export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { topic, count } = req.body;
  if (!topic) return res.status(400).json({ error: "Topic is required" });

  const prompt = `You are an expert educator. Generate exactly ${count || 10} multiple-choice quiz questions about "${topic}".

Return ONLY valid JSON, no markdown, no explanation:
{
  "questions": [
    {
      "id": "q1",
      "question": "Question text?",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctAnswer": "Option A",
      "difficulty": 1,
      "explanation": "Brief explanation"
    }
  ]
}

Rules:
- Exactly 4 options per question
- correctAnswer must exactly match one of the options
- difficulty must be 1, 2, 3, 4, or 5
- Make 2 questions per difficulty level
- Keep questions and answers concise`;

  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.7,
        max_tokens: 4000,
      }),
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error?.message || "Groq API error");
    }

    const data = await response.json();
    const text = data.choices[0].message.content.trim();
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