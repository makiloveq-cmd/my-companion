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

# 初始化 Supabase
supabase = create_client(
    os.getenv("SUPABASE_URL"),
    os.getenv("SUPABASE_KEY")
)

# 讀取記憶
def load_memory(bot):
    result = supabase.table("memories").select("role, content").eq("session_id", bot).order("id").execute()
    return [{"role": r["role"], "content": r["content"]} for r in result.data]

# 儲存記憶
def save_message(bot, role, content):
    supabase.table("memories").insert({
        "session_id": bot,
        "role": role,
        "content": content
    }).execute()

# 提供前端頁面

# 載入歷史訊息
@app.route("/history/<bot>", methods=["GET"])
def get_history(bot):
    history = load_memory(bot)
    return jsonify({"history": history})
@app.route("/")
def index():
    return send_from_directory(".", "index.html")

# Claude 對話
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

# Gemini 對話
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

    chat = model.start_chat(history=[
        {"role": h["role"], "parts": [h["content"]]}
        for h in history[:-1] if h["role"] in ["user", "model"]
    ])

    response = chat.send_message(user_message)
    reply = response.text

    save_message("gemini", "model", reply)

    return jsonify({"reply": reply})

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(debug=False, host="0.0.0.0", port=port)