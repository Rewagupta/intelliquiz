// ============================================================
// app.js — Main Application Controller
// Handles page routing, UI rendering, quiz flowAIzaSyB8gS5nPWtGhjq-H_IC8y4upKrr9XGeSaA
// ============================================================

// ── Page Router ──────────────────────────────────────────────
const ROUTER = {
  show(pageId) {
    document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));
    const page = document.getElementById(pageId);
    if (page) {
      page.classList.add("active");
      window.scrollTo(0, 0);
    }
  },
};

// ── Notification helpers ──────────────────────────────────────
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

// ── Home Page ─────────────────────────────────────────────────
function initHome() {
  document.getElementById("btn-teacher").onclick = () => ROUTER.show("page-teacher-setup");
  document.getElementById("btn-student").onclick = () => ROUTER.show("page-join");
}

// ── Join Page (Student) ───────────────────────────────────────
function initJoin() {
  document.getElementById("btn-join-back").onclick = () => ROUTER.show("page-home");

  document.getElementById("btn-join-submit").onclick = () => {
    const code = document.getElementById("join-code").value.trim().toUpperCase();
    const name = document.getElementById("join-name").value.trim();
    if (code.length !== 6) return alert("Please enter a 6-digit room code.");
    if (!name) return alert("Please enter your name.");

    const result = STATE.joinRoom(code, name);
    if (result.error) return alert(result.error);

    STATE.save();
    startStudentQuiz(code, name);
  };
}

// ── Teacher Setup Page ────────────────────────────────────────
let teacherQuestions = [];
let activeTab = "manual";

function initTeacherSetup() {
  document.getElementById("btn-teacher-back").onclick = () => ROUTER.show("page-home");

  // Tab switching
  document.querySelectorAll(".tab-btn").forEach(btn => {
    btn.onclick = () => {
      document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
      document.querySelectorAll(".tab-panel").forEach(p => p.classList.add("hidden"));
      btn.classList.add("active");
      activeTab = btn.dataset.tab;
      document.getElementById(`tab-${activeTab}`).classList.remove("hidden");
    };
  });

  // Manual: add question
  document.getElementById("btn-add-question").onclick = addManualQuestion;

  // AI: generate
  document.getElementById("btn-ai-generate").onclick = generateAIQuestions;

  // Launch quiz
  document.getElementById("btn-launch-quiz").onclick = launchQuiz;

  renderQuestionList();
}

function addManualQuestion() {
  const q = document.getElementById("manual-question").value.trim();
  const opts = ["A","B","C","D"].map(l =>
    document.getElementById(`opt-${l}`).value.trim()
  );
  const correct = document.getElementById("correct-option").value;
  const difficulty = parseInt(document.getElementById("q-difficulty").value);

  if (!q) return alert("Please enter the question text.");
  if (opts.some(o => !o)) return alert("Please fill in all 4 options.");

  const correctText = document.getElementById(`opt-${correct}`).value.trim();
  if (!correctText) return alert("The correct option is empty.");

  teacherQuestions.push({
    id: `q${Date.now()}`,
    question: q,
    options: opts,
    correctAnswer: correctText,
    difficulty,
    explanation: document.getElementById("q-explanation").value.trim() || "",
  });

  // Clear form
  ["manual-question","opt-A","opt-B","opt-C","opt-D","q-explanation"]
    .forEach(id => { document.getElementById(id).value = ""; });

  STATE.save();
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
  if (!result.success) {
    status.textContent = "❌ Error: " + result.error;
    return;
  }

  teacherQuestions = [...teacherQuestions, ...result.questions];
  status.textContent = `✅ ${result.questions.length} questions added!`;
  STATE.save();
  renderQuestionList();
}

function renderQuestionList() {
  const list = document.getElementById("question-list");
  const count = document.getElementById("q-count");
  count.textContent = teacherQuestions.length;

  if (teacherQuestions.length === 0) {
    list.innerHTML = `<div class="text-dim text-center" style="padding:24px">
      No questions yet. Add manually or generate with AI.
    </div>`;
    return;
  }

  list.innerHTML = teacherQuestions.map((q, i) => `
    <div class="q-item">
      <span class="q-num">#${i + 1}</span>
      <span class="q-text">${q.question}</span>
      <span class="diff-badge diff-${q.difficulty}">L${q.difficulty}</span>
      <button class="q-remove" onclick="removeQuestion(${i})" title="Remove">✕</button>
    </div>
  `).join("");
}

function removeQuestion(index) {
  teacherQuestions.splice(index, 1);
  renderQuestionList();
}

function launchQuiz() {
  const title = document.getElementById("quiz-title").value.trim() || "Smart Quiz";
  if (teacherQuestions.length < 2) return alert("Add at least 2 questions to launch.");

  const roomCode = STATE.createRoom("Teacher", {
    title,
    questions: teacherQuestions,
    timePerQuestion: parseInt(document.getElementById("time-per-q").value) || 30,
  });

  STATE.save();
  showWaitingRoom(roomCode);
}

// ── Waiting Room (Teacher View) ───────────────────────────────
let waitingInterval = null;

