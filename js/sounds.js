// ============================================================
// sounds.js — Sound Effects using Web Audio API
// No external files needed — all sounds generated in browser
// Call SOUNDS.correct(), SOUNDS.wrong(), etc. from anywhere
// ============================================================

const SOUNDS = {
  ctx: null,
  enabled: true,

  // ── Initialize Audio Context ──────────────────────────────
  init() {
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    } catch(e) {
      console.warn("Web Audio API not supported");
      this.enabled = false;
    }
  },

  // ── Resume context (required after user interaction) ──────
  resume() {
    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume();
    }
  },

  // ── Core tone generator ───────────────────────────────────
  _play(frequency, type, startTime, duration, volume = 0.3, fadeOut = true) {
    if (!this.enabled || !this.ctx) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.type = type;
      osc.frequency.setValueAtTime(frequency, startTime);

      gain.gain.setValueAtTime(volume, startTime);
      if (fadeOut) {
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
      }

      osc.start(startTime);
      osc.stop(startTime + duration);
    } catch(e) {}
  },

  // ── Correct Answer — happy ascending chime ────────────────
  correct() {
    if (!this.enabled || !this.ctx) return;
    this.resume();
    const t = this.ctx.currentTime;
    this._play(523, "sine", t,       0.15, 0.25); // C5
    this._play(659, "sine", t + 0.1, 0.15, 0.25); // E5
    this._play(784, "sine", t + 0.2, 0.3,  0.3);  // G5
  },

  // ── Wrong Answer — descending buzz ────────────────────────
  wrong() {
    if (!this.enabled || !this.ctx) return;
    this.resume();
    const t = this.ctx.currentTime;
    this._play(300, "sawtooth", t,       0.1, 0.2);
    this._play(200, "sawtooth", t + 0.1, 0.2, 0.2);
  },

  // ── Timer Tick — soft click ───────────────────────────────
  tick() {
    if (!this.enabled || !this.ctx) return;
    this.resume();
    const t = this.ctx.currentTime;
    this._play(800, "square", t, 0.05, 0.1);
  },

  // ── Timer Warning — urgent beep (last 5 seconds) ──────────
  timerWarn() {
    if (!this.enabled || !this.ctx) return;
    this.resume();
    const t = this.ctx.currentTime;
    this._play(440, "square", t,        0.08, 0.15);
    this._play(440, "square", t + 0.15, 0.08, 0.15);
  },

  // ── Quiz Complete — victory fanfare ───────────────────────
  complete() {
    if (!this.enabled || !this.ctx) return;
    this.resume();
    const t = this.ctx.currentTime;
    // Ascending major scale burst
    const notes = [523, 587, 659, 698, 784, 880, 988, 1047];
    notes.forEach((freq, i) => {
      this._play(freq, "sine", t + i * 0.08, 0.2, 0.25);
    });
  },

  // ── Student Joins — soft pop ──────────────────────────────
  join() {
    if (!this.enabled || !this.ctx) return;
    this.resume();
    const t = this.ctx.currentTime;
    this._play(600, "sine", t,       0.06, 0.15);
    this._play(900, "sine", t + 0.06, 0.1, 0.15);
  },

  // ── Quiz Launch — countdown beep ─────────────────────────
  launch() {
    if (!this.enabled || !this.ctx) return;
    this.resume();
    const t = this.ctx.currentTime;
    this._play(400, "sine", t,       0.12, 0.2);
    this._play(400, "sine", t + 0.2, 0.12, 0.2);
    this._play(600, "sine", t + 0.4, 0.3,  0.3);
  },

  // ── Toggle on/off ────────────────────────────────────────
  toggle() {
    this.enabled = !this.enabled;
    localStorage.setItem("iq_sounds", this.enabled ? "1" : "0");
    return this.enabled;
  },

  // ── Load saved preference ────────────────────────────────
  loadPreference() {
    const saved = localStorage.getItem("iq_sounds");
    if (saved === "0") this.enabled = false;
  },
};

// Initialize on load
document.addEventListener("DOMContentLoaded", () => {
  SOUNDS.init();
  SOUNDS.loadPreference();
});

// Resume audio context on first user interaction
document.addEventListener("click", () => SOUNDS.resume(), { once: true });

window.SOUNDS = SOUNDS;