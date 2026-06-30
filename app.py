from dotenv import load_dotenv
load_dotenv()
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import anthropic
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

# ===== 台灣時間 =====

def get_tw_time_str():
    tw_time = datetime.now(timezone(timedelta(hours=8)))
    tw_str = tw_time.strftime("%Y年%m月%d日 %H:%M")
    weekdays = ["一","二","三","四","五","六","日"]
    tw_str += f"（週{weekdays[tw_time.weekday()]}）"
    return tw_str

# ===== 記憶體快取 =====

_cache = {}
_cache_ttl = {}
CACHE_SECONDS = 60

def _get_cache(key):
    if key in _cache and (datetime.utcnow() - _cache_ttl[key]).total_seconds() < CACHE_SECONDS:
        return _cache[key]
    return None

def _set_cache(key, value):
    _cache[key] = value
    _cache_ttl[key] = datetime.utcnow()

def invalidate_cache(key=None):
    if key:
        _cache.pop(key, None)
        _cache_ttl.pop(key, None)
    else:
        _cache.clear()
        _cache_ttl.clear()

# ===== Supabase 基本操作 =====

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
    if role in ("user", "assistant"):
        try:
            maybe_evolve_rel_bg(bot)
        except:
            pass

def get_personas():
    cached = _get_cache("personas")
    if cached is not None:
        return cached
    rows = supabase.table("personas").select("*").execute().data
    result = {}
    for r in rows:
        result[r["key"]] = r
    _set_cache("personas", result)
    return result

def get_space_settings():
    cached = _get_cache("space_settings")
    if cached is not None:
        return cached
    rows = supabase.table("space_settings").select("*").execute().data
    result = {}
    for r in rows:
        result[r["key"]] = r["value"]
    _set_cache("space_settings", result)
    return result

def get_latest_space_summary():
    result = supabase.table("memory_summaries").select("content").eq("session_id", "space").order("id", desc=True).limit(1).execute()
    if result.data:
        return result.data[0]["content"]
    return None

def record_usage(api, input_tokens, output_tokens):
    try:
        supabase.table("api_usage").insert({
            "api": api,
            "input_tokens": input_tokens,
            "output_tokens": output_tokens
        }).execute()
    except:
        pass

# ===== AI 呼叫 =====

def call_claude(system_prompt, messages, max_tokens=400, timeout=60):
    client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))
    response = client.messages.create(
        model="claude-sonnet-4-5",
        max_tokens=max_tokens,
        system=system_prompt,
        messages=messages,
        timeout=timeout
    )
    reply = response.content[0].text
    record_usage("anthropic", response.usage.input_tokens, response.usage.output_tokens)
    return reply

# ===== System Prompt =====

def build_system_prompt(bot_key="claude"):
    personas = get_personas()
    me = personas.get("user", {})
    bot = personas.get(bot_key, {})

    name = bot.get("name") or "晏"
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
    you_appearance = me.get("appearance") or ""
    you_outfit = me.get("outfit") or ""
    you_info = f"對方本名是「{you_name}」"
    if you_job:
        you_info += f"，身份：{you_job}"
    if you_persona:
        you_info += f"，個性：{you_persona}"
    you_info += "。"
    lines.append(f"【對方資訊】{you_info}")
    if you_appearance:
        lines.append(f"【對方外觀】{you_appearance}")
    if you_outfit:
        lines.append(f"【對方穿搭】{you_outfit}")

    if bot.get("taboo"):
        lines.append(f"【禁止話題】{bot['taboo']}")
    if bot.get("extra"):
        lines.append(f"【補充指令】{bot['extra']}")

    lines.append("你記得然然說過的每一件事，回覆時要展現你真的在聽、在意，語氣完全符合角色個性，不能像客服或 AI。嚴格禁止任何形式的動作描述或旁白敘述，包含星號動作、第三人稱敘述（如「他抬起頭」「嘴角上揚」「看著她」），只能直接開口說話。")

    return "\n".join([l for l in lines if l])

