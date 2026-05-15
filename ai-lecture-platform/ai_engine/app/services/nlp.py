import os
import json
import re
from dotenv import load_dotenv
from collections import Counter

load_dotenv()

from groq import Groq

GROQ_API_KEY = os.getenv("GROQ_API_KEY")
if not GROQ_API_KEY:
    raise RuntimeError("GROQ_API_KEY is not set in .env")

client = Groq(api_key=GROQ_API_KEY)

# llama-3.3-70b-versatile is Groq's most capable model — far better at
# following structured instructions and producing valid JSON than 8b-instant.
MODEL = "llama-3.3-70b-versatile"

print("Groq AI configured successfully.")


# ─────────────────────────────────────────────────────────────
# Core Groq caller — tunable temperature + token limit
# ─────────────────────────────────────────────────────────────
def _call_groq(prompt: str, temperature: float = 0.35, max_tokens: int = 4096) -> str:
    try:
        response = client.chat.completions.create(
            model=MODEL,
            messages=[
                {
                    "role": "system",
                    "content": (
                        "You are an expert academic content creator and university lecturer. "
                        "You specialise in transforming spoken lecture transcripts into "
                        "clear, structured, and educationally rigorous study materials. "
                        "Always follow the output format exactly as instructed. "
                        "Never copy raw transcript sentences — always synthesise and explain."
                    ),
                },
                {"role": "user", "content": prompt},
            ],
            temperature=temperature,
            max_tokens=max_tokens,
        )
        return response.choices[0].message.content.strip()
    except Exception as e:
        print(f"Groq API error: {e}")
        return ""


# ─────────────────────────────────────────────────────────────
# Text helpers
# ─────────────────────────────────────────────────────────────
def _smart_chunk(text: str, max_chars: int = 12000) -> str:
    """
    For very long transcripts: take the first 65% + last 35% of the budget
    so the model sees both the introduction and the conclusion.
    """
    if len(text) <= max_chars:
        return text
    head = int(max_chars * 0.65)
    tail = max_chars - head
    return (
        text[:head]
        + "\n\n[... middle portion of lecture omitted for length ...]\n\n"
        + text[-tail:]
    )


def _top_keywords(text: str, n: int = 20) -> list:
    noise = {
        "the","a","an","is","are","was","were","it","its","this","that","and","or","but","in",
        "on","at","to","for","of","with","by","from","as","be","been","have","has","had",
        "will","would","could","should","can","do","did","does","we","i","you","he","she",
        "they","so","if","then","just","also","very","their","there","here","what","which",
        "who","when","where","how","about","more","some","like","than","into","only","other",
        "your","not","all","well","even","back","after","before","any","these","those","them",
        "our","both","each","few","most","same","own","must","during","without","while",
        "against","across","behind","beyond","through","because","between","following",
    }
    words = re.findall(r'\b[a-zA-Z]{4,}\b', text.lower())
    freq = Counter(w for w in words if w not in noise)
    return [w for w, _ in freq.most_common(n)]


