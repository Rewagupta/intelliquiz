// ============================================================
// state.js — Central app state (single source of truth)
// All data lives here. Other files READ and WRITE via this API.
// ============================================================

const STATE = {
  // Active rooms: { roomCode: { ...roomData } }
  rooms: {},

  // Current user context
  currentRoom: null,
  currentStudent: null,
  currentTeacher: null,

  // ── Helper: generate a random 6-digit room code ──────────
  generateRoomCode() {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  },

  // ── Create a new room (called by teacher) ────────────────
  createRoom(teacherName, quiz) {
    const code = this.generateRoomCode();
    this.rooms[code] = {
      code,
      teacherName,
      quiz,                  // { title, questions: [...] }
      students: {},          // { studentName: { ...studentState } }
      status: "waiting",     // waiting | active | ended
      createdAt: Date.now(),
    };
    this.currentRoom = code;
    return code;
  },

  // ── Student joins room ────────────────────────────────────
  joinRoom(code, studentName) {
    code = code.toUpperCase();
    const room = this.rooms[code];
    if (!room) return { error: "Room not found" };
    if (room.status === "ended") return { error: "Quiz has ended" };

    const shuffledQ = this.shuffleArray([...room.quiz.questions]);

    room.students[studentName] = {
      name: studentName,
      answers: [],           // { questionId, selectedOption, correct, timeSpent, difficulty }
      currentIndex: 0,
      difficulty: CONFIG.ADAPTIVE.START_DIFFICULTY,
      correctStreak: 0,
      tabSwitches: 0,
      startTime: null,
      questionStartTime: null,
      shuffledQuestions: shuffledQ,
      completed: false,
    };

    this.currentRoom = code;
    this.currentStudent = studentName;
    return { success: true, room };
  },

  // ── Record an answer ──────────────────────────────────────
  recordAnswer(roomCode, studentName, questionId, selectedOption, timeSpent) {
    const student = this.rooms[roomCode]?.students[studentName];
    if (!student) return;

    const q = student.shuffledQuestions[student.currentIndex];
    const correct = selectedOption === q.correctAnswer;

    student.answers.push({
      questionId,
      question: q.question,
      selectedOption,
      correctAnswer: q.correctAnswer,
      correct,
      timeSpent,
      difficulty: student.difficulty,
    });

    // Adaptive difficulty adjustment
    if (correct) {
      student.correctStreak++;
      if (student.correctStreak >= CONFIG.ADAPTIVE.CORRECT_STREAK_TO_INCREASE) {
        student.difficulty = Math.min(student.difficulty + 1, CONFIG.ADAPTIVE.MAX_DIFFICULTY);
        student.correctStreak = 0;
      }
    } else {
      student.correctStreak = 0;
      student.difficulty = Math.max(student.difficulty - CONFIG.ADAPTIVE.WRONG_TO_DECREASE, CONFIG.ADAPTIVE.MIN_DIFFICULTY);
    }

    student.currentIndex++;
    if (student.currentIndex >= student.shuffledQuestions.length) {
      student.completed = true;
    }
  },

  // ── Get analytics for a room ─────────────────────────────
  getAnalytics(roomCode) {
    const room = this.rooms[roomCode];
    if (!room) return null;

    const students = Object.values(room.students);
    const questionStats = {};

    students.forEach(s => {
      s.answers.forEach(a => {
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

    return {
      room,
      students,
      questionStats,
      totalStudents: students.length,
      completedStudents: students.filter(s => s.completed).length,
    };
  },

  // ── Fisher-Yates shuffle ─────────────────────────────────
  shuffleArray(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  },

  // ── Persist to localStorage ───────────────────────────────
  save() {
    try {
      localStorage.setItem("sqp_state", JSON.stringify({
        rooms: this.rooms,
        currentRoom: this.currentRoom,
      }));
    } catch(e) {}
  },

  load() {
    try {
      const saved = JSON.parse(localStorage.getItem("sqp_state") || "{}");
      if (saved.rooms) this.rooms = saved.rooms;
      if (saved.currentRoom) this.currentRoom = saved.currentRoom;
    } catch(e) {}
  },
};

STATE.load();
window.STATE = STATE;
