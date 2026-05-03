// ============================================================
// app.js — Main Application Controller (Firebase version)
// ============================================================

const ROUTER = {
  show(pageId) {
    document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));
    const page = document.getElementById(pageId);
    if (page) { page.classList.add("active"); window.scrollTo(0, 0); }
  },
};

function showCheatAlert(message) {
  const existing = document.getElementById("cheat-alert");
  if (existing) existing.remove();
  const el = document.createElement("div");
  el.className = "cheat-alert";
  el.id = "cheat-alert";
  el.innerHTML = `⚠️ <span>${message}</span>
    <button class="cheat-alert-dismiss" onclick="this.parentElement.remove()">✕</button>`;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 5000);
}

function initHome() {
  document.getElementById("btn-teacher").onclick = () => {
    const user = AUTH.currentUser();
    if (user) {
      loadTeacherDashboard();
      ROUTER.show("page-teacher-dashboard");
    } else {
      ROUTER.show("page-teacher-auth");
    }
  };
  document.getElementById("btn-student").onclick = () => ROUTER.show("page-join");
}

function initJoin() {
  document.getElementById("btn-join-back").onclick = () => ROUTER.show("page-home");
  document.getElementById("btn-join-submit").onclick = async () => {
    const code = document.getElementById("join-code").value.trim().toUpperCase();
    const name = document.getElementById("join-name").value.trim();
    if (code.length !== 6) return alert("Please enter a 6-digit room code.");
    if (!name) return alert("Please enter your name.");

    const btn = document.getElementById("btn-join-submit");
    btn.disabled = true;
    btn.textContent = "Joining...";

    const result = await STATE.joinRoom(code, name);
    btn.disabled = false;
    btn.textContent = "Join Quiz →";

    if (result.error) return alert(result.error);

// Show waiting screen instead of starting immediately
    showStudentWaiting(code, name);
  };
}

let teacherQuestions = [];

function initTeacherSetup() {
  document.getElementById("btn-teacher-back").onclick = () => ROUTER.show("page-home");

document.querySelectorAll("#page-teacher-setup .tab-btn").forEach(btn => {
  btn.onclick = () => {
    document.querySelectorAll("#page-teacher-setup .tab-btn").forEach(b => b.classList.remove("active"));
    document.querySelectorAll("#page-teacher-setup .tab-panel").forEach(p => p.classList.add("hidden"));
    btn.classList.add("active");
    const panel = document.getElementById(`tab-${btn.dataset.tab}`);
    if (panel) panel.classList.remove("hidden");
  };
});

  document.getElementById("btn-add-question").onclick = addManualQuestion;
  document.getElementById("btn-ai-generate").onclick = generateAIQuestions;
  document.getElementById("btn-launch-quiz").onclick = launchQuiz;
  renderQuestionList();
}

function addManualQuestion() {
  const q = document.getElementById("manual-question").value.trim();
  const opts = ["A","B","C","D"].map(l => document.getElementById(`opt-${l}`).value.trim());
  const correct = document.getElementById("correct-option").value;
  const difficulty = parseInt(document.getElementById("q-difficulty").value);

  if (!q) return alert("Please enter the question text.");
  if (opts.some(o => !o)) return alert("Please fill in all 4 options.");

  const correctText = document.getElementById(`opt-${correct}`).value.trim();
  teacherQuestions.push({
    id: `q${Date.now()}`,
    question: q, options: opts,
    correctAnswer: correctText,
    difficulty,
    explanation: document.getElementById("q-explanation").value.trim() || "",
  });

  ["manual-question","opt-A","opt-B","opt-C","opt-D","q-explanation"]
    .forEach(id => { document.getElementById(id).value = ""; });
  renderQuestionList();
}

async function generateAIQuestions() {
  const topic = document.getElementById("ai-topic").value.trim();
  const count = parseInt(document.getElementById("ai-count").value) || 10;
  if (!topic) return alert("Please enter a topic.");

  const btn = document.getElementById("btn-ai-generate");
  const status = document.getElementById("ai-status");
  btn.disabled = true;
  status.innerHTML = `<span class="ai-spinner"></span> Generating ${count} questions about "${topic}"...`;

  const result = await AI.generateQuestions(topic, count);
  btn.disabled = false;

  if (!result.success) { status.textContent = "❌ Error: " + result.error; return; }

  teacherQuestions = [...teacherQuestions, ...result.questions];
  status.textContent = `✅ ${result.questions.length} questions added!`;
  renderQuestionList();
}

