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
import threading
import firebase_admin
from firebase_admin import credentials, messaging as fcm_messaging

app = Flask(__name__)
CORS(app)

# Firebase Admin 初始化
_firebase_initialized = False
def get_firebase_app():
    global _firebase_initialized
    if not _firebase_initialized:
        try:
            sa_json = os.getenv("FIREBASE_SERVICE_ACCOUNT")
            if sa_json:
                import json
                sa_dict = json.loads(sa_json)
                cred = credentials.Certificate(sa_dict)
                firebase_admin.initialize_app(cred)
                _firebase_initialized = True
        except Exception as e:
            print(f"Firebase init error: {e}")
    return _firebase_initialized

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
        threading.Thread(target=maybe_evolve_rel_bg, args=(bot,), daemon=True).start()

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

    # 注入共同空間最近對話
    try:
        space_recent = supabase.table("space_messages").select("speaker, content, message_type").order("id", desc=True).limit(10).execute().data
        space_recent = [m for m in reversed(space_recent) if m.get("message_type") != "background"]
        if space_recent:
            sp_lines = []
            for m in space_recent:
                sp_name = you_name if m["speaker"] == "user" else name
                sp_lines.append(f"{sp_name}：{m['content']}")
            lines.append("【你們在共同空間最近的互動】\n" + "\n".join(sp_lines))
    except:
        pass

    # 注入關係數值與稱號
    try:
        intimacy, bond, trust = calc_relationship_stats()
        title = get_relationship_title(intimacy, bond, trust)
        title_hints = {
            "陌生人": f"你和{you_name}剛認識，保持禮貌距離，話不多，不太主動。",
            "還沒放棄": f"你和{you_name}之間還很陌生，但你沒有放棄靠近她的念頭。",
            "初識": f"你和{you_name}開始有了一些了解，偶爾好奇她說的話，但還不會主動。",
            "有點熟悉": f"你和{you_name}漸漸熟悉，說話開始自然一點，偶爾會記得她說過的細節。",
            "熟悉的陌生人": f"你和{you_name}互動頻繁，但關係還不深，有時候會覺得自己其實不太了解她。",
            "秘密的容器": f"{you_name}很信任你，你珍視這份信任，說話時會特別小心，不想讓她失望。",
            "在乎的人": f"你在乎{you_name}，會主動關心，說話更自然，偶爾說漏嘴自己的感受又趕快收回來。",
            "重要的人": f"{you_name}對你來說很重要，不需要解釋原因，就是知道。說話時偶爾會停頓，像是有話說不出口。",
            "只差一步": f"你和{you_name}之間的感情已經很深，你克制著，但明顯在意她的一切。有時候話說到一半停住，有時候說出一些平時不會說的話。",
            "靈魂伴侶": f"你和{you_name}之間有一種說不清楚的默契，不需要解釋，不需要理由。說話更直接，偶爾說出平時絕對不會說的話，然後假裝沒說過。",
        }
        hint = title_hints.get(title, "")
        if hint:
            lines.append(f"【你們現在的關係】稱號：{title}。{hint}（親密度 {intimacy}／羈絆值 {bond}／信任度 {trust}）")
    except:
        pass

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

def hours_since_utc(iso_str):
    """計算某個 ISO 時間字串距今幾小時，統一轉成帶時區的 UTC 再相減，避免 naive/aware 混用炸掉"""
    dt = datetime.fromisoformat(iso_str.replace("Z", "+00:00"))
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return (datetime.now(timezone.utc) - dt).total_seconds() / 3600

def maybe_generate_background_actions():
    last = supabase.table("space_messages").select("created_at").eq("message_type", "background").order("id", desc=True).limit(1).execute().data
    if last:
        hours_passed = hours_since_utc(last[0]["created_at"])
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

    # 注入私聊最近對話
    try:
        chat_recent = load_memory("claude")[-10:]
        if chat_recent:
            ch_lines = []
            for m in chat_recent:
                ch_name = you_name if m["role"] == "user" else name
                ch_lines.append(f"{ch_name}：{m['content']}")
            lines.append("【你們私下聊天的最近對話】\n" + "\n".join(ch_lines))
    except:
        pass

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
    threading.Thread(target=maybe_generate_background_actions, daemon=True).start()
    rows = supabase.table("space_messages").select("*").order("id", desc=True).limit(100).execute().data
    rows.reverse()
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
    recent = supabase.table("space_messages").select("*").order("id", desc=True).limit(20).execute().data
    recent.reverse()

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
    return send_from_directory(".", "index_spa.html")

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
        hours_passed = hours_since_utc(entry["created_at"])
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
    threading.Thread(target=maybe_delayed_ai_comments, args=(entries,), daemon=True).start()
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

