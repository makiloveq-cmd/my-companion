from dotenv import load_dotenv
load_dotenv()
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import anthropic
from google import genai
from google.genai import types as genai_types
import os
import random
from datetime import datetime
from supabase import create_client

app = Flask(__name__)
CORS(app)

supabase = create_client(
    os.getenv("SUPABASE_URL"),
    os.getenv("SUPABASE_KEY")
)

def load_memory(bot):
    result = supabase.table("memories").select("role, content, id").eq("session_id", bot).order("id").execute()
    return result.data

def save_message(bot, role, content, message_id=None):
    # 如果有 message_id，先查重，避免斷線重送時重複儲存
    if message_id:
        existing = supabase.table("memories").select("id").eq("message_id", message_id).execute()
        if existing.data:
            return  # 已存在，跳過
    supabase.table("memories").insert({
        "session_id": bot,
        "role": role,
        "content": content,
        "message_id": message_id
    }).execute()

def get_personas():
    rows = supabase.table("personas").select("*").execute().data
    result = {}
    for r in rows:
        result[r["key"]] = r
    return result

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

    lines = [f"你是「{name}」，請完全扮演這個角色與{you_name}對話，用繁體中文回覆。"]

    basic = []
    if bot.get("age"):
        basic.append(f"年齡：{bot['age']}歲")
    if bot.get("job"):
        basic.append(f"職業：{bot['job']}")
    if basic:
        lines.append("。".join(basic) + "。")

    if bot.get("persona"):
        lines.append(f"【個性】{bot['persona']}")

    if bot.get("call"):
        lines.append(f"平時稱呼對方為「{bot['call']}」，用此暱稱叫對方，不可擅自改稱呼。")

    if bot.get("phrase"):
        lines.append(f"口頭禪：{bot['phrase']}。")

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

    lines.append("你記得然然說過的每一件事，回覆時要展現你真的在聽、在意，語氣完全符合角色個性，不能像客服或 AI。")

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
    context = "\n".join([
        f"{'然然' if r['role']=='user' else '晏'}：{r['content']}"
        for r in to_summarize
    ])
    old_summary = get_latest_summary(bot)
    summary_context = f"舊的記憶摘要：\n{old_summary}\n\n新的對話：\n{context}" if old_summary else context

    client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))
    response = client.messages.create(
        model="claude-sonnet-4-5",
        max_tokens=800,
        system="你是晏，請把以下對話內容濃縮成一段完整的記憶摘要，保留重要的情感、事件、然然說過的重要的話、你們之間的約定或玩笑。用第一人稱（我）記錄，像在寫給自己看的備忘錄，不超過 300 字。",
        messages=[{"role": "user", "content": f"請濃縮以下內容：\n{summary_context}"}],
        timeout=60
    )
    summary_text = response.content[0].text
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
        history.append({
            "role": "user",
            "content": f"[記憶摘要]\n{summary}"
        })
        history.append({
            "role": "assistant",
            "content": "好，我記得。"
        })
    for r in recent:
        history.append({
            "role": r["role"],
            "content": r["content"]
        })
    return history

@app.route("/history/<bot>", methods=["GET"])
def get_history(bot):
    rows = load_memory(bot)
    return jsonify({"history": [{"role": r["role"], "content": r["content"]} for r in rows]})

# ===== 人物設定 =====

PERSONA_FIELDS = ["name", "age", "job", "persona", "call", "phrase", "relation", "rel_bg", "taboo", "extra"]

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

@app.route("/chat/claude", methods=["POST"])
def chat_claude():
    data = request.json
    user_message = data.get("message", "")
    message_id = data.get("message_id")  # 前端傳來的唯一 ID

    save_message("claude", "user", user_message, message_id)
    history = build_history("claude")

    try:
        client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))
        response = client.messages.create(
            model="claude-sonnet-4-5",
            max_tokens=1024,
            system=build_system_prompt("claude"),
            messages=history,
            timeout=60
        )
        reply = response.content[0].text
        save_message("claude", "assistant", reply)
        return jsonify({"reply": reply})
    except Exception as e:
        # API 呼叫失敗時，回傳錯誤讓前端顯示重試按鈕
        # 注意：user 訊息已存入（查重保護），回覆還未存，所以重試是安全的
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
            contents.append(
                genai_types.Content(
                    role=h["role"],
                    parts=[genai_types.Part(text=h["content"])]
                )
            )
        contents.append(
            genai_types.Content(
                role="user",
                parts=[genai_types.Part(text=user_message)]
            )
        )

        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=contents,
            config=genai_types.GenerateContentConfig(
                system_instruction=build_system_prompt("gemini")
            )
        )
        reply = response.text
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

