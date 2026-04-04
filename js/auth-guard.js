import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore-lite.js";
import { auth, db } from "./firebase-core.js?v=20260404-2";

const mode = document.body?.dataset.authMode || "";
const isProtectedRoute = mode === "protected";
const isGuestRoute = mode === "guest";
const requiredRole = document.body?.dataset.requiredRole || "";
const PROFILE_CACHE_KEY = "userProfileCache";
const PROFILE_CACHE_TTL_MS = 5 * 60 * 1000;

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

function applyRoleVisibility(role) {
    const resolvedRole = role || "user";
    document.body.dataset.userRole = resolvedRole;
    localStorage.setItem("userRole", resolvedRole);

    document.querySelectorAll("[data-admin-only]").forEach((node) => {
        node.hidden = resolvedRole !== "admin";
    });
}

async function handleInactiveUser() {
    localStorage.removeItem("userName");
    localStorage.removeItem("userRole");
    localStorage.removeItem(PROFILE_CACHE_KEY);

    try {
        await signOut(auth);
    } catch (_error) {
        // Ignore sign-out failures and continue redirecting to login.
    }

    const separator = getLoginPath().includes("?") ? "&" : "?";
    window.location.replace(`${getLoginPath()}${separator}disabled=1`);
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

function readCachedProfile(uid) {
    try {
        const raw = localStorage.getItem(PROFILE_CACHE_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        if (!parsed || parsed.uid !== uid) return null;
        if (Date.now() - Number(parsed.cachedAt || 0) > PROFILE_CACHE_TTL_MS) return null;
        return parsed;
    } catch (_error) {
        return null;
    }
}

function writeCachedProfile(profile) {
    try {
        localStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify({
            ...profile,
            cachedAt: Date.now()
        }));
    } catch (_error) {
        // Ignore cache failures.
    }
}

function applyResolvedProfile(profile, fallbackLastSeen) {
    const resolvedName = profile.displayName || "User";
    const resolvedEmail = profile.email || "";
    const resolvedRole = profile.role || "user";
    const resolvedIsActive = profile.isActive !== false;
    const resolvedLastSeen = formatTimestamp(
        profile.lastSeenAt || profile.lastLoginAt || profile.updatedAt || fallbackLastSeen
    );

    updateTextNodes("[data-user-name]", resolvedName);
    updateTextNodes("[data-user-email]", resolvedEmail);
    updateTextNodes("[data-profile-role]", resolvedRole);
    updateTextNodes("[data-profile-last-seen]", resolvedLastSeen);
    applyRoleVisibility(resolvedRole);
    localStorage.setItem("userName", resolvedName);

    return { resolvedName, resolvedRole, resolvedIsActive };
}

async function populateUserProfile(user) {
    const idTokenResult = await user.getIdTokenResult().catch(() => null);
    const fallbackRole = idTokenResult?.claims?.role || (idTokenResult?.claims?.admin ? "admin" : "user");
    const fallbackName = user.displayName || user.email || "User";
    const fallbackEmail = user.email || "";
    const fallbackLastSeen = formatTimestamp(user.metadata?.lastSignInTime);

    updateTextNodes("[data-user-name]", fallbackName);
    updateTextNodes("[data-user-email]", fallbackEmail);
    updateTextNodes("[data-profile-role]", fallbackRole);
    updateTextNodes("[data-profile-last-seen]", fallbackLastSeen);
    applyRoleVisibility(fallbackRole);

    const cachedProfile = readCachedProfile(user.uid);
    if (cachedProfile && !requiredRole && !window.location.pathname.endsWith("/profile.html")) {
        return applyResolvedProfile(cachedProfile, user.metadata?.lastSignInTime);
    }

    try {
        const profileSnap = await getDoc(doc(db, "users", user.uid));
        if (profileSnap.exists()) {
            const profile = profileSnap.data();
            const mergedProfile = {
                uid: user.uid,
                displayName: profile.displayName || fallbackName,
                email: profile.email || fallbackEmail,
                role: profile.role || fallbackRole,
                isActive: profile.isActive !== false,
                lastSeenAt: profile.lastSeenAt || profile.lastLoginAt || profile.updatedAt || user.metadata?.lastSignInTime,
                lastLoginAt: profile.lastLoginAt,
                updatedAt: profile.updatedAt
            };
            writeCachedProfile(mergedProfile);
            return applyResolvedProfile(mergedProfile, user.metadata?.lastSignInTime);
        }
    } catch (_error) {
        updateTextNodes("[data-profile-last-seen]", fallbackLastSeen);
    }

    const fallbackProfile = {
        uid: user.uid,
        displayName: fallbackName,
        email: fallbackEmail,
        role: fallbackRole,
        isActive: true,
        lastSeenAt: user.metadata?.lastSignInTime
    };
    writeCachedProfile(fallbackProfile);
    return applyResolvedProfile(fallbackProfile, user.metadata?.lastSignInTime);
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
                localStorage.removeItem(PROFILE_CACHE_KEY);
                window.location.replace(getLoginPath());
            } catch (_error) {
                alert("Unable to log out right now. Please try again.");
            }
        });
    });
}

onAuthStateChanged(auth, async (user) => {
    if (isProtectedRoute && !user) {
        applyRoleVisibility("guest");
        localStorage.removeItem(PROFILE_CACHE_KEY);
        redirectToLogin();
        return;
    }

    if (isGuestRoute && user) {
        redirectToApp();
        return;
    }

    if (user) {
        const profile = await populateUserProfile(user);
        if (profile?.resolvedIsActive === false) {
            await handleInactiveUser();
            return;
        }
        if (requiredRole && profile?.resolvedRole !== requiredRole) {
            redirectToApp();
            return;
        }
    } else {
        applyRoleVisibility("guest");
        localStorage.removeItem(PROFILE_CACHE_KEY);
    }

    bindLogoutLinks();
});
