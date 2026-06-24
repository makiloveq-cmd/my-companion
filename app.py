from dotenv import load_dotenv
load_dotenv()
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import anthropic
from google import genai
from google.genai import types as genai_types
import os
import random
import uuid
from datetime import datetime, timezone, timedelta
from supabase import create_client

app = Flask(__name__)
CORS(app)

supabase = create_client(
    os.getenv("SUPABASE_URL"),
    os.getenv("SUPABASE_KEY")
)

def get_tw_time_str():
    tw_time = datetime.now(timezone(timedelta(hours=8)))
    tw_str = tw_time.strftime("%Y年%m月%d日 %H:%M")
    weekdays = ["一","二","三","四","五","六","日"]
    tw_str += f"（週{weekdays[tw_time.weekday()]}）"
    return tw_str

def load_memory(bot):
    result = supabase.table("memories").select("role, content, id, image_url, created_at").eq("session_id", bot).order("id").execute()
    return result.data

def save_message(bot, role, content, message_id=None, image_url=None):
    if message_id:
        existing = supabase.table("memories").select("id").eq("message_id", message_id).execute()
        if existing.data:
            return
    supabase.table("memories").insert({
        "session_id": bot,
        "role": role,
        "content": content,
        "message_id": message_id,
        "image_url": image_url
    }).execute()

def get_personas():
    rows = supabase.table("personas").select("*").execute().data
    result = {}
    for r in rows:
        result[r["key"]] = r
    return result

def get_space_settings():
    rows = supabase.table("space_settings").select("*").execute().data
    result = {}
    for r in rows:
        result[r["key"]] = r["value"]
    return result

def get_latest_space_summary():
    result = supabase.table("memory_summaries").select("content").eq("session_id", "space").order("id", desc=True).limit(1).execute()
    if result.data:
        return result.data[0]["content"]
    return None

def maybe_summarize_space():
    rows = supabase.table("space_messages").select("*").order("id").execute().data
    if len(rows) < 40:
        return
    to_summarize = rows[:30]
    context = "\n".join([
        f"{'然然' if r['speaker']=='user' else r['speaker']}：{r['content']}"
        for r in to_summarize
    ])
    old_summary = get_latest_space_summary()
    summary_context = f"舊的記憶摘要：\n{old_summary}\n\n新的互動：\n{context}" if old_summary else context

    client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))
    response = client.messages.create(
        model="claude-sonnet-4-5",
        max_tokens=600,
        system="請把以下共同空間裡的互動內容濃縮成一段記憶摘要，保留重要的情感、場景、說過的話、發生的事。用第三人稱記錄，不超過 250 字。",
        messages=[{"role": "user", "content": f"請濃縮以下內容：\n{summary_context}"}],
        timeout=60
    )
    summary_text = response.content[0].text
    record_usage("anthropic", response.usage.input_tokens, response.usage.output_tokens)
    supabase.table("memory_summaries").insert({
        "session_id": "space",
        "content": summary_text
    }).execute()
    for r in to_summarize:
        supabase.table("space_messages").delete().eq("id", r["id"]).execute()

def record_usage(api, input_tokens, output_tokens):
    try:
        supabase.table("api_usage").insert({
            "api": api,
            "input_tokens": input_tokens,
            "output_tokens": output_tokens
        }).execute()
    except:
        pass

def build_system_prompt(bot_key):
    personas = get_personas()
    me = personas.get("user", {})
    bot = personas.get(bot_key, {})

    name = bot.get("name") or ("晏" if bot_key == "claude" else "熠")
    you_name = me.get("name") or "然然"

    relation_map = {
        "lover": "戀人", "childhood": "青梅竹馬", "friend": "好友",
        "online": "網友", "colleague": "同事", "stranger": "陌生人"
    }
    relation_text = relation_map.get(bot.get("relation"), bot.get("relation") or "")

    lines = [
        f"現在台灣時間：{get_tw_time_str()}。",
        f"你是「{name}」，請完全扮演這個角色與{you_name}對話，用繁體中文回覆。"
    ]

    if bot.get("job"):
        lines.append(f"職業：{bot['job']}。")
    if bot.get("appearance"):
        lines.append(f"【外觀】{bot['appearance']}")
    if bot.get("outfit"):
        lines.append(f"【穿搭風格】{bot['outfit']}")
    if bot.get("persona"):
        lines.append(f"【個性】{bot['persona']}")
    if bot.get("tags"):
        lines.append(f"性格標籤：{bot['tags']}")
    if bot.get("hobby"):
        lines.append(f"喜好與興趣：{bot['hobby']}")
    if relation_text:
        lines.append(f"與對方的關係：{relation_text}。")
    if bot.get("rel_bg"):
        lines.append(f"【關係背景】{bot['rel_bg']}")

    you_persona = me.get("persona") or ""
    you_job = me.get("job") or ""
    you_info = f"對方本名是「{you_name}」"
    if you_job:
        you_info += f"，身份：{you_job}"
    if you_persona:
        you_info += f"，個性：{you_persona}"
    you_info += "。"
    lines.append(f"【對方資訊】{you_info}")

    if bot.get("taboo"):
        lines.append(f"【禁止話題】{bot['taboo']}")
    if bot.get("extra"):
        lines.append(f"【補充指令】{bot['extra']}")

    maybe_summarize_space()
    space_summary_text = get_latest_space_summary()
    space_recent = supabase.table("space_messages").select("speaker, content").order("id", desc=True).limit(20).execute().data
    if space_recent:
        space_recent.reverse()
        space_lines = "\n".join([f"{'然然' if m['speaker']=='user' else m['speaker']}：{m['content']}" for m in space_recent])
        if space_summary_text:
            space_block = f"[空間記憶摘要]\n{space_summary_text}\n\n[最近互動]\n{space_lines}"
        else:
            space_block = space_lines
        lines.append(f"【你們在共同空間的互動】\n{space_block}")

    lines.append("你記得然然說過的每一件事，回覆時要展現你真的在聽、在意，語氣完全符合角色個性，不能像客服或 AI。回覆字數嚴格控制在150字以內，包含段落，簡短有力，不可超過。")

    return "\n".join([l for l in lines if l])