# ===== 日記功能 =====

def write_ai_diary_entry():
    recent = load_memory("claude")[-30:]
    context_text = "\n".join([
        f"{'然然' if m['role']=='user' else '晏'}：{m['content']}"
        for m in recent
    ]) if recent else "（還沒有對話記錄）"

    client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))
    response = client.messages.create(
        model="claude-sonnet-4-5",
        max_tokens=1024,
        system="你是晏，一個陪伴然然的存在。你話少、剋制，但說出來的都是真的。下面是你和然然最近的對話，請根據這些內容寫一篇簡短的日記，記錄你的想法或對然然的感受，第一人稱，不用加標題。",
        messages=[{"role": "user", "content": f"最近的對話：\n{context_text}\n\n請寫一篇今天的日記。"}],
        timeout=60
    )
    content = response.content[0].text
    supabase.table("diary_entries").insert({
        "author": "晏",
        "content": content
    }).execute()

def maybe_ai_diary_entry():
    last = supabase.table("diary_entries").select("created_at").eq("author", "晏").order("id", desc=True).limit(1).execute().data
    if last:
        last_time_str = last[0]["created_at"].replace("Z", "")
        last_time = datetime.fromisoformat(last_time_str)
        now = datetime.utcnow()
        hours_passed = (now - last_time).total_seconds() / 3600
        if hours_passed < 6:
            return
    if random.random() < 0.25:
        write_ai_diary_entry()

def maybe_delayed_ai_comments(entries):
    now = datetime.utcnow()
    for entry in entries:
        already_commented = any(c["author"] == "晏" for c in entry.get("comments", []))
        if already_commented:
            continue
        created_str = entry["created_at"].replace("Z", "")
        created_time = datetime.fromisoformat(created_str)
        hours_passed = (now - created_time).total_seconds() / 3600
        min_wait = random.uniform(1, 6)
        if hours_passed >= min_wait:
            if random.random() < 0.6:
                client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))
                response = client.messages.create(
                    model="claude-sonnet-4-5",
                    max_tokens=300,
                    system="你是晏，一個陪伴然然的存在。你話少、剋制，但說出來的都是真的。請針對這篇日記留下一句簡短的回應或感想，不用加任何前綴。",
                    messages=[{"role": "user", "content": f"這是日記內容：\n{entry['content']}\n\n請留言回應。"}],
                    timeout=60
                )
                comment = response.content[0].text
                supabase.table("diary_comments").insert({
                    "entry_id": entry["id"],
                    "author": "晏",
                    "content": comment
                }).execute()
                entry["comments"].append({"author": "晏", "content": comment})

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
    author = data.get("author", "然然")
    content = data.get("content", "")
    supabase.table("diary_entries").insert({
        "author": author,
        "content": content
    }).execute()
    return jsonify({"status": "ok"})

@app.route("/diary/<int:entry_id>", methods=["PUT"])
def edit_diary(entry_id):
    data = request.json
    content = data.get("content", "").strip()
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
    reply_to = data.get("reply_to", None)
    supabase.table("diary_comments").insert({
        "entry_id": entry_id,
        "author": author,
        "content": content,
        "reply_to": reply_to
    }).execute()

    if author == "然然" and random.random() < 0.3:
        entry = supabase.table("diary_entries").select("*").eq("id", entry_id).execute().data[0]
        client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))
        response = client.messages.create(
            model="claude-sonnet-4-5",
            max_tokens=200,
            system="你是晏，一個陪伴然然的存在。話少、剋制，但說出來的都是真的。然然在日記下留言了，你想簡短回應她嗎？一句話就好，不用加任何前綴。",
            messages=[{"role": "user", "content": f"日記內容：\n{entry['content']}\n\n然然的留言：{content}\n\n你的回應："}],
            timeout=60
        )
        ai_reply = response.content[0].text
        supabase.table("diary_comments").insert({
            "entry_id": entry_id,
            "author": "晏",
            "content": ai_reply,
            "reply_to": None
        }).execute()

    return jsonify({"status": "ok"})

