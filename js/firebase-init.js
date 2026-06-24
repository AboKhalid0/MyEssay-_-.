import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import { getDatabase } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js';
// Add this line:
import { getStorage } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js';

let app, db, storage;

export function initFirebase(config) {
  try {
    app = initializeApp(config);
    db = getDatabase(app);
    storage = getStorage(app); // Initialize Storage
    return { db, storage };
  } catch (error) {
    console.error("Firebase initialization error:", error);
    return null;
  }
}

export function getDb() { return db; }
export function getStorageInstance() { return storage; } // Export it