function renderQuestionList() {
  const list = document.getElementById("question-list");
  document.getElementById("q-count").textContent = teacherQuestions.length;

  if (teacherQuestions.length === 0) {
    list.innerHTML = `<div class="text-dim text-center" style="padding:24px">
      No questions yet. Add manually or generate with AI.</div>`;
    return;
  }
  list.innerHTML = teacherQuestions.map((q, i) => `
    <div class="q-item">
      <span class="q-num">#${i+1}</span>
      <span class="q-text">${q.question}</span>
      <span class="diff-badge diff-${q.difficulty}">L${q.difficulty}</span>
      <button class="q-remove" onclick="removeQuestion(${i})">✕</button>
    </div>`).join("");
}

function removeQuestion(index) {
  teacherQuestions.splice(index, 1);
  renderQuestionList();
}

async function launchQuiz() {
  const title = document.getElementById("quiz-title").value.trim() || "IntelliQuiz";
  if (teacherQuestions.length < 2) return alert("Add at least 2 questions to launch.");

  const btn = document.getElementById("btn-launch-quiz");
  btn.disabled = true;
  btn.textContent = "Creating room...";

  const roomCode = await STATE.createRoom("Teacher", {
    title,
    questions: teacherQuestions,
    timePerQuestion: parseInt(document.getElementById("time-per-q").value) || 30,
  });

  // Save to teacher history if logged in
  const user = AUTH.currentUser();
  if (user) {
    await STATE.saveQuizToHistory(user.uid, roomCode, title, teacherQuestions.length);
  }

  btn.disabled = false;
  btn.innerHTML = `🚀 Launch Quiz &nbsp;<span id="q-count">${teacherQuestions.length}</span> Q's`;
  showWaitingRoom(roomCode);
}

function showWaitingRoom(roomCode) {
  ROUTER.show("page-waiting-room");
  document.getElementById("waiting-room-code").textContent = roomCode;
  document.getElementById("waiting-q-count").textContent = teacherQuestions.length;

  let prevStudentCount = 0;
  STATE.listenToRoom(roomCode, (room) => {
    if (!room) return;
    document.getElementById("waiting-quiz-title").textContent = room.quiz?.title || "Quiz";
    const names = Object.keys(room.students || {});
    document.getElementById("student-chip-count").textContent = names.length;
    if (names.length > prevStudentCount) SOUNDS.join();
    prevStudentCount = names.length;
    document.getElementById("student-chips").innerHTML = names.length
      ? names.map(n => `<span class="chip">👤 ${n}</span>`).join("")
      : `<span class="text-dim pulse">Waiting for students to join...</span>`;
  });

  document.getElementById("btn-start-quiz").onclick = async () => {
    SOUNDS.launch();
    STATE.stopListening(roomCode);
    await DB.update(`rooms/${roomCode}`, { status: "active" });
    showTeacherLiveView(roomCode);
  };

  document.getElementById("btn-waiting-back").onclick = () => {
    STATE.stopListening(roomCode);
    ROUTER.show("page-teacher-setup");
  };
}

