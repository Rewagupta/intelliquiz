// ============================================================
// resultcard.js — Generate downloadable result card as PNG
// Uses Canvas API — no external libraries needed
// Call RESULTCARD.generate(studentData) to download
// ============================================================

const RESULTCARD = {

  generate(data) {
    const { name, score, correct, total, tabSwitches, maxDifficulty, quizTitle } = data;

    const canvas = document.createElement("canvas");
    canvas.width = 800;
    canvas.height = 480;
    const ctx = canvas.getContext("2d");

    // ── Background ──────────────────────────────────────────
    const bgGrad = ctx.createLinearGradient(0, 0, 800, 480);
    bgGrad.addColorStop(0, "#0D0D1A");
    bgGrad.addColorStop(0.5, "#12121F");
    bgGrad.addColorStop(1, "#1A1A2E");
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, 800, 480);

    // ── Grid pattern ────────────────────────────────────────
    ctx.strokeStyle = "rgba(124,58,237,0.06)";
    ctx.lineWidth = 1;
    for (let x = 0; x < 800; x += 40) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, 480); ctx.stroke();
    }
    for (let y = 0; y < 480; y += 40) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(800, y); ctx.stroke();
    }

    // ── Glowing orbs ────────────────────────────────────────
    this._drawOrb(ctx, -60, -60, 280, "rgba(124,58,237,0.15)");
    this._drawOrb(ctx, 700, 400, 220, "rgba(37,99,235,0.12)");
    this._drawOrb(ctx, 400, 480, 180, "rgba(236,72,153,0.08)");

    // ── Top border gradient line ─────────────────────────────
    const topGrad = ctx.createLinearGradient(0, 0, 800, 0);
    topGrad.addColorStop(0, "transparent");
    topGrad.addColorStop(0.3, "#7C3AED");
    topGrad.addColorStop(0.7, "#2563EB");
    topGrad.addColorStop(1, "transparent");
    ctx.fillStyle = topGrad;
    ctx.fillRect(0, 0, 800, 3);

    // ── Brand logo area ──────────────────────────────────────
    ctx.font = "bold 22px Arial";
    const brandGrad = ctx.createLinearGradient(40, 0, 200, 0);
    brandGrad.addColorStop(0, "#A78BFA");
    brandGrad.addColorStop(0.5, "#60A5FA");
    brandGrad.addColorStop(1, "#F472B6");
    ctx.fillStyle = brandGrad;
    ctx.fillText("IntelliQuiz", 40, 52);

    ctx.font = "14px Arial";
    ctx.fillStyle = "rgba(255,255,255,0.3)";
    ctx.fillText("Smart Adaptive Quiz Platform", 40, 74);

    // ── Quiz title ───────────────────────────────────────────
    ctx.font = "14px Arial";
    ctx.fillStyle = "rgba(255,255,255,0.4)";
    ctx.textAlign = "right";
    ctx.fillText(quizTitle || "Quiz Results", 760, 52);
    ctx.textAlign = "left";

    // ── Divider ──────────────────────────────────────────────
    ctx.strokeStyle = "rgba(255,255,255,0.06)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(40, 90); ctx.lineTo(760, 90);
    ctx.stroke();

    // ── Student name ─────────────────────────────────────────
    ctx.font = "bold 36px Arial";
    ctx.fillStyle = "#E2E8F0";
    ctx.fillText(name || "Student", 40, 145);

    ctx.font = "16px Arial";
    ctx.fillStyle = "rgba(255,255,255,0.4)";
    ctx.fillText("Quiz completed successfully", 40, 172);

    // ── Big score circle ─────────────────────────────────────
    const scoreColor = score >= 75 ? "#10B981" : score >= 50 ? "#F59E0B" : "#EF4444";
    const cx = 660, cy = 170, r = 80;

    // Outer glow
    const glowGrad = ctx.createRadialGradient(cx, cy, r * 0.5, cx, cy, r * 1.4);
    glowGrad.addColorStop(0, scoreColor + "30");
    glowGrad.addColorStop(1, "transparent");
    ctx.fillStyle = glowGrad;
    ctx.beginPath();
    ctx.arc(cx, cy, r * 1.4, 0, Math.PI * 2);
    ctx.fill();

    // Circle background
    ctx.fillStyle = "rgba(255,255,255,0.04)";
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();

    // Circle border
    ctx.strokeStyle = scoreColor + "60";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();

    // Score arc
    const scoreAngle = (score / 100) * Math.PI * 2;
    ctx.strokeStyle = scoreColor;
    ctx.lineWidth = 6;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.arc(cx, cy, r - 6, -Math.PI / 2, -Math.PI / 2 + scoreAngle);
    ctx.stroke();

    // Score text
    ctx.font = "bold 48px Arial";
    ctx.fillStyle = scoreColor;
    ctx.textAlign = "center";
    ctx.fillText(score + "%", cx, cy + 10);

    ctx.font = "13px Arial";
    ctx.fillStyle = "rgba(255,255,255,0.4)";
    ctx.fillText("SCORE", cx, cy + 32);
    ctx.textAlign = "left";

    // ── Stats row ────────────────────────────────────────────
    const stats = [
      { label: "Correct",    value: `${correct}/${total}`, color: "#10B981" },
      { label: "Wrong",      value: `${total - correct}/${total}`, color: "#EF4444" },
      { label: "Max Level",  value: "★".repeat(maxDifficulty || 1), color: "#F59E0B" },
      { label: "Tab Alerts", value: tabSwitches || 0, color: tabSwitches > 0 ? "#F59E0B" : "#10B981" },
    ];

    const statY = 230;
    const statW = 160;
    stats.forEach((s, i) => {
      const x = 40 + i * (statW + 10);
      this._drawStatBox(ctx, x, statY, statW, 90, s);
    });

    // ── Performance bar ──────────────────────────────────────
    const barY = 350;
    ctx.font = "13px Arial";
    ctx.fillStyle = "rgba(255,255,255,0.4)";
    ctx.fillText("Performance", 40, barY);

    ctx.fillStyle = "rgba(255,255,255,0.06)";
    this._roundRect(ctx, 40, barY + 10, 720, 8, 4);
    ctx.fill();

    const barGrad = ctx.createLinearGradient(40, 0, 760, 0);
    barGrad.addColorStop(0, "#7C3AED");
    barGrad.addColorStop(0.5, "#2563EB");
    barGrad.addColorStop(1, "#10B981");
    ctx.fillStyle = barGrad;
    this._roundRect(ctx, 40, barY + 10, Math.max(8, 720 * (score / 100)), 8, 4);
    ctx.fill();

    // ── Bottom message ───────────────────────────────────────
    const messages = [
      { min: 90, text: "🏆 Outstanding! You're in the top tier!" },
      { min: 75, text: "🎯 Great job! Strong performance!" },
      { min: 50, text: "👍 Good effort! Keep practicing!" },
      { min: 0,  text: "💪 Don't give up! Every attempt counts!" },
    ];
    const msg = messages.find(m => score >= m.min);

    ctx.font = "bold 16px Arial";
    ctx.fillStyle = "rgba(255,255,255,0.6)";
    ctx.fillText(msg.text, 40, 410);

    // ── Bottom border ────────────────────────────────────────
    ctx.strokeStyle = "rgba(255,255,255,0.06)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(40, 430); ctx.lineTo(760, 430); ctx.stroke();

    ctx.font = "12px Arial";
    ctx.fillStyle = "rgba(255,255,255,0.2)";
    ctx.fillText("Generated by IntelliQuiz · intelliquiz-virid.vercel.app", 40, 458);

    const date = new Date().toLocaleDateString("en-IN", {
      day: "numeric", month: "short", year: "numeric"
    });
    ctx.textAlign = "right";
    ctx.fillText(date, 760, 458);
    ctx.textAlign = "left";

    // ── Download ─────────────────────────────────────────────
    const link = document.createElement("a");
    link.download = `IntelliQuiz-${name}-${score}%.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  },

  // ── Draw glowing orb ─────────────────────────────────────
  _drawOrb(ctx, x, y, r, color) {
    const grad = ctx.createRadialGradient(x, y, 0, x, y, r);
    grad.addColorStop(0, color);
    grad.addColorStop(1, "transparent");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  },

  // ── Draw stat box ─────────────────────────────────────────
  _drawStatBox(ctx, x, y, w, h, stat) {
    // Box background
    ctx.fillStyle = "rgba(255,255,255,0.04)";
    this._roundRect(ctx, x, y, w, h, 10);
    ctx.fill();

    // Box border
    ctx.strokeStyle = "rgba(255,255,255,0.08)";
    ctx.lineWidth = 1;
    this._roundRect(ctx, x, y, w, h, 10);
    ctx.stroke();

    // Value
    ctx.font = "bold 24px Arial";
    ctx.fillStyle = stat.color;
    ctx.fillText(stat.value, x + 16, y + 40);

    // Label
    ctx.font = "12px Arial";
    ctx.fillStyle = "rgba(255,255,255,0.35)";
    ctx.fillText(stat.label.toUpperCase(), x + 16, y + 62);
  },

  // ── Rounded rectangle helper ─────────────────────────────
  _roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  },
};

window.RESULTCARD = RESULTCARD;