function showWaitingRoom(roomCode) {
  ROUTER.show("page-waiting-room");
  document.getElementById("waiting-room-code").textContent = roomCode;
  document.getElementById("waiting-quiz-title").textContent =
    STATE.rooms[roomCode]?.quiz?.title || "Quiz";
  document.getElementById("waiting-q-count").textContent = teacherQuestions.length;

  updateStudentChips(roomCode);

  waitingInterval = setInterval(() => updateStudentChips(roomCode), 2000);

  document.getElementById("btn-start-quiz").onclick = () => {
    clearInterval(waitingInterval);
    STATE.rooms[roomCode].status = "active";
    STATE.save();
    showTeacherLiveView(roomCode);
  };

  document.getElementById("btn-waiting-back").onclick = () => {
    clearInterval(waitingInterval);
    ROUTER.show("page-teacher-setup");
  };
}

function updateStudentChips(roomCode) {
  const room = STATE.rooms[roomCode];
  if (!room) return;
  const names = Object.keys(room.students);
  const chips = document.getElementById("student-chips");
  document.getElementById("student-chip-count").textContent = names.length;
  chips.innerHTML = names.length
    ? names.map(n => `<span class="chip">👤 ${n}</span>`).join("")
    : `<span class="text-dim pulse">Waiting for students to join...</span>`;
}

// ── Teacher Live View ─────────────────────────────────────────
let liveInterval = null;

function showTeacherLiveView(roomCode) {
  ROUTER.show("page-live-view");
  updateLiveView(roomCode);
  liveInterval = setInterval(() => updateLiveView(roomCode), 2000);

  document.getElementById("btn-end-quiz").onclick = () => {
    clearInterval(liveInterval);
    STATE.rooms[roomCode].status = "ended";
    STATE.save();
    showTeacherAnalytics(roomCode);
  };
}

function updateLiveView(roomCode) {
  const room = STATE.rooms[roomCode];
  if (!room) return;
  const students = Object.values(room.students);
  const total = room.quiz.questions.length;

  const html = students.map(s => {
    const pct = Math.round((s.currentIndex / total) * 100);
    const score = s.answers.length
      ? Math.round(s.answers.filter(a => a.correct).length / s.answers.length * 100)
      : 0;
    return `
      <div class="q-item">
        <span style="flex:0 0 140px">👤 ${s.name}</span>
        <div style="flex:1">
          <div class="progress-bar"><div class="progress-fill" style="width:${pct}%"></div></div>
        </div>
        <span class="text-dim" style="font-size:0.82rem">${s.currentIndex}/${total}</span>
        <span class="score-badge score-${score>=75?'high':score>=50?'mid':'low'}">${score}%</span>
        ${s.tabSwitches > 0 ? `<span style="color:var(--warn)">⚠️${s.tabSwitches}</span>` : ""}
        ${s.completed ? `<span style="color:var(--accent)">✓ Done</span>` : ""}
      </div>
    `;
  }).join("") || `<div class="text-dim text-center" style="padding:24px">No students joined yet</div>`;

  document.getElementById("live-student-list").innerHTML = html;
}

// ── Teacher Analytics ─────────────────────────────────────────
function showTeacherAnalytics(roomCode) {
  ROUTER.show("page-analytics");
  ANALYTICS.render(roomCode, "analytics-container");

  document.getElementById("btn-analytics-back").onclick = () => {
    teacherQuestions = [];
    ROUTER.show("page-home");
  };

  document.getElementById("btn-export-csv").onclick = () => exportCSV(roomCode);
}

function exportCSV(roomCode) {
  const data = STATE.getAnalytics(roomCode);
  if (!data) return;

  const rows = [["Student","Score%","Questions Answered","Tab Switches","Completed"]];
  data.students.forEach(s => {
    const score = s.answers.length
      ? Math.round(s.answers.filter(a=>a.correct).length/s.answers.length*100) : 0;
    rows.push([s.name, score, s.answers.length, s.tabSwitches, s.completed]);
  });

  const csv = rows.map(r => r.join(",")).join("\n");
  const a = document.createElement("a");
  a.href = "data:text/csv;charset=utf-8," + encodeURIComponent(csv);
  a.download = `quiz-results-${roomCode}.csv`;
  a.click();
}

// ── Student Quiz Flow ─────────────────────────────────────────
let studentTimer = null;
let questionStartTime = null;

function startStudentQuiz(roomCode, studentName) {
  ROUTER.show("page-quiz");

  const room = STATE.rooms[roomCode];
  const student = room.students[studentName];
  const timePerQ = room.quiz.timePerQuestion || CONFIG.QUIZ.DEFAULT_TIME_PER_QUESTION;

  document.getElementById("quiz-title-display").textContent = room.quiz.title;

  // Start anti-cheat monitoring
  ANTICHEAT.start(
    (timeLeft) => updateTimerUI(timeLeft, timePerQ),
    (reason) => {
      if (reason === "timeout") {
        // Auto-advance on timeout
        handleAnswer(roomCode, studentName, null, timePerQ);
      } else if (reason === "autosubmit") {
        finishQuiz(roomCode, studentName);
      }
    },
    (count) => {
      const limit = CONFIG.ANTI_CHEAT.TAB_SWITCH_WARN_LIMIT;
      showCheatAlert(
        count <= limit
          ? `Tab switch detected (${count}/${limit})! Stay on this tab.`
          : `Too many tab switches! Auto-submitting quiz...`
      );
      student.tabSwitches = count;
      STATE.save();
    }
  );

  renderQuestion(roomCode, studentName, timePerQ);
}

