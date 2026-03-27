from fastapi import FastAPI, BackgroundTasks, HTTPException, WebSocket, WebSocketDisconnect
from pydantic import BaseModel
from dotenv import load_dotenv
import uvicorn
import os
import json
import asyncio
from app.services.orchestrator import process_lecture
from app.services.ai_assistant import ask_ai_about_lecture

load_dotenv()

# Configure larger payload size for AI requests
app = FastAPI(
    title="AI Lecture Engine",
    max_request_size=50 * 1024 * 1024  # 50MB max request size
)

class ProcessRequest(BaseModel):
    lectureId: str
    filePath: str

class ProcessUrlRequest(BaseModel):
    lectureId: str
    videoUrl: str

@app.get("/")
def read_root():
    return {"status": "AI Engine Running", "components": ["Whisper", "Transformers"]}

@app.post("/process-url")
async def trigger_processing_url(request: ProcessUrlRequest, background_tasks: BackgroundTasks):
    """Process lecture from YouTube URL."""
    print(f"Processing lecture from URL: {request.videoUrl}")
    
    background_tasks.add_task(process_lecture, request.lectureId, request.videoUrl)
    return {"status": "processing_started", "lectureId": request.lectureId, "url": request.videoUrl}

@app.post("/process")
async def trigger_processing(request: ProcessRequest, background_tasks: BackgroundTasks):
    if not os.path.exists(request.filePath):
        raise HTTPException(status_code=404, detail="File not found")
    
    background_tasks.add_task(process_lecture, request.lectureId, request.filePath)
    return {"status": "processing_started", "lectureId": request.lectureId}


class RegenerateRequest(BaseModel):
    lectureId: str

class AskAIRequest(BaseModel):
    lectureId: str
    question: str
    transcript: str

@app.post("/regenerate-quiz")
async def regenerate_quiz(request: RegenerateRequest, background_tasks: BackgroundTasks):
    """Re-generates the quiz for a lecture that already has a transcript."""
    from app.models.db import processed_content_collection, quizzes_collection
    from app.services.nlp import generate_quiz
    from bson import ObjectId

    content = processed_content_collection.find_one({"lectureId": ObjectId(request.lectureId)})
    if not content:
        raise HTTPException(status_code=404, detail="No transcript found for this lecture")
    
    def do_regen():
        print(f"Re-generating quiz for {request.lectureId}...")
        full_text = content.get("fullText", "")
        quiz_questions = generate_quiz(full_text)
        if quiz_questions:
            # Remove old quiz if any, then insert fresh one
            quizzes_collection.delete_many({"lectureId": ObjectId(request.lectureId)})
            quizzes_collection.insert_one({
                "lectureId": ObjectId(request.lectureId),
                "questions": quiz_questions
            })
            print(f"Quiz regenerated with {len(quiz_questions)} questions.")
        else:
            print("Quiz regeneration returned empty — text may be too short.")
    
    background_tasks.add_task(do_regen)
    return {"status": "quiz_regeneration_started", "lectureId": request.lectureId}

@app.post("/ask-ai")
async def ask_ai(request: AskAIRequest):
    """Ask AI questions about lecture content."""
    try:
        answer = ask_ai_about_lecture(request.question, request.transcript)
        return {"answer": answer}
    except Exception as e:
        print(f"Error in ask_ai endpoint: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail="Failed to process AI request")

@app.websocket("/ws/transcribe/{lecture_id}")
async def websocket_transcribe(websocket: WebSocket, lecture_id: str):
    await websocket.accept()
    print(f"WebSocket connection established for lecture: {lecture_id}")
    try:
        while True:
            # Receive audio chunk
            data = await websocket.receive_bytes()
            # Simulate real-time processing
            await asyncio.sleep(0.1)
            await websocket.send_json({"transcript": "Streaming partial transcript..."})
    except WebSocketDisconnect:
        print(f"WebSocket disconnected for lecture: {lecture_id}")
    except Exception as e:
        print(f"WebSocket error: {e}")
        await websocket.close()

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
