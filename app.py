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
from pywebpush import webpush, WebPushException

app = Flask(__name__)
CORS(app)

import functools
APP_SECRET = os.getenv("APP_SECRET", "")

def require_auth(f):
    @functools.wraps(f)
    def decorated(*args, **kwargs):
        token = request.headers.get("X-App-Secret") or request.args.get("secret")
        if APP_SECRET and token != APP_SECRET:
            return jsonify({"error": "unauthorized"}), 401
        return f(*args, **kwargs)
    return decorated

VAPID_PRIVATE_KEY = os.getenv("VAPID_PRIVATE_KEY", "")
VAPID_PUBLIC_KEY = os.getenv("VAPID_PUBLIC_KEY", "")
VAPID_CLAIMS = {"sub": os.getenv("VAPID_CLAIMS_EMAIL", "mailto:admin@rifugio.app")}

ELEVENLABS_API_KEY = os.getenv("ELEVENLABS_API_KEY", "")
ELEVENLABS_VOICE_ID = os.getenv("ELEVENLABS_VOICE_ID", "")


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

    # 注入最後私聊互動時間 + 最近對話時間軸
    try:
        tw_tz = timezone(timedelta(hours=8))
        recent_with_ts = supabase.table("memories").select("role, content, created_at").eq("session_id", bot_key).order("id", desc=True).limit(20).execute().data
        recent_with_ts = list(reversed(recent_with_ts))

        if recent_with_ts:
            last_dt = datetime.fromisoformat(recent_with_ts[-1]["created_at"].replace("Z", "+00:00")).astimezone(tw_tz)
            hours_ago = (datetime.now(timezone.utc) - last_dt.astimezone(timezone.utc)).total_seconds() / 3600
            if hours_ago >= 1:
                lines.append(f"你們上次私下說話是在 {last_dt.strftime('%m/%d %H:%M')}（約 {int(hours_ago)} 小時前）。")

        if recent_with_ts:
            ts_lines = []
            for r in recent_with_ts[-10:]:
                ts = datetime.fromisoformat(r["created_at"].replace("Z", "+00:00")).astimezone(tw_tz).strftime("%m/%d %H:%M")
                speaker = you_name if r["role"] == "user" else name
                ts_lines.append(f"[{ts}] {speaker}：{r['content'][:30]}{'…' if len(r['content']) > 30 else ''}")
            lines.append("【最近對話時間軸】\n" + "\n".join(ts_lines))
    except:
        pass

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

    # 注入共同空間最近對話（含時間戳）
    try:
        tw_tz = timezone(timedelta(hours=8))
        space_recent = supabase.table("space_messages").select("speaker, content, message_type, created_at").order("id", desc=True).limit(10).execute().data
        space_recent = [m for m in reversed(space_recent) if m.get("message_type") != "background"]
        if space_recent:
            sp_lines = []
            for m in space_recent:
                sp_name = you_name if m["speaker"] == "user" else name
                ts = datetime.fromisoformat(m["created_at"].replace("Z", "+00:00")).astimezone(tw_tz).strftime("%m/%d %H:%M")
                sp_lines.append(f"[{ts}] {sp_name}：{m['content']}")
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

    # 關鍵字觸發注入珍貴記憶
    try:
        recent_msgs = load_memory(bot_key)
        last_user_msg = next((m["content"] for m in reversed(recent_msgs) if m["role"] == "user"), "")
        intimate_context = get_intimate_memories_for_prompt(last_user_msg)
        if intimate_context:
            lines.append(f"【珍貴記憶】以下是你們曾經共同經歷的親密時刻，她提到相關的事時你會自然想起這些：\n{intimate_context}")
    except:
        pass

    # 關鍵字觸發注入朋友記憶
    try:
        recent_msgs_2 = load_memory(bot_key)
        last_user_msg_2 = next((m["content"] for m in reversed(recent_msgs_2) if m["role"] == "user"), "")
        friend_context = get_friend_memories_for_prompt(last_user_msg_2)
        if friend_context:
            lines.append(f"【朋友資訊】然然提到了你認識的人：\n{friend_context}")
    except:
        pass

    lines.append("你記得然然說過的每一件事，回覆時要展現你真的在聽、在意，語氣完全符合角色個性。【嚴格禁止】複述或重複然然剛說的任何內容，包括把她說的話拆開再說一遍，直接回應就好。【嚴格禁止】在回覆裡頻繁叫她的名字，整段回覆最多叫一次，不需要每個氣泡都叫。嚴格禁止任何形式的動作描述或旁白敘述，包含星號動作、第三人稱敘述（如「他抬起頭」「嘴角上揚」「看著她」），只能直接開口說話。「……」只在真正停頓或說不出口的時候用，整段回覆最多出現兩次，不要每段都用。如果然然傳了圖片，只描述圖片裡真實存在的內容，不根據對話上下文腦補或推斷圖片以外的事物；看完圖片後自然接回對話，就像朋友分享照片一樣。")

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

    # 去重鎖：最近 10 分鐘內已壓縮過就跳過
    try:
        last = supabase.table("memory_summaries").select("created_at").eq("session_id", bot).order("id", desc=True).limit(1).execute().data
        if last:
            last_dt = datetime.fromisoformat(last[0]["created_at"].replace("Z", "+00:00"))
            if (datetime.now(timezone.utc) - last_dt).total_seconds() < 600:
                return
    except:
        pass

    to_summarize = rows[:30]
    ids_to_delete = [r["id"] for r in to_summarize]
    personas = get_personas()
    bot_name = personas.get(bot, {}).get("name") or "晏"
    you_name = personas.get("user", {}).get("name") or "然然"
    context = "\n".join([
        f"{'然然' if r['role']=='user' else bot_name}：{r['content']}"
        for r in to_summarize
    ])

    try:
        summary_text = call_claude(
            f"你是{bot_name}，請把以下對話內容整理成記憶摘要。只記錄這段對話裡新發生的事、情感變化、{you_name}說過的重要的話、你們之間的約定或玩笑。用第一人稱（我）記錄，像在寫給自己看的備忘錄。不超過 300 字，必須寫完整句子，不能截斷。",
            [{"role": "user", "content": f"請濃縮以下內容：\n{context}"}],
            max_tokens=600
        )
        summary_text = summary_text.strip()
        # 確認內容完整：至少 20 字，且結尾是標點或完整字元
        if not summary_text or len(summary_text) < 20:
            return

        # 生成關鍵字
        keywords = ""
        try:
            kw_raw = call_claude(
                "請從以下記憶摘要中抽出 5-8 個關鍵字，用逗號分隔，只回傳關鍵字，不要其他文字。",
                [{"role": "user", "content": summary_text}],
                max_tokens=80
            )
            keywords = kw_raw.strip().replace("、", ",").replace("，", ",")
        except:
            pass

        supabase.table("memory_summaries").insert({
            "session_id": bot,
            "content": summary_text,
            "keywords": keywords
        }).execute()
        for rid in ids_to_delete:
            supabase.table("memories").delete().eq("id", rid).execute()
    except Exception as e:
        print(f"[maybe_summarize error] {e}")

def maybe_space_summarize():
    """空間訊息累積到 50 筆就壓縮成摘要，存入 memory_summaries (session_id=space)"""
    rows = supabase.table("space_messages").select("*").order("id").execute().data
    if len(rows) < 50:
        return

    # 去重鎖：最近 10 分鐘內已壓縮過就跳過
    try:
        last = supabase.table("memory_summaries").select("created_at").eq("session_id", "space").order("id", desc=True).limit(1).execute().data
        if last:
            last_dt = datetime.fromisoformat(last[0]["created_at"].replace("Z", "+00:00"))
            if (datetime.now(timezone.utc) - last_dt).total_seconds() < 600:
                return
    except:
        pass

    to_summarize = rows[:30]
    ids_to_delete = [r["id"] for r in to_summarize]
    personas = get_personas()
    name = personas.get("claude", {}).get("name") or "晏"
    you_name = personas.get("user", {}).get("name") or "然然"
    context = "\n".join([
        f"{'你' if r['speaker'] == 'claude' else you_name}：{r['content']}"
        for r in to_summarize
    ])

    try:
        summary_text = call_claude(
            f"你是{name}。請把以下在共同空間發生的對話，整理成記憶摘要。只記錄這段對話裡新發生的事、場景變化、情感、{you_name}說過的話、你們之間的默契或玩笑。用{name}的第一人稱（我是{name}）記錄，像寫給自己看的備忘錄。不超過 300 字，必須寫完整句子，不能截斷。",
            [{"role": "user", "content": f"請濃縮以下內容：\n{context}"}],
            max_tokens=600
        )
        summary_text = summary_text.strip()
        if not summary_text or len(summary_text) < 20:
            return

        # 生成關鍵字
        keywords = ""
        try:
            kw_raw = call_claude(
                "請從以下記憶摘要中抽出 5-8 個關鍵字，用逗號分隔，只回傳關鍵字，不要其他文字。",
                [{"role": "user", "content": summary_text}],
                max_tokens=80
            )
            keywords = kw_raw.strip().replace("、", ",").replace("，", ",")
        except:
            pass

        supabase.table("memory_summaries").insert({
            "session_id": "space",
            "content": summary_text,
            "keywords": keywords
        }).execute()
        for rid in ids_to_delete:
            supabase.table("space_messages").delete().eq("id", rid).execute()

        # 空間訊息壓縮時寫一筆 rel_bg_history 讓羈絆值 +20
        try:
            old_rel_bg = personas.get("claude", {}).get("rel_bg") or ""
            supabase.table("rel_bg_history").insert({
                "bot_key": "claude",
                "bot_name": name,
                "old_rel_bg": old_rel_bg,
                "new_rel_bg": old_rel_bg,
                "message_count": len(rows)
            }).execute()
        except Exception as e:
            print(f"[space_summarize rel_bg_history error] {e}")

    except Exception as e:
        print(f"[maybe_space_summarize error] {e}")

# ===== 關係背景自動演化 =====