function renderQuestion(roomCode, studentName, timePerQ) {
  const room = STATE.rooms[roomCode];
  const student = room.students[studentName];
  const questions = student.shuffledQuestions;

  if (student.currentIndex >= questions.length || student.completed) {
    ANTICHEAT.stop();
    return showStudentResults(roomCode, studentName);
  }

  const q = questions[student.currentIndex];
  const total = questions.length;
  const pct = Math.round((student.currentIndex / total) * 100);

  // Progress
  document.getElementById("quiz-progress-fill").style.width = pct + "%";
  document.getElementById("quiz-progress-label").textContent =
    `Question ${student.currentIndex + 1} of ${total}`;

  // Adaptive pill
  document.getElementById("adaptive-pill").textContent =
    `Difficulty: ${"★".repeat(student.difficulty)}${"☆".repeat(5-student.difficulty)}`;

  // Question text
  document.getElementById("question-text").textContent = q.question;

  // Options
  const letters = ["A","B","C","D"];
  const opts = document.getElementById("options-container");
  opts.innerHTML = q.options.map((opt, i) => `
    <button class="option-btn" data-option="${opt}" onclick="handleAnswer('${roomCode}','${studentName}','${CSS.escape(opt)}', ${timePerQ})">
      <span class="option-letter">${letters[i]}</span>
      ${opt}
    </button>
  `).join("");

  // Clear explanation
  document.getElementById("explanation-box").classList.add("hidden");

  // Start timer
  questionStartTime = Date.now();
  ANTICHEAT.startTimer(timePerQ);
}

function handleAnswer(roomCode, studentName, selectedOption, timePerQ) {
  ANTICHEAT.stopTimer();

  const timeSpent = Math.round((Date.now() - questionStartTime) / 1000);
  const student = STATE.rooms[roomCode].students[studentName];
  const q = student.shuffledQuestions[student.currentIndex];

  // Decode if CSS-escaped
  const selected = selectedOption;

  // Highlight correct/wrong
  document.querySelectorAll(".option-btn").forEach(btn => {
    btn.disabled = true;
    const optVal = btn.dataset.option;
    if (optVal === q.correctAnswer) btn.classList.add("correct");
    else if (optVal === selected && selected !== q.correctAnswer) btn.classList.add("wrong");
  });

  // Show explanation
  if (q.explanation) {
    const box = document.getElementById("explanation-box");
    box.textContent = "💡 " + q.explanation;
    box.classList.remove("hidden");
  }

  // Record in state
  STATE.recordAnswer(roomCode, studentName, q.id, selected, timeSpent);
  STATE.save();

  // Auto-advance after 1.8s
  setTimeout(() => renderQuestion(roomCode, studentName, timePerQ), 1800);
}

function updateTimerUI(timeLeft, total) {
  document.getElementById("timer-num").textContent = timeLeft;
  const pct = timeLeft / total;
  const r = 24;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - pct);
  const circle = document.getElementById("timer-circle");
  if (circle) {
    circle.style.strokeDasharray = circ;
    circle.style.strokeDashoffset = offset;
    circle.style.stroke = pct > 0.4 ? "var(--accent)" : pct > 0.2 ? "var(--warn)" : "var(--danger)";
  }
}

// ── Student Results ───────────────────────────────────────────
function showStudentResults(roomCode, studentName) {
  ROUTER.show("page-student-results");
  const student = STATE.rooms[roomCode].students[studentName];
  const correct = student.answers.filter(a => a.correct).length;
  const total = student.answers.length;
  const score = total ? Math.round((correct / total) * 100) : 0;

  document.getElementById("result-score").textContent = score + "%";
  document.getElementById("result-correct").textContent = correct;
  document.getElementById("result-total").textContent = total;
  document.getElementById("result-switches").textContent = student.tabSwitches;

  const breakdown = document.getElementById("result-breakdown");
  breakdown.innerHTML = student.answers.map(a => `
    <div class="answer-row ${a.correct ? "correct-row" : "wrong-row"}">
      <span>${a.correct ? "✅" : "❌"}</span>
      <div>
        <div style="font-weight:500">${a.question}</div>
        ${!a.correct ? `<div class="text-dim" style="font-size:0.82rem">
          Your answer: ${a.selectedOption || "No answer"} · Correct: ${a.correctAnswer}
        </div>` : ""}
      </div>
      <span class="text-dim" style="font-size:0.78rem;margin-left:auto">${a.timeSpent}s</span>
    </div>
  `).join("");

  document.getElementById("btn-results-home").onclick = () => ROUTER.show("page-home");
}

// ── Boot ──────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  ROUTER.show("page-home");
  initHome();
  initJoin();
  initTeacherSetup();
});
