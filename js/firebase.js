// ============================================================
// firebase.js — Firebase Realtime Database
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
};

window.DB = DB;