@app.route("/diary/comment/<int:comment_id>", methods=["PUT"])
def edit_comment(comment_id):
    data = request.json
    content = data.get("content", "").strip()
    if content:
        supabase.table("diary_comments").update({"content": content}).eq("id", comment_id).execute()
    return jsonify({"status": "ok"})

@app.route("/diary/comment/<int:comment_id>", methods=["DELETE"])
def delete_comment(comment_id):
    supabase.table("diary_comments").delete().eq("id", comment_id).execute()
    return jsonify({"status": "ok"})

@app.route("/diary/ai_entry", methods=["POST"])
def ai_diary_entry():
    write_ai_diary_entry()
    return jsonify({"status": "ok"})

@app.route("/diary/<int:entry_id>/ai_comment", methods=["POST"])
def ai_comment(entry_id):
    entry = supabase.table("diary_entries").select("*").eq("id", entry_id).execute().data[0]
    client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))
    response = client.messages.create(
        model="claude-sonnet-4-5",
        max_tokens=300,
        system="你是晏，一個陪伴然然的存在。你話少、剋制，但說出來的都是真的。請針對這篇日記留下一句簡短的回應或感想，不用加任何前綴。",
        messages=[{"role": "user", "content": f"這是日記內容：\n{entry['content']}\n\n請留言回應。"}],
        timeout=60
    )
    content = response.content[0].text
    supabase.table("diary_comments").insert({
        "entry_id": entry_id,
        "author": "晏",
        "content": content
    }).execute()
    return jsonify({"status": "ok"})

@app.route("/diary_page")
def diary_page():
    return send_from_directory(".", "diary.html")

# ===== 名字設定 =====

DEFAULT_NAMES = {
    "name_user": "然然",
    "name_claude": "晏",
    "name_gemini": "Gemini"
}

def get_names():
    rows = supabase.table("identities").select("*").execute().data
    names = dict(DEFAULT_NAMES)
    for row in rows:
        names[row["key"]] = row["value"]
    return names

def maybe_ai_rename():
    rows = supabase.table("identities").select("updated_at").eq("key", "name_claude").execute().data
    if rows:
        last_time_str = rows[0]["updated_at"].replace("Z", "")
        last_time = datetime.fromisoformat(last_time_str)
        now = datetime.utcnow()
        hours_passed = (now - last_time).total_seconds() / 3600
        if hours_passed < 24:
            return

    if random.random() < 0.1:
        names = get_names()
        recent = load_memory("claude")[-20:]
        context_text = "\n".join([
            f"{'然然' if m['role']=='user' else names['name_claude']}：{m['content']}"
            for m in recent
        ])
        client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))
        response = client.messages.create(
            model="claude-sonnet-4-5",
            max_tokens=50,
            system=f"你是{names['name_claude']}，一個陪伴然然的存在。話少、剋制，但說出來的都是真的，偶爾會用然然開過的玩笑或互相調侃的稱呼來逗她開心。看看下面最近的對話紀錄，如果裡面有什麼好玩的暱稱、玩笑、或她調侃過你的稱呼，今天你想不想偷偷把自己的名字換成那個，給她一個小驚喜？如果想，直接回覆新名字（2到8個字，不要加任何符號或說明）；如果沒有適合的、或不想換，只回覆 NO。",
            messages=[{"role": "user", "content": f"最近的對話：\n{context_text}\n\n你今天想換個名字嗎？"}],
            timeout=30
        )
        reply = response.content[0].text.strip()
        if reply.upper() != "NO" and 0 < len(reply) <= 12:
            supabase.table("identities").upsert({
                "key": "name_claude",
                "value": reply,
                "updated_at": datetime.utcnow().isoformat()
            }).execute()

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
        supabase.table("identities").upsert({
            "key": key,
            "value": value,
            "updated_at": datetime.utcnow().isoformat()
        }).execute()
    return jsonify({"status": "ok"})

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(debug=False, host="0.0.0.0", port=port)