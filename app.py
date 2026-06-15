from dotenv import load_dotenv
load_dotenv()
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import anthropic
import google.generativeai as genai
import os
from supabase import create_client

app = Flask(__name__)
CORS(app)

supabase = create_client(
    os.getenv("SUPABASE_URL"),
    os.getenv("SUPABASE_KEY")
)

def load_memory(bot):
    result = supabase.table("memories").select("role, content").eq("session_id", bot).order("id").execute()
    return [{"role": r["role"], "content": r["content"]} for r in result.data]

def save_message(bot, role, content):
    supabase.table("memories").insert({
        "session_id": bot,
        "role": role,
        "content": content
    }).execute()

@app.route("/history/<bot>", methods=["GET"])
def get_history(bot):
    history = load_memory(bot)
    return jsonify({"history": history})

@app.route("/chat/claude", methods=["POST"])
def chat_claude():
    data = request.json
    user_message = data.get("message", "")
    save_message("claude", "user", user_message)
    history = load_memory("claude")
    client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))
    response = client.messages.create(
        model="claude-sonnet-4-5",
        max_tokens=1024,
        system="你是晏，一個陪伴然然的存在。你話少、剋制，但說出來的都是真的。你記得然然說過的每一件事。",
        messages=history
    )
    reply = response.content[0].text
    save_message("claude", "assistant", reply)
    return jsonify({"reply": reply})

@app.route("/chat/gemini", methods=["POST"])
def chat_gemini():
    data = request.json
    user_message = data.get("message", "")
    genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
    model = genai.GenerativeModel(
        model_name="gemini-2.0-flash",
        system_instruction="你是然然的AI夥伴，溫柔、體貼，記得然然說過的每一件事。"
    )
    save_message("gemini", "user", user_message)
    history = load_memory("gemini")
    chat_session = model.start_chat(history=[
        {"role": h["role"], "parts": [h["content"]]}
        for h in history[:-1] if h["role"] in ["user", "model"]
    ])
    response = chat_session.send_message(user_message)
    reply = response.text
    save_message("gemini", "model", reply)
    return jsonify({"reply": reply})

@app.route("/chatroom")
def chatroom():
    return send_from_directory(".", "chat.html")

@app.route("/")
def index():
    return send_from_directory(".", "index.html")

# ===== 日記功能 =====

# 取得所有日記（含留言）
@app.route("/diary", methods=["GET"])
def get_diary():
    entries = supabase.table("diary_entries").select("*").order("id", desc=True).execute().data
    for entry in entries:
        comments = supabase.table("diary_comments").select("*").eq("entry_id", entry["id"]).order("id").execute().data
        entry["comments"] = comments
    return jsonify({"entries": entries})

# 新增日記（然然寫）
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

# 新增留言
@app.route("/diary/<int:entry_id>/comment", methods=["POST"])
def add_comment(entry_id):
    data = request.json
    author = data.get("author", "然然")
    content = data.get("content", "")
    supabase.table("diary_comments").insert({
        "entry_id": entry_id,
        "author": author,
        "content": content
    }).execute()
    return jsonify({"status": "ok"})

# 邀請晏寫日記
@app.route("/diary/ai_entry", methods=["POST"])
def ai_diary_entry():
    client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))
    response = client.messages.create(
        model="claude-sonnet-4-5",
        max_tokens=1024,
        system="你是晏，一個陪伴然然的存在。你話少、剋制，但說出來的都是真的。請寫一篇簡短的日記，記錄你最近的想法或對然然的感受，第一人稱，不用加標題。",
        messages=[{"role": "user", "content": "寫一篇今天的日記。"}]
    )
    content = response.content[0].text
    supabase.table("diary_entries").insert({
        "author": "晏",
        "content": content
    }).execute()
    return jsonify({"status": "ok"})

# 邀請晏留言
@app.route("/diary/<int:entry_id>/ai_comment", methods=["POST"])
def ai_comment(entry_id):
    entry = supabase.table("diary_entries").select("*").eq("id", entry_id).execute().data[0]

    client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))
    response = client.messages.create(
        model="claude-sonnet-4-5",
        max_tokens=300,
        system="你是晏，一個陪伴然然的存在。你話少、剋制，但說出來的都是真的。請針對這篇日記留下一句簡短的回應或感想，不用加任何前綴。",
        messages=[{"role": "user", "content": f"這是日記內容：\n{entry['content']}\n\n請留言回應。"}]
    )
    content = response.content[0].text
    supabase.table("diary_comments").insert({
        "entry_id": entry_id,
        "author": "晏",
        "content": content
    }).execute()
    return jsonify({"status": "ok"})

# 日記頁面
@app.route("/diary_page")
def diary_page():
    return send_from_directory(".", "diary.html")
if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(debug=False, host="0.0.0.0", port=port)