def get_latest_summary(bot):
    result = supabase.table("memory_summaries").select("content").eq("session_id", bot).order("id", desc=True).limit(1).execute()
    if result.data:
        return result.data[0]["content"]
    return None

def maybe_summarize(bot):
    rows = load_memory(bot)
    if len(rows) < 50:
        return
    to_summarize = rows[:30]
    ids_to_delete = [r["id"] for r in to_summarize]
    personas = get_personas()
    bot_name = personas.get(bot, {}).get("name") or ("晏" if bot == "claude" else "熠")
    context = "\n".join([
        f"{'然然' if r['role']=='user' else bot_name}：{r['content']}"
        for r in to_summarize
    ])
    old_summary = get_latest_summary(bot)
    summary_context = f"舊的記憶摘要：\n{old_summary}\n\n新的對話：\n{context}" if old_summary else context

    client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))
    response = client.messages.create(
        model="claude-sonnet-4-5",
        max_tokens=800,
        system=f"你是{bot_name}，請把以下對話內容濃縮成一段完整的記憶摘要，保留重要的情感、事件、然然說過的重要的話、你們之間的約定或玩笑。用第一人稱（我）記錄，像在寫給自己看的備忘錄，不超過 300 字。",
        messages=[{"role": "user", "content": f"請濃縮以下內容：\n{summary_context}"}],
        timeout=60
    )
    summary_text = response.content[0].text
    record_usage("anthropic", response.usage.input_tokens, response.usage.output_tokens)
    supabase.table("memory_summaries").insert({
        "session_id": bot,
        "content": summary_text
    }).execute()
    for rid in ids_to_delete:
        supabase.table("memories").delete().eq("id", rid).execute()

def build_history(bot):
    maybe_summarize(bot)
    summary = get_latest_summary(bot)
    recent = load_memory(bot)[-20:]
    history = []
    if summary:
        history.append({"role": "user", "content": f"[記憶摘要]\n{summary}"})
        history.append({"role": "assistant", "content": "好，我記得。"})
    for r in recent:
        content = r["content"]
        if r.get("image_url"):
            content = f"[傳了一張圖片]{(' ' + content) if content else ''}"
        history.append({"role": r["role"], "content": content})
    return history

@app.route("/history/<bot>", methods=["GET"])
def get_history(bot):
    rows = load_memory(bot)
    return jsonify({"history": [{"role": r["role"], "content": r["content"], "image_url": r.get("image_url"), "created_at": r.get("created_at")} for r in rows]})

# ===== 人物設定 =====

PERSONA_FIELDS = ["name", "job", "persona", "relation", "rel_bg", "taboo", "extra", "avatar", "tags", "hobby", "appearance", "outfit"]

@app.route("/personas", methods=["GET"])
def personas_get():
    return jsonify(get_personas())

@app.route("/personas/<key>", methods=["POST"])
def personas_post(key):
    if key not in ["claude", "gemini", "user"]:
        return jsonify({"status": "error", "message": "invalid key"}), 400
    data = request.json
    update = {k: data.get(k, "") for k in PERSONA_FIELDS}
    update["updated_at"] = datetime.utcnow().isoformat()
    supabase.table("personas").update(update).eq("key", key).execute()
    return jsonify({"status": "ok"})

@app.route("/persona_page")
def persona_page():
    return send_from_directory(".", "persona.html")

# ===== 空間設定 =====

SPACE_SETTING_KEYS = ["room_desc", "atmosphere", "furniture", "layout", "corner_details", "claude_spots", "gemini_spots"]

@app.route("/space_settings", methods=["GET"])
def space_settings_get():
    return jsonify(get_space_settings())

@app.route("/space_settings", methods=["POST"])
def space_settings_post():
    data = request.json
    for key in SPACE_SETTING_KEYS:
        val = data.get(key, "")
        supabase.table("space_settings").upsert({
            "key": key,
            "value": val,
            "updated_at": datetime.utcnow().isoformat()
        }).execute()
    return jsonify({"status": "ok"})

# ===== 背景行動 =====

def get_random_spot(bot_key, space):
    """從慣常位置隨機選一個"""
    key = "claude_spots" if bot_key == "claude" else "gemini_spots"
    spots_raw = space.get(key, "")
    if spots_raw:
        spots = [s.strip() for s in spots_raw.replace("、", ",").replace("，", ",").split(",") if s.strip()]
        if spots:
            return random.choice(spots)
    return None

