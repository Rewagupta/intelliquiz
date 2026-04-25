const AI = {

  async generateQuestions(topic, count = 10) {
    const prompt = `You are an expert educator. Generate exactly ${count} multiple-choice quiz questions about "${topic}".

Create questions at 5 difficulty levels (1=easiest, 5=hardest), with a mix across levels.

Return ONLY valid JSON in this exact format, no markdown, no explanation:
{
  "questions": [
    {
      "id": "q1",
      "question": "Question text here?",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctAnswer": "Option A",
      "difficulty": 1,
      "explanation": "Brief explanation of why this is correct"
    }
  ]
}

Rules:
- Each question must have exactly 4 options
- correctAnswer must be one of the 4 options (exact text match)
- difficulty must be 1, 2, 3, 4, or 5
- Distribute: 2 questions at level 1, 2 at level 2, 2 at level 3, 2 at level 4, 2 at level 5
- Keep questions clear, unambiguous, and educationally valuable`;

    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${CONFIG.GEMINI_MODEL}:generateContent?key=${CONFIG.GEMINI_API_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 8192,
            responseMimeType: "application/json",
            }
          }),
        }
      );

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error?.message || "Gemini API error");
      }

      const data = await response.json();
      const text = data.candidates[0].content.parts[0].text.trim();

// Strip markdown fences and clean bad control characters
      const clean = text
      .replace(/```json\n?/g, "")
      .replace(/```\n?/g, "")
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "") // remove bad control chars
      .replace(/\n/g, " ")   // flatten newlines inside JSON
      .trim();

const parsed = JSON.parse(clean);

      const questions = parsed.questions.map((q, i) => ({
        ...q,
        id: q.id || `q${i + 1}`,
      }));

      return { success: true, questions };

    } catch (err) {
      console.error("Gemini generation failed:", err);
      return { success: false, error: err.message };
    }
  },

  getQuestionsByDifficulty(questions, difficulty) {
    const exact = questions.filter(q => q.difficulty === difficulty);
    if (exact.length > 0) return exact;
    const sorted = [...questions].sort((a, b) =>
      Math.abs(a.difficulty - difficulty) - Math.abs(b.difficulty - difficulty)
    );
    return sorted.slice(0, 3);
  },

  pickAdaptiveQuestion(questions, usedIds, currentDifficulty) {
    const available = questions.filter(q => !usedIds.includes(q.id));
    if (available.length === 0) return null;
    const byDiff = this.getQuestionsByDifficulty(available, currentDifficulty);
    return byDiff[Math.floor(Math.random() * byDiff.length)];
  },
};

window.AI = AI;
