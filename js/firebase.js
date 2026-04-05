import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    updateProfile,
    GoogleAuthProvider,
    signInWithPopup,
    signInWithRedirect,
    getRedirectResult,
    fetchSignInMethodsForEmail
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
const PRIMARY_WEBAPP_ORIGIN = "https://indevmovies.web.app";
const GOOGLE_REDIRECT_STARTED_KEY = "indev_google_redirect_started";

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

function normalizeRelativeRedirect(path) {
    if (!path) return "/Pages/HomePage.html";
    if (path.startsWith("./")) return `/${path.slice(2)}`;
    if (path.startsWith("../")) return "/Pages/HomePage.html";
    if (path.startsWith("/")) return path;
    return `/${path}`;
}

function getPostLoginTarget() {
    const params = new URLSearchParams(window.location.search);
    const redirectPath = normalizeRelativeRedirect(getPostLoginRedirect());

    const explicitReturnPath = params.get("returnTo");
    if (explicitReturnPath && explicitReturnPath.startsWith("/")) {
        return `${PRIMARY_WEBAPP_ORIGIN}${explicitReturnPath}`;
    }

    if (window.location.hostname === "indevmovies.firebaseapp.com") {
        return `${PRIMARY_WEBAPP_ORIGIN}${redirectPath}`;
    }
    return getPostLoginRedirect();
}

function getCrossHostGoogleStartTarget() {
    const redirectPath = normalizeRelativeRedirect(getPostLoginRedirect());
    return `https://indevmovies.firebaseapp.com/?startGoogle=1&returnTo=${encodeURIComponent(redirectPath)}`;
}

async function maybeStartCrossHostGoogleRedirect() {
    const params = new URLSearchParams(window.location.search);
    const shouldStart = window.location.hostname === "indevmovies.firebaseapp.com" && params.get("startGoogle") === "1";
    if (!shouldStart) return;

    if (sessionStorage.getItem(GOOGLE_REDIRECT_STARTED_KEY) === "1") return;
    sessionStorage.setItem(GOOGLE_REDIRECT_STARTED_KEY, "1");

    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: "select_account" });
    await signInWithRedirect(auth, provider);
}

function getUnauthorizedDomainFallbackTarget() {
    const alreadyRetried = new URLSearchParams(window.location.search).get("authFallbackTried") === "1";
    if (alreadyRetried) return null;

    if (window.location.hostname === "indevmovies.web.app") {
        return "https://indevmovies.firebaseapp.com/?authFallbackTried=1";
    }

    if (window.location.hostname === "indevmovies.firebaseapp.com") {
        return "https://indevmovies.web.app/?authFallbackTried=1";
    }

    return null;
}

function humanizeAuthError(error) {
    const code = String(error?.code || "");
    const map = {
        "auth/email-already-in-use": "This email is already registered.",
        "auth/invalid-email": "Please enter a valid email address.",
        "auth/weak-password": "Password must be at least 8 characters.",
        "auth/invalid-credential": "Incorrect email or password.",
        "auth/invalid-login-credentials": "Incorrect email or password.",
        "auth/user-not-found": "No account found for this email.",
        "auth/wrong-password": "Incorrect email or password.",
        "auth/too-many-requests": "Too many attempts. Please try again later.",
        "auth/operation-not-allowed": "Google sign-in is not enabled. Please contact support.",
        "auth/unauthorized-domain": "This domain is not authorised for Google sign-in. Add it in the Firebase console.",
        "auth/internal-error": "Google sign-in hit a temporary error. Retrying with redirect...",
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
            localStorage.setItem("hasVisitedBefore", "true");
            alert("Account created successfully.");
            window.location.href = getPostLoginTarget();
        } catch (error) {
            alert(humanizeAuthError(error));
        }
    });
}

/* ── Complete any in-progress redirect sign-in on page load ── */
getRedirectResult(auth).then(async (credential) => {
    if (!credential) {
        await maybeStartCrossHostGoogleRedirect();
        return;
    }
    sessionStorage.removeItem(GOOGLE_REDIRECT_STARTED_KEY);
    const user = credential.user;
    const username = user.displayName || user.email || "User";
    await upsertUserProfile(user, username);
    localStorage.setItem("userName", username);
    localStorage.setItem("hasVisitedBefore", "true");
    window.location.href = getPostLoginTarget();
}).catch((error) => {
    sessionStorage.removeItem(GOOGLE_REDIRECT_STARTED_KEY);
    const msg = humanizeAuthError(error);
    if (msg) alert(msg);
});

/* ── Google OAuth: popup first, redirect fallback ── */
async function handleGoogleAuth() {
    if (window.location.hostname === "indevmovies.web.app") {
        window.location.href = getCrossHostGoogleStartTarget();
        return;
    }

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
        localStorage.setItem("hasVisitedBefore", "true");
        window.location.href = getPostLoginTarget();
    } catch (error) {
        const code = error?.code || "";

        if (code === "auth/unauthorized-domain") {
            const fallbackTarget = getUnauthorizedDomainFallbackTarget();
            if (fallbackTarget) {
                window.location.href = fallbackTarget;
                return;
            }
        }

        if (code === "auth/popup-blocked" || code === "auth/internal-error") {
            // Popup can fail in some browsers/environments; redirect flow is more reliable.
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
            window.location.href = getPostLoginTarget();
        } catch (error) {
            const code = String(error?.code || "");

            // Improve guidance when account exists but uses a different provider.
            if ((code === "auth/invalid-credential" || code === "auth/invalid-login-credentials") && email) {
                try {
                    const methods = await fetchSignInMethodsForEmail(auth, email);
                    if (methods.includes("google.com") && !methods.includes("password")) {
                        alert("This account uses Google sign-in. Please use 'Sign in with Google'.");
                        return;
                    }
                } catch (_lookupError) {
                    // Fall back to generic auth error if provider lookup fails.
                }
            }

            const msg = humanizeAuthError(error);
            if (msg) alert(msg);
        }
    });
}