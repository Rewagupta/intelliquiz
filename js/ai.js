const AI = {
  async generateQuestions(topic, count = 10) {
    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic, count }),
      });

      const data = await response.json();
      if (!data.success) throw new Error(data.error || "Generation failed");

      const questions = data.questions.map((q, i) => ({
        ...q,
        id: q.id || `q${i + 1}`,
      }));

      return { success: true, questions };

    } catch (err) {
      console.error("Generation failed:", err);
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