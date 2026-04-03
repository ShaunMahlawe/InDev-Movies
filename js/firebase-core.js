import { initializeApp } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js";

// Replace with your Firebase project settings after creating InDev Movies project.
const firebaseConfig = {
    apiKey: "AIzaSyCJI4stDucwLS8OeD3QmwW2p-24eLQ7YVs",
    authDomain: "week13dv.firebaseapp.com",
    projectId: "week13dv",
    storageBucket: "week13dv.firebasestorage.app",
    messagingSenderId: "1020561560621",
    appId: "1:1020561560621:web:766d2fdc4325717d1f54a4"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export { app, auth, db };
