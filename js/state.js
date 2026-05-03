// ============================================================
// state.js — Firebase-powered state
// ============================================================

const STATE = {
  currentRoom: null,
  currentStudent: null,

  generateRoomCode() {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  },

  async createRoom(teacherName, quiz) {
    const code = this.generateRoomCode();
    await DB.set(`rooms/${code}`, {
      code,
      teacherName,
      quiz,
      students: {},
      status: "waiting",
      createdAt: Date.now(),
    });
    this.currentRoom = code;
    return code;
  },

  async joinRoom(code, studentName) {
  code = code.toUpperCase();
  const room = await DB.get(`rooms/${code}`);
  if (!room) return { error: "Room not found" };
  if (room.status === "ended") return { error: "Quiz has ended" };
  if (room.status === "active") return { error: "Quiz already in progress — ask your teacher for a new room" };

  // Duplicate name check
  const existing = await DB.get(`rooms/${code}/students/${studentName}`);
  if (existing) return { error: `"${studentName}" is already taken. Please use a different name.` };

  const shuffledQ = this.shuffleArray([...room.quiz.questions]);

  await DB.set(`rooms/${code}/students/${studentName}`, {
    name: studentName,
    answers: [],
    currentIndex: 0,
    difficulty: CONFIG.ADAPTIVE.START_DIFFICULTY,
    correctStreak: 0,
    tabSwitches: 0,
    shuffledQuestions: shuffledQ,
    completed: false,
    joinedAt: Date.now(),
  });

  // Save session for rejoin
  localStorage.setItem("iq_session", JSON.stringify({
    roomCode: code,
    studentName,
    joinedAt: Date.now(),
  }));

  this.currentRoom = code;
  this.currentStudent = studentName;
  return { success: true, room };
},

  async recordAnswer(roomCode, studentName, questionId, selectedOption, timeSpent) {
    const path = `rooms/${roomCode}/students/${studentName}`;
    const student = await DB.get(path);
    if (!student) return;

    const q = student.shuffledQuestions[student.currentIndex];
    const correct = selectedOption === q.correctAnswer;

    const answers = student.answers || [];
    answers.push({
      questionId,
      question: q.question,
      selectedOption,
      correctAnswer: q.correctAnswer,
      correct,
      timeSpent,
      difficulty: student.difficulty,
    });

    let { difficulty, correctStreak } = student;
    if (correct) {
      correctStreak++;
      if (correctStreak >= CONFIG.ADAPTIVE.CORRECT_STREAK_TO_INCREASE) {
        difficulty = Math.min(difficulty + 1, CONFIG.ADAPTIVE.MAX_DIFFICULTY);
        correctStreak = 0;
      }
    } else {
      correctStreak = 0;
      difficulty = Math.max(difficulty - CONFIG.ADAPTIVE.WRONG_TO_DECREASE,
        CONFIG.ADAPTIVE.MIN_DIFFICULTY);
    }

    const newIndex = student.currentIndex + 1;
    const completed = newIndex >= student.shuffledQuestions.length;

    await DB.update(path, {
      answers,
      currentIndex: newIndex,
      difficulty,
      correctStreak,
      completed,
      completedAt: completed ? Date.now() : null,
    });
  },

  async getAnalytics(roomCode) {
    const room = await DB.get(`rooms/${roomCode}`);
    if (!room) return null;

    const students = Object.values(room.students || {});
    const questionStats = {};

    students.forEach(s => {
      (s.answers || []).forEach(a => {
        if (!questionStats[a.questionId]) {
          questionStats[a.questionId] = {
            question: a.question,
            correct: 0, wrong: 0, totalTime: 0, count: 0
          };
        }
        const qs = questionStats[a.questionId];
        qs.count++;
        qs.totalTime += a.timeSpent;
        if (a.correct) qs.correct++; else qs.wrong++;
      });
    });

    return { room, students, questionStats,
      totalStudents: students.length,
      completedStudents: students.filter(s => s.completed).length,
    };
  },

  listenToRoom(roomCode, callback) {
    DB.on(`rooms/${roomCode}`, callback);
  },

  stopListening(roomCode) {
    DB.off(`rooms/${roomCode}`);
  },

  shuffleArray(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  },

 // Rejoin existing session
  async rejoinSession() {
    try {
      const saved = JSON.parse(localStorage.getItem("iq_session"));
      if (!saved) return null;

      const { roomCode, studentName } = saved;
      const room = await DB.get(`rooms/${roomCode}`);
      if (!room) { localStorage.removeItem("iq_session"); return null; }
      if (room.status === "ended") { localStorage.removeItem("iq_session"); return null; }

      const student = await DB.get(`rooms/${roomCode}/students/${studentName}`);
      if (!student) { localStorage.removeItem("iq_session"); return null; }
      if (student.completed) { localStorage.removeItem("iq_session"); return null; }

      this.currentRoom = roomCode;
      this.currentStudent = studentName;
      return { roomCode, studentName, room, student };
    } catch(e) {
      localStorage.removeItem("iq_session");
      return null;
    }
  },

  // Clear session on quiz completion
  clearSession() {
    localStorage.removeItem("iq_session");
  },

  // ── Save quiz to teacher history ──────────────────────────
async saveQuizToHistory(teacherUid, roomCode, quizTitle, questionCount) {
  await DB.set(`teachers/${teacherUid}/quizzes/${roomCode}`, {
    roomCode,
    quizTitle,
    questionCount,
    createdAt: Date.now(),
    status: "active",
  });
},

// ── Mark quiz as ended in history ────────────────────────
async endQuizInHistory(teacherUid, roomCode, studentCount, avgScore) {
  await DB.update(`teachers/${teacherUid}/quizzes/${roomCode}`, {
    status: "ended",
    endedAt: Date.now(),
    studentCount,
    avgScore,
  });
},

// ── Get all quizzes for a teacher ─────────────────────────
async getTeacherHistory(teacherUid) {
  const quizzes = await DB.get(`teachers/${teacherUid}/quizzes`);
  if (!quizzes) return [];
  return Object.values(quizzes).sort((a, b) => b.createdAt - a.createdAt);
},

  save() {},
  load() {},
};

window.STATE = STATE;