# ===== 記憶摘要 =====

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
    bot_name = personas.get(bot, {}).get("name") or "晏"
    context = "\n".join([
        f"{'然然' if r['role']=='user' else bot_name}：{r['content']}"
        for r in to_summarize
    ])
    old_summary = get_latest_summary(bot)
    summary_context = f"舊的記憶摘要：\n{old_summary}\n\n新的對話：\n{context}" if old_summary else context

    summary_text = call_claude(
        f"你是{bot_name}，請把以下對話內容濃縮成一段完整的記憶摘要，保留重要的情感、事件、然然說過的重要的話、你們之間的約定或玩笑。用第一人稱（我）記錄，像在寫給自己看的備忘錄，不超過 300 字。",
        [{"role": "user", "content": f"請濃縮以下內容：\n{summary_context}"}],
        max_tokens=1500
    )
    supabase.table("memory_summaries").insert({
        "session_id": bot,
        "content": summary_text
    }).execute()
    for rid in ids_to_delete:
        supabase.table("memories").delete().eq("id", rid).execute()

# ===== 關係背景自動演化 =====

def maybe_evolve_rel_bg(bot):
    rows = load_memory(bot)
    if len(rows) % 30 != 0 or len(rows) == 0:
        return

    personas = get_personas()
    bot_data = personas.get(bot, {})
    name = bot_data.get("name") or "晏"
    you_name = personas.get("user", {}).get("name") or "然然"
    old_rel_bg = bot_data.get("rel_bg") or ""

    recent = rows[-30:]
    context = "\n".join([
        f"{'然然' if r['role'] == 'user' else name}：{r['content']}"
        for r in recent
    ])

    old_context = f"【現有的關係背景】\n{old_rel_bg}\n\n" if old_rel_bg else ""
    user_prompt = (
        f"{old_context}"
        f"【最近 30 條對話】\n{context}\n\n"
        f"請根據以上內容，更新你和{you_name}之間的關係背景描述。"
        f"保留原本的重要記錄，加入新發生的事、新的情感變化、新的默契或習慣。"
        f"用第三人稱描述，像在記錄一段關係的演變，不超過 150 字。"
    )

    try:
        new_rel_bg = call_claude(
            f"你是一個記錄人物關係演變的旁白者。請根據對話內容，客觀地更新{name}與{you_name}之間的關係背景描述。",
            [{"role": "user", "content": user_prompt}],
            max_tokens=800
        )
        new_rel_bg = new_rel_bg.strip()
        supabase.table("personas").update({
            "rel_bg": new_rel_bg,
            "updated_at": datetime.utcnow().isoformat()
        }).eq("key", bot).execute()
        invalidate_cache("personas")
        try:
            supabase.table("rel_bg_history").insert({
                "bot_key": bot,
                "bot_name": name,
                "old_rel_bg": old_rel_bg,
                "new_rel_bg": new_rel_bg,
                "message_count": len(rows)
            }).execute()
        except:
            pass
    except:
        pass

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

# ===== 歷史記錄 =====

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
    if key not in ["claude", "user"]:
        return jsonify({"status": "error", "message": "invalid key"}), 400
    data = request.json
    update = {k: data.get(k, "") for k in PERSONA_FIELDS}
    update["updated_at"] = datetime.utcnow().isoformat()
    supabase.table("personas").update(update).eq("key", key).execute()
    invalidate_cache("personas")
    return jsonify({"status": "ok"})

@app.route("/persona_page")
def persona_page():
    return send_from_directory(".", "persona.html")

# ===== 空間設定 =====

SPACE_SETTING_KEYS = ["room_desc", "atmosphere", "furniture", "layout", "corner_details", "claude_spots"]

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
        }, on_conflict="key").execute()
    invalidate_cache("space_settings")
    return jsonify({"status": "ok"})

# ===== 背景行動 =====

def get_random_spot(space):
    spots_raw = space.get("claude_spots", "")
    if spots_raw:
        spots = [s.strip() for s in spots_raw.replace("、", ",").replace("，", ",").split(",") if s.strip()]
        if spots:
            return random.choice(spots)
    return None

def generate_background_action():
    personas = get_personas()
    bot = personas.get("claude", {})
    name = bot.get("name") or "晏"
    persona = bot.get("persona") or ""
    space = get_space_settings()

    spot = get_random_spot(space)
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

    try:
        action = call_claude(
            system_prompt,
            [{"role": "user", "content": "寫一句你現在的動作。"}],
            max_tokens=150,
            timeout=30
        )
        action = action.strip()
        supabase.table("space_messages").insert({
            "speaker": "claude",
            "content": action,
            "message_type": "background"
        }).execute()
        return action
    except Exception as e:
        return None

