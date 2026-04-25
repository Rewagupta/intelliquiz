// ============================================================
// anticheat.js — Cheating Prevention Module
// Handles: tab-switch detection, countdown timer, auto-submit
// ============================================================

const ANTICHEAT = {
  timer: null,
  timeLeft: 0,
  onTick: null,       // callback(timeLeft)
  onExpire: null,     // callback() — called when timer hits 0
  onTabSwitch: null,  // callback(count)
  tabSwitchCount: 0,
  active: false,

  // ── Start monitoring ──────────────────────────────────────
  start(onTick, onExpire, onTabSwitch) {
    this.onTick = onTick;
    this.onExpire = onExpire;
    this.onTabSwitch = onTabSwitch;
    this.active = true;
    this.tabSwitchCount = 0;

    // Tab visibility detection
    this._visibilityHandler = () => {
      if (!this.active) return;
      if (document.hidden) {
        this.tabSwitchCount++;
        if (this.onTabSwitch) this.onTabSwitch(this.tabSwitchCount);

        if (
          CONFIG.ANTI_CHEAT.AUTO_SUBMIT_ON_LIMIT &&
          this.tabSwitchCount > CONFIG.ANTI_CHEAT.TAB_SWITCH_WARN_LIMIT
        ) {
          this.stop();
          if (this.onExpire) this.onExpire("autosubmit");
        }
      }
    };
    document.addEventListener("visibilitychange", this._visibilityHandler);
  },

  // ── Start per-question countdown ─────────────────────────
  startTimer(seconds) {
    this.stopTimer();
    this.timeLeft = seconds;
    if (this.onTick) this.onTick(this.timeLeft);

    this.timer = setInterval(() => {
      this.timeLeft--;
      if (this.onTick) this.onTick(this.timeLeft);
      if (this.timeLeft <= 0) {
        this.stopTimer();
        if (this.onExpire) this.onExpire("timeout");
      }
    }, 1000);
  },

  stopTimer() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  },

  // ── Stop all monitoring ───────────────────────────────────
  stop() {
    this.active = false;
    this.stopTimer();
    if (this._visibilityHandler) {
      document.removeEventListener("visibilitychange", this._visibilityHandler);
    }
  },

  // ── Get elapsed time for current question ─────────────────
  getTimeSpent(totalSeconds) {
    return totalSeconds - this.timeLeft;
  },
};

window.ANTICHEAT = ANTICHEAT;
