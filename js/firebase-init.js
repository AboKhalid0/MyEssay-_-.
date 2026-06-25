import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import { getDatabase } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js';

// 1. ضع معلومات مشروعك هنا مباشرة
const firebaseConfig = {
  apiKey: "AIzaSyBgHFTC6hHQ8lL2I6AqtsW13jDgJodiRq0",
  authDomain: "my-sweetlibrary1.firebaseapp.com",
  databaseURL: "https://my-sweetlibrary1-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "my-sweetlibrary1",
  storageBucket: "my-sweetlibrary1.firebasestorage.app",
  messagingSenderId: "805197492729",
  appId: "1:805197492729:web:cd73524f0ed08a9e818d28"
};

let app;
let db;

export async function initFirebase() {
  app = initializeApp(firebaseConfig);
  db = getDatabase(app);
  return true; 
}

export function getDb() {
  return db;
}