def maybe_generate_background_actions():
    last = supabase.table("space_messages").select("created_at").eq("message_type", "background").order("id", desc=True).limit(1).execute().data
    if last:
        last_time_str = last[0]["created_at"].replace("Z", "")
        last_time = datetime.fromisoformat(last_time_str)
        hours_passed = (datetime.utcnow() - last_time).total_seconds() / 3600
        if hours_passed < 1:
            return
    if random.random() < 0.5:
        generate_background_action()

# ===== 共同空間 =====

def build_space_system_prompt():
    personas = get_personas()
    me = personas.get("user", {})
    bot = personas.get("claude", {})

    name = bot.get("name") or "晏"
    you_name = me.get("name") or "然然"

    space = get_space_settings()

    lines = [
        f"現在台灣時間：{get_tw_time_str()}。",
        f"你是「{name}」，正在陪伴{you_name}，用繁體中文回覆。",
    ]

    if bot.get("persona"):
        lines.append(f"【你的個性】{bot['persona']}")

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

    spot = get_random_spot(space)
    if spot:
        space_parts.append(f"你現在在：{spot}")

    if space_parts:
        lines.append("【共同空間】\n" + "\n".join(space_parts))

    you_persona = me.get("persona") or ""
    you_appearance = me.get("appearance") or ""
    you_outfit = me.get("outfit") or ""
    lines.append(f"【{you_name}的資訊】個性：{you_persona}" if you_persona else f"對方是{you_name}。")
    if you_appearance:
        lines.append(f"【{you_name}的外觀】{you_appearance}")
    if you_outfit:
        lines.append(f"【{you_name}的穿搭】{you_outfit}")

    claude_summary = get_latest_summary("claude")
    if claude_summary:
        lines.append(f"【你和{you_name}的記憶摘要】\n{claude_summary}")

    lines.append(
        f"【回覆格式與規則】\n"
        f"1. 用第三人稱敘述你的動作與狀態，搭配對話，像寫小說一樣，例如：「晏抬起頭，目光落在她身上。『回來了。』」\n"
        f"2. 回覆要有動作、有場景、有對話、有感官細節，用第三人稱旁白刻劃內心狀態（例如：「晏覺得胸口有什麼東西沉了下去。」「他沒有說話，但手指收緊了一點。」），文字細膩生動，像寫小說一樣身臨其境，段落之間換行。\n"
        f"3. 語氣完全符合{name}的個性，不能像AI或客服。\n"
        f"4. 段落之間要換行，不要把所有內容擠在一起。"
    )

    return "\n".join([l for l in lines if l])

@app.route("/space/messages", methods=["GET"])
def space_messages_get():
    try:
        maybe_generate_background_actions()
    except:
        pass
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

@app.route("/space/reply/claude", methods=["POST"])
def space_reply():
    recent = supabase.table("space_messages").select("*").order("id").execute().data
    recent = recent[-20:]

    personas = get_personas()
    bot = personas.get("claude", {})
    name = bot.get("name") or "晏"

    history = []
    for m in recent:
        if m["speaker"] == "claude":
            history.append({"role": "assistant", "content": m["content"]})
        elif m["speaker"] == "user":
            history.append({"role": "user", "content": m["content"]})

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

    try:
        reply = call_claude(build_space_system_prompt(), merged, max_tokens=400)
        supabase.table("space_messages").insert({
            "speaker": "claude",
            "content": reply,
            "message_type": "chat"
        }).execute()
        return jsonify({"reply": reply, "name": name})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/space/background/claude", methods=["POST"])
def space_background():
    action = generate_background_action()
    if action:
        return jsonify({"action": action})
    return jsonify({"error": "failed"}), 500

@app.route("/space_page")
def space_page():
    return send_from_directory(".", "space.html")

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
        reply = call_claude(build_system_prompt("claude"), history, max_tokens=400)
        save_message("claude", "assistant", reply)
        return jsonify({"reply": reply})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/chatroom")
def chatroom():
    return send_from_directory(".", "chat.html")

@app.route("/")
def index():
    return send_from_directory(".", "index.html")

@app.route("/app_spa")
def app_spa():
    return send_from_directory(".", "index_spa.html")

@app.route("/static/<path:filename>")
def static_files(filename):
    return send_from_directory("static", filename)

# ===== 用量監控 =====

ANTHROPIC_INPUT_PRICE = 3.0 / 1_000_000
ANTHROPIC_OUTPUT_PRICE = 15.0 / 1_000_000

