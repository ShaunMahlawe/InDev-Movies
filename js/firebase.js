import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    onAuthStateChanged,
    updateProfile
} from "https://www.gstatic.com/firebasejs/12.4.0/firebase-auth.js";
import {
    doc,
    setDoc,
    updateDoc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js";
import { auth, db } from "./firebase-core.js";

const signupForm = document.getElementById("signupForm");
const loginForm = document.getElementById("loginForm");
const signUpEmail = document.getElementById("signUpEmail");
const signUpPass = document.getElementById("signUpPass");
const signUpUsername = document.getElementById("create-username");
const signInEmail = document.getElementById("signInEmail");
const signInPass = document.getElementById("signInPass");

function getPostLoginRedirect() {
    const params = new URLSearchParams(window.location.search);
    const redirect = params.get("redirect");
    if (!redirect) return "./Pages/profile.html";

    // Accept only in-app relative redirects.
    const isRelativePath = redirect.startsWith("/") || redirect.startsWith("./") || redirect.startsWith("../");
    if (!isRelativePath || redirect.includes("//")) {
        return "./Pages/profile.html";
    }

    return redirect;
}

function humanizeAuthError(error) {
    const code = String(error?.code || "");
    const map = {
        "auth/email-already-in-use": "This email is already registered.",
        "auth/invalid-email": "Please enter a valid email address.",
        "auth/weak-password": "Password must be at least 8 characters.",
        "auth/invalid-credential": "Incorrect email or password.",
        "auth/user-not-found": "No account found for this email.",
        "auth/wrong-password": "Incorrect email or password.",
        "auth/too-many-requests": "Too many attempts. Please try again later."
    };
    return map[code] || (error?.message || "Authentication failed.");
}

async function upsertUserProfile(user, username) {
    if (!user || !user.uid) return;

    const profileRef = doc(db, "users", user.uid);
    const baseData = {
        uid: user.uid,
        email: user.email || "",
        displayName: username || user.displayName || "",
        updatedAt: serverTimestamp(),
        lastLoginAt: serverTimestamp(),
        role: "user",
        isActive: true
    };

    await setDoc(profileRef, {
        ...baseData,
        createdAt: serverTimestamp()
    }, { merge: true });
}

if (signupForm) {
    signupForm.addEventListener("submit", async (event) => {
        event.preventDefault();

        const email = (signUpEmail?.value || "").trim();
        const password = signUpPass?.value || "";
        const username = (signUpUsername?.value || "").trim();

        if (!username) {
            alert("Please enter a username.");
            return;
        }
        if (password.length < 8) {
            alert("Password must be at least 8 characters.");
            return;
        }

        try {
            const credential = await createUserWithEmailAndPassword(auth, email, password);
            await updateProfile(credential.user, { displayName: username });
            await upsertUserProfile(credential.user, username);
            localStorage.setItem("userName", username);
            alert("Account created successfully.");
            window.location.href = getPostLoginRedirect();
        } catch (error) {
            alert(humanizeAuthError(error));
        }
    });
}

if (loginForm) {
    loginForm.addEventListener("submit", async (event) => {
        event.preventDefault();

        const email = (signInEmail?.value || "").trim();
        const password = signInPass?.value || "";

        try {
            const credential = await signInWithEmailAndPassword(auth, email, password);
            await upsertUserProfile(credential.user, credential.user.displayName || "");
            const name = credential.user.displayName || credential.user.email || "User";
            localStorage.setItem("userName", name);
            alert("Login successful.");
            window.location.href = getPostLoginRedirect();
        } catch (error) {
            alert(humanizeAuthError(error));
        }
    });
}

onAuthStateChanged(auth, async (user) => {
    if (!user) return;
    try {
        await updateDoc(doc(db, "users", user.uid), {
            lastSeenAt: serverTimestamp(),
            updatedAt: serverTimestamp()
        });
    } catch (_error) {
        // Keep UX uninterrupted when profile update fails silently.
    }
});