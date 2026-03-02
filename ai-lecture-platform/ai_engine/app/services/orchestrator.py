import os
from app.models.db import lectures_collection, processed_content_collection
from app.services.transcription import transcribe_audio
from app.services.nlp import generate_smart_notes, generate_quiz
from bson import ObjectId
import datetime

def process_lecture(lecture_id: str, file_path: str):
    print(f"Starting processing for {lecture_id}")
    
    # 1. Update Status to Processing
    lectures_collection.update_one(
        {"_id": ObjectId(lecture_id)},
        {"$set": {"status": "processing"}}
    )
    
    try:
        # Fetch lecture title for LLM context
        lecture_doc = lectures_collection.find_one({"_id": ObjectId(lecture_id)})
        lecture_title = lecture_doc.get("title", "Untitled Lecture") if lecture_doc else "Untitled Lecture"
        print(f"Lecture title: {lecture_title}")

        # 2. Transcription (Whisper)
        print("Running Transcription...")
        transcript_result = transcribe_audio(file_path)
        full_text = transcript_result["text"]
        segments = transcript_result["segments"]
        
        # 3. NLP Processing (Summary, Notes) — pass title as context
        print("Running NLP Pipeline...")
        nlp_result = generate_smart_notes(full_text, title=lecture_title)
        
        # 4. Quiz Generation — pass title as context
        print("Generating Quiz...")
        quiz_questions = generate_quiz(full_text, title=lecture_title)
        
        # 5. Save Results
        processed_content = {
            "lectureId": ObjectId(lecture_id),
            "transcript": segments,
            "fullText": full_text,
            "summary": nlp_result["summary"],
            "keyTakeaways": nlp_result["key_takeaways"],
            "notes": nlp_result["notes"],
            "generatedAt": datetime.datetime.utcnow()
        }
        
        processed_content_collection.insert_one(processed_content)
        
        # Save Quiz if generated
        if quiz_questions:
            # Import here to avoid circular dependency if needed, or better separate concerns
            from app.models.db import quizzes_collection
            quiz_doc = {
                "lectureId": ObjectId(lecture_id),
                "questions": quiz_questions
            }
            quizzes_collection.insert_one(quiz_doc)
            
        # 6. Update Status to Completed
        lectures_collection.update_one(
            {"_id": ObjectId(lecture_id)},
            {"$set": {"status": "completed"}}
        )
        print(f"Processing complete for {lecture_id}")
        
    except Exception as e:
        print(f"Error processing lecture {lecture_id}: {str(e)}")
        lectures_collection.update_one(
            {"_id": ObjectId(lecture_id)},
            {"$set": {"status": "failed"}}
        )