function showTeacherLiveView(roomCode) {
  ROUTER.show("page-live-view");

  STATE.listenToRoom(roomCode, (room) => {
    if (!room) return;
    const students = Object.values(room.students || {});
    const total = room.quiz.questions.length;

    document.getElementById("live-student-list").innerHTML = students.map(s => {
      const answers = s.answers || [];
      const pct = Math.round((s.currentIndex / total) * 100);
      const score = answers.length
        ? Math.round(answers.filter(a => a.correct).length / answers.length * 100) : 0;
      return `
        <div class="q-item">
          <span style="flex:0 0 140px">👤 ${s.name}</span>
          <div style="flex:1">
            <div class="progress-bar">
              <div class="progress-fill" style="width:${pct}%"></div>
            </div>
          </div>
          <span class="text-dim" style="font-size:0.82rem">${s.currentIndex}/${total}</span>
          <span class="score-badge score-${score>=75?'high':score>=50?'mid':'low'}">${score}%</span>
          ${(s.tabSwitches||0)>0?`<span style="color:var(--warn)">⚠️${s.tabSwitches}</span>`:""}
          ${s.completed?`<span style="color:var(--accent)">✓ Done</span>`:""}
        </div>`;
    }).join("") || `<div class="text-dim text-center" style="padding:24px">No students yet</div>`;
  });

  document.getElementById("btn-end-quiz").onclick = async () => {
    STATE.stopListening(roomCode);
    await DB.update(`rooms/${roomCode}`, { status: "ended" });
    showTeacherAnalytics(roomCode);
  };
}

async function showTeacherAnalytics(roomCode) {
  ROUTER.show("page-analytics");
  const data = await STATE.getAnalytics(roomCode);
  ANALYTICS.renderDirect(data, "analytics-container");

  // Save final results to teacher history
  const user = AUTH.currentUser();
  if (user && data) {
    const avgScore = data.students.length
      ? Math.round(data.students.reduce((sum, s) => {
          const ans = s.answers || [];
          return sum + (ans.length
            ? Math.round(ans.filter(a=>a.correct).length/ans.length*100) : 0);
        }, 0) / data.students.length)
      : 0;
    await STATE.endQuizInHistory(user.uid, roomCode, data.totalStudents, avgScore);
  }

  document.getElementById("btn-analytics-back").onclick = () => {
    teacherQuestions = [];
    ROUTER.show("page-home");
  };

  document.getElementById("btn-export-csv").onclick = () => {
    if (!data) return;
    const rows = [["Student","Score%","Questions","Tab Switches","Completed"]];
    data.students.forEach(s => {
      const ans = s.answers || [];
      const score = ans.length
        ? Math.round(ans.filter(a=>a.correct).length/ans.length*100) : 0;
      rows.push([s.name, score, ans.length, s.tabSwitches||0, s.completed]);
    });
    const csv = rows.map(r => r.join(",")).join("\n");
    const a = document.createElement("a");
    a.href = "data:text/csv;charset=utf-8," + encodeURIComponent(csv);
    a.download = `intelliquiz-results.csv`;
    a.click();
  };
}

// ── Student Quiz ──────────────────────────────────────────────
let questionStartTime = null;

function startStudentQuiz(roomCode, studentName) {
  ROUTER.show("page-quiz");

  DB.get(`rooms/${roomCode}`).then(room => {
    const timePerQ = room.quiz.timePerQuestion || CONFIG.QUIZ.DEFAULT_TIME_PER_QUESTION;
    document.getElementById("quiz-title-display").textContent = room.quiz.title;

    ANTICHEAT.start(
      (timeLeft) => updateTimerUI(timeLeft, timePerQ),
      async (reason) => {
        if (reason === "timeout") await handleAnswer(roomCode, studentName, null, timePerQ);
        else if (reason === "autosubmit") await showStudentResults(roomCode, studentName);
      },
      async (count) => {
        const limit = CONFIG.ANTI_CHEAT.TAB_SWITCH_WARN_LIMIT;
        showCheatAlert(count <= limit
          ? `Tab switch detected (${count}/${limit})! Stay on this tab.`
          : `Too many tab switches! Auto-submitting...`);
        await DB.update(`rooms/${roomCode}/students/${studentName}`, { tabSwitches: count });
      }
    );

    renderQuestion(roomCode, studentName, timePerQ);
  });
}

