import whisper
import os
import requests
import tempfile
from urllib.parse import urlparse
import re

# Load model once at startup
# Using 'base' model for speed on CPU. Change to 'medium' or 'large' for better accuracy if GPU available.
print("Loading Whisper model...")
try:
    model = whisper.load_model("base")
    print("Whisper model loaded successfully.")
except Exception as e:
    print(f"Error loading Whisper model: {e}")
    raise e

def transcribe_audio(file_path_or_url: str):
    """
    Transcribe audio from local file path or URL
    """
    print(f"Transcribing {file_path_or_url}...")
    
    # Check if it's a URL
    if file_path_or_url.startswith(('http://', 'https://')):
        # Handle YouTube URLs
        if 'youtube.com' in file_path_or_url or 'youtu.be' in file_path_or_url:
            print("YouTube URL detected - attempting to extract audio...")
            return transcribe_youtube(file_path_or_url)
        
        # Download file from URL to temporary location
        try:
            print("Downloading file from URL...")
            response = requests.get(file_path_or_url, stream=True)
            response.raise_for_status()
            
            # Get file extension from URL
            parsed_url = urlparse(file_path_or_url)
            filename = os.path.basename(parsed_url.path)
            if not filename or '.' not in filename:
                filename = 'temp_audio.mp4'
            
            # Create temporary file
            with tempfile.NamedTemporaryFile(delete=False, suffix=os.path.splitext(filename)[1]) as temp_file:
                for chunk in response.iter_content(chunk_size=8192):
                    temp_file.write(chunk)
                temp_file_path = temp_file.name
            
            print(f"Downloaded to temporary file: {temp_file_path}")
            file_path = temp_file_path
            
        except Exception as e:
            print(f"Error downloading file from URL: {e}")
            raise Exception(f"Failed to download file from URL: {e}")
    else:
        # Local file path
        if not os.path.exists(file_path_or_url):
            raise FileNotFoundError(f"Audio file not found: {file_path_or_url}")
        file_path = file_path_or_url
    
    try:
        # task="translate" → Whisper will ALWAYS output English,
        # even if speaker uses Hindi, Marathi, Arabic, etc.
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
    finally:
        # Clean up temporary file if it was created
        if file_path_or_url.startswith(('http://', 'https://')):
            try:
                os.unlink(file_path)
                print(f"Cleaned up temporary file: {file_path}")
            except:
                pass

def transcribe_youtube(youtube_url: str):
    """
    Transcribe audio from YouTube URL using yt-dlp.
    Downloads raw best-audio (no ffmpeg conversion needed) into a temp dir,
    then transcribes directly with Whisper which handles webm/m4a/opus natively.
    """
    try:
        import yt_dlp
    except ImportError:
        raise Exception(
            "yt-dlp is not installed. Activate your venv and run: pip install yt-dlp"
        )

    import glob

    with tempfile.TemporaryDirectory() as tmpdir:
        output_template = os.path.join(tmpdir, 'audio.%(ext)s')

        # No FFmpegExtractAudio postprocessor — Whisper handles webm/m4a/opus directly.
        ydl_opts = {
            'format': 'bestaudio/best',
            'outtmpl': output_template,
            'quiet': False,
            'no_warnings': False,
        }

        print("Downloading audio from YouTube via yt-dlp...")
        try:
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                ydl.download([youtube_url])
        except Exception as e:
            raise Exception(f"yt-dlp download failed: {e}")

        # Find the downloaded file (extension varies: webm, m4a, opus …)
        files = glob.glob(os.path.join(tmpdir, 'audio.*'))
        if not files:
            raise Exception("yt-dlp produced no output file — check URL or format availability.")

        audio_file = files[0]
        print(f"Downloaded YouTube audio to: {audio_file}")

        result = model.transcribe(audio_file, task="translate", fp16=False)

        return {
            "text": result["text"],
            "segments": [
                {"start": seg["start"], "end": seg["end"], "text": seg["text"]}
                for seg in result["segments"]
            ]
        }
