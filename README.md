# 🧠 Smart Adaptive Quiz Platform

A full-featured, AI-powered quiz system with adaptive difficulty, cheating prevention, and real-time analytics.

---

## 📁 File Structure

```
smart-quiz/
├── index.html          ← All page templates (HTML only, no logic)
├── css/
│   └── style.css       ← ALL styling & theming (edit here to retheme)
└── js/
    ├── config.js       ← ⭐ API keys, difficulty settings, quiz config
    ├── state.js        ← Central data store (rooms, students, answers)
    ├── ai.js           ← Anthropic API calls for question generation
    ├── anticheat.js    ← Tab-switch detection, countdown timer
    ├── analytics.js    ← Charts, stats, CSV export
    └── app.js          ← Page routing, UI events, quiz flow
```

---

## ⚡ How to Run

1. Open `js/config.js` and replace `YOUR_API_KEY_HERE` with your Anthropic API key
2. Open `index.html` in any modern browser — no server needed!
3. That's it. No npm, no build step.

---

## 🔑 Key Differentiators — How They Work

### 1. Adaptive Difficulty (js/state.js → recordAnswer)
- Every student gets questions from their own **shuffled copy** of the question bank
- Each question has a difficulty 1–5 (set manually or by AI)
- After each answer, `STATE.recordAnswer()` adjusts the student's `difficulty` level:
  - **3 correct in a row** → difficulty goes up by 1
  - **1 wrong** → difficulty goes down by 1
- The next question is picked to match their current difficulty
- You can tune these thresholds in `js/config.js → ADAPTIVE`

### 2. AI Question Generation (js/ai.js → generateQuestions)
- Teacher types a topic name → hits "Generate"
- `AI.generateQuestions(topic, count)` sends a structured prompt to Claude
- Claude returns JSON with questions at all 5 difficulty levels
- Questions are validated and added to the quiz bank instantly
- Requires your Anthropic API key in `js/config.js`

### 3. Cheating Prevention (js/anticheat.js)
- `ANTICHEAT.start()` registers a `visibilitychange` listener
- Every time the student switches tabs, the count increments
- Warnings appear at each switch. After the limit (default 3), the quiz auto-submits
- The countdown timer `ANTICHEAT.startTimer(seconds)` runs per-question
- If time runs out, the question is auto-skipped
- All thresholds are in `js/config.js → ANTI_CHEAT`

### 4. Detailed Analytics (js/analytics.js)
- `ANALYTICS.render(roomCode, containerId)` calls `STATE.getAnalytics()` and renders:
  - Summary cards (students, completion, avg score, avg time)
  - Bar chart of questions most students got wrong
  - Per-student table with score, speed, max difficulty reached, tab switches
  - SVG line chart showing each student's adaptive difficulty journey
- CSV export via `exportCSV()` in `js/app.js`

### 5. No Login for Students (js/state.js → joinRoom)
- Students enter a 6-digit room code + their name
- `STATE.joinRoom(code, name)` looks up the room and creates a student record
- No accounts, no passwords, no database needed
- Room codes are generated with `STATE.generateRoomCode()`

---

## 🛠 Making Changes

| What you want to change | File to edit |
|------------------------|-------------|
| API key / difficulty thresholds | `js/config.js` |
| Colors, fonts, spacing | `css/style.css` (edit CSS variables at top) |
| AI prompt / question format | `js/ai.js` → `generateQuestions()` |
| Tab-switch limit / timer | `js/config.js → ANTI_CHEAT` |
| Analytics charts | `js/analytics.js` |
| Page layout / HTML structure | `index.html` |
| Quiz flow / routing | `js/app.js` |
| Room/student data logic | `js/state.js` |

---

## 🗺 Data Flow

```
Teacher creates quiz
    ↓
STATE.createRoom() → roomCode
    ↓
Students join with roomCode + name
    ↓
STATE.joinRoom() → shuffled question copy per student
    ↓
Quiz starts → per-question loop:
    ANTICHEAT.startTimer()
    Student picks answer
    STATE.recordAnswer() → adjusts difficulty
    ↓
Quiz ends → STATE.getAnalytics()
    ↓
ANALYTICS.render() → charts + table
```

---

## 📝 Notes
- Data is saved in `localStorage` so it survives page refresh
- This is a single-browser demo — in production, replace STATE with a real backend (Firebase, Supabase, etc.)
- The AI tab requires an active internet connection and a valid Anthropic API key
