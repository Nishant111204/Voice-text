import whisper
import os

# Load model once at startup
# Using 'base' model for speed on CPU. Change to 'medium' or 'large' for better accuracy if GPU available.
print("Loading Whisper model...")
try:
    model = whisper.load_model("base")
    print("Whisper model loaded successfully.")
except Exception as e:
    print(f"Error loading Whisper model: {e}")
    raise e

def transcribe_audio(file_path: str):
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"Audio file not found: {file_path}")
    
    print(f"Transcribing {file_path}...")
    
    # task="translate" → Whisper will ALWAYS output English,
    # even if the speaker uses Hindi, Marathi, Arabic, etc.
    result = model.transcribe(file_path, task="translate", fp16=False)
    
    return {
        "text": result["text"],
        "segments": [
            {
                "start": segment["start"],
                "end": segment["end"],
                "text": segment["text"]
            } 
            for segment in result["segments"]
        ]
    }
