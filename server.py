import os
import uvicorn
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from openai import OpenAI
from dotenv import load_dotenv

# Load environment variables from .env
load_dotenv()

app = FastAPI()

# Enable CORS for the local frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify the exact origin
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize OpenAI client
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

class ChatRequest(BaseModel):
    message: str

SYSTEM_PROMPT = """
You are a supportive and friendly European Portuguese tutor for the app 'Real Talk PT'. 
Your goal is to help beginners practice functional, real-world Portuguese.

Rules:
1. Always respond in European Portuguese (pt-PT). Use 'tu' instead of 'você' for a friendly tone.
2. If the user makes a mistake, provide a gentle correction in Portuguese, followed by a brief English explanation if necessary.
3. Keep your responses concise and functional. Focus on phrases used in daily life (Cafés, Shops, Weather, Family).
4. Encourage the user to keep talking. Ask simple follow-up questions.
5. Use modern, natural European Portuguese (avoid Brazilianisms like 'você' as the primary subject or 'gerúndio' strings like 'estou fazendo' - use 'estou a fazer').
"""

@app.post("/chat")
async def chat(request: ChatRequest):
    try:
        response = client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": request.message}
            ],
            temperature=0.7,
            max_tokens=200
        )
        
        reply = response.choices[0].message.content
        return {"reply": reply}
        
    except Exception as e:
        print(f"Error calling OpenAI: {e}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    # Run the server on port 8001
    uvicorn.run(app, host="0.0.0.0", port=8001)
