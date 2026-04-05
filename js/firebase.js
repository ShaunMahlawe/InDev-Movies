import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    updateProfile,
    GoogleAuthProvider,
    signInWithPopup,
    signInWithRedirect,
    getRedirectResult
} from "https://www.gstatic.com/firebasejs/12.4.0/firebase-auth.js";
import {
    doc,
    getDoc,
    setDoc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore-lite.js";
import { auth, db } from "./firebase-core.js?v=20260404-2";

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
    if (!redirect) return "./Pages/HomePage.html";

    // Accept only in-app relative redirects.
    const isRelativePath = redirect.startsWith("/") || redirect.startsWith("./") || redirect.startsWith("../");
    if (!isRelativePath || redirect.includes("//")) {
        return "./Pages/HomePage.html";
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
        "auth/too-many-requests": "Too many attempts. Please try again later.",
        "auth/operation-not-allowed": "Google sign-in is not enabled. Please contact support.",
        "auth/unauthorized-domain": "This domain is not authorised for Google sign-in. Add it in the Firebase console.",
        "auth/popup-blocked": "Popup was blocked by the browser. Redirecting you to sign in...",
        "auth/cancelled-popup-request": null,
        "auth/popup-closed-by-user": null
    };
    const msg = map[code];
    if (msg === null) return null; // silently ignored
    return msg || (error?.message || "Authentication failed.");
}

async function upsertUserProfile(user, username) {
    if (!user || !user.uid) return;

    const profileRef = doc(db, "users", user.uid);
    try {
        const existingProfileSnap = await getDoc(profileRef);
        const existingProfile = existingProfileSnap.exists() ? existingProfileSnap.data() : null;
        const profileData = {
            uid: user.uid,
            email: user.email || "",
            displayName: username || user.displayName || existingProfile?.displayName || "",
            updatedAt: serverTimestamp(),
            lastLoginAt: serverTimestamp(),
            role: existingProfile?.role || "user",
            isActive: existingProfile?.isActive !== false
        };

        if (!existingProfileSnap.exists()) {
            profileData.createdAt = serverTimestamp();
        }

        await setDoc(profileRef, profileData, { merge: true });
    } catch (error) {
        console.warn("Profile sync skipped:", error);
    }
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

/* ── Complete any in-progress redirect sign-in on page load ── */
getRedirectResult(auth).then(async (credential) => {
    if (!credential) return;
    const user = credential.user;
    const username = user.displayName || user.email || "User";
    await upsertUserProfile(user, username);
    localStorage.setItem("userName", username);
    window.location.href = getPostLoginRedirect();
}).catch((error) => {
    const msg = humanizeAuthError(error);
    if (msg) alert(msg);
});

/* ── Google OAuth: popup first, redirect fallback ── */
async function handleGoogleAuth() {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: "select_account" });

    // Disable the buttons during the flow
    const btns = [
        document.getElementById("googleSignInBtn"),
        document.getElementById("googleSignUpBtn")
    ].filter(Boolean);
    btns.forEach((b) => { b.disabled = true; b.style.opacity = "0.6"; });

    try {
        const credential = await signInWithPopup(auth, provider);
        const user = credential.user;
        const username = user.displayName || user.email || "User";
        await upsertUserProfile(user, username);
        localStorage.setItem("userName", username);
        window.location.href = getPostLoginRedirect();
    } catch (error) {
        const code = error?.code || "";

        if (code === "auth/popup-blocked") {
            // Popup was blocked — silently fall back to redirect
            await signInWithRedirect(auth, provider);
            return; // page will reload; re-enable buttons is unnecessary
        }

        btns.forEach((b) => { b.disabled = false; b.style.opacity = ""; });

        const msg = humanizeAuthError(error);
        if (msg) alert(msg);
    }
}

const googleSignInBtn  = document.getElementById("googleSignInBtn");
const googleSignUpBtn  = document.getElementById("googleSignUpBtn");
if (googleSignInBtn)  googleSignInBtn.addEventListener("click", handleGoogleAuth);
if (googleSignUpBtn)  googleSignUpBtn.addEventListener("click", handleGoogleAuth);

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