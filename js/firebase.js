// ============================================================
// firebase.js — Firebase init + Auth + Database helpers
// ============================================================

const FIREBASE_CONFIG = {
  apiKey: "AIzaSyDXSdcG5-XAU2shE-9U6mvYNRTMQaqCiKM",
  authDomain: "intelliquiz-f2489.firebaseapp.com",
  databaseURL: "https://intelliquiz-f2489-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "intelliquiz-f2489",
  storageBucket: "intelliquiz-f2489.firebasestorage.app",
  messagingSenderId: "445848301624",
  appId: "1:445848301624:web:5e3bf84e83144ab0b7f6cd"
};

firebase.initializeApp(FIREBASE_CONFIG);
const db = firebase.database();
const auth = firebase.auth();

// ── Auth helpers ──────────────────────────────────────────────
const AUTH = {
  // Sign up new teacher
  async signUp(email, password, name) {
    const cred = await auth.createUserWithEmailAndPassword(email, password);
    await cred.user.updateProfile({ displayName: name });
    await DB.set(`teachers/${cred.user.uid}/profile`, {
      name, email, createdAt: Date.now()
    });
    return cred.user;
  },

  // Login existing teacher
  async login(email, password) {
    const cred = await auth.signInWithEmailAndPassword(email, password);
    return cred.user;
  },

  // Logout
  async logout() {
    await auth.signOut();
  },

  // Get current user
  currentUser() {
    return auth.currentUser;
  },

  // Listen for auth state changes
  onAuthChange(callback) {
    return auth.onAuthStateChanged(callback);
  },

  // Reset password
  async resetPassword(email) {
    await auth.sendPasswordResetEmail(email);
  }
};

// ── Database helpers ──────────────────────────────────────────
const DB = {
  async set(path, data) {
    await db.ref(path).set(data);
  },

  async get(path) {
    const snap = await db.ref(path).once("value");
    return snap.val();
  },

  async update(path, data) {
    await db.ref(path).update(data);
  },

  on(path, callback) {
    db.ref(path).on("value", snap => callback(snap.val()));
  },

  off(path) {
    db.ref(path).off();
  },

  async push(path, data) {
    const ref = await db.ref(path).push(data);
    return ref.key;
  },

  async delete(path) {
    await db.ref(path).remove();
  }
};

window.AUTH = AUTH;
window.DB = DB;
window.auth = auth;