# 🧠 IntelliQuiz — Smart Adaptive Quiz Platform

A full-featured, AI-powered quiz platform with adaptive difficulty, real-time multiplayer across devices, cheating prevention, and detailed performance analytics.

🌐 **Live Demo:** [intelliquiz-virid.vercel.app](https://intelliquiz-virid.vercel.app)
📦 **Repository:** [github.com/Rewagupta/intelliquiz](https://github.com/Rewagupta/intelliquiz)

---

## 🔑 Key Differentiators

| Feature | IntelliQuiz | Google Forms | Kahoot | Mentimeter |
|---------|-------------|--------------|--------|------------|
| Adaptive Difficulty | ✅ | ❌ | ❌ | ❌ |
| AI Question Generation | ✅ | ❌ | ❌ | ❌ |
| Real-time Cross-Device Sync | ✅ | ❌ | ✅ | ✅ |
| Anti-Cheat Detection | ✅ | ❌ | ❌ | ❌ |
| Detailed Analytics | ✅ | ⚠️ Basic | ⚠️ Basic | ⚠️ Basic |
| No Student Login Required | ✅ | ✅ | ✅ | ✅ |

---

## 📁 File Structure

```
intelliquiz/
├── index.html              ← All page templates (HTML only, no logic)
├── api/
│   └── generate.js         ← Vercel serverless function (Groq API call — key stays safe)
├── css/
│   └── style.css           ← ALL styling & theming (edit CSS variables at top to retheme)
└── js/
    ├── config.js           ← App settings & difficulty thresholds (no API keys)
    ├── firebase.js         ← Firebase initialization & DB helper functions
    ├── state.js            ← Central state — rooms, students, adaptive logic (Firebase-backed)
    ├── ai.js               ← Calls /api/generate serverless function
    ├── anticheat.js        ← Tab-switch detection & countdown timer
    ├── analytics.js        ← Charts, stats, CSV export
    └── app.js              ← Page routing, UI events, full quiz flow
```

---

## ⚡ Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Frontend | HTML5, CSS3, JavaScript | UI, quiz flow, animations |
| AI Backend | Groq API (LLaMA 3.3 70B) | Question generation |
| Database | Firebase Realtime Database | Cross-device real-time sync |
| Hosting | Vercel | Deployment & serverless functions |
| Version Control | Git & GitHub | Source code management |
| API Security | Vercel Environment Variables | Groq key never exposed to browser |

---

## 🚀 How to Run Locally

### Prerequisites
- [VS Code](https://code.visualstudio.com/) with Live Server extension
- A free [Groq API key](https://console.groq.com) (starts with `gsk_...`)
- A free [Firebase](https://console.firebase.google.com) project with Realtime Database enabled

### Steps

**1. Clone the repository**
```bash
git clone https://github.com/Rewagupta/intelliquiz.git
cd intelliquiz
```

**2. Set up Firebase**
- Go to [console.firebase.google.com](https://console.firebase.google.com)
- Create a project → Enable Realtime Database (Test mode)
- Register a Web App → Copy the `firebaseConfig` object
- Paste your config into `js/firebase.js`

**3. Set up Groq (for local serverless testing)**

Install Vercel CLI:
```bash
npm install -g vercel
```

Create a `.env` file in the root folder:
```
GROQ_API_KEY=gsk_your_actual_key_here
```

Run locally:
```bash
vercel dev
```

App will be available at `http://localhost:3000`

> ⚠️ **Note:** Do NOT use Live Server for local testing if you need AI generation — it won't run the serverless function. Use `vercel dev` instead. Live Server works fine for testing everything else.

---

## 🌍 Deploying to Vercel

**1. Push to GitHub**
```bash
git add .
git commit -m "your message"
git push
```

**2. Connect to Vercel**
- Go to [vercel.com](https://vercel.com) → Import your GitHub repo
- Click **Deploy** (no settings to change)

**3. Add Environment Variable**
- Vercel → Settings → Environment Variables
- Add: `GROQ_API_KEY` = your Groq key
- Redeploy without cache

Vercel auto-deploys on every `git push` after this.

---

## 🔑 How Each Feature Works

### 1. Adaptive Difficulty — `js/state.js → recordAnswer()`
- Every student gets a **randomly shuffled** copy of the question bank
- Each question has a difficulty level 1–5 (assigned manually or by AI)
- After each answer, difficulty adjusts:
  - **3 correct in a row** → difficulty increases by 1
  - **1 wrong answer** → difficulty decreases by 1
- Difficulty is clamped between Level 1 and Level 5
- Tune thresholds in `js/config.js → ADAPTIVE`

### 2. AI Question Generation — `api/generate.js` + `js/ai.js`
- Teacher types a topic → clicks Generate
- `js/ai.js` calls `/api/generate` (your own Vercel serverless function)
- The serverless function calls Groq API with a structured prompt
- Groq returns 10 MCQs across all 5 difficulty levels as JSON
- Questions are validated and added to the quiz bank instantly
- **Groq API key is stored in Vercel environment variables — never in the browser**

### 3. Cheating Prevention — `js/anticheat.js`
- `ANTICHEAT.start()` registers a `visibilitychange` event listener
- Tab switch detected → count increments → warning shown to student
- After 3 switches (configurable) → quiz auto-submits
- Per-question countdown timer → auto-skips if time expires
- Tab switch count recorded per student → visible in teacher analytics
- All thresholds configurable in `js/config.js → ANTI_CHEAT`

### 4. Real-Time Multiplayer — `js/firebase.js` + `js/state.js`
- Teacher creates room → saved to Firebase Realtime Database
- Students join on **any device** using the 6-digit room code
- Firebase `on()` listeners push live updates to all connected clients
- Teacher sees student progress, scores, and completion in real time
- No page refresh needed — everything updates automatically

### 5. Detailed Analytics — `js/analytics.js`
- After quiz ends, `ANALYTICS.renderDirect(data, containerId)` renders:
  - Summary cards (students, completions, avg score, avg time/question)
  - Bar chart of questions with highest wrong-answer rates
  - Student performance table (score, speed, max difficulty, tab switches)
  - SVG line chart of each student's adaptive difficulty journey
- CSV export downloads all student data as a spreadsheet

### 6. No Login for Students — `js/state.js → joinRoom()`
- Students enter a 6-digit room code + their name only
- `STATE.joinRoom(code, name)` verifies room in Firebase and registers student
- No accounts, no passwords, no email verification
- Room codes generated with `STATE.generateRoomCode()`

---

## 🛠 Making Changes

| What you want to change | File to edit |
|------------------------|-------------|
| Difficulty thresholds | `js/config.js → ADAPTIVE` |
| Tab-switch limit / timer | `js/config.js → ANTI_CHEAT` |
| Colors, fonts, spacing | `css/style.css` (CSS variables at top) |
| AI prompt / question format | `api/generate.js` |
| Firebase config | `js/firebase.js` |
| Room/student data logic | `js/state.js` |
| Analytics charts | `js/analytics.js` |
| Page layout / HTML | `index.html` |
| Quiz flow / routing | `js/app.js` |

---

## 🗺 Data Flow

```
Teacher enters topic → /api/generate → Groq AI → 10 MCQs returned
         ↓
Teacher launches quiz → STATE.createRoom() → saved to Firebase
         ↓
Students join on any device with room code
         ↓
STATE.joinRoom() → student record created in Firebase with shuffled questions
         ↓
Quiz starts → per-question loop:
    ANTICHEAT.startTimer()
    Student picks answer → handleAnswer()
    STATE.recordAnswer() → saved to Firebase → difficulty adjusted
    Teacher dashboard updates in real time via Firebase listener
         ↓
Quiz ends → STATE.getAnalytics() → fetches all data from Firebase
         ↓
ANALYTICS.renderDirect() → charts + table + CSV export
```

---

## ⚠️ Security Notes

- **Never put API keys in `js/config.js` or any frontend file** — they will be exposed in the browser
- The Groq API key lives only in Vercel Environment Variables
- The Firebase config in `js/firebase.js` is safe to commit — it only identifies your project, access is controlled by Firebase Database Rules
- For production use, update Firebase Database Rules from test mode to authenticated access

---

## 📝 Environment Variables (Vercel)

| Variable | Description |
|----------|-------------|
| `GROQ_API_KEY` | Your Groq API key from console.groq.com |

---

## 🙏 Acknowledgements

- [Groq](https://groq.com) — Ultra-fast LLaMA inference API
- [Firebase](https://firebase.google.com) — Realtime Database
- [Vercel](https://vercel.com) — Hosting & serverless functions
- [Meta AI](https://ai.meta.com/llama/) — LLaMA 3.3 70B model