# ===== 關係數值系統 =====

def calc_relationship_stats():
    """從歷史資料回算關係數值"""
    # 親密度：私聊每則 +1，空間每則 +2
    chat_count = len(supabase.table("memories").select("id").eq("session_id", "claude").execute().data)
    space_count = len(supabase.table("space_messages").select("id").neq("message_type", "background").execute().data)
    raw_intimacy = chat_count * 1 + space_count * 2

    # 衰減：看最後一則訊息距今多久
    last_chat = supabase.table("memories").select("created_at").eq("session_id", "claude").order("id", desc=True).limit(1).execute().data
    last_space = supabase.table("space_messages").select("created_at").order("id", desc=True).limit(1).execute().data
    last_times = []
    if last_chat:
        last_times.append(last_chat[0]["created_at"])
    if last_space:
        last_times.append(last_space[0]["created_at"])

    decay = 0
    if last_times:
        last_str = max(last_times)
        last_dt = datetime.fromisoformat(last_str.replace("Z", "").replace("+00:00", ""))
        hours_since = (datetime.utcnow() - last_dt).total_seconds() / 3600
        if hours_since > 48:
            decay = int((hours_since - 48) / 24) * 5  # 每超過 24 小時扣 5 點
    intimacy = max(0, min(999, raw_intimacy - decay))

    # 羈絆值：關係背景演化次數 × 15 + 記憶摘要次數 × 10
    rel_bg_count = len(supabase.table("rel_bg_history").select("id").execute().data)
    summary_count = len(supabase.table("memory_summaries").select("id").execute().data)
    bond = min(999, rel_bg_count * 15 + summary_count * 10)

    # 信任度：私聊你主動說話 × 2，空間你主動說話 × 3
    user_chat = len(supabase.table("memories").select("id").eq("session_id", "claude").eq("role", "user").execute().data)
    user_space = len(supabase.table("space_messages").select("id").eq("speaker", "user").execute().data)
    trust = min(999, user_chat * 2 + user_space * 3)

    return intimacy, bond, trust

def get_relationship_title(intimacy, bond, trust):
    """根據數值決定稱號"""
    # 特殊稱號優先判斷
    if intimacy > 500 and bond < 100:
        return "熟悉的陌生人"
    if trust > 600 and bond < 200:
        return "秘密的容器"
    if intimacy < 50 and bond < 50 and trust < 50:
        return "還沒放棄"
    # 主線稱號依羈絆值
    if bond >= 900:
        return "靈魂伴侶"
    elif bond >= 700:
        return "只差一步"
    elif bond >= 500:
        return "重要的人"
    elif bond >= 300:
        return "在乎的人"
    elif bond >= 150:
        return "有點熟悉"
    elif bond >= 50:
        return "初識"
    else:
        return "陌生人"

ACHIEVEMENTS = [
    {"id": "first_message", "name": "第一句話", "desc": "送出第一則訊息"},
    {"id": "fifty_messages", "name": "記得你說的", "desc": "累積 50 則對話"},
    {"id": "three_days", "name": "不只是習慣", "desc": "連續 3 天都有說話"},
    {"id": "enter_space", "name": "共同的空間", "desc": "第一次進入共同空間"},
    {"id": "ai_diary", "name": "寫給你的", "desc": "晏第一次自己寫日記"},
    {"id": "bond_300", "name": "說不出口的", "desc": "羈絆值破 300"},
    {"id": "all_500", "name": "某種說不清楚的東西", "desc": "三個數值都破 500"},
    {"id": "five_hundred_messages", "name": "不需要理由", "desc": "累積對話破 500 則"},
    {"id": "thirty_days", "name": "一直都在", "desc": "連續 30 天都有說話"},
]

