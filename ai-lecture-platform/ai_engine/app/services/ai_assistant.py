from .nlp import _call_groq, MODEL, _smart_chunk

def ask_ai_about_lecture(question: str, transcript: str) -> str:
    """Ask AI a question about a lecture, using the transcript as context."""
    try:
        print(f"AI Assistant: question='{question[:60]}...'")

        # Normalise transcript — accept both plain string and segment array
        if isinstance(transcript, list):
            transcript_text = "\n".join(
                f"[{seg.get('start', 0):.0f}s]: {seg.get('text', '')}"
                for seg in transcript
            )
        else:
            transcript_text = str(transcript)

        # Smart chunk to stay within model limits
        context = _smart_chunk(transcript_text, 10000)

        prompt = f"""You are an expert AI teaching assistant. A student is asking a question about a lecture.

LECTURE TRANSCRIPT:
{context}

STUDENT QUESTION:
{question}

INSTRUCTIONS:
- If the question is about the lecture, answer using the transcript as your primary source.
- If it is a general knowledge question, answer it directly.
- Reference specific parts of the lecture where relevant (e.g. "As mentioned around 5:30…").
- Be clear, educational, and concise.

ANSWER:"""

        print(f"Calling Groq (prompt length: {len(prompt)} chars)")
        response = _call_groq(prompt, temperature=0.4, max_tokens=1500)
        print(f"Groq response: {response[:80] if response else 'empty'}")
        return response or "I couldn't generate a response. Please try rephrasing your question."

    except Exception as e:
        print(f"AI Assistant error: {e}")
        import traceback
        traceback.print_exc()
        return "I encountered an error while processing your question. Please try again."
