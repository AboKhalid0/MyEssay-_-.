// firebase-init.js
// Handles Firebase setup, config persistence, and exports db/auth

const STORAGE_KEY = 'maktaba_firebase_config';

let db   = null;
let auth = null;
let app  = null;

export function getDb()   { return db;   }
export function getAuth() { return auth; }

export async function initFirebase() {
  const cfg = loadConfig();
  if (!cfg) return false;

  try {
    const { initializeApp }  = window.__firebaseModules;
    const { getDatabase }    = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js');
    const { getAuth: fa }    = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js');

    app  = initializeApp(cfg, 'maktaba');
    db   = getDatabase(app);
    auth = fa(app);
    return true;
  } catch (e) {
    console.error('Firebase init failed:', e);
    return false;
  }
}

export function saveConfig(cfg) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cfg));
}

export function loadConfig() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

export function hasConfig() {
  return !!loadConfig();
}
