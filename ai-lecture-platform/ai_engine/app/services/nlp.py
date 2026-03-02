import os
import json
import re
from dotenv import load_dotenv

load_dotenv()

from groq import Groq

GROQ_API_KEY = os.getenv("GROQ_API_KEY")
if not GROQ_API_KEY:
    raise RuntimeError("GROQ_API_KEY is not set in .env")

client = Groq(api_key=GROQ_API_KEY)
MODEL = "llama-3.1-8b-instant"

print("Groq AI configured successfully.")


# ─────────────────────────────────────────────────────────────
# Helper: call Groq
# ─────────────────────────────────────────────────────────────
def _ask_groq(prompt: str) -> str:
    try:
        response = client.chat.completions.create(
            model=MODEL,
            messages=[
                {"role": "system", "content": "You are a helpful AI assistant that processes lecture transcripts and generates educational content."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.7,
            max_tokens=4000
        )
        return response.choices[0].message.content.strip()
    except Exception as e:
        print(f"Groq API error: {e}")
        return ""


# ─────────────────────────────────────────────────────────────
# Helper: extract first ~300 words (introduction)
# ─────────────────────────────────────────────────────────────
def _intro(text: str, words: int = 300) -> str:
    return " ".join(text.split()[:words])


# ─────────────────────────────────────────────────────────────
# Helper: extract keywords via simple frequency
# ─────────────────────────────────────────────────────────────
def _keywords(text: str, top_n: int = 15) -> list[str]:
    from collections import Counter
    stopwords = {"the","a","an","is","are","was","were","it","its","this","that",
                 "and","or","but","in","on","at","to","for","of","with","by",
                 "from","as","be","been","have","has","had","will","would","could",
                 "should","can","do","did","does","we","i","you","he","she","they",
                 "so","if","then","that","just","also","very","their","there","here"}
    words = re.findall(r'\b[a-zA-Z]{4,}\b', text.lower())
    freq = Counter(w for w in words if w not in stopwords)
    return [w for w, _ in freq.most_common(top_n)]


# ─────────────────────────────────────────────────────────────
# Build shared context block to prepend to every prompt
# ─────────────────────────────────────────────────────────────
def _context_block(text: str, title: str) -> str:
    intro = _intro(text, 300)
    kw = ", ".join(_keywords(text, 15))
    return f"""LECTURE CONTEXT
===============
Title       : {title}
Keywords    : {kw}
Introduction: {intro}
"""


# ─────────────────────────────────────────────────────────────
# Public: Smart Notes
# ─────────────────────────────────────────────────────────────
def generate_smart_notes(text: str, title: str = "Untitled Lecture") -> dict:
    if not text or len(text.strip()) < 30:
        return {
            "summary": "Not enough spoken content to generate notes.",
            "key_takeaways": ["The recording was too short or silent."],
            "notes": "# Lecture Notes\n\nInsufficient content captured."
        }

    trimmed = text[:8000]
    ctx = _context_block(trimmed, title)

    # ── Comprehensive Summary ─────────────────────────────────
    summary_prompt = f"""{ctx}

FULL TRANSCRIPT:
{trimmed}

TASK: Write a comprehensive, well-structured SUMMARY of this lecture titled "{title}".

Requirements:
- Minimum 5-8 sentences. Be thorough, not brief.
- Cover ALL major topics and concepts discussed.
- Rephrase and synthesise — do NOT copy sentences from the transcript.
- Write in clear academic English.
- Reference specific topics, terms, and examples from the lecture.

SUMMARY:"""
    summary = _ask_groq(summary_prompt) or trimmed[:600]

    # ── Key Takeaways ─────────────────────────────────────────
    takeaways_prompt = f"""{ctx}

FULL TRANSCRIPT:
{trimmed}

TASK: Extract exactly 6 KEY TAKEAWAYS from the lecture "{title}".

Requirements:
- Each takeaway is one clear, insightful sentence.
- Cover different aspects of the lecture (don't repeat the same idea).
- Be specific — mention actual terms, concepts, or examples from the transcript.
- Format as a numbered list (1. 2. 3. etc.)

KEY TAKEAWAYS:"""
    takeaways_raw = _ask_groq(takeaways_prompt)
    key_takeaways = []
    for line in takeaways_raw.splitlines():
        line = re.sub(r'^\d+[\.\)]\s*', '', line).strip()
        if line and len(line) > 15:
            key_takeaways.append(line)
    if not key_takeaways:
        key_takeaways = [summary[:200]]

    # ── Full Markdown Notes ───────────────────────────────────
    notes_prompt = f"""{ctx}

FULL TRANSCRIPT:
{trimmed}

TASK: Generate comprehensive, detailed STUDY NOTES in Markdown format for the lecture "{title}".

Use this exact structure:
# 📝 {title} — Lecture Notes

## 🎯 Overview
[2-3 sentence overview of what this lecture covers]

## 🔑 Key Concepts
[List each major concept with a brief explanation. Use bold for concept names.]

## 📖 Detailed Notes
[Organise content by topic. Use headers (###), bullets, and numbered lists.
Cover every significant point discussed in the lecture. This should be thorough.]

## 💡 Summary
[Concise recap paragraph]

## ❓ Questions to Review
[3-5 questions a student might ask about this material]

NOTES:"""
    notes_markdown = _ask_groq(notes_prompt) or f"# {title} — Lecture Notes\n\n{summary}"

    return {
        "summary": summary,
        "key_takeaways": key_takeaways[:6],
        "notes": notes_markdown
    }


# ─────────────────────────────────────────────────────────────
# Public: Quiz Generation
# ─────────────────────────────────────────────────────────────
def generate_quiz(text: str, title: str = "Untitled Lecture") -> list[dict]:
    if not text or len(text.strip()) < 50:
        return []

    trimmed = text[:8000]
    ctx = _context_block(trimmed, title)

    quiz_prompt = f"""{ctx}

FULL TRANSCRIPT:
{trimmed}

TASK: Create a 5-question multiple-choice quiz for the lecture titled "{title}".

Requirements:
- Questions must be based DIRECTLY on the lecture content above.
- Use the title and keywords to understand the subject area.
- Include a mix of: factual recall, conceptual understanding, and application.
- Each question has exactly 4 options. One is correct, three are plausible distractors.
- Distractors must be related to the topic (not obviously wrong).
- Each question tests a DIFFERENT concept from the lecture.
- The explanation should reference specific content from the transcript.

OUTPUT: Valid JSON array only. No markdown, no extra text. Example format:
[
  {{
    "question": "Question here?",
    "options": ["Correct answer", "Wrong A", "Wrong B", "Wrong C"],
    "correctIndex": 0,
    "explanation": "Specific explanation referencing the lecture content."
  }}
]

JSON:"""

    raw = _ask_groq(quiz_prompt)
    validated = []
    if raw:
        try:
            clean = re.sub(r'^```(?:json)?\s*', '', raw, flags=re.MULTILINE)
            clean = re.sub(r'\s*```$', '', clean, flags=re.MULTILINE).strip()
            questions = json.loads(clean)
            for q in questions:
                if all(k in q for k in ("question", "options", "correctIndex", "explanation")):
                    if isinstance(q["options"], list) and len(q["options"]) >= 2:
                        validated.append({
                            "question": str(q["question"]),
                            "options": [str(o) for o in q["options"][:4]],
                            "correctIndex": int(q["correctIndex"]),
                            "explanation": str(q["explanation"])
                        })
        except (json.JSONDecodeError, Exception) as e:
            print(f"Quiz JSON parse error: {e}\nRaw: {raw[:200]}")

    # TextRank fallback if Groq returned nothing
    if not validated:
        print("Groq quiz unavailable — using TextRank fallback")
        validated = _textrank_fallback_quiz(text)

    return validated[:5]


# ─────────────────────────────────────────────────────────────
# Fallback: TextRank fill-in-the-blank quiz (no API needed)
# ─────────────────────────────────────────────────────────────
def _textrank_fallback_quiz(text: str) -> list[dict]:
    import heapq, random
    from collections import Counter

    stopwords = {"the","a","an","is","are","was","were","it","its","this","that",
                 "and","or","but","in","on","at","to","for","of","with","by","from","as","be","been"}
    sentences = [s.strip() for s in re.split(r'(?<=[.!?])\s+', text) if len(s.strip()) > 30]
    if not sentences:
        return []

    words = re.findall(r'\b[a-z]+\b', text.lower())
    freq = Counter(w for w in words if w not in stopwords and len(w) > 3)
    max_freq = max(freq.values()) if freq else 1
    norm_freq = {w: c / max_freq for w, c in freq.items()}

    scores = {s: sum(norm_freq.get(w, 0) for w in re.findall(r'\b[a-z]+\b', s.lower())) / max(len(s.split()), 1)
              for s in sentences}
    top = heapq.nlargest(min(7, len(sentences)), scores, key=scores.get)
    all_content_words = [w for w in re.findall(r'\b[A-Za-z]{4,}\b', text) if w.lower() not in stopwords]

    questions = []
    for sent in top:
        ws = sent.split()
        cands = [(i, w) for i, w in enumerate(ws)
                 if w.lower().rstrip(".,;:?!") not in stopwords and len(w) > 4]
        if not cands:
            continue
        idx, answer_word = cands[len(cands) // 2]
        clean_answer = answer_word.rstrip(".,;:?!")
        blanked = ws[:]; blanked[idx] = "_______"
        distractors = list({w for w in all_content_words if w.lower() != clean_answer.lower()})
        random.shuffle(distractors)
        distractors = (distractors[:3] + ["none of the above"] * 3)[:3]
        options = [clean_answer] + distractors
        random.shuffle(options)
        questions.append({
            "question": f"Fill in the blank: {' '.join(blanked)}",
            "options": options[:4],
            "correctIndex": options.index(clean_answer),
            "explanation": f"The missing word from the lecture is '{clean_answer}'."
        })
        if len(questions) >= 5:
            break
    return questions