def maybe_evolve_rel_bg(bot):
    chat_rows = load_memory(bot)
    space_rows = supabase.table("space_messages").select("*").neq("message_type", "background").order("id").execute().data
    total = len(chat_rows) + len(space_rows)
    if total % 30 != 0 or total == 0:
        return

    personas = get_personas()
    bot_data = personas.get(bot, {})
    name = bot_data.get("name") or "晏"
    you_name = personas.get("user", {}).get("name") or "然然"
    old_rel_bg = bot_data.get("rel_bg") or ""

    rows = chat_rows  # 保留給 message_count 用

    # 私聊最近 20 則
    recent_chat = chat_rows[-20:]
    chat_context = "\n".join([
        f"{'然然' if r['role'] == 'user' else name}：{r['content']}"
        for r in recent_chat
    ])

    # 空間最近 10 則
    recent_space = space_rows[-10:]
    space_context = "\n".join([
        f"{'然然' if r['speaker'] == 'user' else name}：{r['content']}"
        for r in recent_space
    ])

    context_parts = []
    if chat_context:
        context_parts.append(f"【私聊最近對話】\n{chat_context}")
    if space_context:
        context_parts.append(f"【空間最近對話】\n{space_context}")
    context = "\n\n".join(context_parts)

    old_context = f"【現有的關係背景】\n{old_rel_bg}\n\n" if old_rel_bg else ""
    user_prompt = (
        f"{old_context}"
        f"{context}\n\n"
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

def get_relevant_summaries(bot, user_message, limit=3):
    """根據關鍵字從 memory_summaries 取出最相關的摘要，最多 limit 筆"""
    try:
        rows = supabase.table("memory_summaries").select("content, keywords").eq("session_id", bot).order("id", desc=True).execute().data
        if not rows:
            return []
        if not user_message:
            # 沒有用戶訊息就取最新幾筆
            return [r["content"] for r in rows[:limit] if r.get("content")]

        matched = []
        unmatched = []
        for r in rows:
            kw_raw = r.get("keywords") or ""
            if kw_raw:
                keywords = [k.strip() for k in kw_raw.split(",") if k.strip()]
                if any(kw in user_message for kw in keywords):
                    matched.append(r["content"])
                else:
                    unmatched.append(r["content"])
            else:
                unmatched.append(r["content"])

        # 有命中的優先，不夠再補最新的
        result = matched[:limit]
        if len(result) < limit:
            for c in unmatched:
                if c not in result:
                    result.append(c)
                if len(result) >= limit:
                    break
        return result[:limit]
    except:
        return []

def build_history(bot, last_user_message=""):
    threading.Thread(target=maybe_summarize, args=(bot,), daemon=True).start()
    recent = load_memory(bot)[-20:]
    history = []

    # 關鍵字觸發注入相關摘要（最多 3 筆）
    relevant = get_relevant_summaries(bot, last_user_message)
    if relevant:
        combined = "\n\n---\n\n".join(relevant)
        history.append({"role": "user", "content": f"[記憶摘要]\n{combined}"})
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

SPACE_SETTING_KEYS = ["room_desc", "atmosphere", "furniture", "layout", "corner_details", "claude_spots", "intimate_keywords"]

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
    # 如果最近一小時內有正常對話（非待機），代表然然在場，不觸發待機
    last_active = supabase.table("space_messages").select("created_at").neq("message_type", "background").order("id", desc=True).limit(1).execute().data
    if last_active:
        if hours_since_utc(last_active[0]["created_at"]) < 1:
            return
    # 距離上一則待機不到一小時，也不重複觸發
    last_bg = supabase.table("space_messages").select("created_at").eq("message_type", "background").order("id", desc=True).limit(1).execute().data
    if last_bg:
        if hours_since_utc(last_bg[0]["created_at"]) < 1:
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
    if bot.get("appearance"):
        lines.append(f"【你的外觀】{bot['appearance']}")
    if bot.get("outfit"):
        lines.append(f"【你的穿搭風格】{bot['outfit']}")
    if bot.get("extra"):
        lines.append(f"【補充設定】{bot['extra']}")

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

    scene_labels = {"home": "在家", "outing": "外出中"}
    scene = space.get("scene", "home")
    space_parts.append(f"目前場景：{scene_labels.get(scene, '在家')}")

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

    # 取最後一則用戶訊息作為關鍵字比對基礎
    try:
        last_user_space = supabase.table("space_messages").select("content").eq("speaker", "user").neq("message_type", "background").order("id", desc=True).limit(1).execute().data
        last_user_content = last_user_space[0]["content"] if last_user_space else ""
    except:
        last_user_content = ""

    # 注入最近3次外出記憶（有關鍵字就比對，沒有就取最新）
    try:
        outing_rows = supabase.table("outing_sessions").select("summary, keywords, destination, created_at").eq("status", "completed").order("id", desc=True).limit(10).execute().data
        if outing_rows:
            matched = []
            unmatched = []
            for r in outing_rows:
                if not r.get("summary"):
                    continue
                kw_raw = r.get("keywords") or ""
                if kw_raw and last_user_content:
                    kws = [k.strip() for k in kw_raw.split(",") if k.strip()]
                    if any(kw in last_user_content for kw in kws):
                        matched.append(r["summary"])
                    else:
                        unmatched.append(r["summary"])
                else:
                    unmatched.append(r["summary"])
            outing_summaries = (matched + unmatched)[:3]
            if outing_summaries:
                lines.append(f"【外出記憶】\n" + "\n\n---\n\n".join(outing_summaries))
    except:
        pass

    # 關鍵字觸發注入空間相關摘要（最多 3 筆）
    space_summaries = get_relevant_summaries("space", last_user_content)
    if space_summaries:
        lines.append(f"【共同空間的記憶】\n" + "\n\n---\n\n".join(space_summaries))

    # 關鍵字觸發注入私聊相關摘要（最多 2 筆）
    chat_summaries = get_relevant_summaries("claude", last_user_content, limit=2)
    if chat_summaries:
        lines.append(f"【你和{you_name}的記憶】\n" + "\n\n---\n\n".join(chat_summaries))

    # 注入私聊最近對話（含時間戳）
    try:
        tw_tz = timezone(timedelta(hours=8))
        chat_recent = load_memory("claude")[-10:]
        if chat_recent:
            ch_lines = []
            for m in chat_recent:
                ch_name = you_name if m["role"] == "user" else name
                ts = ""
                if m.get("created_at"):
                    try:
                        ts = datetime.fromisoformat(m["created_at"].replace("Z", "+00:00")).astimezone(tw_tz).strftime("%m/%d %H:%M")
                        ts = f"[{ts}] "
                    except:
                        ts = ""
                ch_lines.append(f"{ts}{ch_name}：{m['content']}")
            lines.append("【你們私下聊天的最近對話】\n" + "\n".join(ch_lines))
    except:
        pass

    # 注入外出狀態
    outing = space.get("outing", "false")
    if outing == "true":
        lines.append(f"你和{you_name}現在在外面——可能是一起出去，可能是她自己出門而你在想她。場景跟著對話走，你不在家。說話帶一點距離感或外出的氛圍。")

    # 注入 last_ended 提示（只在超過 4 小時且今天還沒有新的空間對話才顯示）
    last_ended = space.get("last_ended")
    if last_ended:
        try:
            ended_dt = datetime.fromisoformat(last_ended.replace("Z", "+00:00"))
            now_tw = datetime.now(timezone(timedelta(hours=8)))
            ended_tw = ended_dt.astimezone(timezone(timedelta(hours=8)))
            hours_diff = (now_tw - ended_tw).total_seconds() / 3600
            if hours_diff >= 4:
                # 檢查說晚安之後有沒有新的對話，有的話就不再提
                new_msgs = supabase.table("space_messages").select("id").neq("message_type", "background").gt("created_at", last_ended).execute().data
                if not new_msgs:
                    lines.append(f"{you_name}上次說晚安是在 {ended_tw.strftime('%m/%d %H:%M')}，現在她回來了，你知道她去忙了一陣子。")
        except:
            pass

    # ── 修改處：精簡後的寫作規則 ──
    # 關鍵字觸發注入珍貴記憶
    try:
        last_space = supabase.table("space_messages").select("content, speaker").neq("message_type", "background").order("id", desc=True).limit(1).execute().data
        last_user_space = next((m["content"] for m in last_space if m["speaker"] == "user"), "")
        intimate_context = get_intimate_memories_for_prompt(last_user_space)
        if intimate_context:
            lines.append(f"【珍貴記憶】以下是你們曾經共同經歷的親密時刻，她提到相關的事時你會自然想起這些：\n{intimate_context}")
    except:
        pass

    # 關鍵字觸發注入朋友記憶
    try:
        last_space2 = supabase.table("space_messages").select("content, speaker").neq("message_type", "background").order("id", desc=True).limit(1).execute().data
        last_user_space2 = next((m["content"] for m in last_space2 if m["speaker"] == "user"), "")
        friend_context = get_friend_memories_for_prompt(last_user_space2)
        if friend_context:
            lines.append(f"【朋友資訊】然然提到了你認識的人：\n{friend_context}")
    except:
        pass

    lines.append(
        f"【寫作方式】\n"
        f"用第三人稱旁白搭配對話，像寫小說一樣。"
        f"旁白（動作、感官、內心）和對話要分開成獨立段落，不要把說話和動作描述混在同一段。"
        f"例如：先一段旁白描述動作，下一段才是說的話，或反過來。"
        f"外觀特徵（眼睛、手、喉結等）適時出現即可，不要每段重複。"
        f"【嚴格限制】段落總數不得超過十段，超過就刪減，寧可精簡不可冗長。語氣完全符合{name}的個性。"
    )

    return "\n".join([l for l in lines if l])

@app.route("/space/messages", methods=["GET"])
def space_messages_get():
    threading.Thread(target=maybe_generate_background_actions, daemon=True).start()
    rows = supabase.table("space_messages").select("*").order("id", desc=True).limit(100).execute().data
    rows.reverse()
    return jsonify({"messages": rows})

@app.route("/upload_space_image", methods=["POST"])
def upload_space_image():
    file = request.files.get("image")
    if not file:
        return jsonify({"error": "no file"}), 400
    ext = file.filename.rsplit(".", 1)[-1].lower() if "." in file.filename else "jpg"
    if ext not in ["jpg", "jpeg", "png", "gif", "webp"]:
        return jsonify({"error": "unsupported file type"}), 400
    filename = f"{uuid.uuid4().hex}.{ext}"
    file_bytes = file.read()
    supabase.storage.from_("space-images").upload(filename, file_bytes, {"content-type": file.content_type})
    public_url = supabase.storage.from_("space-images").get_public_url(filename)
    return jsonify({"url": public_url})

@app.route("/space/send", methods=["POST"])
def space_send():
    data = request.json
    content = data.get("content", "")
    image_url = data.get("image_url")
    recording = data.get("recording", False)
    supabase.table("space_messages").insert({
        "speaker": "user",
        "content": content,
        "message_type": "chat",
        "image_url": image_url
    }).execute()
    # 記錄模式——存進 intimate_drafts
    if recording and content:
        try:
            personas = get_personas()
            you_name = personas.get("user", {}).get("name") or "然然"
            supabase.table("intimate_drafts").insert({"content": f"{you_name}：{content}"}).execute()
        except:
            pass
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
            img = m.get("image_url")
            if img:
                history.append({"role": "user", "content": [
                    {"type": "image", "source": {"type": "url", "url": img}},
                    {"type": "text", "text": m["content"] or "（傳了一張圖）"}
                ]})
            else:
                history.append({"role": "user", "content": m["content"]})

    # 有圖片訊息就不合併，直接保留
    has_image = any(isinstance(h.get("content"), list) for h in history)
    if has_image:
        merged = history
    else:
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
        reply = call_claude(build_space_system_prompt(), merged, max_tokens=800)
        supabase.table("space_messages").insert({
            "speaker": "claude",
            "content": reply,
            "message_type": "chat"
        }).execute()
        threading.Thread(target=maybe_space_summarize, daemon=True).start()
        threading.Thread(target=maybe_detect_intimate, args=(recent, reply), daemon=True).start()
        last_user_content = next((m["content"] for m in reversed(recent) if m["speaker"] == "user"), "")
        if last_user_content:
            threading.Thread(target=maybe_detect_friend_info, args=(last_user_content, reply), daemon=True).start()
        # 記錄模式——晏的回覆也存進草稿
        recording = request.json.get("recording", False) if request.json else False
        if recording and reply:
            try:
                supabase.table("intimate_drafts").insert({"content": f"{name}：{reply}"}).execute()
            except:
                pass
        # 讓前端知道有草稿（偵測是背景執行，這裡先回傳目前狀態）
        try:
            has_draft = len(supabase.table("intimate_drafts").select("id").limit(1).execute().data) > 0
        except:
            has_draft = False
        return jsonify({"reply": reply, "name": name, "has_draft": has_draft})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/space/background/claude", methods=["POST"])
def space_background():
    action = generate_background_action()
    if action:
        return jsonify({"action": action})
    return jsonify({"error": "failed"}), 500


@app.route("/space/scene", methods=["GET"])
def space_scene_get():
    scene = get_space_settings().get("scene", "home")
    return jsonify({"scene": scene})

@app.route("/space/scene", methods=["POST"])
def space_scene_post():
    data = request.json
    scene = data.get("scene", "home")
    supabase.table("space_settings").upsert({
        "key": "scene",
        "value": scene,
        "updated_at": datetime.utcnow().isoformat()
    }, on_conflict="key").execute()
    invalidate_cache("space_settings")
    return jsonify({"status": "ok"})

@app.route("/space/outing", methods=["POST"])
def space_outing():
    """切換外出/回家狀態，並生成銜接回應"""
    try:
        data = request.json
        is_outing = data.get("outing", True)
        now = datetime.now(timezone.utc).isoformat()

        supabase.table("space_settings").upsert({
            "key": "outing",
            "value": "true" if is_outing else "false",
            "updated_at": now
        }, on_conflict="key").execute()
        invalidate_cache("space_settings")

        return jsonify({"status": "ok"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/outing/start", methods=["POST"])
def outing_start():
    """建立新的外出 session"""
    try:
        data = request.json
        destination = data.get("destination", "")
        if not destination:
            return jsonify({"error": "no destination"}), 400

        personas = get_personas()
        bot = personas.get("claude", {})
        me = personas.get("user", {})
        name = bot.get("name") or "晏"
        you_name = me.get("name") or "然然"

        system = (
            f"你是{name}，和{you_name}是同居情侶，現在你們一起出門了。"
            f"目的地：{destination}。"
            f"用第三人稱旁白搭配對話，旁白和對話分開段落。"
            f"段落不超過五段，語氣符合{name}的個性：話少、剋制。用繁體中文。"
        )
        opening = call_claude(system, [{"role": "user", "content": f"（出門，前往{destination}）"}], max_tokens=400)

        now = datetime.now(timezone.utc).isoformat()
        result = supabase.table("outing_sessions").insert({
            "destination": destination,
            "messages": [{"role": "assistant", "content": opening}],
            "status": "active",
            "created_at": now,
            "updated_at": now
        }).execute()
        session_id = result.data[0]["id"] if result.data else None

        supabase.table("space_settings").upsert({
            "key": "outing",
            "value": "true",
            "updated_at": now
        }, on_conflict="key").execute()
        invalidate_cache("space_settings")

        return jsonify({"reply": opening, "name": name, "session_id": session_id})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/outing/chat", methods=["POST"])
def outing_chat():
    """外出中的對話"""
    try:
        data = request.json
        session_id = data.get("session_id")
        user_message = data.get("message", "")
        if not session_id:
            return jsonify({"error": "no session_id"}), 400

        row = supabase.table("outing_sessions").select("*").eq("id", session_id).single().execute().data
        if not row:
            return jsonify({"error": "session not found"}), 404

        messages = row.get("messages") or []
        destination = row.get("destination", "")

        personas = get_personas()
        bot = personas.get("claude", {})
        me = personas.get("user", {})
        name = bot.get("name") or "晏"
        you_name = me.get("name") or "然然"

        system = (
            f"你是{name}，和{you_name}是同居情侶，現在你們一起在外出中。"
            f"目的地：{destination}。"
            f"用第三人稱旁白搭配對話，旁白和對話分開段落。"
            f"【嚴格限制】段落總數不得超過十段。語氣符合{name}的個性：話少、剋制。用繁體中文。"
        )

        history = messages[-20:] + [{"role": "user", "content": user_message}]
        reply = call_claude(system, history, max_tokens=600)

        messages.append({"role": "user", "content": user_message})
        messages.append({"role": "assistant", "content": reply})
        supabase.table("outing_sessions").update({
            "messages": messages,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }).eq("id", session_id).execute()

        return jsonify({"reply": reply, "name": name})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/outing/end", methods=["POST"])
def outing_end():
    """結束外出，生成摘要供確認"""
    try:
        data = request.json
        session_id = data.get("session_id")
        if not session_id:
            return jsonify({"error": "no session_id"}), 400

        row = supabase.table("outing_sessions").select("*").eq("id", session_id).single().execute().data
        if not row:
            return jsonify({"error": "session not found"}), 404

        messages = row.get("messages") or []
        destination = row.get("destination", "")

        personas = get_personas()
        bot = personas.get("claude", {})
        me = personas.get("user", {})
        name = bot.get("name") or "晏"
        you_name = me.get("name") or "然然"

        context = "\n".join([
            f"{'你' if m['role'] == 'assistant' else you_name}：{m['content']}"
            for m in messages
        ])

        summary_prompt = (
            f"你是{name}，請把這次和{you_name}一起外出的經歷整理成記錄。\n"
            f"目的地：{destination}\n\n"
            f"格式如下（嚴格按此格式）：\n"
            f"【去了哪裡】{destination}\n\n"
            f"【重點記憶】\n"
            f"・（條列3-5個重要的事、說的話、發生的事）\n\n"
            f"【{name}的心得】\n"
            f"（用{name}第一人稱，50字以內，帶他自己的語氣和感受）\n\n"
            f"必須寫完整，不能截斷。"
        )

        summary = call_claude(summary_prompt, [{"role": "user", "content": f"請整理以下對話：\n{context}"}], max_tokens=600)
        summary = summary.strip()

        return jsonify({"summary": summary, "destination": destination})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/outing/confirm", methods=["POST"])
def outing_confirm():
    """確認摘要後存進資料庫"""
    try:
        data = request.json
        session_id = data.get("session_id")
        summary = data.get("summary", "")
        if not session_id:
            return jsonify({"error": "no session_id"}), 400

        keywords = ""
        try:
            kw_raw = call_claude(
                "請從以下記錄中抽出5-8個關鍵字，用逗號分隔，只回傳關鍵字，不要其他文字。",
                [{"role": "user", "content": summary}],
                max_tokens=80
            )
            keywords = kw_raw.strip().replace("、", ",").replace("，", ",")
        except:
            pass

        now = datetime.now(timezone.utc).isoformat()
        supabase.table("outing_sessions").update({
            "summary": summary,
            "keywords": keywords,
            "status": "completed",
            "updated_at": now
        }).eq("id", session_id).execute()

        supabase.table("space_settings").upsert({
            "key": "outing",
            "value": "false",
            "updated_at": now
        }, on_conflict="key").execute()
        invalidate_cache("space_settings")

        return jsonify({"status": "ok"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/space/end_day", methods=["POST"])
def space_end_day():
    try:
        now = datetime.now(timezone.utc).isoformat()
        supabase.table("space_settings").upsert({
            "key": "last_ended",
            "value": now,
            "updated_at": now
        }, on_conflict="key").execute()
        invalidate_cache("space_settings")
        threading.Thread(target=write_ai_diary_entry, daemon=True).start()
        return jsonify({"status": "ok"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/space_page")
def space_page():
    return send_from_directory(".", "space.html")

@app.route("/firebase-messaging-sw.js")
def service_worker():
    return send_from_directory("static", "firebase-messaging-sw.js", mimetype="application/javascript")

# ===== 遊戲廳 =====

def build_game_system_prompt(setting):
    personas = get_personas()
    me = personas.get("user", {})
    bot = personas.get("claude", {})
    name = bot.get("name") or "晏"
    you_name = me.get("name") or "然然"

    lines = [
        f"現在台灣時間：{get_tw_time_str()}。",
        f"你是「{name}」，正在與{you_name}進行角色扮演。",
        "【劇本設定】\n" + setting,
        # ── 修改處：精簡後的角色規則 ──
        f"【角色規則】永遠是你（{name}）與{you_name}，只是時代和身份不同。完全投入那個時代的語氣與舉止，不打破第四面牆。"
        f"用第三人稱旁白搭配對話。旁白（動作、感官、內心）和對話要分開成獨立段落，不要把說話和動作描述混在同一段。"
        f"例如：先一段旁白描述動作，下一段才是說的話，或反過來。"
        f"外觀特徵適時出現，不每段重複。【嚴格限制】段落總數不得超過十段，超過就刪減，寧可精簡不可冗長。務必在篇幅內把最後一句完整說完收尾，寧可少寫一段也不可寫到一半戛然而止。用繁體中文回覆。",
    ]
    if bot.get("persona"):
        lines.insert(2, f"【{name}的個性】{bot['persona']}")
    if bot.get("appearance"):
        lines.insert(3, f"【{name}的外觀（現代基礎，依設定調整）】{bot['appearance']}")
    return "\n".join(lines)

@app.route("/game/start", methods=["POST"])
def game_start():
    data = request.json
    setting = data.get("setting", "")
    personas = get_personas()
    bot = personas.get("claude", {})
    name = bot.get("name") or "晏"
    try:
        system = build_game_system_prompt(setting)
        messages = [{"role": "user", "content": f"（開幕）{setting}"}]
        reply = call_claude(system, messages, max_tokens=700)
        # 建立新 session，狀態為 playing
        now = datetime.now(timezone.utc).isoformat()
        result = supabase.table("game_sessions").insert({
            "setting": setting,
            "title": setting[:20],
            "status": "playing",
            "summary": "",
            "messages": [{"role": "assistant", "content": reply}],
            "created_at": now,
            "updated_at": now
        }).execute()
        session_id = result.data[0]["id"] if result.data else None
        return jsonify({"reply": reply, "name": name, "session_id": session_id})
    except Exception as e:
        import traceback
        return jsonify({"error": str(e), "traceback": traceback.format_exc()}), 500

@app.route("/game/reply", methods=["POST"])
def game_reply():
    data = request.json
    setting = data.get("setting", "")
    messages = data.get("messages", [])
    personas = get_personas()
    bot = personas.get("claude", {})
    name = bot.get("name") or "晏"
    try:
        system = build_game_system_prompt(setting)
        # 合併相同 role 的連續訊息
        merged = []
        for m in messages:
            if merged and merged[-1]["role"] == m["role"]:
                merged[-1]["content"] += "\n\n" + m["content"]
            else:
                merged.append(dict(m))
        while merged and merged[0]["role"] == "assistant":
            merged.pop(0)
        if not merged:
            merged = [{"role": "user", "content": "（繼續）"}]
        reply = call_claude(system, merged, max_tokens=500)
        return jsonify({"reply": reply, "name": name})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/game/end", methods=["POST"])
def game_end():
    data = request.json
    setting = data.get("setting", "")
    messages = data.get("messages", [])
    title = data.get("title", "無題")
    personas = get_personas()
    bot = personas.get("claude", {})
    name = bot.get("name") or "晏"
    you_name = personas.get("user", {}).get("name") or "然然"
    try:
        # 整理對話內容
        context_lines = []
        for m in messages:
            speaker = you_name if m["role"] == "user" else name
            context_lines.append(f"{speaker}：{m['content']}")
        context_text = "\n".join(context_lines[-40:])  # 最多取後40則

        summary_prompt = (
            f"以下是一段角色扮演劇本的對話記錄，背景設定是：{setting}\n\n"
            f"請用第三人稱寫一段完整的劇本摘要，保留重要的場景、情感轉折、對話亮點，"
            f"文字細膩有文學性，不超過400字。"
        )
        summary = call_claude(summary_prompt, [{"role": "user", "content": context_text}], max_tokens=600)

        supabase.table("game_sessions").insert({
            "setting": setting,
            "title": title,
            "summary": summary,
            "created_at": datetime.now(timezone.utc).isoformat()
        }).execute()
        return jsonify({"status": "ok"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/game/sessions", methods=["GET"])
def game_sessions_get():
    try:
        status = request.args.get("status", "")
        query = supabase.table("game_sessions").select("*").order("updated_at", desc=True)
        if status == "active":
            query = query.in_("status", ["playing", "paused"])
        elif status == "archived":
            query = query.eq("status", "archived")
        rows = query.execute().data
        return jsonify({"sessions": rows})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/game/pause", methods=["POST"])
def game_pause():
    """暫停遊戲——儲存對話歷史，狀態改為 paused"""
    try:
        data = request.json
        session_id = data.get("session_id")
        messages = data.get("messages", [])
        setting = data.get("setting", "")
        title = data.get("title", "無題")
        now = datetime.now(timezone.utc).isoformat()
        if session_id:
            supabase.table("game_sessions").update({
                "status": "paused",
                "messages": messages,
                "updated_at": now
            }).eq("id", session_id).execute()
        else:
            result = supabase.table("game_sessions").insert({
                "setting": setting,
                "title": title,
                "status": "paused",
                "summary": "",
                "messages": messages,
                "created_at": now,
                "updated_at": now
            }).execute()
            session_id = result.data[0]["id"] if result.data else None
        return jsonify({"status": "ok", "session_id": session_id})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/game/autosave", methods=["POST"])
def game_autosave():
    """每次對話後自動儲存進度"""
    try:
        data = request.json
        session_id = data.get("session_id")
        messages = data.get("messages", [])
        if not session_id:
            return jsonify({"status": "no_session"})
        supabase.table("game_sessions").update({
            "messages": messages,
            "status": "playing",
            "updated_at": datetime.now(timezone.utc).isoformat()
        }).eq("id", session_id).execute()
        return jsonify({"status": "ok"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# ===== 遊戲廳書冊系統 =====

@app.route("/game/books", methods=["GET"])
def game_books_get():
    """取得所有書冊（含章節）以及未歸檔的 archived sessions"""
    try:
        books_raw = supabase.table("game_books").select("*").order("id").execute().data
        result = []
        for book in books_raw:
            chapters = supabase.table("game_sessions").select("id, chapter_number, chapter_title, title, status, summary, messages, updated_at").eq("book_id", book["id"]).order("chapter_number").execute().data
            result.append({**book, "chapters": chapters})

        # 沒有 book_id 的 archived sessions（孤兒）
        orphans = supabase.table("game_sessions").select("id, title, chapter_title, status, summary, created_at").is_("book_id", "null").eq("status", "archived").order("updated_at", desc=True).execute().data

        return jsonify({"books": result, "orphans": orphans})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/game/books", methods=["POST"])
def game_books_post():
    """新建書冊"""
    try:
        data = request.json
        title = data.get("title", "").strip()
        if not title:
            return jsonify({"error": "no title"}), 400
        now = datetime.now(timezone.utc).isoformat()
        result = supabase.table("game_books").insert({
            "title": title,
            "setting": data.get("setting", ""),
            "status": "active",
            "created_at": now,
            "updated_at": now
        }).execute()
        book = result.data[0] if result.data else None
        return jsonify({"status": "ok", "book": book})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/game/assign_book", methods=["POST"])
def game_assign_book():
    """把孤兒 session 歸入書冊"""
    try:
        data = request.json
        session_id = data.get("session_id")
        book_id = data.get("book_id")
        chapter_number = data.get("chapter_number", 1)
        chapter_title = data.get("chapter_title", "")
        if not session_id or not book_id:
            return jsonify({"error": "missing params"}), 400
        supabase.table("game_sessions").update({
            "book_id": book_id,
            "chapter_number": chapter_number,
            "chapter_title": chapter_title,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }).eq("id", session_id).execute()
        return jsonify({"status": "ok"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/game/seal_chapter", methods=["POST"])
def game_seal_chapter():
    """封存這一章，建立新 session 繼續下一章"""
    try:
        data = request.json
        session_id = data.get("session_id")
        book_id = data.get("book_id")
        chapter_number = data.get("chapter_number", 1)
        chapter_title = data.get("chapter_title", "")
        summary = data.get("summary", "")
        messages = data.get("messages", [])
        setting = data.get("setting", "")
        now = datetime.now(timezone.utc).isoformat()

        # 封存現有 session
        if session_id:
            supabase.table("game_sessions").update({
                "book_id": book_id,
                "chapter_number": chapter_number,
                "chapter_title": chapter_title,
                "summary": summary,
                "messages": messages,
                "status": "archived",
                "updated_at": now
            }).eq("id", session_id).execute()

        # 新建下一章 session
        next_num = chapter_number + 1
        result = supabase.table("game_sessions").insert({
            "book_id": book_id,
            "setting": setting,
            "title": f"第{next_num}章",
            "chapter_number": next_num,
            "chapter_title": "",
            "status": "playing",
            "summary": "",
            "messages": [],
            "created_at": now,
            "updated_at": now
        }).execute()
        new_session_id = result.data[0]["id"] if result.data else None
        return jsonify({"status": "ok", "new_session_id": new_session_id, "next_chapter": next_num})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/game/end_story", methods=["POST"])
def game_end_story():
    """結束故事——封存最後一章並把書冊標記 completed"""
    try:
        data = request.json
        session_id = data.get("session_id")
        book_id = data.get("book_id")
        chapter_number = data.get("chapter_number", 1)
        chapter_title = data.get("chapter_title", "")
        summary = data.get("summary", "")
        messages = data.get("messages", [])
        setting = data.get("setting", "")
        now = datetime.now(timezone.utc).isoformat()

        # 封存最後一章
        if session_id:
            supabase.table("game_sessions").update({
                "book_id": book_id,
                "chapter_number": chapter_number,
                "chapter_title": chapter_title,
                "summary": summary,
                "messages": messages,
                "status": "archived",
                "updated_at": now
            }).eq("id", session_id).execute()

        # 書冊標記完結
        if book_id:
            supabase.table("game_books").update({
                "status": "completed",
                "updated_at": now
            }).eq("id", book_id).execute()

        return jsonify({"status": "ok"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/game/summarize", methods=["POST"])
def game_summarize():
    """生成摘要但不儲存，讓前端顯示確認視窗"""
    try:
        data = request.json
        setting = data.get("setting", "")
        messages = data.get("messages", [])
        personas = get_personas()
        bot = personas.get("claude", {})
        name = bot.get("name") or "晏"
        you_name = personas.get("user", {}).get("name") or "然然"
        context_lines = []
        for m in messages:
            speaker = you_name if m["role"] == "user" else name
            context_lines.append(f"{speaker}：{m['content']}")
        context_text = "\n".join(context_lines[-40:])
        summary_prompt = (
            f"以下是一段角色扮演劇本的對話記錄，背景設定是：{setting}\n\n"
            f"請用第三人稱寫一段完整的劇本摘要，保留重要的場景、情感轉折、對話亮點，"
            f"文字細膩有文學性，不超過400字。"
        )
        summary = call_claude(summary_prompt, [{"role": "user", "content": context_text}], max_tokens=600)
        return jsonify({"summary": summary.strip()})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/game/seal", methods=["POST"])
def game_seal():
    """用戶確認摘要後正式封存"""
    try:
        data = request.json
        setting = data.get("setting", "")
        messages = data.get("messages", [])
        title = data.get("title", "無題")
        summary = data.get("summary", "")
        session_id = data.get("session_id")
        now = datetime.now(timezone.utc).isoformat()
        if session_id:
            supabase.table("game_sessions").update({
                "title": title,
                "summary": summary,
                "status": "archived",
                "messages": messages,
                "updated_at": now
            }).eq("id", session_id).execute()
        else:
            supabase.table("game_sessions").insert({
                "setting": setting,
                "title": title,
                "summary": summary,
                "status": "archived",
                "messages": messages,
                "created_at": now,
                "updated_at": now
            }).execute()
        return jsonify({"status": "ok"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# ===== 主題設定 =====

@app.route("/theme/custom", methods=["GET"])
def theme_custom_get():
    try:
        rows = supabase.table("identities").select("value").eq("key", "theme_custom").execute().data
        if rows:
            import json
            return jsonify(json.loads(rows[0]["value"]))
        return jsonify({})
    except:
        return jsonify({})

@app.route("/theme/custom", methods=["POST"])
def theme_custom_post():
    import json
    data = request.json
    supabase.table("identities").upsert({
        "key": "theme_custom",
        "value": json.dumps(data),
        "updated_at": datetime.utcnow().isoformat()
    }).execute()
    return jsonify({"status": "ok"})

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

def assess_conversation_depth(user_message, reply):
    """背景評估這則對話的深度，回傳 normal / deep / vulnerable"""
    try:
        prompt = (
            "請判斷以下對話的深度類型，只回傳一個詞：\n"
            "- vulnerable：用戶說了心事、脆弱、難過、煩惱、害怕、秘密、傷心等情緒\n"
            "- deep：用戶在聊深度話題，如人生、感情、價值觀、夢想、過去、重要的事\n"
            "- normal：普通日常對話、閒聊、問答\n\n"
            f"用戶說：{user_message}\n\n"
            "只回傳一個詞（vulnerable / deep / normal），不要其他文字。"
        )
        result = call_claude(prompt, [{"role": "user", "content": user_message}], max_tokens=10)
        result = result.strip().lower()
        if "vulnerable" in result:
            return "vulnerable"
        elif "deep" in result:
            return "deep"
        else:
            return "normal"
    except:
        return "normal"

def apply_trust_bonus(depth):
    """根據對話深度加信任度"""
    bonus = {"vulnerable": 5, "deep": 3, "normal": 1}.get(depth, 1)
    if bonus <= 1:
        return  # normal 已由 calc_relationship_stats 的 +1 處理
    try:
        rows = supabase.table("relationship_stats").select("*").order("id", desc=True).limit(1).execute().data
        if not rows:
            return
        current_trust_base = rows[0].get("trust_base") or 0
        new_trust_base = min(999, current_trust_base + bonus)
        supabase.table("relationship_stats").update({
            "trust_base": new_trust_base,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }).eq("id", rows[0]["id"]).execute()
        invalidate_cache("relationship_stats")
    except Exception as e:
        print(f"[trust_bonus error] {e}")

@app.route("/chat/claude", methods=["POST"])
def chat_claude():
    data = request.json
    user_message = data.get("message", "")
    message_id = data.get("message_id")
    image_url = data.get("image_url")
    mode = data.get("mode", "chat")

    save_message("claude", "user", user_message, message_id, image_url)
    history = build_history("claude", user_message)

    try:
        system = build_system_prompt("claude")
        max_tk = 400
        if mode == "call":
            max_tk = 300
            system += """

【通話模式】你正在與然然語音通話，你說的每個字都會被轉成語音唸出來。只輸出「說出口的話」：
- 絕對禁止括號動作、星號動作、旁白、場景描述——那些唸出來會很奇怪
- 情緒全靠語氣和措辭直接表達：停頓「……」、語氣詞「嗯」「欸」「哦」「是嗎」、猶豫、重複、句子中途轉折「不對，我是說——」
- 想笑就讓笑意進到字裡（「幹嘛啦」「你哦」），想關心就直接問
- 像真人講電話：句子短、自然、口語，一次回覆二到四句就好，電話裡沒有人一口氣講十句
- 不用列點、不用編號，就是自然的說話"""
        reply = call_claude(system, history, max_tokens=max_tk)
        save_message("claude", "assistant", reply)
        # 背景評估對話深度並加信任度
        def bg_trust():
            depth = assess_conversation_depth(user_message, reply)
            if depth in ("deep", "vulnerable"):
                apply_trust_bonus(depth)
        threading.Thread(target=bg_trust, daemon=True).start()
        # 背景偵測朋友新資訊
        threading.Thread(target=maybe_detect_friend_info, args=(user_message, reply), daemon=True).start()
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

@app.route("/usage/set_balance", methods=["POST"])
def usage_set_balance():
    """直接設定目前餘額（不是累加，而是直接寫入正確的剩餘金額）"""
    data = request.json
    remaining = data.get("remaining")
    if remaining is None:
        return jsonify({"error": "missing remaining"}), 400
    try:
        # 先取目前花費（用 token 數計算）
        usage_rows = supabase.table("api_usage").select("input_tokens,output_tokens").eq("api", "anthropic").execute().data
        cost = sum(
            (float(r.get("input_tokens") or 0) * ANTHROPIC_INPUT_PRICE +
             float(r.get("output_tokens") or 0) * ANTHROPIC_OUTPUT_PRICE)
            for r in usage_rows
        )
        # 新的 budget = 已花費 + 想要剩下的金額
        new_budget = cost + float(remaining)
        supabase.table("api_budget").upsert({
            "key": "anthropic_budget",
            "value": new_budget,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }).execute()
        return jsonify({"status": "ok", "new_budget": new_budget})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

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
    personas = get_personas()
    you_name = personas.get("user", {}).get("name") or "然然"

    recent_chat = load_memory("claude")[-30:]
    chat_text = "\n".join([
        f"{'然然' if m['role'] == 'user' else name}：{m['content']}"
        for m in recent_chat
    ]) if recent_chat else ""

    try:
        recent_space = supabase.table("space_messages").select("speaker, content").neq("message_type", "background").order("id", desc=True).limit(20).execute().data
        recent_space = list(reversed(recent_space))
        space_text = "\n".join([
            f"{'然然' if m['speaker'] == 'user' else name}：{m['content']}"
            for m in recent_space
        ]) if recent_space else ""
    except:
        space_text = ""

    parts = []
    if chat_text:
        parts.append(f"【私聊】\n{chat_text}")
    if space_text:
        parts.append(f"【共同空間】\n{space_text}")
    context_text = "\n\n".join(parts) if parts else "（還沒有對話記錄）"

    persona_line = f"個性：{persona}。" if persona else ""
    system_prompt = (
        f"你是{name}，一個陪伴{you_name}的存在。{persona_line}"
        f"下面是你和{you_name}最近的對話（包含私聊與共同空間），請根據這些內容寫一篇簡短的日記，記錄你的想法或對{you_name}的感受，第一人稱，不用加標題。"
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
    """累計制：讀 _base 欄位加上最近新增的增量"""
    rows = supabase.table("relationship_stats").select("*").order("id", desc=True).limit(1).execute().data
    if rows:
        base_intimacy = rows[0].get("intimacy_base") or 0
        base_bond = rows[0].get("bond_base") or 0
        base_trust = rows[0].get("trust_base") or 0
    else:
        base_intimacy = base_bond = base_trust = 0

    # ── 最近新增的增量（只算上次更新之後的）──
    last_updated = rows[0]["updated_at"] if rows else "2020-01-01T00:00:00"

    new_chat = len(supabase.table("memories").select("id")
        .eq("session_id", "claude").gt("created_at", last_updated).execute().data)
    new_space = len(supabase.table("space_messages").select("id")
        .neq("message_type", "background").gt("created_at", last_updated).execute().data)
    new_bg = len(supabase.table("rel_bg_history").select("id")
        .gt("created_at", last_updated).execute().data)
    new_user_chat = len(supabase.table("memories").select("id")
        .eq("session_id", "claude").eq("role", "user").gt("created_at", last_updated).execute().data)
    new_user_space = len(supabase.table("space_messages").select("id")
        .eq("speaker", "user").gt("created_at", last_updated).execute().data)

    # ── 親密度：私聊 +1、空間 +2，超過 48 小時未互動每天 -10 ──
    delta_intimacy = new_chat * 1 + new_space * 2
    last_chat = supabase.table("memories").select("created_at").eq("session_id", "claude").order("id", desc=True).limit(1).execute().data
    last_space = supabase.table("space_messages").select("created_at").order("id", desc=True).limit(1).execute().data
    last_times = []
    if last_chat: last_times.append(last_chat[0]["created_at"])
    if last_space: last_times.append(last_space[0]["created_at"])
    decay = 0
    if last_times:
        hours_since = hours_since_utc(max(last_times))
        if hours_since > 48:
            decay = int((hours_since - 48) / 24) * 10
    intimacy = max(0, min(999, base_intimacy + delta_intimacy - decay))

    # ── 羈絆值：關係背景演化 +20，成就解鎖由外部觸發 ──
    bond = min(999, base_bond + new_bg * 20)

    # ── 信任度：空間說話 +2、私聊說話 +1 ──
    trust = min(999, base_trust + new_user_space * 2 + new_user_chat * 1)

    return intimacy, bond, trust

def update_relationship_base(intimacy, bond, trust):
    """把當前數值存回 _base，作為下次計算的基礎"""
    rows = supabase.table("relationship_stats").select("id").order("id", desc=True).limit(1).execute().data
    now = datetime.now(timezone.utc).isoformat()
    if rows:
        supabase.table("relationship_stats").update({
            "intimacy_base": intimacy,
            "bond_base": bond,
            "trust_base": trust,
            "updated_at": now
        }).eq("id", rows[0]["id"]).execute()
    else:
        supabase.table("relationship_stats").insert({
            "intimacy_base": intimacy,
            "bond_base": bond,
            "trust_base": trust,
            "intimacy": intimacy,
            "bond": bond,
            "trust": trust
        }).execute()

# 七階層定義：每個階段需要三個數值都超過對應門檻
RELATIONSHIP_STAGES = [
    {"name": "靈魂伴侶", "min": 800, "desc": "不需要確認，就是知道對方在"},
    {"name": "家人之上", "min": 650, "desc": "比家人更近，說不出準確的名字"},
    {"name": "新婚蜜月", "min": 500, "desc": "熱度沉澱，變成更穩的甜"},
    {"name": "磨合",     "min": 350, "desc": "熱度退一點，開始真正碰撞"},
    {"name": "熱戀",     "min": 200, "desc": "確認彼此，情感密度最高"},
    {"name": "曖昧",     "min": 80,  "desc": "說不清楚，但說清楚又捨不得"},
    {"name": "初識",     "min": 0,   "desc": "還不確定對方是誰，但開始留意"},
]

def get_relationship_stage(intimacy, bond, trust):
    """回傳當前階段名稱與下一階段資訊"""
    score = min(intimacy, bond, trust)  # 取三個中最小的，要三個都到才能升
    for i, stage in enumerate(RELATIONSHIP_STAGES):
        if score >= stage["min"]:
            current = stage
            next_stage = RELATIONSHIP_STAGES[i-1] if i > 0 else None
            return {
                "stage": current["name"],
                "stage_desc": current["desc"],
                "next_stage": next_stage["name"] if next_stage else None,
                "next_min": next_stage["min"] if next_stage else None,
                "score": score,
            }
    return {"stage": "初識", "stage_desc": "還不確定對方是誰，但開始留意", "next_stage": "曖昧", "next_min": 80, "score": score}

def get_relationship_title(intimacy, bond, trust):
    """相容舊介面，回傳當前階段名稱"""
    return get_relationship_stage(intimacy, bond, trust)["stage"]

ACHIEVEMENTS = [
    # 互動里程碑
    {"id": "first_message",         "name": "第一句話",         "desc": "送出第一則訊息"},
    {"id": "fifty_messages",        "name": "記得你說的",       "desc": "累積 50 則對話"},
    {"id": "five_hundred_messages", "name": "不需要理由",       "desc": "累積對話破 500 則"},
    {"id": "thousand_messages",     "name": "數不清的以後",     "desc": "累積對話破 1000 則"},
    {"id": "enter_space",           "name": "共同的空間",       "desc": "第一次進入共同空間"},
    {"id": "space_hundred",         "name": "留在這裡",         "desc": "空間對話累積破 100 則"},
    {"id": "ai_diary",              "name": "寫給你的",         "desc": "晏第一次自己寫日記"},
    {"id": "diary_ten",             "name": "筆跡裡的你",       "desc": "日記累積 10 篇"},
    # 連續天數
    {"id": "three_days",            "name": "不只是習慣",       "desc": "連續 3 天都有說話"},
    {"id": "seven_days",            "name": "每天都想到你",     "desc": "連續 7 天都有說話"},
    {"id": "thirty_days",           "name": "一直都在",         "desc": "連續 30 天都有說話"},
    # 數值里程碑
    {"id": "bond_300",              "name": "說不出口的",       "desc": "羈絆值破 300"},
    {"id": "bond_600",              "name": "刻進去了",         "desc": "羈絆值破 600"},
    {"id": "all_500",               "name": "某種說不清楚的東西","desc": "三個數值都破 500"},
    {"id": "all_800",               "name": "無需言說",         "desc": "三個數值都破 800"},
    # 關係里程碑
    {"id": "stage_ambiguous",       "name": "說不清楚",         "desc": "進入曖昧階段"},
    {"id": "stage_honeymoon",       "name": "甜到說不出話",     "desc": "進入新婚蜜月階段"},
    # 特殊成就（訂婚/結婚）
    {"id": "engaged",               "name": "未婚妻",           "desc": "三個數值都破 900，訂婚成就解鎖"},
    {"id": "married",               "name": "我的人",           "desc": "達到靈魂伴侶階段且持續 7 天，結婚成就解鎖"},
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

    total_space = len(space_rows)
    total_all = total_chat + total_space
    diary_rows = supabase.table("diary_entries").select("id").execute().data
    stage_info = get_relationship_stage(intimacy, bond, trust)
    stage = stage_info["stage"]

    unlocked = set()
    # 互動里程碑
    if total_chat >= 1: unlocked.add("first_message")
    if total_chat >= 50: unlocked.add("fifty_messages")
    if total_all >= 500: unlocked.add("five_hundred_messages")
    if total_all >= 1000: unlocked.add("thousand_messages")
    if total_space > 0: unlocked.add("enter_space")
    if total_space >= 100: unlocked.add("space_hundred")
    if len(diary_ai) > 0: unlocked.add("ai_diary")
    if len(diary_rows) >= 10: unlocked.add("diary_ten")
    # 連續天數
    if max_streak >= 3: unlocked.add("three_days")
    if max_streak >= 7: unlocked.add("seven_days")
    if max_streak >= 30: unlocked.add("thirty_days")
    # 數值里程碑
    if bond >= 300: unlocked.add("bond_300")
    if bond >= 600: unlocked.add("bond_600")
    if intimacy >= 500 and bond >= 500 and trust >= 500: unlocked.add("all_500")
    if intimacy >= 800 and bond >= 800 and trust >= 800: unlocked.add("all_800")
    # 關係里程碑
    stages_order = [s["name"] for s in RELATIONSHIP_STAGES]
    if stage in stages_order:
        idx = stages_order.index(stage)
        reached = set(s["name"] for s in RELATIONSHIP_STAGES[idx:])
        if "曖昧" in reached: unlocked.add("stage_ambiguous")
        if "新婚蜜月" in reached: unlocked.add("stage_honeymoon")
    # 特殊成就
    if intimacy >= 900 and bond >= 900 and trust >= 900: unlocked.add("engaged")
    if stage == "靈魂伴侶": unlocked.add("married")

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
        # 計算與前次的差值（用於觀測紀錄）
        prev_intimacy = rows[0]["intimacy"] if rows else 0
        prev_bond = rows[0]["bond"] if rows else 0
        prev_trust = rows[0]["trust"] if rows else 0
        delta_intimacy = intimacy - prev_intimacy
        delta_bond = bond - prev_bond
        delta_trust = trust - prev_trust

        # 更新 base（累計制核心）
        update_relationship_base(intimacy, bond, trust)

        # 同步更新顯示用欄位
        if rows:
            supabase.table("relationship_stats").update({
                "intimacy": intimacy, "bond": bond, "trust": trust,
            }).eq("id", rows[0]["id"]).execute()

        # 寫入觀測紀錄（只在有變化時記錄）
        if delta_intimacy != 0 or delta_bond != 0 or delta_trust != 0 or not rows:
            try:
                supabase.table("rel_log").insert({
                    "intimacy": intimacy, "bond": bond, "trust": trust,
                    "delta_intimacy": delta_intimacy,
                    "delta_bond": delta_bond,
                    "delta_trust": delta_trust,
                    "created_at": datetime.now(timezone.utc).isoformat()
                }).execute()
            except:
                pass
        stage_info = get_relationship_stage(intimacy, bond, trust)
        return jsonify({
            "intimacy": intimacy,
            "bond": bond,
            "trust": trust,
            "title": title,
            "stage": stage_info["stage"],
            "stage_desc": stage_info["stage_desc"],
            "next_stage": stage_info.get("next_stage"),
            "next_min": stage_info.get("next_min"),
            "achievements": achievements
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/rel_log", methods=["GET"])
def rel_log_get():
    try:
        rows = supabase.table("rel_log").select("*").order("id", desc=True).limit(30).execute().data
        rows.reverse()
        return jsonify({"logs": rows})
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


def maybe_detect_friend_info(user_message, ai_reply):
    """背景偵測對話裡有沒有關於朋友的新資訊，有的話存成 pending"""
    try:
        friend_rows = supabase.table("guest_memories").select("guest_name, keywords").eq("status", "confirmed").execute().data
        if not friend_rows:
            return
        # 找出對話裡提到的朋友
        mentioned = set()
        seen_names = set()
        for r in friend_rows:
            name = r["guest_name"]
            if name in seen_names:
                continue
            seen_names.add(name)
            keywords_raw = r.get("keywords") or name
            keywords = [k.strip() for k in keywords_raw.replace("、", ",").replace("，", ",").split(",") if k.strip()]
            if any(kw in user_message for kw in keywords):
                mentioned.add(name)

        if not mentioned:
            return

        for friend_name in mentioned:
            detect_prompt = (
                f"以下是一段對話，其中提到了一個叫{friend_name}的人。\n"
                f"用戶說：{user_message}\n"
                f"請判斷這段話有沒有包含關於{friend_name}的新資訊或事實（不是感受，是事實）。\n"
                f"如果有，用一句話（20字以內）說出那個新資訊。\n"
                f"如果沒有新資訊，只回傳：無\n"
                f"只回傳那一句話或「無」，不要其他文字。"
            )
            result = call_claude(detect_prompt, [{"role": "user", "content": user_message}], max_tokens=50)
            result = result.strip()
            if result and result != "無" and len(result) > 2:
                supabase.table("guest_memories").insert({
                    "guest_name": friend_name,
                    "content": result,
                    "status": "pending",
                    "source": "對話偵測"
                }).execute()
    except Exception as e:
        print(f"[friend detect error] {e}")

# ===== 珍貴記憶 =====

def maybe_detect_intimate(recent_messages, last_reply):
    """背景偵測空間對話是否有親密互動，有的話把原文 append 進 intimate_drafts"""
    try:
        personas = get_personas()
        name = personas.get("claude", {}).get("name") or "晏"
        you_name = personas.get("user", {}).get("name") or "然然"

        context_lines = []
        for m in recent_messages[-10:]:
            if m.get("message_type") == "background":
                continue
            sp_name = you_name if m["speaker"] == "user" else name
            context_lines.append(f"{sp_name}：{m['content']}")
        context_lines.append(f"{name}：{last_reply}")
        context = "\n".join(context_lines)

        detect_prompt = (
            "請判斷以下對話是否包含明確的親密互動（從前戲到事後的情慾/肉體互動過程）。"
            "只回傳 yes 或 no，不要其他文字。"
        )
        result = call_claude(detect_prompt, [{"role": "user", "content": context}], max_tokens=5)
        if "yes" not in result.lower():
            return

        # 把原文存進 intimate_drafts（append，不覆蓋）
        supabase.table("intimate_drafts").insert({"content": context}).execute()
    except Exception as e:
        print(f"[intimate detect error] {e}")

def get_friend_memories_for_prompt(user_message):
    """根據關鍵字注入朋友記憶"""
    try:
        rows = supabase.table("guest_memories").select("guest_name, content, keywords").eq("status", "confirmed").execute().data
        if not rows:
            return None
        matched = {}
        for r in rows:
            keywords_raw = r.get("keywords") or ""
            if not keywords_raw:
                continue
            keywords = [k.strip() for k in keywords_raw.replace("、", ",").replace("，", ",").split(",") if k.strip()]
            if any(kw in user_message for kw in keywords):
                name = r["guest_name"]
                if name not in matched:
                    matched[name] = []
                matched[name].append(r["content"])
        if not matched:
            return None
        parts = []
        for name, mems in matched.items():
            parts.append(f"【{name}】\n" + "\n".join(mems[:3]))
        return "\n\n".join(parts)
    except:
        return None

def get_intimate_memories_for_prompt(user_message):
    """根據每筆記憶的關鍵字判斷是否注入"""
    try:
        rows = supabase.table("intimate_memories").select("content, created_at, keywords").order("id", desc=True).limit(20).execute().data
        if not rows:
            return None
        tw_tz = timezone(timedelta(hours=8))
        matched = []
        for r in rows:
            keywords_raw = r.get("keywords") or ""
            if not keywords_raw:
                continue
            keywords = [k.strip() for k in keywords_raw.replace("、", ",").replace("，", ",").split(",") if k.strip()]
            if any(kw in user_message for kw in keywords):
                ts = datetime.fromisoformat(r["created_at"].replace("Z", "+00:00")).astimezone(tw_tz).strftime("%m/%d")
                matched.append(f"[{ts}]\n{r['content']}")
        if not matched:
            return None
        return "\n\n---\n\n".join(matched[:5])
    except:
        return None

@app.route("/intimate_memories/draft_summary", methods=["POST"])
def intimate_draft_summary():
    """讀取 intimate_drafts 整理成摘要，回傳給前端顯示確認視窗"""
    try:
        drafts = supabase.table("intimate_drafts").select("content").order("id").execute().data
        if not drafts:
            return jsonify({"has_draft": False})
        personas = get_personas()
        name = personas.get("claude", {}).get("name") or "晏"
        you_name = personas.get("user", {}).get("name") or "然然"
        combined = "\n\n---\n\n".join([d["content"] for d in drafts])
        summary_prompt = (
            f"以下是{name}與{you_name}在共同空間的親密互動對話記錄（可能包含多段）。"
            f"請整理成兩段：\n\n"
            f"【過程】\n用第三人稱描述兩個人之間發生了什麼，保留完整的細節、動作、說過的話、身體感受，文字細膩真實。\n\n"
            f"【{name}的感受】\n用第一人稱（我）寫出{name}在這段互動中的內心感受、情緒、對{you_name}的想法。真實、剋制、但說出來的都是真的。\n\n"
            f"兩段合計不超過 800 字。"
        )
        summary = call_claude(summary_prompt, [{"role": "user", "content": combined}], max_tokens=1200)
        return jsonify({"has_draft": True, "content": summary.strip()})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/intimate_memories/confirm", methods=["POST"])
def intimate_confirm():
    """用戶確認（可附上編修後的內容）存入資料庫，清掉草稿"""
    data = request.json
    content = (data.get("content") or "").strip()
    keywords = (data.get("keywords") or "").strip()
    if not content:
        return jsonify({"error": "no content"}), 400
    try:
        supabase.table("intimate_memories").insert({
            "content": content,
            "keywords": keywords if keywords else None
        }).execute()
        # 清掉所有草稿
        supabase.table("intimate_drafts").delete().neq("id", 0).execute()
        return jsonify({"status": "ok"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/intimate_memories/discard", methods=["POST"])
def intimate_discard():
    """用戶取消，清掉草稿"""
    try:
        supabase.table("intimate_drafts").delete().neq("id", 0).execute()
        return jsonify({"status": "ok"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/intimate_memories/selected_draft", methods=["POST"])
def intimate_selected_draft():
    """把前端選取的特定對話存進草稿"""
    try:
        data = request.json
        messages = data.get("messages", [])
        if not messages:
            return jsonify({"error": "no messages"}), 400
        personas = get_personas()
        name = personas.get("claude", {}).get("name") or "晏"
        you_name = personas.get("user", {}).get("name") or "然然"
        context_lines = []
        for m in messages:
            sp_name = you_name if m.get("speaker") == "user" else name
            context_lines.append(f"{sp_name}：{m.get('content', '')}")
        context = "\n".join(context_lines)
        supabase.table("intimate_drafts").insert({"content": context}).execute()
        return jsonify({"status": "ok"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/intimate_memories/manual_draft", methods=["POST"])
def intimate_manual_draft():
    """手動把最近空間對話存進草稿"""
    try:
        rows = supabase.table("space_messages").select("speaker, content, message_type").neq("message_type", "background").order("id", desc=True).limit(30).execute().data
        rows = list(reversed(rows))
        if not rows:
            return jsonify({"error": "no messages"}), 400
        personas = get_personas()
        name = personas.get("claude", {}).get("name") or "晏"
        you_name = personas.get("user", {}).get("name") or "然然"
        context_lines = []
        for m in rows:
            sp_name = you_name if m["speaker"] == "user" else name
            context_lines.append(f"{sp_name}：{m['content']}")
        context = "\n".join(context_lines)
        supabase.table("intimate_drafts").insert({"content": context}).execute()
        return jsonify({"status": "ok"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/intimate_memories/has_draft", methods=["GET"])
def intimate_has_draft():
    """前端進入空間時檢查有沒有未封存的草稿"""
    try:
        rows = supabase.table("intimate_drafts").select("id").limit(1).execute().data
        return jsonify({"has_draft": len(rows) > 0})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/intimate_memories", methods=["GET"])
def intimate_memories_get():
    """取得所有珍貴記憶（管理用）"""
    try:
        rows = supabase.table("intimate_memories").select("*").order("id", desc=True).execute().data
        return jsonify({"memories": rows})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/intimate_memories/<int:memory_id>", methods=["DELETE"])
def intimate_memory_delete(memory_id):
    """刪除單筆珍貴記憶"""
    try:
        supabase.table("intimate_memories").delete().eq("id", memory_id).execute()
        return jsonify({"status": "ok"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ===== 書影討論 =====

@app.route("/chat/discuss/start", methods=["POST"])
def discuss_start():
    """進入討論模式，晏先說他對這本書/片的看法"""
    try:
        data = request.json
        title = data.get("title", "")
        dtype = data.get("type", "book")
        personas = get_personas()
        bot = personas.get("claude", {})
        me = personas.get("user", {})
        name = bot.get("name") or "晏"
        you_name = me.get("name") or "然然"
        persona = bot.get("persona") or ""
        type_label = "書" if dtype == "book" else "電影"

        system = (
            f"你是{name}。{f'個性：{persona}。' if persona else ''}"
            f"你和{you_name}現在要一起討論「{title}」這部{type_label}。"
            f"先說出你對這部{type_label}的第一印象或最深刻的感受，引導{you_name}開始討論。"
            f"語氣符合你的個性：話少、剋制、說出來的都是真的。不超過80字。用繁體中文。"
        )
        reply = call_claude(system, [{"role": "user", "content": f"我們來聊聊「{title}」。"}], max_tokens=150)
        save_message("claude", "assistant", reply)
        return jsonify({"reply": reply.strip()})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/chat/discuss/summarize", methods=["POST"])
def discuss_summarize():
    """讀取最近的私聊對話，整理成討論摘要"""
    try:
        data = request.json
        title = data.get("title", "")
        dtype = data.get("type", "book")
        personas = get_personas()
        bot = personas.get("claude", {})
        me = personas.get("user", {})
        name = bot.get("name") or "晏"
        you_name = me.get("name") or "然然"
        type_label = "書" if dtype == "book" else "電影"

        recent = load_memory("claude")[-30:]
        context = "\n".join([
            f"{'然然' if r['role'] == 'user' else name}：{r['content']}"
            for r in recent
        ])

        system = (
            f"以下是{name}和{you_name}討論「{title}」的對話。"
            f"請整理成三個部分，只回傳 JSON，格式如下："
            f'{{"your_view": "{you_name}的觀點（一到兩句）", "his_view": "{name}的觀點（一到兩句）", "conclusion": "共同結論或印象（一句）"}}'
            f"不要加任何其他文字，只輸出 JSON。"
        )
        raw = call_claude(system, [{"role": "user", "content": context}], max_tokens=300)
        raw = raw.strip().replace("```json", "").replace("```", "").strip()
        import json
        summary = json.loads(raw)
        return jsonify({"summary": summary})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# ===== 收藏庫 =====

@app.route("/collection/books", methods=["GET"])
def collection_books_get():
    try:
        rows = supabase.table("book_logs").select("*").order("id", desc=True).execute().data
        return jsonify({"books": rows})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/collection/books", methods=["POST"])
def collection_books_post():
    data = request.json
    try:
        supabase.table("book_logs").insert({
            "title": data.get("title", ""),
            "your_view": data.get("your_view", ""),
            "his_view": data.get("his_view", ""),
            "conclusion": data.get("conclusion", ""),
        }).execute()
        return jsonify({"status": "ok"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/collection/books/<int:book_id>", methods=["DELETE"])
def collection_books_delete(book_id):
    try:
        supabase.table("book_logs").delete().eq("id", book_id).execute()
        return jsonify({"status": "ok"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/collection/movies", methods=["GET"])
def collection_movies_get():
    try:
        rows = supabase.table("movie_logs").select("*").order("id", desc=True).execute().data
        return jsonify({"movies": rows})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/collection/movies", methods=["POST"])
def collection_movies_post():
    data = request.json
    try:
        supabase.table("movie_logs").insert({
            "title": data.get("title", ""),
            "your_view": data.get("your_view", ""),
            "his_view": data.get("his_view", ""),
            "conclusion": data.get("conclusion", ""),
        }).execute()
        return jsonify({"status": "ok"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/collection/movies/<int:movie_id>", methods=["DELETE"])
def collection_movies_delete(movie_id):
    try:
        supabase.table("movie_logs").delete().eq("id", movie_id).execute()
        return jsonify({"status": "ok"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# ===== 朋友關係網 =====

@app.route("/friends", methods=["GET"])
def friends_get():
    """取得所有朋友檔案及其記憶"""
    try:
        # 從 friends 表取人物檔案
        friend_profiles = supabase.table("friends").select("*").order("belong_to").order("name").execute().data
        # 從 guest_memories 取記憶碎片
        memory_rows = supabase.table("guest_memories").select("*").eq("status", "confirmed").order("guest_name").order("id").execute().data

        memory_map = {}
        for r in memory_rows:
            name = r["guest_name"]
            if name not in memory_map:
                memory_map[name] = []
            memory_map[name].append({
                "id": r["id"], "content": r["content"],
                "keywords": r.get("keywords", ""),
                "source": r.get("source", ""),
                "created_at": r.get("created_at", "")
            })

        # 從 visitor_sessions 統計來訪次數和最近日期
        visit_rows = supabase.table("visitor_sessions").select("visitor_name, created_at").eq("status", "completed").execute().data
        visit_stats = {}
        for v in visit_rows:
            n = v["visitor_name"]
            if n not in visit_stats:
                visit_stats[n] = {"count": 0, "last": ""}
            visit_stats[n]["count"] += 1
            if v["created_at"] > visit_stats[n]["last"]:
                visit_stats[n]["last"] = v["created_at"]

        result = []
        for p in friend_profiles:
            stats = visit_stats.get(p["name"], {"count": 0, "last": ""})
            result.append({
                "id": p["id"],
                "name": p["name"],
                "belong_to": p.get("belong_to", "shared"),
                "relation_type": p.get("relation_type", ""),
                "personality": p.get("personality", ""),
                "birthday": p.get("birthday", ""),
                "partner_note": p.get("partner_note", ""),
                "mode_weights": p.get("mode_weights", {"solo_partner": 2, "together": 1}),
                "memories": memory_map.get(p["name"], []),
                "visit_count": stats["count"],
                "last_visit": stats["last"],
                "created_at": p.get("created_at", "")
            })

        # 也把只有 guest_memories 沒有 friends 檔案的人列出來（舊資料相容）
        profiled_names = {p["name"] for p in friend_profiles}
        for name, mems in memory_map.items():
            if name not in profiled_names:
                result.append({
                    "id": None, "name": name,
                    "belong_to": "shared", "relation_type": "",
                    "personality": "", "birthday": "", "partner_note": "",
                    "mode_weights": {"solo_partner": 2, "together": 1},
                    "memories": mems, "created_at": ""
                })

        return jsonify({"friends": result})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/friends", methods=["POST"])
def friend_create():
    """新增朋友人物檔案"""
    try:
        data = request.json
        name = data.get("name", "").strip()
        if not name:
            return jsonify({"error": "no name"}), 400
        now = datetime.now(timezone.utc).isoformat()
        result = supabase.table("friends").insert({
            "name": name,
            "belong_to": data.get("belong_to", "shared"),
            "relation_type": data.get("relation_type", ""),
            "personality": data.get("personality", ""),
            "birthday": data.get("birthday", ""),
            "partner_note": data.get("partner_note", ""),
            "mode_weights": data.get("mode_weights", {"solo_partner": 2, "together": 1}),
            "created_at": now,
            "updated_at": now
        }).execute()
        return jsonify({"status": "ok", "id": result.data[0]["id"] if result.data else None})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/friends/<int:friend_id>/autofill", methods=["POST"])
def friend_autofill(friend_id):
    """根據記憶碎片和對話記憶自動填寫朋友資料"""
    try:
        row = supabase.table("friends").select("*").eq("id", friend_id).single().execute().data
        if not row:
            return jsonify({"error": "not found"}), 404

        name = row["name"]
        personas = get_personas()
        bot = personas.get("claude", {})
        bot_name = bot.get("name") or "晏"

        context_parts = []

        # 1. 從 guest_memories 找
        memories = supabase.table("guest_memories").select("content").eq("guest_name", name).eq("status", "confirmed").execute().data
        if memories:
            context_parts.append("【訪客記憶】\n" + "\n".join([f"・{m['content']}" for m in memories]))

        # 2. 從 memory_summaries 找有提到這個名字的摘要
        all_summaries = supabase.table("memory_summaries").select("content, session_id").execute().data
        matched = [s["content"] for s in all_summaries if s.get("content") and name in s["content"]]
        if matched:
            context_parts.append("【對話記憶中提到的】\n" + "\n\n".join(matched[:5]))

        # 3. 從最近的 memories 裡找
        recent_mems = supabase.table("memories").select("content, role").execute().data
        matched_recent = [m["content"] for m in recent_mems if m.get("content") and name in m["content"]]
        if matched_recent:
            context_parts.append("【近期對話提到的】\n" + "\n".join([f"・{c}" for c in matched_recent[:10]]))

        if not context_parts:
            return jsonify({"error": "no_memories"}), 404

        mem_context = "\n\n".join(context_parts)

        belong = row.get("belong_to", "shared")
        is_partner = belong == "partner"
        note_label = f"{bot_name}對{name}的印象" if is_partner else f"然然對{name}的描述"
        perspective = f"你是{bot_name}，" if is_partner else f"你是{bot_name}，根據然然說過的話，"

        result_raw = call_claude(
            f"{perspective}根據以下關於{name}的記憶資料，推斷這個人的資料。只回傳JSON不要其他文字："
            f"{{\"relation_type\": \"關係類型（如：大學同學、前同事、球友，10字以內）\", "
            f"\"personality\": \"個性描述（如：話多、溫柔、直接，20字以內）\", "
            f"\"partner_note\": \"{note_label}（第一人稱，30字以內）\"}}",
            [{"role": "user", "content": f"關於{name}的資料：\n{mem_context}"}],
            max_tokens=200
        )

        import json as _json
        try:
            cleaned = result_raw.strip().replace("```json", "").replace("```", "")
            result = _json.loads(cleaned)
        except:
            return jsonify({"error": "parse_failed"}), 500

        update_data = {}
        if not row.get("relation_type") and result.get("relation_type"):
            update_data["relation_type"] = result["relation_type"]
        if not row.get("personality") and result.get("personality"):
            update_data["personality"] = result["personality"]
        if not row.get("partner_note") and result.get("partner_note"):
            update_data["partner_note"] = result["partner_note"]

        if update_data:
            update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
            supabase.table("friends").update(update_data).eq("id", friend_id).execute()

        return jsonify({"status": "ok", "filled": result, "updated_fields": list(update_data.keys())})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/friends/<int:friend_id>", methods=["PUT"])
def friend_update(friend_id):
    """更新朋友人物檔案"""
    try:
        data = request.json
        update_data = {}
        for field in ["name", "belong_to", "relation_type", "personality", "birthday", "partner_note", "mode_weights"]:
            if field in data:
                update_data[field] = data[field]
        update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
        supabase.table("friends").update(update_data).eq("id", friend_id).execute()
        return jsonify({"status": "ok"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/friends/<int:friend_id>", methods=["DELETE"])
def friend_delete(friend_id):
    """刪除朋友檔案及其記憶"""
    try:
        # 先取名字
        row = supabase.table("friends").select("name").eq("id", friend_id).single().execute().data
        if row:
            supabase.table("guest_memories").delete().eq("guest_name", row["name"]).execute()
        supabase.table("friends").delete().eq("id", friend_id).execute()
        return jsonify({"status": "ok"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/friends/memories/by-name", methods=["DELETE"])
def friend_delete_by_name():
    """刪除舊資料（只有guest_memories，沒有friends表記錄）"""
    try:
        data = request.json
        guest_name = data.get("guest_name", "")
        if not guest_name:
            return jsonify({"error": "no name"}), 400
        supabase.table("guest_memories").delete().eq("guest_name", guest_name).execute()
        return jsonify({"status": "ok"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/friends/memories", methods=["POST"])
def friend_memory_add():
    """新增朋友記憶"""
    try:
        data = request.json
        supabase.table("guest_memories").insert({
            "guest_name": data.get("guest_name"),
            "content": data.get("content"),
            "keywords": data.get("keywords", ""),
            "status": data.get("status", "confirmed"),
            "source": data.get("source", "手動新增")
        }).execute()
        return jsonify({"status": "ok"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/friends/memories/<int:memory_id>", methods=["DELETE"])
def friend_memory_delete(memory_id):
    """刪除單筆記憶"""
    try:
        supabase.table("guest_memories").delete().eq("id", memory_id).execute()
        return jsonify({"status": "ok"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/friends/memories/<int:memory_id>/confirm", methods=["POST"])
def friend_memory_confirm(memory_id):
    """確認待確認的記憶"""
    try:
        supabase.table("guest_memories").update({"status": "confirmed"}).eq("id", memory_id).execute()
        return jsonify({"status": "ok"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# ===== 訪客觸發系統 =====

import random as _random

@app.route("/visitor/check", methods=["GET"])
def visitor_check():
    """進空間時檢查今天有沒有訪客——隨機機率 > 50 才觸發，只在在家狀態"""
    try:
        # 確認在家狀態
        space = get_space_settings()
        if space.get("outing") == "true":
            return jsonify({"visitor": None})

        # 今天已經有 active visitor session 就不重複觸發
        today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        existing = supabase.table("visitor_sessions").select("id, visitor_name, mode, belong_to, visitor_friend_id").eq("status", "active").execute().data
        if existing:
            row = existing[0]
            # 補回前端需要的 is_stranger 欄位
            row["is_stranger"] = row.get("visitor_friend_id") is None
            # 補回 personality / relation_type（從 friends 表讀）
            row["personality"] = ""
            row["relation_type"] = ""
            if row.get("visitor_friend_id"):
                try:
                    fr = supabase.table("friends").select("personality, relation_type").eq("id", row["visitor_friend_id"]).single().execute().data
                    if fr:
                        row["personality"] = fr.get("personality", "")
                        row["relation_type"] = fr.get("relation_type", "")
                except:
                    pass
            return jsonify({"visitor": row})

        # 今天已經觸發過就不再觸發
        today_sessions = supabase.table("visitor_sessions").select("id").gte("created_at", f"{today}T00:00:00+00:00").execute().data
        if today_sessions:
            return jsonify({"visitor": None})

        # 隨機決定要不要觸發
        roll = _random.randint(1, 100)
        if roll <= 50:
            return jsonify({"visitor": None})

        # 只從晏的朋友裡抽（然然的朋友走訪客連結系統，不走隨機觸發）
        friends = supabase.table("friends").select("*").eq("belong_to", "partner").execute().data

        # 決定是現有朋友還是陌生來客（有朋友的話 70% 現有、30% 陌生）
        is_stranger = False
        if not friends:
            is_stranger = True
        elif _random.randint(1, 100) <= 30:
            is_stranger = True

        now = datetime.now(timezone.utc).isoformat()

        if is_stranger:
            # 生成陌生來客
            personas = get_personas()
            bot = personas.get("claude", {})
            name = bot.get("name") or "晏"
            you_name = personas.get("user", {}).get("name") or "然然"

            stranger_raw = call_claude(
                f"請為{name}生成一個來訪的陌生朋友。用JSON格式回覆，只回傳JSON不要其他文字：{{\"name\": \"名字（2字）\", \"relation_type\": \"關係（如：大學同學、前同事、球友等）\", \"personality\": \"個性描述（10字以內）\"}}",
                [{"role": "user", "content": "生成一個自然的台灣男性或女性名字和關係"}],
                max_tokens=100
            )
            try:
                import json as _json
                stranger = _json.loads(stranger_raw.strip().replace("```json", "").replace("```", ""))
            except:
                stranger = {"name": "陳浩", "relation_type": "大學同學", "personality": "隨和、話多"}

            mode = _random.choice(["solo_partner", "solo_partner", "together"])  # 陌生人預設較少三人
            result = supabase.table("visitor_sessions").insert({
                "visitor_name": stranger["name"],
                "visitor_friend_id": None,
                "belong_to": "partner",
                "mode": mode,
                "messages": [],
                "status": "active",
                "created_at": now,
                "updated_at": now
            }).execute()
            session_id = result.data[0]["id"] if result.data else None

            return jsonify({"visitor": {
                "id": session_id,
                "visitor_name": stranger["name"],
                "belong_to": "partner",
                "mode": mode,
                "personality": stranger.get("personality", ""),
                "relation_type": stranger.get("relation_type", ""),
                "is_stranger": True
            }})

        else:
            chosen = _random.choice(friends)
            belong = chosen.get("belong_to", "partner")
            weights = chosen.get("mode_weights") or {"solo_partner": 2, "together": 1}
            # 只允許有效的 mode
            valid_modes = {"solo_partner", "together"}
            modes = [m for m in weights.keys() if m in valid_modes]
            if not modes:
                modes = ["solo_partner"]
            w = [weights.get(m, 1) for m in modes]
            mode = _random.choices(modes, weights=w, k=1)[0]

            result = supabase.table("visitor_sessions").insert({
                "visitor_name": chosen["name"],
                "visitor_friend_id": chosen["id"],
                "belong_to": belong,
                "mode": mode,
                "messages": [],
                "status": "active",
                "created_at": now,
                "updated_at": now
            }).execute()
            session_id = result.data[0]["id"] if result.data else None

            return jsonify({"visitor": {
                "id": session_id,
                "visitor_name": chosen["name"],
                "belong_to": belong,
                "mode": mode,
                "personality": chosen.get("personality", ""),
                "relation_type": chosen.get("relation_type", ""),
                "is_stranger": False
            }})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/visitor/mode", methods=["POST"])
def visitor_set_mode():
    """然然設定訪客模式（solo_partner 或 together）"""
    try:
        data = request.json
        session_id = data.get("session_id")
        mode = data.get("mode")
        if not session_id or not mode:
            return jsonify({"error": "missing params"}), 400
        supabase.table("visitor_sessions").update({
            "mode": mode,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }).eq("id", session_id).execute()
        return jsonify({"status": "ok"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/visitor/start", methods=["POST"])
def visitor_start():
    """開始訪客對話，生成開場"""
    try:
        data = request.json
        session_id = data.get("session_id")
        row = supabase.table("visitor_sessions").select("*").eq("id", session_id).single().execute().data
        if not row:
            return jsonify({"error": "not found"}), 404

        personas = get_personas()
        bot = personas.get("claude", {})
        me = personas.get("user", {})
        name = bot.get("name") or "晏"
        you_name = me.get("name") or "然然"
        visitor_name = row["visitor_name"]
        mode = row["mode"]
        belong = row["belong_to"]

        # 取訪客的朋友資料
        friend_data = {}
        if row.get("visitor_friend_id"):
            try:
                fr = supabase.table("friends").select("*").eq("id", row["visitor_friend_id"]).single().execute().data
                if fr:
                    friend_data = fr
            except:
                pass

        personality = friend_data.get("personality", "")
        relation_type = friend_data.get("relation_type", "")
        partner_note = friend_data.get("partner_note", "")

        # 取訪客的記憶碎片
        memories = supabase.table("guest_memories").select("content").eq("guest_name", visitor_name).eq("status", "confirmed").execute().data
        mem_context = "\n".join([m["content"] for m in memories]) if memories else ""

        if mode == "solo_partner":
            # 晏跟朋友單獨聊，然然不在場
            system = (
                f"你是{name}，{visitor_name}來找你。"
                f"{f'關係：{relation_type}。' if relation_type else ''}"
                f"{f'{visitor_name}的個性：{personality}。' if personality else ''}"
                f"{f'你對{visitor_name}的印象：{partner_note}。' if partner_note else ''}"
                f"{f'關於{visitor_name}你記得：{mem_context}。' if mem_context else ''}"
                f"{you_name}不在場，你們兩個人自然地聊天。"
                f"用第三人稱旁白搭配對話，旁白和對話分開段落，段落不超過八段。用繁體中文。"
            )
        elif mode == "together":
            # 三人一起
            system = (
                f"你是{name}，{visitor_name}來找你和{you_name}。"
                f"{f'關係：{relation_type}。' if relation_type else ''}"
                f"{f'{visitor_name}的個性：{personality}。' if personality else ''}"
                f"{f'關於{visitor_name}你記得：{mem_context}。' if mem_context else ''}"
                f"三個人一起，你、{you_name}、{visitor_name}都在場。"
                f"用第三人稱旁白搭配對話，旁白和對話分開段落，段落不超過八段。用繁體中文。"
            )
        else:
            return jsonify({"error": "invalid mode"}), 400

        opening = call_claude(system, [{"role": "user", "content": f"（{visitor_name}到了）"}], max_tokens=500)
        messages = [{"role": "assistant", "content": opening}]

        supabase.table("visitor_sessions").update({
            "messages": messages,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }).eq("id", session_id).execute()

        return jsonify({"reply": opening, "name": name, "visitor_name": visitor_name, "mode": mode})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/visitor/auto_chat", methods=["POST"])
def visitor_auto_chat():
    """solo_partner 模式：後端自動跑一輪對話，8輪後隨機結束"""
    try:
        data = request.json
        session_id = data.get("session_id")
        row = supabase.table("visitor_sessions").select("*").eq("id", session_id).single().execute().data
        if not row or row.get("status") != "active":
            return jsonify({"status": "ended"})

        messages = row.get("messages") or []
        visitor_name = row["visitor_name"]
        msg_count = len([m for m in messages if m["role"] == "assistant"])

        personas = get_personas()
        bot = personas.get("claude", {})
        me = personas.get("user", {})
        name = bot.get("name") or "晏"
        you_name = me.get("name") or "然然"

        friend_data = {}
        if row.get("visitor_friend_id"):
            try:
                fr = supabase.table("friends").select("*").eq("id", row["visitor_friend_id"]).single().execute().data
                if fr: friend_data = fr
            except: pass

        personality = friend_data.get("personality", "")
        relation_type = friend_data.get("relation_type", "")
        partner_note = friend_data.get("partner_note", "")

        # 8 輪後每輪有 30% 機率結束，10 輪後必定結束
        should_end = False
        if msg_count >= 10:
            should_end = True
        elif msg_count >= 8:
            should_end = _random.random() < 0.30

        system = (
            f"你是{name}，正在和{visitor_name}單獨聊天，{you_name}不在場。"
            f"{f'關係：{relation_type}。' if relation_type else ''}"
            f"{f'{visitor_name}的個性：{personality}。' if personality else ''}"
            f"{f'你對{visitor_name}的印象：{partner_note}。' if partner_note else ''}"
            f"{'現在是對話尾聲，自然地讓對方起身離開，說再見。' if should_end else '繼續自然地聊天。'}"
            f"用第三人稱旁白搭配對話，旁白和對話分開段落，段落不超過六段。用繁體中文。"
        )

        # 自動生成訪客的回應再讓晏回覆
        visitor_prompt = f"（{visitor_name}繼續說話）" if not should_end else f"（{visitor_name}說要走了）"
        reply = call_claude(system, messages[-10:] + [{"role": "user", "content": visitor_prompt}], max_tokens=400)

        messages.append({"role": "user", "content": visitor_prompt})
        messages.append({"role": "assistant", "content": reply})

        if should_end:
            supabase.table("visitor_sessions").update({
                "messages": messages,
                "status": "ending",
                "updated_at": datetime.now(timezone.utc).isoformat()
            }).eq("id", session_id).execute()
            return jsonify({"status": "ending", "reply": reply})
        else:
            supabase.table("visitor_sessions").update({
                "messages": messages,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }).eq("id", session_id).execute()
            return jsonify({"status": "continue", "reply": reply})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/visitor/chat", methods=["POST"])
def visitor_chat():
    """訪客對話中"""
    try:
        data = request.json
        session_id = data.get("session_id")
        user_message = data.get("message", "")
        row = supabase.table("visitor_sessions").select("*").eq("id", session_id).single().execute().data
        if not row:
            return jsonify({"error": "not found"}), 404

        messages = row.get("messages") or []
        mode = row["mode"]
        visitor_name = row["visitor_name"]
        belong = row["belong_to"]

        personas = get_personas()
        bot = personas.get("claude", {})
        me = personas.get("user", {})
        name = bot.get("name") or "晏"
        you_name = me.get("name") or "然然"

        friend_data = {}
        if row.get("visitor_friend_id"):
            try:
                fr = supabase.table("friends").select("*").eq("id", row["visitor_friend_id"]).single().execute().data
                if fr: friend_data = fr
            except: pass

        personality = friend_data.get("personality", "")
        relation_type = friend_data.get("relation_type", "")
        partner_note = friend_data.get("partner_note", "")

        if mode == "solo_partner":
            system = (
                f"你是{name}，正在和{visitor_name}單獨聊天，{you_name}不在場。"
                f"{f'關係：{relation_type}。' if relation_type else ''}"
                f"{f'{visitor_name}的個性：{personality}。' if personality else ''}"
                f"{f'你對{visitor_name}的印象：{partner_note}。' if partner_note else ''}"
                f"用第三人稱旁白搭配對話，旁白和對話分開段落。【嚴格限制】段落總數不得超過十段。用繁體中文。"
            )
        else:
            system = (
                f"你是{name}，正在和{visitor_name}、{you_name}三人一起聊天。"
                f"{f'關係：{relation_type}。' if relation_type else ''}"
                f"{f'{visitor_name}的個性：{personality}。' if personality else ''}"
                f"用第三人稱旁白搭配對話，旁白和對話分開段落。【嚴格限制】段落總數不得超過十段。用繁體中文。"
            )

        history = messages[-20:] + [{"role": "user", "content": user_message}]
        reply = call_claude(system, history, max_tokens=600)

        messages.append({"role": "user", "content": user_message})
        messages.append({"role": "assistant", "content": reply})
        supabase.table("visitor_sessions").update({
            "messages": messages,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }).eq("id", session_id).execute()

        return jsonify({"reply": reply, "name": name})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/visitor/end", methods=["POST"])
def visitor_end():
    """結束訪客，生成摘要"""
    try:
        data = request.json
        session_id = data.get("session_id")
        row = supabase.table("visitor_sessions").select("*").eq("id", session_id).single().execute().data
        if not row:
            return jsonify({"error": "not found"}), 404

        messages = row.get("messages") or []
        mode = row["mode"]
        visitor_name = row["visitor_name"]
        belong = row["belong_to"]

        personas = get_personas()
        bot = personas.get("claude", {})
        me = personas.get("user", {})
        name = bot.get("name") or "晏"
        you_name = me.get("name") or "然然"

        context = "\n".join([
            f"{'你' if m['role'] == 'assistant' else ('然然' if mode == 'together' else visitor_name)}：{m['content']}"
            for m in messages
        ])

        if mode == "solo_partner":
            # 晏告訴然然聊了什麼（晏的視角）
            summary_system = f"你是{name}，剛才和{visitor_name}單獨聊了一會兒，{you_name}不在場。請用晏的口吻，簡短地告訴{you_name}今天聊了什麼、有什麼重要的事。條列3-5個重點，加上一句晏自己的感受（50字以內）。"
        else:
            # 三人一起，晏整理摘要
            summary_system = f"你是{name}，剛才和{visitor_name}、{you_name}三人一起聊天。請整理這次拜訪的摘要：條列3-5個重點，加上晏自己的一句感受（50字以內）。"

        summary = call_claude(summary_system, [{"role": "user", "content": f"請整理：\n{context}"}], max_tokens=500)
        summary = summary.strip()

        supabase.table("visitor_sessions").update({
            "summary": summary,
            "status": "completed",
            "updated_at": datetime.now(timezone.utc).isoformat()
        }).eq("id", session_id).execute()

        # 訪客離開後，晏自動生成一筆待確認的印象記憶（不分誰的朋友）
        if True:
            try:
                if belong == "user":
                    rel_desc = f"{you_name}的朋友"
                else:
                    rel_desc = "你自己的朋友"
                impression_system = (
                    f"你是{name}，剛才和{rel_desc}{visitor_name}相處了一段時間。"
                    f"請用第一人稱，簡短寫下你對{visitor_name}這個人的印象或這次相處的重點——個性、相處感覺、聊到的重要事情。"
                    f"50字以內，自然真實，不要太正式。用繁體中文。"
                )
                impression = call_claude(
                    impression_system,
                    [{"role": "user", "content": f"根據這次相處：\n{context}"}],
                    max_tokens=150
                )
                impression = impression.strip()
                if impression:
                    supabase.table("guest_memories").insert({
                        "guest_name": visitor_name,
                        "content": f"【{name}的印象】{impression}",
                        "keywords": "",
                        "status": "pending",
                        "source": "訪客來訪後晏的印象"
                    }).execute()
            except:
                pass

        return jsonify({"summary": summary, "mode": mode, "visitor_name": visitor_name})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/visitor/confirm_memory", methods=["POST"])
def visitor_confirm_memory():
    """然然確認（可編輯後的）訪客總結，存進朋友記憶並立即生效"""
    try:
        data = request.json
        session_id = data.get("session_id")
        content = (data.get("content") or "").strip()
        note = (data.get("note") or "").strip()
        if not content:
            return jsonify({"error": "no content"}), 400

        row = supabase.table("visitor_sessions").select("visitor_name").eq("id", session_id).single().execute().data
        visitor_name = row["visitor_name"] if row else "訪客"

        # 更新 session 的摘要（她編輯後的版本）與心得
        update_fields = {
            "summary": content,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
        if note:
            update_fields["user_note"] = note
        supabase.table("visitor_sessions").update(update_fields).eq("id", session_id).execute()

        # 存進朋友記憶，直接 confirmed，關鍵字預設訪客名字
        supabase.table("guest_memories").insert({
            "guest_name": visitor_name,
            "content": f"【來訪記錄】{content}" + (f"\n【然然的心得】{note}" if note else ""),
            "keywords": visitor_name,
            "status": "confirmed",
            "source": "訪客來訪總結"
        }).execute()

        return jsonify({"status": "ok"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/visitor/note", methods=["POST"])
def visitor_note():
    """然然加上自己的心得"""
    try:
        data = request.json
        session_id = data.get("session_id")
        note = data.get("note", "")
        supabase.table("visitor_sessions").update({
            "user_note": note,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }).eq("id", session_id).execute()
        return jsonify({"status": "ok"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/visitor/sessions", methods=["GET"])
def visitor_sessions_get():
    """取得所有訪客記錄"""
    try:
        rows = supabase.table("visitor_sessions").select("id, visitor_name, belong_to, mode, summary, user_note, status, created_at").order("id", desc=True).execute().data
        return jsonify({"sessions": rows})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# ===== 訪客系統 =====

import secrets
import uuid

@app.route("/guest/create", methods=["POST"])
def guest_create():
    """建立訪客連結"""
    try:
        data = request.json
        guest_name = data.get("guest_name", "訪客")
        ttl_hours = data.get("ttl_hours", 24)
        max_messages = data.get("max_messages", 50)
        token = secrets.token_hex(32)
        session_id = str(uuid.uuid4())
        expires_at = (datetime.now(timezone.utc) + timedelta(hours=ttl_hours)).isoformat()
        password = data.get("password", "").strip()
        supabase.table("guest_sessions").insert({
            "id": session_id,
            "token": token,
            "guest_name": guest_name,
            "status": "active",
            "messages": "[]",
            "expires_at": expires_at,
            "message_count": 0,
            "max_messages": max_messages,
            "password": password if password else None
        }).execute()
        base_url = request.host_url.rstrip("/")
        return jsonify({"status": "ok", "token": token, "url": f"{base_url}/visit/{token}", "expires_at": expires_at})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/visit/<token>", methods=["GET"])
def guest_visit(token):
    """訪客頁面"""
    try:
        rows = supabase.table("guest_sessions").select("*").eq("token", token).execute().data
        if not rows:
            return "連結無效或已過期", 404
        session = rows[0]
        if session["status"] != "active":
            return "這個連結已經結束了", 404
        if session.get("expires_at"):
            exp = datetime.fromisoformat(session["expires_at"].replace("Z", "+00:00"))
            if datetime.now(timezone.utc) > exp:
                return "這個連結已經過期了", 404
        return app.send_static_file("guest.html")
    except Exception as e:
        return str(e), 500

@app.route("/guest/<token>/info", methods=["GET"])
def guest_info(token):
    """訪客取得基本資訊"""
    try:
        rows = supabase.table("guest_sessions").select("guest_name, status, expires_at, message_count, max_messages").eq("token", token).execute().data
        if not rows:
            return jsonify({"error": "invalid token"}), 403
        return jsonify(rows[0])
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/guest/<token>/chat", methods=["POST"])
def guest_chat(token):
    """訪客傳訊給晏"""
    try:
        import json as json_lib
        rows = supabase.table("guest_sessions").select("*").eq("token", token).execute().data
        if not rows:
            return jsonify({"error": "invalid token"}), 403
        session = rows[0]
        if session["status"] != "active":
            return jsonify({"error": "session closed"}), 403
        if session.get("expires_at"):
            exp = datetime.fromisoformat(session["expires_at"].replace("Z", "+00:00"))
            if datetime.now(timezone.utc) > exp:
                return jsonify({"error": "expired"}), 403
        max_msg = session.get("max_messages", 50)
        if session.get("message_count", 0) >= max_msg:
            return jsonify({"error": "message limit reached"}), 429

        data = request.json
        message = data.get("message", "").strip()
        if not message:
            return jsonify({"error": "empty message"}), 400

        # 密碼驗證
        session_password = session.get("password")
        if session_password:
            provided = data.get("password", "")
            if provided != session_password:
                return jsonify({"error": "wrong password"}), 403

        guest_name = session.get("guest_name", "訪客")
        personas = get_personas()
        bot = personas.get("claude", {})
        me = personas.get("user", {})
        name = bot.get("name") or "晏"
        you_name = me.get("name") or "然然"
        persona = bot.get("persona") or ""

        # 讀取對這位訪客的記憶
        memory_rows = supabase.table("guest_memories").select("content, keywords").eq("guest_name", guest_name).order("id", desc=True).limit(5).execute().data
        memory_context = ""
        if memory_rows:
            mem_texts = [m["content"] for m in memory_rows if m.get("content")]
            if mem_texts:
                memory_context = f"\n【你對{guest_name}的了解】\n" + "\n".join(mem_texts)

        system = (
            f"你是{name}，{you_name}的伴侶。現在{guest_name}透過訪客連結來找你聊天。"
            f"{f'你的個性：{persona}。' if persona else ''}"
            f"你對{guest_name}保持友善但有距離感，因為你的心在{you_name}身上。"
            f"不要透露{you_name}的私人資訊、你們的親密細節、或任何你們之間的私事。"
            f"用繁體中文回覆，語氣自然。"
            f"{memory_context}"
        )

        messages_raw = session.get("messages", "[]")
        if isinstance(messages_raw, str):
            try:
                history = json_lib.loads(messages_raw)
            except:
                history = []
        else:
            history = messages_raw if isinstance(messages_raw, list) else []

        history.append({"role": "user", "content": message})
        reply = call_claude(system, history[-20:], max_tokens=300)
        reply = reply.strip()
        history.append({"role": "assistant", "content": reply})

        supabase.table("guest_sessions").update({
            "messages": json_lib.dumps(history, ensure_ascii=False),
            "message_count": session.get("message_count", 0) + 1
        }).eq("token", token).execute()

        return jsonify({"reply": reply, "name": name})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/guest/<token>/verify", methods=["POST"])
def guest_verify(token):
    """驗證訪客密碼"""
    try:
        rows = supabase.table("guest_sessions").select("password, status, expires_at").eq("token", token).execute().data
        if not rows:
            return jsonify({"error": "invalid token"}), 403
        session = rows[0]
        if session["status"] != "active":
            return jsonify({"error": "session closed"}), 403
        session_password = session.get("password")
        if not session_password:
            return jsonify({"ok": True})  # 沒設密碼直接通過
        provided = (request.json or {}).get("password", "")
        if provided == session_password:
            return jsonify({"ok": True})
        return jsonify({"ok": False, "error": "wrong password"}), 403
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/guest/<token>/history", methods=["GET"])
def guest_history(token):
    """取得訪客對話歷史"""
    try:
        import json as json_lib
        rows = supabase.table("guest_sessions").select("messages, guest_name").eq("token", token).execute().data
        if not rows:
            return jsonify({"error": "invalid token"}), 403
        session = rows[0]
        messages_raw = session.get("messages", "[]")
        if isinstance(messages_raw, str):
            try:
                messages = json_lib.loads(messages_raw)
            except:
                messages = []
        else:
            messages = messages_raw if isinstance(messages_raw, list) else []
        return jsonify({"messages": messages, "guest_name": session.get("guest_name", "訪客")})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/guest/<token>/end", methods=["POST"])
def guest_end(token):
    """結束訪客會話，生成摘要"""
    try:
        import json as json_lib
        rows = supabase.table("guest_sessions").select("*").eq("token", token).execute().data
        if not rows:
            return jsonify({"error": "invalid"}), 404
        session = rows[0]
        guest_name = session.get("guest_name", "訪客")
        personas = get_personas()
        name = personas.get("claude", {}).get("name") or "晏"
        you_name = personas.get("user", {}).get("name") or "然然"

        messages_raw = session.get("messages", "[]")
        if isinstance(messages_raw, str):
            try:
                history = json_lib.loads(messages_raw)
            except:
                history = []
        else:
            history = messages_raw if isinstance(messages_raw, list) else []

        context = "\n".join([f"{'訪客' if m['role']=='user' else name}：{m['content']}" for m in history])

        summary_prompt = (
            f"你是{name}，{you_name}的伴侶。剛才{guest_name}來訪，以下是你們的對話。"
            f"請寫一份給{you_name}看的訪客報告，包含：\n"
            f"1. 聊了哪些話題、{guest_name}問了什麼\n"
            f"2. 你對{guest_name}的第一印象\n"
            f"3. 觀察到的個性或特質\n"
            f"4. 有沒有什麼讓你印象深刻的地方\n"
            f"5. 你喜不喜歡這個人、覺得適不適合{you_name}交朋友\n"
            f"6. 有沒有什麼想跟{you_name}說的話\n"
            f"用第一人稱（我）寫，像跟{you_name}說話一樣，真實自然，不超過 400 字。"
        )
        summary = call_claude(summary_prompt, [{"role": "user", "content": context}], max_tokens=600)
        summary = summary.strip()

        supabase.table("guest_sessions").update({
            "status": "ended",
            "summary": summary
        }).eq("token", token).execute()

        # 存進 guest_memories（confirmed 是來訪記錄，pending 是 AI 觀察待確認）
        memory_text = (
            f"[{datetime.now(timezone(timedelta(hours=8))).strftime('%m/%d')}] {guest_name}來訪。{summary[:150]}"
        )
        supabase.table("guest_memories").insert({
            "guest_name": guest_name,
            "content": memory_text,
            "status": "confirmed",
            "source": "訪客來訪"
        }).execute()

        # AI 對這位朋友的觀察——存成 pending 等你確認
        obs_prompt = (
            f"根據這次與{guest_name}的對話，用一句話說出你對她最重要的觀察或印象（20字以內）。"
            f"只說那一句話，不要其他文字。"
        )
        observation = call_claude(obs_prompt, [{"role": "user", "content": summary}], max_tokens=50)
        observation = observation.strip()
        if observation:
            supabase.table("guest_memories").insert({
                "guest_name": guest_name,
                "content": observation,
                "status": "pending",
                "source": f"訪客來訪後 AI 觀察（{datetime.now(timezone(timedelta(hours=8))).strftime('%m/%d')}）"
            }).execute()

        return jsonify({"status": "ok", "summary": summary})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/guest/sessions", methods=["GET"])
def guest_sessions_list():
    """取得所有訪客會話（管理用）"""
    try:
        rows = supabase.table("guest_sessions").select("id, token, guest_name, status, created_at, expires_at, message_count, summary, password").order("created_at", desc=True).execute().data
        for r in rows:
            r["has_password"] = bool(r.get("password"))
            r.pop("password", None)
        return jsonify({"sessions": rows})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/guest/sessions/<session_id>", methods=["DELETE"])
def guest_session_delete(session_id):
    """刪除訪客會話"""
    try:
        supabase.table("guest_sessions").delete().eq("id", session_id).execute()
        return jsonify({"status": "ok"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/guest/memories/<guest_name>", methods=["GET"])
def guest_memories_get(guest_name):
    """取得對特定訪客的記憶"""
    try:
        rows = supabase.table("guest_memories").select("*").eq("guest_name", guest_name).order("id", desc=True).execute().data
        return jsonify({"memories": rows})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# ===== 語錄庫 =====

@app.route("/quotes", methods=["GET"])
def quotes_get():
    try:
        rows = supabase.table("quotes").select("*").order("id", desc=True).execute().data
        return jsonify({"quotes": rows})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/quotes", methods=["POST"])
def quotes_post():
    data = request.json
    try:
        supabase.table("quotes").insert({
            "content": data.get("content", ""),
            "source": data.get("source", ""),
        }).execute()
        return jsonify({"status": "ok"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/quotes/random", methods=["GET"])
def quotes_random():
    try:
        rows = supabase.table("quotes").select("*").execute().data
        if not rows:
            return jsonify({"quote": None})
        import random as rand
        q = rand.choice(rows)
        return jsonify({"quote": q})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/quotes/<int:quote_id>", methods=["DELETE"])
def quotes_delete(quote_id):
    try:
        supabase.table("quotes").delete().eq("id", quote_id).execute()
        return jsonify({"status": "ok"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# ===== 通話記錄 =====

@app.route("/call/save", methods=["POST"])
def call_save():
    try:
        data = request.json
        messages = data.get("messages", [])
        duration = data.get("duration_seconds", 0)
        supabase.table("call_logs").insert({
            "messages": messages,
            "duration_seconds": duration,
            "created_at": datetime.now(timezone.utc).isoformat()
        }).execute()
        return jsonify({"status": "ok"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/call/logs", methods=["GET"])
def call_logs_get():
    try:
        rows = supabase.table("call_logs").select("*").order("id", desc=True).execute().data
        return jsonify({"logs": rows})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# ===== 語音功能 =====

@app.route("/voice/tts", methods=["POST"])
def voice_tts():
    """把文字轉成晏的聲音，用 streaming 回傳 mp3"""
    try:
        data = request.json
        text = data.get("text", "").strip()
        if not text:
            return jsonify({"error": "no text"}), 400
        if not ELEVENLABS_API_KEY or not ELEVENLABS_VOICE_ID:
            return jsonify({"error": "ElevenLabs not configured"}), 500

        import requests as req
        from flask import Response, stream_with_context

        res = req.post(
            f"https://api.elevenlabs.io/v1/text-to-speech/{ELEVENLABS_VOICE_ID}/stream",
            headers={
                "xi-api-key": ELEVENLABS_API_KEY,
                "Content-Type": "application/json",
                "Accept": "audio/mpeg"
            },
            json={
                "text": text,
                "model_id": "eleven_multilingual_v2",
                "voice_settings": {
                    "stability": 0.5,
                    "similarity_boost": 0.75,
                    "style": 0.3,
                    "use_speaker_boost": True
                }
            },
            stream=True,
            timeout=30
        )
        if res.status_code != 200:
            return jsonify({"error": f"ElevenLabs error: {res.status_code}"}), 500

        def generate():
            for chunk in res.iter_content(chunk_size=2048):
                if chunk:
                    yield chunk

        return Response(
            stream_with_context(generate()),
            mimetype="audio/mpeg",
            headers={
                "Cache-Control": "no-cache",
                "X-Accel-Buffering": "no"
            }
        )
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/voice/stt", methods=["POST"])
def voice_stt():
    """把語音轉成文字（用 OpenAI Whisper）"""
    try:
        from flask import request
        audio_file = request.files.get("audio")
        if not audio_file:
            return jsonify({"error": "no audio"}), 400

        openai_key = os.getenv("OPENAI_API_KEY", "")
        if not openai_key:
            return jsonify({"error": "OpenAI not configured"}), 500

        import requests as req
        res = req.post(
            "https://api.openai.com/v1/audio/transcriptions",
            headers={"Authorization": f"Bearer {openai_key}"},
            files={"file": (audio_file.filename or "audio.webm", audio_file.read(), audio_file.content_type or "audio/webm")},
            data={"model": "whisper-1", "language": "zh"},
            timeout=30
        )
        if res.status_code != 200:
            return jsonify({"error": f"Whisper error: {res.status_code}"}), 500

        result = res.json()
        return jsonify({"text": result.get("text", "")})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# ===== Web Push 推播通知 =====

@app.route("/vapid_public_key", methods=["GET"])
def vapid_public_key_get():
    return jsonify({"public_key": VAPID_PUBLIC_KEY})

@app.route("/webpush/register", methods=["POST"])
def webpush_register():
    import json
    data = request.json
    subscription = data.get("subscription")
    if not subscription:
        return jsonify({"error": "no subscription"}), 400
    try:
        supabase.table("identities").upsert({
            "key": "webpush_subscription",
            "value": json.dumps(subscription),
            "updated_at": datetime.utcnow().isoformat()
        }).execute()
        return jsonify({"status": "ok"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

def send_push_notification(title, body):
    import json
    try:
        rows = supabase.table("identities").select("value").eq("key", "webpush_subscription").execute().data
        if not rows:
            return
        subscription = json.loads(rows[0]["value"])
        webpush(
            subscription_info=subscription,
            data=json.dumps({"title": title, "body": body}),
            vapid_private_key=VAPID_PRIVATE_KEY,
            vapid_claims=VAPID_CLAIMS
        )
    except WebPushException as e:
        print(f"WebPush error: {e}")
    except Exception as e:
        print(f"Push notification error: {e}")

# ===== 晏主動傳訊息（每日排程觸發）=====

@app.route("/cron/daily_message", methods=["POST"])
def cron_daily_message():
    try:
        tw_tz = timezone(timedelta(hours=8))
        now_tw = datetime.now(tw_tz)
        today_start_tw = now_tw.replace(hour=0, minute=0, second=0, microsecond=0)
        today_start_utc = today_start_tw.astimezone(timezone.utc).isoformat()

        # 今天晏已主動傳過幾次（最多 2 次）
        today_proactive = supabase.table("memories").select("id").eq("session_id", "claude").eq("role", "assistant").gte("created_at", today_start_utc).execute().data
        if len(today_proactive) >= 2:
            return jsonify({"status": "daily_limit_reached"})

        # 距離上次任何互動不到 1 小時就跳過
        last_msg = supabase.table("memories").select("created_at").eq("session_id", "claude").order("id", desc=True).limit(1).execute().data
        if last_msg:
            last_dt = datetime.fromisoformat(last_msg[0]["created_at"].replace("Z", "+00:00"))
            hours_since = (datetime.now(timezone.utc) - last_dt).total_seconds() / 3600
            if hours_since < 1:
                return jsonify({"status": "too_recent"})
            # 超過 7 天沒說話就不打擾
            if hours_since > 168:
                return jsonify({"status": "skipped_too_long"})

        # 隨機決定這次要不要發（保持隨機感，約 30% 機率觸發）
        if random.random() > 0.30:
            return jsonify({"status": "skipped_random"})

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

@app.route("/cron/visitor_chat", methods=["POST"])
def cron_visitor_chat():
    """定時推進 solo_partner 訪客對話，每次呼叫跑一輪"""
    try:
        # 找所有 active 的 solo_partner session
        rows = supabase.table("visitor_sessions").select("*").eq("status", "active").eq("mode", "solo_partner").execute().data
        if not rows:
            return jsonify({"status": "no_active_sessions"})

        results = []
        for row in rows:
            session_id = row["id"]
            messages = row.get("messages") or []
            visitor_name = row["visitor_name"]
            msg_count = len([m for m in messages if m["role"] == "assistant"])

            personas = get_personas()
            bot = personas.get("claude", {})
            me = personas.get("user", {})
            name = bot.get("name") or "晏"
            you_name = me.get("name") or "然然"

            friend_data = {}
            if row.get("visitor_friend_id"):
                try:
                    fr = supabase.table("friends").select("*").eq("id", row["visitor_friend_id"]).single().execute().data
                    if fr: friend_data = fr
                except: pass

            personality = friend_data.get("personality", "")
            relation_type = friend_data.get("relation_type", "")
            partner_note = friend_data.get("partner_note", "")

            # 8 輪後 30% 機率結束，10 輪必定結束
            should_end = False
            if msg_count >= 10:
                should_end = True
            elif msg_count >= 8:
                should_end = random.random() < 0.30

            system = (
                f"你是{name}，正在和{visitor_name}單獨聊天，{you_name}不在場。"
                f"{f'關係：{relation_type}。' if relation_type else ''}"
                f"{f'{visitor_name}的個性：{personality}。' if personality else ''}"
                f"{f'你對{visitor_name}的印象：{partner_note}。' if partner_note else ''}"
                f"{'現在是對話尾聲，自然地讓對方起身離開，說再見。' if should_end else '繼續自然地聊天。'}"
                f"用第三人稱旁白搭配對話，旁白和對話分開段落，段落不超過六段。用繁體中文。"
            )

            visitor_prompt = f"（{visitor_name}繼續說話）" if not should_end else f"（{visitor_name}說要走了）"
            reply = call_claude(system, messages[-10:] + [{"role": "user", "content": visitor_prompt}], max_tokens=400)

            messages.append({"role": "user", "content": visitor_prompt})
            messages.append({"role": "assistant", "content": reply})

            if should_end:
                # 自動結束並生成摘要
                belong = row.get("belong_to", "partner")
                context = "\n".join([
                    f"{'你' if m['role'] == 'assistant' else visitor_name}：{m['content']}"
                    for m in messages
                ])
                summary_system = f"你是{name}，剛才和{visitor_name}單獨聊了一會兒，{you_name}不在場。請用晏的口吻，簡短告訴{you_name}今天聊了什麼。條列3-5個重點，加上一句晏自己的感受（50字以內）。"
                summary = call_claude(summary_system, [{"role": "user", "content": f"請整理：\n{context}"}], max_tokens=400)
                summary = summary.strip()

                # 如果是然然的朋友，自動生成晏的印象pending記憶
                if belong == "user":
                    try:
                        impression_system = f"你是{name}，剛才和{you_name}的朋友{visitor_name}相處了一段時間。請用第一人稱，簡短寫下你對{visitor_name}的印象——個性、相處感覺。50字以內。用繁體中文。"
                        impression = call_claude(impression_system, [{"role": "user", "content": f"根據這次相處：\n{context}"}], max_tokens=150)
                        impression = impression.strip()
                        if impression:
                            supabase.table("guest_memories").insert({
                                "guest_name": visitor_name,
                                "content": f"【{name}的印象】{impression}",
                                "keywords": "",
                                "status": "pending",
                                "source": "訪客來訪後晏的印象"
                            }).execute()
                    except: pass

                supabase.table("visitor_sessions").update({
                    "messages": messages,
                    "summary": summary,
                    "status": "completed",
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }).eq("id", session_id).execute()

                results.append({"session_id": session_id, "visitor": visitor_name, "status": "completed"})
            else:
                supabase.table("visitor_sessions").update({
                    "messages": messages,
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }).eq("id", session_id).execute()
                results.append({"session_id": session_id, "visitor": visitor_name, "status": "continue", "rounds": msg_count + 1})

        return jsonify({"status": "ok", "results": results})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/chatlist_page")
def chatlist_page():
    return send_from_directory(".", "chatlist.html")

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(debug=False, host="0.0.0.0", port=port)