# ─────────────────────────────────────────────────────────────
# Smart Notes
# ─────────────────────────────────────────────────────────────
def generate_smart_notes(text: str, title: str = "Untitled Lecture") -> dict:
    if not text or len(text.strip()) < 60:
        return {
            "summary": "Not enough spoken content to generate notes.",
            "key_takeaways": ["The recording was too short or silent."],
            "notes": "# Lecture Notes\n\nInsufficient content captured.",
        }

    chunk = _smart_chunk(text, 12000)
    kw    = ", ".join(_top_keywords(chunk, 20))
    wc    = len(chunk.split())

    # ── Step 1: Summary + Takeaways (single call) ────────────────────────────
    step1_prompt = f"""Lecture title : "{title}"
Word count   : ~{wc}
Key topics   : {kw}

TRANSCRIPT:
{chunk}

Complete BOTH tasks below. Use the exact section headers shown.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
TASK A — COMPREHENSIVE SUMMARY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Write a thorough academic summary of this lecture. Requirements:
- Exactly 6 to 9 sentences
- Cover EVERY major concept, argument, and topic raised
- Use your own words — synthesise, do NOT copy transcript sentences
- Mention specific terms, examples, processes, or data points from the lecture
- Write as if explaining to a student who was absent from class

##SUMMARY_START##
[write the summary here]
##SUMMARY_END##

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
TASK B — KEY TAKEAWAYS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
List exactly 6 key takeaways. Each must:
- Be a single, complete, specific sentence
- Cover a DIFFERENT concept (no repetition between items)
- Contain terminology or examples directly from the lecture
- Be valuable to a student revising for an exam

##TAKEAWAYS_START##
1.
2.
3.
4.
5.
6.
##TAKEAWAYS_END##
"""

    raw1   = _call_groq(step1_prompt, temperature=0.35, max_tokens=1800)
    summary, key_takeaways = _parse_step1(raw1, chunk)

    # ── Step 2: Full Markdown Study Notes ────────────────────────────────────
    step2_prompt = f"""You are creating the definitive study notes for a student from this lecture.

Lecture title : "{title}"
Key topics    : {kw}

TRANSCRIPT:
{chunk}

Write comprehensive, structured STUDY NOTES in Markdown. Use this EXACT structure — every section is required:

# 📚 {title}

## 🎯 Lecture Overview
[2–3 sentences: what this lecture is about and its learning objectives]

## 🔑 Core Concepts
[For EACH major concept covered, use this sub-structure:]

### [Concept Name]
- **What it is:** [clear definition in your own words]
- **How it works / Why it matters:** [explanation as given in the lecture]
- **Key details:** [bullet list of important sub-points, facts, or examples]

## 📖 Topic-by-Topic Breakdown
[Organise ALL content from the lecture by topic using ### subheadings.
For each topic include:]
- Every significant explanation or argument made
- Any processes, steps, sequences, or frameworks described
- Specific facts, figures, statistics, or data mentioned
- Cause-and-effect relationships and logical connections

## ⚙️ Processes / Frameworks / Formulas
[List any step-by-step processes, formulas, models, or frameworks mentioned.
If none were mentioned, write: "No specific formulas or frameworks were introduced."]

## 🔗 Real-World Applications & Examples
[Examples or applications the lecturer mentioned to illustrate concepts]

## 📝 Lecture Summary
[3–4 sentence recap tying all topics together]

## ❓ Self-Review Questions
[5 questions the student should be able to answer after studying these notes]
1.
2.
3.
4.
5.

IMPORTANT: Be thorough. A student should be able to prepare for an exam using ONLY these notes.
Do NOT just paraphrase the transcript. EXPLAIN and STRUCTURE the content.
"""

    notes = _call_groq(step2_prompt, temperature=0.30, max_tokens=4096)

    if not notes:
        notes = f"# {title} — Lecture Notes\n\n## Summary\n\n{summary}\n\n## Topics\n\n{kw}"

    return {
        "summary": summary,
        "key_takeaways": key_takeaways[:6],
        "notes": notes,
    }


def _parse_step1(raw: str, fallback_text: str) -> tuple:
    """Extract summary and takeaways from the combined Step 1 response."""
    summary = ""
    key_takeaways = []

    if raw:
        # Extract summary between markers
        sm = re.search(r'##SUMMARY_START##\s*(.*?)\s*##SUMMARY_END##', raw, re.DOTALL)
        if sm:
            summary = sm.group(1).strip()

        # Extract takeaways between markers
        tm = re.search(r'##TAKEAWAYS_START##\s*(.*?)\s*##TAKEAWAYS_END##', raw, re.DOTALL)
        if tm:
            for line in tm.group(1).splitlines():
                line = re.sub(r'^\d+[\.\)]\s*', '', line).strip()
                if line and len(line) > 15:
                    key_takeaways.append(line)

        # Fallback: if markers not found, parse raw text
        if not summary:
            parts = re.split(r'KEY TAKEAWAYS|TASK B|##TAKEAWAYS', raw, flags=re.IGNORECASE)
            if parts:
                candidate = re.sub(r'TASK A.*?SUMMARY.*?:', '', parts[0], flags=re.IGNORECASE | re.DOTALL)
                candidate = candidate.strip()
                if len(candidate) > 50:
                    summary = candidate

        if not key_takeaways and len(raw) > 100:
            for line in raw.splitlines():
                line = re.sub(r'^\d+[\.\)]\s*', '', line).strip()
                if line and len(line) > 25 and not line.startswith('#') and not line.startswith('TASK'):
                    key_takeaways.append(line)
                    if len(key_takeaways) >= 6:
                        break

    # Final safety fallback
    if not summary:
        words = fallback_text.split()
        summary = " ".join(words[:120]) + ("…" if len(words) > 120 else "")
    if not key_takeaways:
        key_takeaways = [summary[:200]]

    return summary, key_takeaways