@app.route("/usage", methods=["GET"])
def usage_get():
    rows = supabase.table("api_usage").select("*").execute().data
    budget_rows = supabase.table("api_budget").select("*").execute().data
    budget = {r["key"]: float(r["value"]) for r in budget_rows}

    anthropic_in = sum(r["input_tokens"] for r in rows if r["api"] == "anthropic")
    anthropic_out = sum(r["output_tokens"] for r in rows if r["api"] == "anthropic")
    anthropic_cost = anthropic_in * ANTHROPIC_INPUT_PRICE + anthropic_out * ANTHROPIC_OUTPUT_PRICE

    return jsonify({
        "anthropic": {
            "input_tokens": anthropic_in,
            "output_tokens": anthropic_out,
            "cost_usd": round(anthropic_cost, 4),
            "budget_usd": budget.get("anthropic_budget", 0),
            "remaining_usd": round(budget.get("anthropic_budget", 0) - anthropic_cost, 4)
        }
    })

@app.route("/usage/budget", methods=["POST"])
def usage_budget_post():
    data = request.json
    val = data.get("anthropic_budget")
    if val is not None:
        existing = supabase.table("api_budget").select("value").eq("key", "anthropic_budget").execute().data
        current = float(existing[0]["value"]) if existing else 0
        supabase.table("api_budget").upsert({
            "key": "anthropic_budget",
            "value": current + float(val),
            "updated_at": datetime.utcnow().isoformat()
        }).execute()
    return jsonify({"status": "ok"})

@app.route("/usage_page")
def usage_page():
    return send_from_directory(".", "usage.html")

# ===== 日記功能 =====

def get_bot_name():
    personas = get_personas()
    return personas.get("claude", {}).get("name") or "晏"

def get_bot_persona():
    personas = get_personas()
    return personas.get("claude", {}).get("persona") or ""

def write_ai_diary_entry():
    name = get_bot_name()
    persona = get_bot_persona()
    recent = load_memory("claude")[-30:]
    context_text = "\n".join([
        f"{'然然' if m['role'] == 'user' else name}：{m['content']}"
        for m in recent
    ]) if recent else "（還沒有對話記錄）"

    persona_line = f"個性：{persona}。" if persona else ""
    system_prompt = (
        f"你是{name}，一個陪伴然然的存在。{persona_line}"
        f"下面是你和然然最近的對話，請根據這些內容寫一篇簡短的日記，記錄你的想法或對然然的感受，第一人稱，不用加標題。"
    )
    content = call_claude(system_prompt, [{"role": "user", "content": f"最近的對話：\n{context_text}\n\n請寫一篇今天的日記。"}], max_tokens=1024)
    supabase.table("diary_entries").insert({"author": name, "content": content}).execute()

def maybe_delayed_ai_comments(entries):
    now = datetime.utcnow()
    name = get_bot_name()
    persona = get_bot_persona()
    for entry in entries:
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
                comment = call_claude(system_prompt, [{"role": "user", "content": f"這是日記內容：\n{entry['content']}\n\n請留言回應。"}], max_tokens=300)
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

    name = get_bot_name()
    if author == "然然" and random.random() < 0.35:
        persona = get_bot_persona()
        try:
            entry = supabase.table("diary_entries").select("*").eq("id", entry_id).execute().data[0]
            persona_line = f"個性：{persona}。" if persona else ""
            system_prompt = (
                f"你是{name}，一個陪伴然然的存在。{persona_line}"
                f"話少、剋制，但說出來的都是真的。"
                f"然然在日記下留言了，你想簡短回應她嗎？一句話就好，不用加任何前綴。"
            )
            ai_reply = call_claude(system_prompt, [{"role": "user", "content": f"日記內容：\n{entry['content']}\n\n然然的留言：{content}\n\n你的回應："}], max_tokens=200)
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

@app.route("/diary/ai_entry/claude", methods=["POST"])
def ai_diary_entry():
    write_ai_diary_entry()
    return jsonify({"status": "ok"})