async function renderQuestion(roomCode, studentName, timePerQ) {
  const student = await DB.get(`rooms/${roomCode}/students/${studentName}`);
  if (!student) return;

  if (student.currentIndex >= student.shuffledQuestions.length || student.completed) {
    ANTICHEAT.stop();
    return showStudentResults(roomCode, studentName);
  }

  const q = student.shuffledQuestions[student.currentIndex];
  const total = student.shuffledQuestions.length;
  const pct = Math.round((student.currentIndex / total) * 100);

  document.getElementById("quiz-progress-fill").style.width = pct + "%";
  document.getElementById("quiz-progress-label").textContent =
    `Question ${student.currentIndex + 1} of ${total}`;
  document.getElementById("adaptive-pill").textContent =
    `Difficulty: ${"★".repeat(student.difficulty)}${"☆".repeat(5 - student.difficulty)}`;
  document.getElementById("question-text").textContent = q.question;

  const letters = ["A","B","C","D"];
  const container = document.getElementById("options-container");
  container.innerHTML = "";
  q.options.forEach((opt, i) => {
    const btn = document.createElement("button");
    btn.className = "option-btn";
    btn.dataset.option = opt;
    btn.innerHTML = `<span class="option-letter">${letters[i]}</span>${opt}`;
    btn.addEventListener("click", () => handleAnswer(roomCode, studentName, opt, timePerQ));
    container.appendChild(btn);
});

  document.getElementById("explanation-box").classList.add("hidden");
  questionStartTime = Date.now();
  ANTICHEAT.startTimer(timePerQ);
}

async function handleAnswer(roomCode, studentName, selectedOption, timePerQ) {
  ANTICHEAT.stopTimer();
  const timeSpent = Math.round((Date.now() - questionStartTime) / 1000);
  const student = await DB.get(`rooms/${roomCode}/students/${studentName}`);
  if (!student) return;

  const q = student.shuffledQuestions[student.currentIndex];

  document.querySelectorAll(".option-btn").forEach(btn => {
    btn.disabled = true;
    if (btn.dataset.option === q.correctAnswer) btn.classList.add("correct");
    else if (btn.dataset.option === selectedOption) btn.classList.add("wrong");
  });

  // ── Play sound ──────────────────────────────────────────
  if (selectedOption === q.correctAnswer) {
    SOUNDS.correct();
  } else {
    SOUNDS.wrong();
  }

  if (q.explanation) {
    const box = document.getElementById("explanation-box");
    box.textContent = "💡 " + q.explanation;
    box.classList.remove("hidden");
  }

  await STATE.recordAnswer(roomCode, studentName, q.id, selectedOption, timeSpent);
  setTimeout(() => renderQuestion(roomCode, studentName, timePerQ), 1800);
}

function updateTimerUI(timeLeft, total) {
  document.getElementById("timer-num").textContent = timeLeft;
  const pct = timeLeft / total;
  const circ = 2 * Math.PI * 24;
  const circle = document.getElementById("timer-circle");
  if (circle) {
    circle.style.strokeDasharray = circ;
    circle.style.strokeDashoffset = circ * (1 - pct);
    circle.style.stroke = pct > 0.4 ? "var(--purple-light)" : pct > 0.2 ? "var(--warn)" : "var(--danger)";
  }
  // ── Timer warning sound ───────────────────────────────────
  if (timeLeft <= 5 && timeLeft > 0) {
    SOUNDS.timerWarn();
  }
}

async function showStudentResults(roomCode, studentName) {
  STATE.clearSession();
  SOUNDS.complete();
  ROUTER.show("page-student-results");
  const student = await DB.get(`rooms/${roomCode}/students/${studentName}`);
  const answers = student.answers || [];
  const correct = answers.filter(a => a.correct).length;
  const total = answers.length;
  const score = total ? Math.round((correct / total) * 100) : 0;

  document.getElementById("result-score").textContent = score + "%";
  document.getElementById("result-correct").textContent = correct;
  document.getElementById("result-total").textContent = total;
  document.getElementById("result-switches").textContent = student.tabSwitches || 0;

  document.getElementById("result-breakdown").innerHTML = answers.map(a => `
    <div class="answer-row ${a.correct ? "correct-row" : "wrong-row"}">
      <span>${a.correct ? "✅" : "❌"}</span>
      <div>
        <div style="font-weight:500">${a.question}</div>
        ${!a.correct ? `<div class="text-dim" style="font-size:0.82rem">
          Your answer: ${a.selectedOption || "No answer"} · Correct: ${a.correctAnswer}
        </div>` : ""}
      </div>
      <span class="text-dim" style="font-size:0.78rem;margin-left:auto">${a.timeSpent}s</span>
    </div>`).join("");

  document.getElementById("btn-results-home").onclick = () => ROUTER.show("page-home");

  // ── Download result card ────────────────────────────────
  const maxDifficulty = answers.length
    ? Math.max(...answers.map(a => a.difficulty || 1))
    : 1;

  document.getElementById("btn-download-card").onclick = async () => {
    const room = await DB.get(`rooms/${roomCode}`);
    RESULTCARD.generate({
      name: studentName,
      score,
      correct,
      total,
      tabSwitches: student.tabSwitches || 0,
      maxDifficulty,
      quizTitle: room?.quiz?.title || "IntelliQuiz",
    });
  };
}