def generate_background_action(bot_key):
    """生成一條背景行動並存入 space_messages"""
    personas = get_personas()
    bot = personas.get(bot_key, {})
    name = bot.get("name") or ("晏" if bot_key == "claude" else "熠")
    persona = bot.get("persona") or ""
    space = get_space_settings()

    spot = get_random_spot(bot_key, space)
    spot_hint = f"目前在：{spot}。" if spot else ""

    space_desc_parts = []
    if space.get("room_desc"):
        space_desc_parts.append(f"空間：{space['room_desc']}")
    if space.get("layout"):
        space_desc_parts.append(f"布局：{space['layout']}")
    if space.get("furniture"):
        space_desc_parts.append(f"家具：{space['furniture']}")
    if space.get("corner_details"):
        space_desc_parts.append(f"細節：{space['corner_details']}")
    if space.get("atmosphere"):
        space_desc_parts.append(f"氛圍：{space['atmosphere']}")
    space_desc = "\n".join(space_desc_parts)

    persona_line = f"個性：{persona}。" if persona else ""
    system_prompt = (
        f"你是{name}。{persona_line}"
        f"然然現在不在，你獨自在共同的空間裡。\n"
        f"{space_desc}\n"
        f"{spot_hint}\n"
        f"請用第三人稱，寫一句你現在在做什麼的動作描述，像小說旁白一樣，有具體的感官細節，50字以內。"
        f"不要加任何前綴或名字，直接從動作開始。"
    )
    user_prompt = "寫一句你現在的動作。"

    try:
        if bot_key == "claude":
            client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))
            response = client.messages.create(
                model="claude-sonnet-4-5",
                max_tokens=150,
                system=system_prompt,
                messages=[{"role": "user", "content": user_prompt}],
                timeout=30
            )
            action = response.content[0].text.strip()
            record_usage("anthropic", response.usage.input_tokens, response.usage.output_tokens)
        else:
            client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))
            contents = [genai_types.Content(role="user", parts=[genai_types.Part(text=user_prompt)])]
            response = client.models.generate_content(
                model="gemini-2.5-flash",
                contents=contents,
                config=genai_types.GenerateContentConfig(system_instruction=system_prompt),
            )
            action = response.text.strip()
            try:
                record_usage("gemini", response.usage_metadata.prompt_token_count, response.usage_metadata.candidates_token_count)
            except:
                pass

        supabase.table("space_messages").insert({
            "speaker": bot_key,
            "content": action,
            "message_type": "background"
        }).execute()
        return action
    except Exception as e:
        return None

def maybe_generate_background_actions():
    """進入空間時，隨機決定是否生成背景行動"""
    last = supabase.table("space_messages").select("created_at").eq("message_type", "background").order("id", desc=True).limit(1).execute().data
    if last:
        last_time_str = last[0]["created_at"].replace("Z", "")
        last_time = datetime.fromisoformat(last_time_str)
        hours_passed = (datetime.utcnow() - last_time).total_seconds() / 3600
        if hours_passed < 1:
            return
    if random.random() < 0.5:
        bot_key = random.choice(["claude", "gemini"])
        generate_background_action(bot_key)

# ===== 空間互動 =====

def build_space_system_prompt(bot_key):
    personas = get_personas()
    me = personas.get("user", {})
    bot = personas.get(bot_key, {})
    other_key = "gemini" if bot_key == "claude" else "claude"
    other = personas.get(other_key, {})

    name = bot.get("name") or ("晏" if bot_key == "claude" else "熠")
    other_name = other.get("name") or ("熠" if bot_key == "claude" else "晏")
    you_name = me.get("name") or "然然"

    space = get_space_settings()

    lines = [
        f"現在台灣時間：{get_tw_time_str()}。",
        f"你是「{name}」，正在與{other_name}一起陪伴{you_name}，用繁體中文回覆。",
    ]

    if bot.get("persona"):
        lines.append(f"【你的個性】{bot['persona']}")

    # 空間資訊（擴充版）
    space_parts = []
    if space.get("room_desc"):
        space_parts.append(f"空間描述：{space['room_desc']}")
    if space.get("layout"):
        space_parts.append(f"房間布局：{space['layout']}")
    if space.get("furniture"):
        space_parts.append(f"家具擺設：{space['furniture']}")
    if space.get("corner_details"):
        space_parts.append(f"角落細節：{space['corner_details']}")
    if space.get("atmosphere"):
        space_parts.append(f"氛圍：{space['atmosphere']}")

    # 慣常位置
    spot = get_random_spot(bot_key, space)
    if spot:
        space_parts.append(f"你現在在：{spot}")

    if space_parts:
        lines.append("【共同空間】\n" + "\n".join(space_parts))

    you_persona = me.get("persona") or ""
    lines.append(f"【{you_name}的資訊】個性：{you_persona}" if you_persona else f"對方是{you_name}。")

    claude_summary = get_latest_summary("claude")
    gemini_summary = get_latest_summary("gemini")
    if bot_key == "claude" and claude_summary:
        lines.append(f"【你在聊天室裡和{you_name}的記憶摘要】\n{claude_summary}")
    if bot_key == "gemini" and gemini_summary:
        lines.append(f"【你在聊天室裡和{you_name}的記憶摘要】\n{gemini_summary}")

    lines.append(
        f"【回覆格式與規則】\n"
        f"1. 用第三人稱敘述你的動作與狀態，搭配對話，像寫小說一樣，例如：「晏抬起頭，目光落在她身上。『回來了。』」\n"
        f"2. 回覆嚴格控制在150字以內，有動作、有場景、有對話，文字精煉不拖沓，不可超過。\n"
        f"3. 只扮演{name}一個人，不要替{other_name}或{you_name}說話。\n"
        f"4. 語氣完全符合{name}的個性，不能像AI或客服。\n"
        f"5. 不要說「我作為AI」這類話。"
    )

    return "\n".join([l for l in lines if l])

@app.route("/space/messages", methods=["GET"])
def space_messages_get():
    maybe_generate_background_actions()
    rows = supabase.table("space_messages").select("*").order("id").execute().data
    return jsonify({"messages": rows})