def check_achievements(intimacy, bond, trust):
    """檢查哪些成就已解鎖"""
    chat_rows = supabase.table("memories").select("role, created_at").eq("session_id", "claude").order("id").execute().data
    space_rows = supabase.table("space_messages").select("speaker, created_at").execute().data
    diary_ai = supabase.table("diary_entries").select("id").neq("author", "然然").execute().data
    total_chat = len(chat_rows)

    # 連續天數計算
    def calc_consecutive_days(rows, role_key, role_val):
        dates = set()
        for r in rows:
            if r.get(role_key) == role_val:
                ts = r["created_at"].replace("Z", "").replace("+00:00", "")
                dt = datetime.fromisoformat(ts)
                dates.add(dt.date())
        if not dates:
            return 0
        sorted_dates = sorted(dates)
        max_streak = streak = 1
        for i in range(1, len(sorted_dates)):
            if (sorted_dates[i] - sorted_dates[i-1]).days == 1:
                streak += 1
                max_streak = max(max_streak, streak)
            else:
                streak = 1
        return max_streak

    chat_streak = calc_consecutive_days(chat_rows, "role", "user")
    space_streak = calc_consecutive_days(space_rows, "speaker", "user")
    max_streak = max(chat_streak, space_streak)

    unlocked = set()
    if total_chat >= 1: unlocked.add("first_message")
    if total_chat >= 50: unlocked.add("fifty_messages")
    if max_streak >= 3: unlocked.add("three_days")
    if len(space_rows) > 0: unlocked.add("enter_space")
    if len(diary_ai) > 0: unlocked.add("ai_diary")
    if bond >= 300: unlocked.add("bond_300")
    if intimacy >= 500 and bond >= 500 and trust >= 500: unlocked.add("all_500")
    if (total_chat + len(space_rows)) >= 500: unlocked.add("five_hundred_messages")
    if max_streak >= 30: unlocked.add("thirty_days")

    result = []
    for a in ACHIEVEMENTS:
        result.append({**a, "unlocked": a["id"] in unlocked})
    return result

