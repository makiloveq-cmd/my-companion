from dotenv import load_dotenv
load_dotenv()
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import anthropic
import google.generativeai as genai
import sqlite3
import os

app = Flask(__name__)
CORS(app)

DB_PATH = "memory.db"

# 初始化資料庫
def init_db():
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute('''
        CREATE TABLE IF NOT EXISTS messages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            bot TEXT NOT NULL,
            role TEXT NOT NULL,
            content TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    conn.commit()
    conn.close()

init_db()

# 讀取記憶
def load_memory(bot):
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute("SELECT role, content FROM messages WHERE bot=? ORDER BY id", (bot,))
    rows = c.fetchall()
    conn.close()
    return [{"role": r[0], "content": r[1]} for r in rows]

# 儲存記憶
def save_message(bot, role, content):
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute("INSERT INTO messages (bot, role, content) VALUES (?, ?, ?)", (bot, role, content))
    conn.commit()
    conn.close()

# 提供前端頁面
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