// ============================================================
// api/generate.js — Serverless function (runs on Vercel)
// Your Gemini API key stays here — never exposed to browser
// ============================================================

export default async function handler(req, res) {
  // Only allow POST
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { topic, count } = req.body;

  if (!topic) {
    return res.status(400).json({ error: "Topic is required" });
  }

  const prompt = `You are an expert educator. Generate exactly ${count || 10} multiple-choice quiz questions about "${topic}".

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
- Make 2 questions per difficulty level
- Keep answers short (max 8 words per option)
- Keep questions concise (max 20 words)`;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${process.env.GEMINI_MODEL}:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 8192,
            responseMimeType: "application/json",
          },
        }),
      }
    );

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error?.message || "Gemini API error");
    }

    const data = await response.json();
    const text = data.candidates[0].content.parts[0].text.trim();
    const clean = text
      .replace(/```json\n?/g, "")
      .replace(/```\n?/g, "")
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "")
      .trim();

    const parsed = JSON.parse(clean);
    return res.status(200).json({ success: true, questions: parsed.questions });

  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
}