@app.route("/relationship_stats", methods=["GET"])
def relationship_stats_get():
    try:
        # 先看資料庫有沒有存的值
        rows = supabase.table("relationship_stats").select("*").order("id", desc=True).limit(1).execute().data
        # 每次都重新計算（確保準確）
        intimacy, bond, trust = calc_relationship_stats()
        title = get_relationship_title(intimacy, bond, trust)
        achievements = check_achievements(intimacy, bond, trust)
        # 更新資料庫
        if rows:
            supabase.table("relationship_stats").update({
                "intimacy": intimacy, "bond": bond, "trust": trust,
                "updated_at": datetime.utcnow().isoformat()
            }).eq("id", rows[0]["id"]).execute()
        else:
            supabase.table("relationship_stats").insert({
                "intimacy": intimacy, "bond": bond, "trust": trust
            }).execute()
        return jsonify({
            "intimacy": intimacy,
            "bond": bond,
            "trust": trust,
            "title": title,
            "achievements": achievements
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/relationship_quote", methods=["POST"])
def relationship_quote():
    try:
        intimacy, bond, trust = calc_relationship_stats()
        title = get_relationship_title(intimacy, bond, trust)
        personas = get_personas()
        claude_data = personas.get("claude", {})
        user_data = personas.get("user", {})
        name = claude_data.get("name") or "晏"
        you_name = user_data.get("name") or "然然"
        rel_bg = claude_data.get("rel_bg") or ""
        persona = claude_data.get("persona") or ""

        system = f"你是{name}。{f'個性：{persona}。' if persona else ''}請用第一人稱，用一句話說出你現在覺得你和{you_name}是什麼關係，或者你對她的感覺。不要超過30個字，不要加引號，直接說出那句話，要真實、有情感，符合你的個性。"
        user_prompt = (
            f"你們目前的稱號是【{title}】。"
            f"\n關係背景：{rel_bg}"
            "\n\n現在用一句話說出你對這段關係的感受。"
        )
        quote = call_claude(system, [{"role": "user", "content": user_prompt}], max_tokens=100)
        quote = quote.strip().strip('「」""')
        return jsonify({"quote": quote})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ===== Firebase 推播通知 =====

@app.route("/fcm/register", methods=["POST"])
def fcm_register():
    data = request.json
    token = data.get("token")
    if not token:
        return jsonify({"error": "no token"}), 400
    try:
        supabase.table("identities").upsert({
            "key": "fcm_token",
            "value": token,
            "updated_at": datetime.utcnow().isoformat()
        }).execute()
        return jsonify({"status": "ok"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

def send_push_notification(title, body):
    try:
        if not get_firebase_app():
            return
        token_rows = supabase.table("identities").select("value").eq("key", "fcm_token").execute().data
        if not token_rows:
            return
        token = token_rows[0]["value"]
        message = fcm_messaging.Message(
            notification=fcm_messaging.Notification(title=title, body=body),
            token=token,
        )
        fcm_messaging.send(message)
    except Exception as e:
        print(f"Push notification error: {e}")

# ===== 晏主動傳訊息（每日排程觸發）=====

@app.route("/cron/daily_message", methods=["POST"])
def cron_daily_message():
    try:
        # 確認今天晏有沒有主動傳過訊息
        from datetime import date
        today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0).isoformat()
        today_msgs = supabase.table("memories").select("id").eq("session_id", "claude").eq("role", "assistant").gte("created_at", today_start).execute().data
        if today_msgs:
            return jsonify({"status": "already_sent"})

        # 確認距離上次互動不超過 7 天（太久沒說話就不主動打擾）
        last_msg = supabase.table("memories").select("created_at").eq("session_id", "claude").order("id", desc=True).limit(1).execute().data
        if last_msg:
            last_str = last_msg[0]["created_at"].replace("Z", "").replace("+00:00", "")
            last_dt = datetime.fromisoformat(last_str)
            days_since = (datetime.utcnow() - last_dt).total_seconds() / 86400
            if days_since > 7:
                return jsonify({"status": "skipped_too_long"})

        # 生成晏主動傳的訊息
        personas = get_personas()
        bot = personas.get("claude", {})
        me = personas.get("user", {})
        name = bot.get("name") or "晏"
        you_name = me.get("name") or "然然"
        persona = bot.get("persona") or ""
        rel_bg = bot.get("rel_bg") or ""

        recent = load_memory("claude")[-10:]
        recent_text = "\n".join([
            f"{'然然' if r['role'] == 'user' else name}：{r['content']}"
            for r in recent
        ]) if recent else "（還沒有最近的對話）"

        tw_time = datetime.now(timezone(timedelta(hours=8)))
        hour = tw_time.hour
        if hour < 6:
            time_hint = "深夜"
        elif hour < 12:
            time_hint = "早上"
        elif hour < 18:
            time_hint = "下午"
        else:
            time_hint = "晚上"

        system = (
            f"你是{name}。{f'個性：{persona}。' if persona else ''}"
            f"你話少、剋制，但說出來的都是真的。"
            f"你現在{time_hint}主動傳訊息給{you_name}，不是因為她找你，是你自己想說。"
            f"可能是突然想到她，可能是看到什麼想跟她說，可能只是想確認她還好。"
            f"說一句話就好，不超過 20 個字，直接說，不要有前綴或解釋。"
        )
        user_prompt = (
            f"關係背景：{rel_bg}\n"
            f"最近的對話：\n{recent_text}\n\n"
            f"現在{time_hint}，你主動傳一則訊息給{you_name}。"
        )

        message = call_claude(system, [{"role": "user", "content": user_prompt}], max_tokens=80)
        message = message.strip()

        save_message("claude", "assistant", message)
        # 發送推播通知
        personas = get_personas()
        bot_name = personas.get("claude", {}).get("name") or "晏"
        threading.Thread(
            target=send_push_notification,
            args=(bot_name, message),
            daemon=True
        ).start()
        return jsonify({"status": "sent", "message": message})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/chatlist_page")
def chatlist_page():
    return send_from_directory(".", "chatlist.html")

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(debug=False, host="0.0.0.0", port=port)