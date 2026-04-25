// ============================================================
// analytics.js — Performance Analytics & Charts
// Call ANALYTICS.render(roomCode, containerId) to show results
// ============================================================

const ANALYTICS = {

  // ── Main render entry point ───────────────────────────────
  render(roomCode, containerId) {
    const data = STATE.getAnalytics(roomCode);
    if (!data) return;

    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = `
      <div class="analytics-wrap">
        ${this._summaryCards(data)}
        ${this._hardestQuestions(data)}
        ${this._studentTable(data)}
        ${this._difficultyProgression(data)}
      </div>
    `;
  },

  // ── Summary stat cards ────────────────────────────────────
  _summaryCards(data) {
    const avgScore = this._avgScore(data.students);
    const avgTime = this._avgTimePerQuestion(data.students);
    return `
      <div class="stat-cards">
        <div class="stat-card">
          <div class="stat-num">${data.totalStudents}</div>
          <div class="stat-label">Students</div>
        </div>
        <div class="stat-card">
          <div class="stat-num">${data.completedStudents}</div>
          <div class="stat-label">Completed</div>
        </div>
        <div class="stat-card">
          <div class="stat-num">${avgScore}%</div>
          <div class="stat-label">Avg Score</div>
        </div>
        <div class="stat-card">
          <div class="stat-num">${avgTime}s</div>
          <div class="stat-label">Avg Time/Q</div>
        </div>
      </div>
    `;
  },

  // ── Hardest questions (most wrong answers) ────────────────
  _hardestQuestions(data) {
    const qs = Object.values(data.questionStats)
      .sort((a, b) => b.wrong - a.wrong)
      .slice(0, 5);

    if (qs.length === 0) return "";

    const bars = qs.map(q => {
      const pct = Math.round((q.wrong / q.count) * 100) || 0;
      return `
        <div class="bar-row">
          <div class="bar-label" title="${q.question}">${this._truncate(q.question, 45)}</div>
          <div class="bar-track">
            <div class="bar-fill" style="width:${pct}%"></div>
          </div>
          <div class="bar-pct">${pct}% wrong</div>
        </div>
      `;
    }).join("");

    return `
      <div class="analytics-section">
        <h3 class="section-title">🎯 Questions Students Struggled With Most</h3>
        <div class="bar-chart">${bars}</div>
      </div>
    `;
  },

  // ── Per-student performance table ────────────────────────
  _studentTable(data) {
    if (data.students.length === 0) return "";

    const rows = data.students
      .sort((a, b) => this._score(b) - this._score(a))
      .map((s, i) => {
        const score = this._score(s);
        const avgTime = s.answers.length
          ? Math.round(s.answers.reduce((sum, a) => sum + a.timeSpent, 0) / s.answers.length)
          : 0;
        const maxDiff = s.answers.length ? Math.max(...s.answers.map(a => a.difficulty)) : 0;
        const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : "";
        return `
          <tr>
            <td>${medal} ${s.name}</td>
            <td><span class="score-badge score-${this._scoreClass(score)}">${score}%</span></td>
            <td>${s.answers.length}</td>
            <td>${avgTime}s</td>
            <td>${"★".repeat(maxDiff)}${"☆".repeat(5 - maxDiff)}</td>
            <td>${s.tabSwitches > 0 ? `⚠️ ${s.tabSwitches}` : "✅ 0"}</td>
          </tr>
        `;
      }).join("");

    return `
      <div class="analytics-section">
        <h3 class="section-title">📊 Student Performance</h3>
        <table class="perf-table">
          <thead>
            <tr>
              <th>Student</th><th>Score</th><th>Questions</th>
              <th>Avg Time/Q</th><th>Max Difficulty</th><th>Tab Switches</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    `;
  },

  // ── Difficulty progression per student ────────────────────
  _difficultyProgression(data) {
    if (data.students.length === 0) return "";

    const svgWidth = 600, svgHeight = 200;
    const colors = ["#6EE7B7","#60A5FA","#F472B6","#FBBF24","#A78BFA"];

    const allLengths = data.students.map(s => s.answers.length);
    const maxLen = Math.max(...allLengths, 1);

    const paths = data.students.map((s, si) => {
      if (s.answers.length < 2) return "";
      const pts = s.answers.map((a, i) => {
        const x = (i / (maxLen - 1)) * (svgWidth - 40) + 20;
        const y = svgHeight - 20 - ((a.difficulty - 1) / 4) * (svgHeight - 40);
        return `${x},${y}`;
      });
      return `<polyline points="${pts.join(" ")}" fill="none" stroke="${colors[si % colors.length]}" stroke-width="2.5" opacity="0.85"/>`;
    }).join("");

    const legend = data.students.map((s, si) => `
      <span style="color:${colors[si % colors.length]}">● ${s.name}</span>
    `).join("  ");

    return `
      <div class="analytics-section">
        <h3 class="section-title">📈 Adaptive Difficulty Journey</h3>
        <svg viewBox="0 0 ${svgWidth} ${svgHeight}" class="diff-chart">
          <!-- Y axis labels -->
          ${[1,2,3,4,5].map(d => {
            const y = svgHeight - 20 - ((d-1)/4)*(svgHeight-40);
            return `<text x="10" y="${y+4}" fill="#888" font-size="10">L${d}</text>`;
          }).join("")}
          ${paths}
        </svg>
        <div class="chart-legend">${legend}</div>
      </div>
    `;
  },

  // ── Helpers ───────────────────────────────────────────────
  _score(student) {
    if (!student.answers.length) return 0;
    const correct = student.answers.filter(a => a.correct).length;
    return Math.round((correct / student.answers.length) * 100);
  },

  _avgScore(students) {
    if (!students.length) return 0;
    return Math.round(students.reduce((s, st) => s + this._score(st), 0) / students.length);
  },

  _avgTimePerQuestion(students) {
    const allAnswers = students.flatMap(s => s.answers);
    if (!allAnswers.length) return 0;
    return Math.round(allAnswers.reduce((s, a) => s + a.timeSpent, 0) / allAnswers.length);
  },

  _scoreClass(score) {
    if (score >= 75) return "high";
    if (score >= 50) return "mid";
    return "low";
  },

  _truncate(str, len) {
    return str.length > len ? str.slice(0, len) + "…" : str;
  },
};

window.ANALYTICS = ANALYTICS;
