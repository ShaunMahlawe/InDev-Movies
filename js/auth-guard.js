import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js";
import { auth, db } from "./firebase-core.js";

const mode = document.body?.dataset.authMode || "";
const isProtectedRoute = mode === "protected";
const isGuestRoute = mode === "guest";

function getLoginPath() {
    return window.location.pathname.includes("/Pages/") ? "../index.html" : "./index.html";
}

function getAppPath() {
    return window.location.pathname.includes("/Pages/") ? "../Pages/HomePage.html" : "./Pages/HomePage.html";
}

function updateTextNodes(selector, value) {
    document.querySelectorAll(selector).forEach((node) => {
        node.textContent = value;
    });
}

function formatTimestamp(timestampValue) {
    if (!timestampValue) return "-";

    if (typeof timestampValue.toDate === "function") {
        return timestampValue.toDate().toLocaleString();
    }

    const parsed = new Date(timestampValue);
    if (Number.isNaN(parsed.getTime())) {
        return "-";
    }

    return parsed.toLocaleString();
}

async function populateUserProfile(user) {
    const fallbackName = user.displayName || user.email || "User";
    const fallbackEmail = user.email || "";
    const fallbackLastSeen = formatTimestamp(user.metadata?.lastSignInTime);

    updateTextNodes("[data-user-name]", fallbackName);
    updateTextNodes("[data-user-email]", fallbackEmail);
    updateTextNodes("[data-profile-role]", "user");
    updateTextNodes("[data-profile-last-seen]", fallbackLastSeen);

    let resolvedName = fallbackName;

    try {
        const profileSnap = await getDoc(doc(db, "users", user.uid));
        if (profileSnap.exists()) {
            const profile = profileSnap.data();
            resolvedName = profile.displayName || fallbackName;

            updateTextNodes("[data-user-name]", resolvedName);
            updateTextNodes("[data-user-email]", profile.email || fallbackEmail);
            updateTextNodes("[data-profile-role]", profile.role || "user");
            updateTextNodes(
                "[data-profile-last-seen]",
                formatTimestamp(profile.lastSeenAt || profile.lastLoginAt || profile.updatedAt || user.metadata?.lastSignInTime)
            );
        }
    } catch (_error) {
        updateTextNodes("[data-profile-last-seen]", fallbackLastSeen);
    }

    localStorage.setItem("userName", resolvedName);
}

function redirectToLogin() {
    const currentPath = `${window.location.pathname}${window.location.search}`;
    const redirect = encodeURIComponent(currentPath);
    window.location.replace(`${getLoginPath()}?redirect=${redirect}`);
}

function redirectToApp() {
    window.location.replace(getAppPath());
}

function bindLogoutLinks() {
    const logoutLinks = document.querySelectorAll('[data-auth-action="logout"]');
    logoutLinks.forEach((link) => {
        if (link.dataset.logoutBound === "true") {
            return;
        }
        link.dataset.logoutBound = "true";

        link.addEventListener("click", async (event) => {
            event.preventDefault();
            try {
                await signOut(auth);
                localStorage.removeItem("userName");
                window.location.replace(getLoginPath());
            } catch (_error) {
                alert("Unable to log out right now. Please try again.");
            }
        });
    });
}

onAuthStateChanged(auth, async (user) => {
    if (isProtectedRoute && !user) {
        redirectToLogin();
        return;
    }

    if (isGuestRoute && user) {
        redirectToApp();
        return;
    }

    if (user) {
        await populateUserProfile(user);
    }

    bindLogoutLinks();
});
