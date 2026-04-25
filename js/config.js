const CONFIG = {
  // ── Gemini API ──
  GEMINI_API_KEY: "AIzaSyB9nzXsZmu1CqIMdz9IMf8Ap5pQDdrzbSc",
  GEMINI_MODEL: "gemini-2.5-flash",

  // ── Adaptive Difficulty ──
  ADAPTIVE: {
    CORRECT_STREAK_TO_INCREASE: 3,
    WRONG_TO_DECREASE: 1,
    MIN_DIFFICULTY: 1,
    MAX_DIFFICULTY: 5,
    START_DIFFICULTY: 2,
  },

  // ── Quiz Settings ──
  QUIZ: {
    DEFAULT_TIME_PER_QUESTION: 30,
    ROOM_CODE_LENGTH: 6,
    MAX_QUESTIONS: 20,
    DEFAULT_QUESTIONS: 10,
  },

  // ── Anti-Cheat ──
  ANTI_CHEAT: {
    TAB_SWITCH_WARN_LIMIT: 3,
    AUTO_SUBMIT_ON_LIMIT: true,
  },
};

window.CONFIG = CONFIG;