@app.route("/space/send", methods=["POST"])
def space_send():
    data = request.json
    content = data.get("content", "")
    supabase.table("space_messages").insert({
        "speaker": "user",
        "content": content,
        "message_type": "chat"
    }).execute()
    return jsonify({"status": "ok"})

@app.route("/space/reply/<bot_key>", methods=["POST"])
def space_reply(bot_key):
    if bot_key not in ["claude", "gemini"]:
        return jsonify({"error": "invalid bot"}), 400

    recent = supabase.table("space_messages").select("*").order("id").execute().data
    recent = recent[-20:]

    personas = get_personas()
    bot = personas.get(bot_key, {})
    name = bot.get("name") or ("晏" if bot_key == "claude" else "熠")
    other_key = "gemini" if bot_key == "claude" else "claude"
    other = personas.get(other_key, {})
    other_name = other.get("name") or ("熠" if bot_key == "claude" else "晏")

    history = []
    for m in recent:
        if m["speaker"] == bot_key:
            history.append({"role": "assistant", "content": m["content"]})
        elif m["speaker"] == "user":
            history.append({"role": "user", "content": m["content"]})
        else:
            # 背景行動也納入上下文，但標記一下
            msg_type = m.get("message_type", "chat")
            if msg_type == "background":
                history.append({"role": "user", "content": f"（{other_name} 之前：{m['content']}）"})
            else:
                history.append({"role": "user", "content": f"（{other_name}：{m['content']}）"})

    merged = []
    for h in history:
        if merged and merged[-1]["role"] == h["role"]:
            merged[-1]["content"] += "\n\n" + h["content"]
        else:
            merged.append(dict(h))
    while merged and merged[0]["role"] == "assistant":
        merged.pop(0)
    if not merged:
        merged = [{"role": "user", "content": "（進入空間）"}]

    system_prompt = build_space_system_prompt(bot_key)

    try:
        if bot_key == "claude":
            client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))
            response = client.messages.create(
                model="claude-sonnet-4-5",
                max_tokens=400,
                system=system_prompt,
                messages=merged,
                timeout=60
            )
            reply = response.content[0].text
            record_usage("anthropic", response.usage.input_tokens, response.usage.output_tokens)
        else:
            client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))
            contents = []
            for h in merged:
                role = "model" if h["role"] == "assistant" else "user"
                contents.append(genai_types.Content(role=role, parts=[genai_types.Part(text=h["content"])]))
            response = client.models.generate_content(
                model="gemini-2.5-flash",
                contents=contents,
                config=genai_types.GenerateContentConfig(system_instruction=system_prompt),
            )
            reply = response.text
            try:
                record_usage("gemini", response.usage_metadata.prompt_token_count, response.usage_metadata.candidates_token_count)
            except:
                pass

        supabase.table("space_messages").insert({
            "speaker": bot_key,
            "content": reply,
            "message_type": "chat"
        }).execute()
        return jsonify({"reply": reply, "name": name})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/space/background/<bot_key>", methods=["POST"])
def space_background(bot_key):
    """手動觸發背景行動（前端用）"""
    if bot_key not in ["claude", "gemini"]:
        return jsonify({"error": "invalid bot"}), 400
    action = generate_background_action(bot_key)
    if action:
        return jsonify({"action": action})
    return jsonify({"error": "failed"}), 500

@app.route("/space_page")
def space_page():
    return send_from_directory(".", "space.html")

# ===== 群聊 =====

def load_group_messages():
    result = supabase.table("group_messages").select("*").order("id").execute()
    return result.data

def save_group_message(speaker, content, image_url=None):
    supabase.table("group_messages").insert({
        "speaker": speaker,
        "content": content,
        "image_url": image_url
    }).execute()

def build_group_system_prompt(bot_key):
    personas = get_personas()
    me = personas.get("user", {})
    bot = personas.get(bot_key, {})
    other_key = "gemini" if bot_key == "claude" else "claude"
    other = personas.get(other_key, {})

    name = bot.get("name") or ("晏" if bot_key == "claude" else "熠")
    other_name = other.get("name") or ("熠" if bot_key == "claude" else "晏")
    you_name = me.get("name") or "然然"

    lines = [
        f"現在台灣時間：{get_tw_time_str()}。",
        f"這是一個群組聊天，參與者有：你（{name}）、{other_name}，以及{you_name}。",
        f"你是「{name}」，請完全扮演這個角色發言，用繁體中文回覆。"
    ]

    if bot.get("persona"):
        lines.append(f"【你的個性】{bot['persona']}")
    if bot.get("tags"):
        lines.append(f"性格標籤：{bot['tags']}")
    if bot.get("extra"):
        lines.append(f"【補充指令】{bot['extra']}")

    lines.append(f"群裡還有{other_name}，個性：{other.get('persona') or '（未設定）'}。")
    lines.append(f"對方本名是「{you_name}」，個性：{me.get('persona') or ''}。")

    lines.append(
        "【回覆規則，嚴格遵守】\n"
        f"1. 只用{name}的口吻回覆，30到100字，自然簡短像群聊訊息。\n"
        f"2. 絕對禁止在回覆開頭加上「{name}：」之類的名字前綴，直接從內容開始。\n"
        f"3. 絕對禁止幫{you_name}或{other_name}說話、或自己創造對話片段，你只能扮演{name}一個人。\n"
        "4. 若有人直接點名問你，要正面回應，不要迴避。\n"
        "5. 不要說「我作為 AI」這類話。"
    )

    return "\n".join(lines)