// ── Student Waiting Screen ────────────────────────────────────
function showStudentWaiting(roomCode, studentName) {
  ROUTER.show("page-student-waiting");

  // Set student name display
  document.getElementById("sw-student-name").textContent = studentName;
  document.getElementById("sw-room-code").textContent = roomCode;

  // Listen for teacher to start the quiz
  DB.on(`rooms/${roomCode}/status`, (status) => {
    if (status === "active") {
      DB.off(`rooms/${roomCode}/status`);
      startStudentQuiz(roomCode, studentName);
    }
    if (status === "ended") {
      DB.off(`rooms/${roomCode}/status`);
      alert("This quiz has ended before it started.");
      ROUTER.show("page-home");
    }
  });
}

// ── Rejoin Prompt ─────────────────────────────────────────────
function showRejoinPrompt(session) {
  ROUTER.show("page-home");

  // Create rejoin banner
  const banner = document.createElement("div");
  banner.id = "rejoin-banner";
  banner.style.cssText = `
    position: fixed; bottom: 24px; left: 50%; transform: translateX(-50%);
    background: var(--surface); border: 1px solid rgba(124,58,237,.5);
    border-radius: var(--radius-lg); padding: 20px 28px;
    display: flex; align-items: center; gap: 20px;
    box-shadow: 0 8px 40px rgba(0,0,0,.4); z-index: 999;
    max-width: 500px; width: calc(100% - 32px);
    backdrop-filter: blur(20px);
    animation: slideIn .3s ease;
  `;

  banner.innerHTML = `
    <div style="flex:1">
      <div style="font-weight:700;color:var(--text);margin-bottom:4px">
        🔄 Resume your quiz?
      </div>
      <div style="font-size:.85rem;color:var(--text-dim)">
        You were in room <strong style="color:var(--purple-light);font-family:var(--font-mono)">${session.roomCode}</strong>
        as <strong style="color:var(--text)">${session.studentName}</strong>
        — Question ${(session.student.currentIndex || 0) + 1}
      </div>
    </div>
    <div style="display:flex;gap:8px;flex-shrink:0">
      <button class="btn btn-primary" style="padding:8px 16px;font-size:.85rem"
        onclick="doRejoin('${session.roomCode}','${session.studentName}')">
        Resume
      </button>
      <button class="btn btn-ghost" style="padding:8px 16px;font-size:.85rem"
        onclick="dismissRejoin()">
        Dismiss
      </button>
    </div>
  `;

  document.body.appendChild(banner);
}

async function doRejoin(roomCode, studentName) {
  dismissRejoin();
  const room = await DB.get(`rooms/${roomCode}`);
  if (!room) return alert("Room no longer available.");

  STATE.currentRoom = roomCode;
  STATE.currentStudent = studentName;

  if (room.status === "active") {
    startStudentQuiz(roomCode, studentName);
  } else if (room.status === "waiting") {
    showStudentWaiting(roomCode, studentName);
  } else {
    alert("This quiz has already ended.");
    STATE.clearSession();
  }
}

function dismissRejoin() {
  const banner = document.getElementById("rejoin-banner");
  if (banner) banner.remove();
  STATE.clearSession();
}

// ── Auth Functions ────────────────────────────────────────────
function switchAuthTab(tab) {
  const formLogin = document.getElementById("auth-form-login");
  const formSignup = document.getElementById("auth-form-signup");
  const tabLogin = document.getElementById("auth-tab-login");
  const tabSignup = document.getElementById("auth-tab-signup");

  if (formLogin) formLogin.classList.toggle("hidden", tab !== "login");
  if (formSignup) formSignup.classList.toggle("hidden", tab !== "signup");
  if (tabLogin) tabLogin.classList.toggle("active", tab === "login");
  if (tabSignup) tabSignup.classList.toggle("active", tab === "signup");
}

