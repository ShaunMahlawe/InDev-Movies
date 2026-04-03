import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-auth.js";
import { auth } from "./firebase-core.js";

const mode = document.body?.dataset.authMode || "";
const isProtectedRoute = mode === "protected";
const isGuestRoute = mode === "guest";

function getLoginPath() {
    return window.location.pathname.includes("/Pages/") ? "../index.html" : "./index.html";
}

function getAppPath() {
    return window.location.pathname.includes("/Pages/") ? "../Pages/profile.html" : "./Pages/profile.html";
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

onAuthStateChanged(auth, (user) => {
    if (isProtectedRoute && !user) {
        redirectToLogin();
        return;
    }

    if (isGuestRoute && user) {
        redirectToApp();
        return;
    }

    if (user) {
        const displayName = user.displayName || user.email || "User";
        localStorage.setItem("userName", displayName);

        const userNameNodes = document.querySelectorAll("[data-user-name]");
        userNameNodes.forEach((node) => {
            node.textContent = displayName;
        });

        const userEmailNodes = document.querySelectorAll("[data-user-email]");
        userEmailNodes.forEach((node) => {
            node.textContent = user.email || "";
        });
    }

    bindLogoutLinks();
});