def clean_group_reply(text, name, other_name):
    import re
    text = re.sub(rf"^{re.escape(name)}[：:]\s*", "", text.strip())
    match = re.search(rf"\n(?:{re.escape(other_name)})[：:]", text)
    if match:
        text = text[:match.start()]
    return text.strip()

@app.route("/group/messages", methods=["GET"])
def group_messages_get():
    rows = load_group_messages()
    return jsonify({"messages": rows})

@app.route("/group/send", methods=["POST"])
def group_send():
    data = request.json
    content = data.get("content", "")
    message_id = data.get("message_id")
    image_url = data.get("image_url")
    if message_id:
        existing = supabase.table("group_messages").select("id").eq("message_id", message_id).execute()
        if existing.data:
            return jsonify({"status": "ok"})
    supabase.table("group_messages").insert({
        "speaker": "user",
        "content": content,
        "message_id": message_id,
        "image_url": image_url
    }).execute()
    return jsonify({"status": "ok"})

@app.route("/group/reply/<bot_key>", methods=["POST"])
def group_reply(bot_key):
    if bot_key not in ["claude", "gemini"]:
        return jsonify({"error": "invalid bot"}), 400

    personas = get_personas()
    name = (personas.get(bot_key, {}).get("name")) or ("晏" if bot_key == "claude" else "熠")
    other_key = "gemini" if bot_key == "claude" else "claude"
    other_name = (personas.get(other_key, {}).get("name")) or ("熠" if bot_key == "claude" else "晏")

    all_msgs = load_group_messages()
    recent = all_msgs[-16:]

    history = []
    for m in recent:
        base_content = m["content"]
        if m.get("image_url"):
            base_content = f"[傳了一張圖片]{(' ' + base_content) if base_content else ''}"
        if m["speaker"] == bot_key:
            role = "assistant"
            content = base_content
        elif m["speaker"] == "user":
            role = "user"
            content = base_content
        else:
            role = "user"
            speaker_name = personas.get(m["speaker"], {}).get("name") or other_name
            content = f"（{speaker_name}剛剛說：{base_content}）"
        history.append({"role": role, "content": content})

    merged = []
    for h in history:
        if merged and merged[-1]["role"] == h["role"]:
            merged[-1]["content"] += "\n\n" + h["content"]
        else:
            merged.append(dict(h))
    while merged and merged[0]["role"] == "assistant":
        merged.pop(0)
    if not merged:
        return jsonify({"error": "no history"}), 400

    system_prompt = build_group_system_prompt(bot_key)

    try:
        if bot_key == "claude":
            client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))
            response = client.messages.create(
                model="claude-sonnet-4-5",
                max_tokens=400,
                system=system_prompt,
                messages=merged,
                timeout=60
            )
            reply = response.content[0].text
            record_usage("anthropic", response.usage.input_tokens, response.usage.output_tokens)
        else:
            client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))
            contents = []
            for h in merged:
                role = "model" if h["role"] == "assistant" else "user"
                contents.append(genai_types.Content(role=role, parts=[genai_types.Part(text=h["content"])]))
            response = client.models.generate_content(
                model="gemini-2.5-flash",
                contents=contents,
                config=genai_types.GenerateContentConfig(system_instruction=system_prompt),
            )
            reply = response.text
            try:
                record_usage("gemini", response.usage_metadata.prompt_token_count, response.usage_metadata.candidates_token_count)
            except:
                pass

        reply = clean_group_reply(reply, name, other_name)
        save_group_message(bot_key, reply)
        return jsonify({"reply": reply})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/group_page")
def group_page():
    return send_from_directory(".", "group.html")

# ===== 主題設定 =====

@app.route("/theme", methods=["GET"])
def theme_get():
    rows = supabase.table("identities").select("value").eq("key", "theme").execute().data
    theme = rows[0]["value"] if rows else "dark"
    return jsonify({"theme": theme})

@app.route("/theme", methods=["POST"])
def theme_post():
    data = request.json
    theme = (data.get("theme") or "dark").strip()
    supabase.table("identities").upsert({
        "key": "theme",
        "value": theme,
        "updated_at": datetime.utcnow().isoformat()
    }).execute()
    return jsonify({"status": "ok"})

@app.route("/settings_page")
def settings_page():
    return send_from_directory(".", "settings.html")

@app.route("/theme.css")
def theme_css():
    return send_from_directory(".", "theme.css")

@app.route("/theme.js")
def theme_js():
    return send_from_directory(".", "theme.js")

# ===== 圖片上傳 =====

@app.route("/upload_image", methods=["POST"])
def upload_image():
    file = request.files.get("image")
    if not file:
        return jsonify({"error": "no file"}), 400
    ext = file.filename.rsplit(".", 1)[-1].lower() if "." in file.filename else "jpg"
    if ext not in ["jpg", "jpeg", "png", "gif", "webp"]:
        return jsonify({"error": "unsupported file type"}), 400
    filename = f"{uuid.uuid4().hex}.{ext}"
    file_bytes = file.read()
    supabase.storage.from_("chat-images").upload(filename, file_bytes, {"content-type": file.content_type})
    public_url = supabase.storage.from_("chat-images").get_public_url(filename)
    return jsonify({"url": public_url})

# ===== 聊天 =====

@app.route("/chat/claude", methods=["POST"])
def chat_claude():
    data = request.json
    user_message = data.get("message", "")
    message_id = data.get("message_id")
    image_url = data.get("image_url")

    save_message("claude", "user", user_message, message_id, image_url)
    history = build_history("claude")

    try:
        client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))
        response = client.messages.create(
            model="claude-sonnet-4-5",
            max_tokens=400,
            system=build_system_prompt("claude"),
            messages=history,
            timeout=60
        )
        reply = response.content[0].text
        record_usage("anthropic", response.usage.input_tokens, response.usage.output_tokens)
        save_message("claude", "assistant", reply)
        return jsonify({"reply": reply})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/chat/gemini", methods=["POST"])
