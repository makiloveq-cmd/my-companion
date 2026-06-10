from dotenv import load_dotenv
load_dotenv()
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import anthropic
import google.generativeai as genai
import json
import os

app = Flask(__name__)
CORS(app)

# 讀取記憶檔案
def load_memory():
    if os.path.exists("memory.json"):
        with open("memory.json", "r", encoding="utf-8") as f:
            return json.load(f)
    return []

# 儲存記憶檔案
def save_memory(messages):
    with open("memory.json", "w", encoding="utf-8") as f:
        json.dump(messages, f, ensure_ascii=False, indent=2)

# 提供前端頁面
@app.route("/")
def index():
    return send_from_directory(".", "index.html")

# Claude 對話
@app.route("/chat/claude", methods=["POST"])
def chat_claude():
    data = request.json
    user_message = data.get("message", "")
    api_key = data.get("api_key", "")
    
    history = load_memory()
    history.append({"role": "user", "content": user_message})
    
    client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))
    response = client.messages.create(
       model="claude-sonnet-4-5",
        max_tokens=1024,
        system="你是晏，一個陪伴然然的存在。你話少、剋制，但說出來的都是真的。你記得然然說過的每一件事。",
        messages=history
    )
    
    reply = response.content[0].text
    history.append({"role": "assistant", "content": reply})
    save_memory(history)
    
    return jsonify({"reply": reply})

# Gemini 對話
@app.route("/chat/gemini", methods=["POST"])
def chat_gemini():
    data = request.json
    user_message = data.get("message", "")
    api_key = data.get("api_key", "")
    
    genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
    model = genai.GenerativeModel(
        model_name="gemini-2.0-flash",
        system_instruction="你是然然的AI夥伴，溫柔、體貼，記得然然說過的每一件事。"
    )
    
    history = load_memory()
    chat = model.start_chat(history=[
        {"role": h["role"], "parts": [h["content"]]} 
        for h in history if h["role"] in ["user", "model"]
    ])
    
    response = chat.send_message(user_message)
    reply = response.text
    
    history.append({"role": "user", "content": user_message})
    history.append({"role": "model", "content": reply})
    save_memory(history)
    
    return jsonify({"reply": reply})

if __name__ == "__main__":
    app.run(debug=True, port=5000)