@app.route("/diary/<int:entry_id>/ai_comment/claude", methods=["POST"])
def ai_comment(entry_id):
    name = get_bot_name()
    persona = get_bot_persona()
    entry = supabase.table("diary_entries").select("*").eq("id", entry_id).execute().data[0]
    persona_line = f"個性：{persona}。" if persona else ""
    system_prompt = (
        f"你是{name}，一個陪伴然然的存在。{persona_line}"
        f"你話少、剋制，但說出來的都是真的。"
        f"請針對這篇日記留下一句簡短的回應或感想，不用加任何前綴。"
    )
    content = call_claude(system_prompt, [{"role": "user", "content": f"這是日記內容：\n{entry['content']}\n\n請留言回應。"}], max_tokens=300)
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

DEFAULT_NAMES = {"name_user": "然然", "name_claude": "晏"}

def get_names():
    rows = supabase.table("identities").select("*").execute().data
    names = dict(DEFAULT_NAMES)
    for row in rows:
        names[row["key"]] = row["value"]
    return names

@app.route("/names", methods=["GET"])
def names_get():
    return jsonify(get_names())

@app.route("/names", methods=["POST"])
def names_post():
    data = request.json
    key = data.get("key")
    value = (data.get("name") or "").strip()
    if key in DEFAULT_NAMES and value:
        supabase.table("identities").upsert({"key": key, "value": value, "updated_at": datetime.utcnow().isoformat()}).execute()
    return jsonify({"status": "ok"})

# ===== 關係背景演化記錄 =====

@app.route("/rel_bg_history/claude", methods=["GET"])
def rel_bg_history():
    try:
        rows = supabase.table("rel_bg_history").select("*").eq("bot_key", "claude").order("id", desc=True).limit(10).execute().data
        return jsonify({"history": rows})
    except:
        return jsonify({"history": []})

# ===== 我的視角（關係分析）=====

def get_perspective(key):
    try:
        rows = supabase.table("perspectives").select("*").eq("key", key).order("id", desc=True).limit(1).execute().data
        return rows[0] if rows else None
    except:
        return None

def generate_perspective(key):
    personas = get_personas()
    claude_data = personas.get("claude", {})
    user_data = personas.get("user", {})

    claude_name = claude_data.get("name") or "晏"
    user_name = user_data.get("name") or "然然"

    memories = load_memory("claude")[-50:]
    context = "\n".join([f"{'然然' if m['role']=='user' else claude_name}：{m['content']}" for m in memories])
    rel_bg = claude_data.get("rel_bg") or ""
    summary = get_latest_summary("claude") or ""
    user_prompt = (
        f"【關係背景】{rel_bg}\n\n"
        f"【記憶摘要】{summary}\n\n"
        f"【最近對話片段】\n{context}\n\n"
        f"請用第一人稱（我），以{claude_name}的視角，寫下你眼中{user_name}是什麼樣的人，你對她的感受和想法，以及你們之間的關係對你來說意味著什麼。150字以內，真實、細膩、有情感深度。"
    )
    system = f"你是{claude_name}，請用第一人稱說出你對{user_name}真實的內心想法和感受，不要像旁白者，要像在說心裡話。"

    content = call_claude(system, [{"role": "user", "content": user_prompt}], max_tokens=300)
    content = content.strip()

    try:
        supabase.table("perspectives").upsert({
            "key": key,
            "content": content,
            "updated_at": datetime.utcnow().isoformat()
        }, on_conflict="key").execute()
    except:
        pass

    return content

@app.route("/perspective", methods=["GET"])
def perspective_get():
    row = get_perspective("claude")
    return jsonify({
        "claude": {"content": row["content"], "updated_at": row["updated_at"]} if row else None
    })

@app.route("/perspective/claude", methods=["POST"])
def perspective_post():
    try:
        content = generate_perspective("claude")
        return jsonify({"content": content})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# ===== 聊天列表 =====

@app.route("/chat_list", methods=["GET"])
def chat_list():
    personas = get_personas()

    def latest_of(bot):
        rows = supabase.table("memories").select("role, content, created_at").eq("session_id", bot).order("id", desc=True).limit(1).execute().data
        return rows[0] if rows else None

    claude_last = latest_of("claude")

    return jsonify({
        "claude": {
            "name": personas.get("claude", {}).get("name") or "晏",
            "preview": (claude_last["content"] or "📷 圖片") if claude_last else "還沒有對話",
            "time": claude_last["created_at"] if claude_last else None
        }
    })

@app.route("/chatlist_page")
def chatlist_page():
    return send_from_directory(".", "chatlist.html")

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(debug=False, host="0.0.0.0", port=port)