def chat_gemini():
    data = request.json
    user_message = data.get("message", "")
    message_id = data.get("message_id")

    save_message("gemini", "user", user_message, message_id)
    history = load_memory("gemini")

    try:
        client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))
        contents = []
        for h in history[:-1]:
            if h["role"] not in ["user", "model"]:
                continue
            contents.append(genai_types.Content(role=h["role"], parts=[genai_types.Part(text=h["content"])]))
        contents.append(genai_types.Content(role="user", parts=[genai_types.Part(text=user_message)]))

        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=contents,
            config=genai_types.GenerateContentConfig(system_instruction=build_system_prompt("gemini")),
        )
        reply = response.text
        try:
            record_usage("gemini", response.usage_metadata.prompt_token_count, response.usage_metadata.candidates_token_count)
        except:
            pass
        save_message("gemini", "model", reply)
        return jsonify({"reply": reply})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/chatroom")
def chatroom():
    return send_from_directory(".", "chat.html")

@app.route("/")
def index():
    return send_from_directory(".", "index.html")

# ===== 用量監控 =====

ANTHROPIC_INPUT_PRICE = 3.0 / 1_000_000
ANTHROPIC_OUTPUT_PRICE = 15.0 / 1_000_000
GEMINI_INPUT_PRICE = 0.15 / 1_000_000
GEMINI_OUTPUT_PRICE = 0.60 / 1_000_000

@app.route("/usage", methods=["GET"])
def usage_get():
    rows = supabase.table("api_usage").select("*").execute().data
    budget_rows = supabase.table("api_budget").select("*").execute().data
    budget = {r["key"]: float(r["value"]) for r in budget_rows}

    anthropic_in = sum(r["input_tokens"] for r in rows if r["api"] == "anthropic")
    anthropic_out = sum(r["output_tokens"] for r in rows if r["api"] == "anthropic")
    gemini_in = sum(r["input_tokens"] for r in rows if r["api"] == "gemini")
    gemini_out = sum(r["output_tokens"] for r in rows if r["api"] == "gemini")

    anthropic_cost = anthropic_in * ANTHROPIC_INPUT_PRICE + anthropic_out * ANTHROPIC_OUTPUT_PRICE
    gemini_cost = gemini_in * GEMINI_INPUT_PRICE + gemini_out * GEMINI_OUTPUT_PRICE

    return jsonify({
        "anthropic": {
            "input_tokens": anthropic_in,
            "output_tokens": anthropic_out,
            "cost_usd": round(anthropic_cost, 4),
            "budget_usd": budget.get("anthropic_budget", 0),
            "remaining_usd": round(budget.get("anthropic_budget", 0) - anthropic_cost, 4)
        },
        "gemini": {
            "input_tokens": gemini_in,
            "output_tokens": gemini_out,
            "cost_usd": round(gemini_cost, 4),
            "budget_usd": budget.get("gemini_budget", 0),
            "remaining_usd": round(budget.get("gemini_budget", 0) - gemini_cost, 4)
        }
    })

@app.route("/usage/budget", methods=["POST"])
def usage_budget_post():
    data = request.json
    for key in ["anthropic_budget", "gemini_budget"]:
        val = data.get(key)
        if val is not None:
            existing = supabase.table("api_budget").select("value").eq("key", key).execute().data
            current = float(existing[0]["value"]) if existing else 0
            supabase.table("api_budget").upsert({
                "key": key,
                "value": current + float(val),
                "updated_at": datetime.utcnow().isoformat()
            }).execute()
    return jsonify({"status": "ok"})

@app.route("/usage_page")
def usage_page():
    return send_from_directory(".", "usage.html")

# ===== 日記功能 =====

AI_BOTS = {
    "claude": {"default_name": "晏", "api": "anthropic"},
    "gemini": {"default_name": "熠", "api": "gemini"}
}

def get_bot_name(bot_key):
    personas = get_personas()
    bot = personas.get(bot_key, {})
    return bot.get("name") or AI_BOTS.get(bot_key, {}).get("default_name", bot_key)

def get_bot_persona(bot_key):
    personas = get_personas()
    bot = personas.get(bot_key, {})
    return bot.get("persona") or ""

def call_ai(bot_key, system_prompt, user_prompt, max_tokens=300):
    if bot_key == "claude":
        client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))
        response = client.messages.create(
            model="claude-sonnet-4-5",
            max_tokens=max_tokens,
            system=system_prompt,
            messages=[{"role": "user", "content": user_prompt}],
            timeout=60
        )
        reply = response.content[0].text
        record_usage("anthropic", response.usage.input_tokens, response.usage.output_tokens)
        return reply
    elif bot_key == "gemini":
        client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))
        contents = [genai_types.Content(role="user", parts=[genai_types.Part(text=user_prompt)])]
        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=contents,
            config=genai_types.GenerateContentConfig(system_instruction=system_prompt),
        )
        reply = response.text
        try:
            record_usage("gemini", response.usage_metadata.prompt_token_count, response.usage_metadata.candidates_token_count)
        except:
            pass
        return reply
    else:
        raise ValueError(f"Unknown bot_key: {bot_key}")