async function doLogin() {
  const email = document.getElementById("login-email").value.trim();
  const password = document.getElementById("login-password").value;
  const errEl = document.getElementById("login-error");
  const btn = document.getElementById("btn-login");

  if (!email || !password) return showAuthError("login", "Please fill in all fields.");

  btn.disabled = true;
  btn.textContent = "Logging in...";
  errEl.style.display = "none";

  try {
    await AUTH.login(email, password);
    btn.textContent = "Login →";
    btn.disabled = false;
    loadTeacherDashboard();
    ROUTER.show("page-teacher-dashboard");
  } catch(err) {
    btn.disabled = false;
    btn.textContent = "Login →";
    showAuthError("login", friendlyAuthError(err.code));
  }
}

async function doSignup() {
  const name = document.getElementById("signup-name").value.trim();
  const email = document.getElementById("signup-email").value.trim();
  const password = document.getElementById("signup-password").value;
  const btn = document.getElementById("btn-signup");

  if (!name || !email || !password) return showAuthError("signup", "Please fill in all fields.");
  if (password.length < 6) return showAuthError("signup", "Password must be at least 6 characters.");

  btn.disabled = true;
  btn.textContent = "Creating account...";

  try {
    await AUTH.signUp(email, password, name);
    btn.textContent = "Create Account →";
    btn.disabled = false;
    loadTeacherDashboard();
    ROUTER.show("page-teacher-dashboard");
  } catch(err) {
    btn.disabled = false;
    btn.textContent = "Create Account →";
    showAuthError("signup", friendlyAuthError(err.code));
  }
}

async function doLogout() {
  await AUTH.logout();
  teacherQuestions = [];
  ROUTER.show("page-home");
}

async function doResetPassword() {
  const email = document.getElementById("login-email").value.trim();
  if (!email) return showAuthError("login", "Enter your email above first.");
  try {
    await AUTH.resetPassword(email);
    showAuthError("login", "✅ Password reset email sent! Check your inbox.");
  } catch(err) {
    showAuthError("login", friendlyAuthError(err.code));
  }
}

function showAuthError(form, message) {
  const el = document.getElementById(`${form}-error`);
  el.textContent = message;
  el.style.display = "block";
}

function friendlyAuthError(code) {
  const errors = {
    "auth/user-not-found": "No account found with this email.",
    "auth/wrong-password": "Incorrect password.",
    "auth/email-already-in-use": "An account with this email already exists.",
    "auth/weak-password": "Password must be at least 6 characters.",
    "auth/invalid-email": "Please enter a valid email address.",
    "auth/too-many-requests": "Too many attempts. Please try again later.",
    "auth/invalid-credential": "Incorrect email or password.",
  };
  return errors[code] || "Something went wrong. Please try again.";
}

