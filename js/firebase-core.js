import { initializeApp } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore-lite.js";

function getFirebaseRuntimeConfig() {
    const runtimeConfig = window.INDEV_CONFIG || {};
    const firebaseConfig = runtimeConfig.firebase || window.FIREBASE_CONFIG || null;

    if (!firebaseConfig || !firebaseConfig.apiKey || !firebaseConfig.projectId || !firebaseConfig.appId) {
        throw new Error("Missing Firebase runtime config. Define window.INDEV_CONFIG.firebase in js/app-config.local.js.");
    }

    return firebaseConfig;
}

const firebaseConfig = getFirebaseRuntimeConfig();

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export { app, auth, db };