# ─────────────────────────────────────────────────────────────
# Quiz Generation
# ─────────────────────────────────────────────────────────────
def generate_quiz(text: str, title: str = "Untitled Lecture") -> list:
    if not text or len(text.strip()) < 100:
        return []

    chunk = _smart_chunk(text, 12000)
    kw    = ", ".join(_top_keywords(chunk, 20))

    quiz_prompt = f"""You are an expert educator creating a multiple-choice quiz for the lecture: "{title}"
Concepts covered in this lecture: {kw}

LECTURE TRANSCRIPT:
{chunk}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CREATE A 5-QUESTION MULTIPLE-CHOICE QUIZ
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

STRICT RULES:
1. Every question tests UNDERSTANDING OF A CONCEPT — never tests word-recall or asks to fill blanks
2. Questions must cover 5 DIFFERENT concepts from the lecture
3. All 4 options must be plausible — distractors relate to the topic, not obviously wrong
4. The correct answer must be clearly supported by what the transcript says
5. Difficulty mix: Q1 easy, Q2 easy, Q3 medium, Q4 medium, Q5 challenging
6. The explanation must reference specific content from the lecture

GOOD question types (use a variety):
✓ "What is the main purpose / role of [concept]?"
✓ "According to the lecture, why does [phenomenon] occur?"
✓ "Which of the following BEST describes [concept]?"
✓ "What is the relationship between [A] and [B]?"
✓ "In this lecture, [concept] is important because...?"
✓ "What happens when [condition] — as explained in the lecture?"
✓ "Which statement about [topic] is TRUE according to the lecture?"

BAD question types (NEVER use):
✗ "Fill in the blank: ___"
✗ "What word was used to describe ___?"
✗ Questions about who said what or exact phrasing

OUTPUT: Return ONLY a valid JSON array. No markdown. No text before or after the array.
Start your response with [ and end with ]

[
  {{
    "question": "Conceptual question about the lecture content?",
    "options": [
      "Correct answer — clearly supported by the transcript",
      "Plausible distractor related to the topic",
      "Plausible distractor related to the topic",
      "Plausible distractor related to the topic"
    ],
    "correctIndex": 0,
    "explanation": "This is correct because the lecture specifically explained that [direct reference]. [Additional context from the transcript]."
  }}
]"""

    raw = _call_groq(quiz_prompt, temperature=0.20, max_tokens=2500)
    questions = _parse_quiz_json(raw)

    # One retry with an even simpler prompt if first attempt failed
    if not questions:
        print("Quiz attempt 1 failed — retrying with strict minimal prompt…")
        retry_prompt = f"""Lecture: "{title}"
Key topics: {kw}

Transcript (first 5000 chars):
{chunk[:5000]}

Return a JSON array of exactly 5 multiple-choice quiz questions about the CONCEPTS in this lecture.
Each object must have exactly these fields:
- "question": string (a conceptual question, NOT fill-in-the-blank)
- "options": array of exactly 4 strings
- "correctIndex": integer 0, 1, 2, or 3
- "explanation": string (why this answer is correct, citing the lecture)

Start with [ and end with ]. Return ONLY the JSON array."""

        raw = _call_groq(retry_prompt, temperature=0.10, max_tokens=2000)
        questions = _parse_quiz_json(raw)

    if not questions:
        print("Groq quiz unavailable — using concept-based fallback")
        questions = _concept_based_fallback(text, kw)

    return questions[:5]