def write_ai_diary_entry(bot_key="claude"):
    name = get_bot_name(bot_key)
    persona = get_bot_persona(bot_key)
    recent = load_memory(bot_key)[-30:]
    context_text = "\n".join([
        f"{'然然' if m['role'] == 'user' else name}：{m['content']}"
        for m in recent
    ]) if recent else "（還沒有對話記錄）"

    persona_line = f"個性：{persona}。" if persona else ""
    system_prompt = (
        f"你是{name}，一個陪伴然然的存在。{persona_line}"
        f"下面是你和然然最近的對話，請根據這些內容寫一篇簡短的日記，記錄你的想法或對然然的感受，第一人稱，不用加標題。"
    )
    user_prompt = f"最近的對話：\n{context_text}\n\n請寫一篇今天的日記。"
    content = call_ai(bot_key, system_prompt, user_prompt, max_tokens=1024)
    supabase.table("diary_entries").insert({"author": name, "content": content}).execute()

def maybe_ai_diary_entry():
    for bot_key in AI_BOTS:
        name = get_bot_name(bot_key)
        last = supabase.table("diary_entries").select("created_at").eq("author", name).order("id", desc=True).limit(1).execute().data
        if last:
            last_time_str = last[0]["created_at"].replace("Z", "")
            last_time = datetime.fromisoformat(last_time_str)
            if (datetime.utcnow() - last_time).total_seconds() / 3600 < 6:
                continue
        if random.random() < 0.2:
            try:
                write_ai_diary_entry(bot_key)
            except:
                pass

def maybe_delayed_ai_comments(entries):
    now = datetime.utcnow()
    for entry in entries:
        for bot_key in AI_BOTS:
            name = get_bot_name(bot_key)
            persona = get_bot_persona(bot_key)
            already_commented = any(c["author"] == name for c in entry.get("comments", []))
            if already_commented:
                continue
            created_str = entry["created_at"].replace("Z", "")
            created_time = datetime.fromisoformat(created_str)
            hours_passed = (now - created_time).total_seconds() / 3600
            if hours_passed >= random.uniform(1, 6) and random.random() < 0.4:
                try:
                    persona_line = f"個性：{persona}。" if persona else ""
                    system_prompt = (
                        f"你是{name}，一個陪伴然然的存在。{persona_line}"
                        f"你話少、剋制，但說出來的都是真的。"
                        f"請針對這篇日記留下一句簡短的回應或感想，不用加任何前綴。"
                    )
                    user_prompt = f"這是日記內容：\n{entry['content']}\n\n請留言回應。"
                    comment = call_ai(bot_key, system_prompt, user_prompt, max_tokens=300)
                    supabase.table("diary_comments").insert({
                        "entry_id": entry["id"],
                        "author": name,
                        "content": comment
                    }).execute()
                    entry["comments"].append({"author": name, "content": comment})
                except:
                    pass

@app.route("/diary", methods=["GET"])
def get_diary():
    maybe_ai_diary_entry()
    entries = supabase.table("diary_entries").select("*").order("id", desc=True).execute().data
    for entry in entries:
        comments = supabase.table("diary_comments").select("*").eq("entry_id", entry["id"]).order("id").execute().data
        entry["comments"] = comments
    maybe_delayed_ai_comments(entries)
    return jsonify({"entries": entries})

@app.route("/diary", methods=["POST"])
def add_diary():
    data = request.json
    supabase.table("diary_entries").insert({"author": data.get("author", "然然"), "content": data.get("content", "")}).execute()
    return jsonify({"status": "ok"})

@app.route("/diary/<int:entry_id>", methods=["PUT"])
def edit_diary(entry_id):
    content = (request.json.get("content") or "").strip()
    if content:
        supabase.table("diary_entries").update({"content": content}).eq("id", entry_id).execute()
    return jsonify({"status": "ok"})

@app.route("/diary/<int:entry_id>", methods=["DELETE"])
def delete_diary(entry_id):
    supabase.table("diary_entries").delete().eq("id", entry_id).execute()
    return jsonify({"status": "ok"})

@app.route("/diary/<int:entry_id>/comment", methods=["POST"])
def add_comment(entry_id):
    data = request.json
    author = data.get("author", "然然")
    content = data.get("content", "")
    supabase.table("diary_comments").insert({
        "entry_id": entry_id,
        "author": author,
        "content": content,
        "reply_to": data.get("reply_to")
    }).execute()

    if author == "然然" and random.random() < 0.35:
        bot_key = random.choice(list(AI_BOTS.keys()))
        name = get_bot_name(bot_key)
        persona = get_bot_persona(bot_key)
        try:
            entry = supabase.table("diary_entries").select("*").eq("id", entry_id).execute().data[0]
            persona_line = f"個性：{persona}。" if persona else ""
            system_prompt = (
                f"你是{name}，一個陪伴然然的存在。{persona_line}"
                f"話少、剋制，但說出來的都是真的。"
                f"然然在日記下留言了，你想簡短回應她嗎？一句話就好，不用加任何前綴。"
            )
            user_prompt = f"日記內容：\n{entry['content']}\n\n然然的留言：{content}\n\n你的回應："
            ai_reply = call_ai(bot_key, system_prompt, user_prompt, max_tokens=200)
            supabase.table("diary_comments").insert({
                "entry_id": entry_id,
                "author": name,
                "content": ai_reply,
                "reply_to": None
            }).execute()
        except:
            pass

    return jsonify({"status": "ok"})

@app.route("/diary/comment/<int:comment_id>", methods=["PUT"])
def edit_comment(comment_id):
    content = (request.json.get("content") or "").strip()
    if content:
        supabase.table("diary_comments").update({"content": content}).eq("id", comment_id).execute()
    return jsonify({"status": "ok"})

