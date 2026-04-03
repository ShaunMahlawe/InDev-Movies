import { initializeApp } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js";

// Replace with your Firebase project settings after creating InDev Movies project.
const firebaseConfig = {
    apiKey: "AIzaSyBV_QLXNUs9Rt3NdAuars5K8p6lvsPt--0",
    authDomain: "dv100firebaseclass.firebaseapp.com",
    projectId: "dv100firebaseclass",
    storageBucket: "dv100firebaseclass.firebasestorage.app",
    messagingSenderId: "758270673361",
    appId: "1:758270673361:web:dfb0071f2417bfb1f1a0f0",
    measurementId: "G-362N0K9LYB"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export { app, auth, db };