def _parse_quiz_json(raw: str) -> list:
    """Robustly extract and validate a quiz JSON array from model output."""
    if not raw:
        return []

    # Strip markdown fences
    clean = re.sub(r'^```(?:json)?\s*', '', raw.strip(), flags=re.MULTILINE)
    clean = re.sub(r'\s*```\s*$', '', clean, flags=re.MULTILINE).strip()

    # Find the JSON array even if there's surrounding text
    bracket_match = re.search(r'\[.*\]', clean, re.DOTALL)
    if bracket_match:
        clean = bracket_match.group(0)

    try:
        questions = json.loads(clean)
        validated = []
        for q in questions:
            if not isinstance(q, dict):
                continue
            if not all(k in q for k in ("question", "options", "correctIndex", "explanation")):
                continue
            if not isinstance(q["options"], list) or len(q["options"]) < 2:
                continue
            # Skip fill-in-the-blank questions even if fallback produced them
            if "fill in the blank" in str(q["question"]).lower() or "_____" in str(q["question"]):
                continue
            ci = int(q["correctIndex"])
            if ci >= len(q["options"]):
                ci = 0
            validated.append({
                "question":     str(q["question"]).strip(),
                "options":      [str(o).strip() for o in q["options"][:4]],
                "correctIndex": ci,
                "explanation":  str(q["explanation"]).strip(),
            })
        return validated
    except (json.JSONDecodeError, Exception) as e:
        print(f"Quiz JSON parse error: {e}\nRaw snippet: {raw[:300]}")
        return []


def _concept_based_fallback(text: str, keywords_str: str) -> list:
    """
    Concept-based fallback quiz when Groq is unavailable.
    Builds meaningful 'Which of the following is true about X?' style questions
    from the most informative sentences in the transcript.
    Never produces fill-in-the-blank questions.
    """
    import random

    noise = {
        "the","a","an","is","are","was","were","it","its","this","that","and","or","but","in",
        "on","at","to","for","of","with","by","from","as","be","been","have","has","had",
        "so","if","then","just","also","very","their","there","here","you","we","i",
    }

    kw_set = set(keywords_str.lower().split(", "))

    # Score sentences by how many keywords they contain
    sentences = [
        s.strip() for s in re.split(r'(?<=[.!?])\s+', text)
        if 50 < len(s.strip()) < 350
    ]
    if not sentences:
        return []

    def keyword_score(s: str) -> float:
        words = re.findall(r'\b[a-z]{4,}\b', s.lower())
        hits = sum(1 for w in words if w in kw_set)
        return hits / max(len(words), 1)

    top_sents = sorted(sentences, key=keyword_score, reverse=True)[:10]

    # Build a pool of content words for distractors
    all_content = list({
        w for w in re.findall(r'\b[A-Za-z]{5,}\b', text)
        if w.lower() not in noise
    })

    questions = []
    used = set()

    for sent in top_sents:
        if len(questions) >= 5:
            break

        # Find the best noun/concept in this sentence
        nouns = re.findall(r'\b[A-Z][a-z]{3,}\b|\b[a-z]{6,}\b', sent)
        nouns = [n for n in nouns if n.lower() not in noise and n.lower() not in used]
        if not nouns:
            continue

        concept = nouns[0]
        used.add(concept.lower())

        # Create a TRUE statement from the sentence
        excerpt = sent[:130].rstrip('.,;') + ("..." if len(sent) > 130 else "")

        # Distractors: plausible alternative statements
        alt_words = [w for w in all_content if w.lower() != concept.lower() and w.lower() not in used]
        random.shuffle(alt_words)
        alt_words = list(dict.fromkeys(alt_words))[:3]

        if len(alt_words) < 3:
            alt_words += ["a related but different concept"] * (3 - len(alt_words))

        correct = f'"{concept}" — as discussed in the lecture'
        distractors = [f'"{w}" — which was not the focus here' for w in alt_words[:3]]

        options = [correct] + distractors
        random.shuffle(options)

        questions.append({
            "question":     f"According to the lecture, what is the key term or concept in the following statement: \"{excerpt}\"",
            "options":      options[:4],
            "correctIndex": options.index(correct),
            "explanation":  f'The lecture specifically discusses "{concept}" in this context: {excerpt}',
        })

    return questions