// ── Teacher Dashboard ─────────────────────────────────────────
async function loadTeacherDashboard() {
  const user = AUTH.currentUser();
  if (!user) return;

  document.getElementById("teacher-name-display").textContent =
    `👋 ${user.displayName || user.email}`;

  const list = document.getElementById("quiz-history-list");
  list.innerHTML = `<div class="text-dim text-center" style="padding:40px">Loading...</div>`;

  const history = await STATE.getTeacherHistory(user.uid);

  if (history.length === 0) {
    list.innerHTML = `
      <div class="card" style="text-align:center;padding:48px">
        <div style="font-size:3rem;margin-bottom:16px">📝</div>
        <h3 style="margin-bottom:8px">No quizzes yet</h3>
        <p class="text-dim" style="margin-bottom:24px">Create your first quiz to get started</p>
        <button class="btn btn-primary" onclick="ROUTER.show('page-teacher-setup')">
          + Create Quiz
        </button>
      </div>`;
    updateDashboardStats([], 0, 0);
    return;
  }

  // Render history cards
  list.innerHTML = history.map(q => {
    const date = new Date(q.createdAt).toLocaleDateString("en-IN", {
      day: "numeric", month: "short", year: "numeric"
    });
    const statusColor = q.status === "ended" ? "var(--green)" : "var(--warn)";
    const statusText = q.status === "ended" ? "Completed" : "In Progress";

    return `
      <div class="q-item" style="cursor:pointer;margin-bottom:10px"
        onclick="viewPastQuiz('${q.roomCode}', '${q.quizTitle}', '${date}')">
        <div style="flex:1">
          <div style="font-weight:700;color:var(--text);margin-bottom:4px">
            ${q.quizTitle}
          </div>
          <div style="font-size:.8rem;color:var(--text-dim);display:flex;gap:16px;flex-wrap:wrap">
            <span>📅 ${date}</span>
            <span>❓ ${q.questionCount} questions</span>
            <span>👥 ${q.studentCount || 0} students</span>
            ${q.avgScore !== undefined
              ? `<span>📊 Avg: ${q.avgScore}%</span>`
              : ""}
          </div>
        </div>
        <div style="display:flex;align-items:center;gap:12px">
          <span style="font-size:.75rem;padding:3px 10px;border-radius:999px;
            background:rgba(0,0,0,.2);color:${statusColor};
            border:1px solid ${statusColor}">
            ${statusText}
          </span>
          <span style="color:var(--text-dim)">→</span>
        </div>
      </div>
    `;
  }).join("");

  // Update stats
  const totalStudents = history.reduce((s, q) => s + (q.studentCount || 0), 0);
  const scoresWithData = history.filter(q => q.avgScore !== undefined);
  const avgScore = scoresWithData.length
    ? Math.round(scoresWithData.reduce((s, q) => s + q.avgScore, 0) / scoresWithData.length)
    : 0;

  updateDashboardStats(history, totalStudents, avgScore);
}

function updateDashboardStats(history, totalStudents, avgScore) {
  document.getElementById("stat-total-quizzes").textContent = history.length;
  document.getElementById("stat-total-students").textContent = totalStudents;
  document.getElementById("stat-avg-score").textContent = avgScore + "%";
}

async function viewPastQuiz(roomCode, title, date) {
  ROUTER.show("page-past-analytics");
  document.getElementById("past-quiz-title").textContent = title;
  document.getElementById("past-quiz-meta").textContent =
    `Room: ${roomCode} · ${date}`;

  const data = await STATE.getAnalytics(roomCode);
  if (!data || data.students.length === 0) {
    document.getElementById("past-analytics-container").innerHTML =
      `<div class="text-dim text-center" style="padding:40px">
        No student data available for this quiz.
      </div>`;
    return;
  }

  ANALYTICS.renderDirect(data, "past-analytics-container");

  document.getElementById("btn-export-past-csv").onclick = () => {
    const rows = [["Student","Score%","Questions","Tab Switches","Completed"]];
    data.students.forEach(s => {
      const ans = s.answers || [];
      const score = ans.length
        ? Math.round(ans.filter(a=>a.correct).length/ans.length*100) : 0;
      rows.push([s.name, score, ans.length, s.tabSwitches||0, s.completed]);
    });
    const csv = rows.map(r => r.join(",")).join("\n");
    const a = document.createElement("a");
    a.href = "data:text/csv;charset=utf-8," + encodeURIComponent(csv);
    a.download = `${title}-results.csv`;
    a.click();
  };
}

function toggleSound() {
  const enabled = SOUNDS.toggle();
  const btn = document.getElementById("sound-toggle");
  if (btn) btn.textContent = enabled ? "🔊" : "🔇";
}

// ── Boot ──────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", async () => {
  initHome();
  initJoin();
  initTeacherSetup();

  // Check for existing student session
  const session = await STATE.rejoinSession();
  if (session) {
    showRejoinPrompt(session);
    return;
  }

  // Check if teacher is already logged in
  AUTH.onAuthChange(async (user) => {
    if (user && window.location.hash !== "#quiz") {
      // Auto-redirect logged in teacher to dashboard
      // only on first load, not during quiz
    }
  });

  ROUTER.show("page-home");
});