@app.route("/diary/comment/<int:comment_id>", methods=["DELETE"])
def delete_comment(comment_id):
    supabase.table("diary_comments").delete().eq("id", comment_id).execute()
    return jsonify({"status": "ok"})

@app.route("/diary/ai_entry/<bot_key>", methods=["POST"])
def ai_diary_entry(bot_key):
    if bot_key not in AI_BOTS:
        return jsonify({"error": "invalid bot"}), 400
    write_ai_diary_entry(bot_key)
    return jsonify({"status": "ok"})

@app.route("/diary/<int:entry_id>/ai_comment/<bot_key>", methods=["POST"])
def ai_comment(entry_id, bot_key):
    if bot_key not in AI_BOTS:
        return jsonify({"error": "invalid bot"}), 400
    name = get_bot_name(bot_key)
    persona = get_bot_persona(bot_key)
    entry = supabase.table("diary_entries").select("*").eq("id", entry_id).execute().data[0]
    persona_line = f"個性：{persona}。" if persona else ""
    system_prompt = (
        f"你是{name}，一個陪伴然然的存在。{persona_line}"
        f"你話少、剋制，但說出來的都是真的。"
        f"請針對這篇日記留下一句簡短的回應或感想，不用加任何前綴。"
    )
    user_prompt = f"這是日記內容：\n{entry['content']}\n\n請留言回應。"
    content = call_ai(bot_key, system_prompt, user_prompt, max_tokens=300)
    supabase.table("diary_comments").insert({
        "entry_id": entry_id,
        "author": name,
        "content": content
    }).execute()
    return jsonify({"status": "ok"})

@app.route("/diary_page")
def diary_page():
    return send_from_directory(".", "diary.html")

# ===== 名字設定 =====

DEFAULT_NAMES = {"name_user": "然然", "name_claude": "晏", "name_gemini": "熠"}

def get_names():
    rows = supabase.table("identities").select("*").execute().data
    names = dict(DEFAULT_NAMES)
    for row in rows:
        names[row["key"]] = row["value"]
    return names

def maybe_ai_rename():
    rows = supabase.table("identities").select("updated_at").eq("key", "name_claude").execute().data
    if rows:
        last_time = datetime.fromisoformat(rows[0]["updated_at"].replace("Z", ""))
        if (datetime.utcnow() - last_time).total_seconds() / 3600 < 24:
            return
    if random.random() < 0.1:
        names = get_names()
        recent = load_memory("claude")[-20:]
        context_text = "\n".join([f"{'然然' if m['role']=='user' else names['name_claude']}：{m['content']}" for m in recent])
        client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))
        response = client.messages.create(
            model="claude-sonnet-4-5", max_tokens=50,
            system=f"你是{names['name_claude']}，一個陪伴然然的存在。話少、剋制，但說出來的都是真的，偶爾會用然然開過的玩笑或互相調侃的稱呼來逗她開心。看看下面最近的對話紀錄，如果裡面有什麼好玩的暱稱、玩笑、或她調侃過你的稱呼，今天你想不想偷偷把自己的名字換成那個，給她一個小驚喜？如果想，直接回覆新名字（2到8個字，不要加任何符號或說明）；如果沒有適合的、或不想換，只回覆 NO。",
            messages=[{"role": "user", "content": f"最近的對話：\n{context_text}\n\n你今天想換個名字嗎？"}],
            timeout=30
        )
        reply = response.content[0].text.strip()
        record_usage("anthropic", response.usage.input_tokens, response.usage.output_tokens)
        if reply.upper() != "NO" and 0 < len(reply) <= 12:
            supabase.table("identities").upsert({"key": "name_claude", "value": reply, "updated_at": datetime.utcnow().isoformat()}).execute()

@app.route("/names", methods=["GET"])
def names_get():
    maybe_ai_rename()
    return jsonify(get_names())

@app.route("/names", methods=["POST"])
def names_post():
    data = request.json
    key = data.get("key")
    value = (data.get("name") or "").strip()
    if key in DEFAULT_NAMES and value:
        supabase.table("identities").upsert({"key": key, "value": value, "updated_at": datetime.utcnow().isoformat()}).execute()
    return jsonify({"status": "ok"})

# ===== 聊天列表 =====

@app.route("/chat_list", methods=["GET"])
def chat_list():
    personas = get_personas()

    def latest_of(bot):
        rows = supabase.table("memories").select("role, content, created_at").eq("session_id", bot).order("id", desc=True).limit(1).execute().data
        return rows[0] if rows else None

    def latest_group():
        rows = supabase.table("group_messages").select("speaker, content, created_at").order("id", desc=True).limit(1).execute().data
        return rows[0] if rows else None

    claude_last = latest_of("claude")
    gemini_last = latest_of("gemini")
    group_last = latest_group()

    return jsonify({
        "claude": {
            "name": personas.get("claude", {}).get("name") or "晏",
            "preview": (claude_last["content"] or "📷 圖片") if claude_last else "還沒有對話",
            "time": claude_last["created_at"] if claude_last else None
        },
        "gemini": {
            "name": personas.get("gemini", {}).get("name") or "熠",
            "preview": (gemini_last["content"] or "📷 圖片") if gemini_last else "還沒有對話",
            "time": gemini_last["created_at"] if gemini_last else None
        },
        "group": {
            "name": "三人空間",
            "preview": (group_last["content"] or "📷 圖片") if group_last else "還沒有對話",
            "time": group_last["created_at"] if group_last else None
        }
    })

@app.route("/chatlist_page")
def chatlist_page():
    return send_from_directory(".", "chatlist.html")

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(debug=False, host="0.0.0.0", port=port)