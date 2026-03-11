import os
from fastapi import HTTPException
from .nlp import _ask_groq, MODEL
from typing import Dict, Any
import json

def ask_ai_about_lecture(question: str, transcript: str) -> str:
    """
    Ask AI questions about lecture content using Groq API
    """
    try:
        print(f"AI Assistant called with question: {question[:50]}...")
        print(f"Transcript type: {type(transcript)}, length: {len(str(transcript))}")
        
        # Convert transcript array to readable string if needed
        if isinstance(transcript, list):
            # Convert array of transcript segments to readable text
            transcript_text = "\n".join([
                f"[{segment.get('start', 0)}s - {segment.get('end', 0)}s]: {segment.get('text', '')}"
                for segment in transcript
            ])
        else:
            transcript_text = transcript
        
        # Smart transcript processing to avoid payload limits
        max_transcript_length = 8000  # Reduced to 8K characters for safety
        
        # For very long transcripts, use only the most relevant parts
        if len(transcript_text) > max_transcript_length:
            # Take beginning, middle, and end of transcript
            beginning = transcript_text[:2000]
            middle_start = len(transcript_text) // 2 - 2000
            middle = transcript_text[middle_start:middle_start + 2000]
            end = transcript_text[-2000:]
            
            truncated_transcript = f"""
            {beginning}

            ... [MIDDLE CONTENT - ~{middle_start} characters omitted] ...

            {end}

            Note: Due to length limits, only showing key sections. For more specific questions about particular parts, please ask with timestamps or specific topics.
            """
        else:
            truncated_transcript = transcript_text
        
        # Enhanced prompt for better AI responses
        prompt = f"""
        You are an intelligent AI teaching assistant with access to general knowledge and specific lecture content.
        
        The student has asked a question about a lecture. Here's the lecture transcript for context:
        
        LECTURE TRANSCRIPT (with timestamps):
        {truncated_transcript}
        
        STUDENT QUESTION:
        {question}
        
        INSTRUCTIONS:
        1. If the question is about the lecture content, use the transcript as your primary source
        2. If the question is general knowledge (like "What is the capital of India?"), answer it directly 
        3. If the question relates to the lecture topic, provide the answer and reference where it appears in the transcript
        4. If the transcript was truncated, mention that you only have access to partial content
        5. Be helpful, educational, and conversational
        6. For transcript references, include timestamps like "mentioned at 15:30"
        
        Please provide a comprehensive answer based on the available information.
        """
        
        print(f"Calling Groq API with prompt length: {len(prompt)}")
        response = _ask_groq(prompt)
        print(f"Groq API response received: {response[:100] if response else 'No response'}")
        return response or "I apologize, but I couldn't generate a response. Please try again."
        
    except Exception as e:
        print(f"Error in ask_ai_about_lecture: {e}")
        import traceback
        traceback.print_exc()
        return "I'm sorry, I encountered an error while processing your question. Please try again or rephrase your question."
