import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js";
import { auth, db } from "./firebase-core.js";

const nameEl = document.getElementById("profileDisplayName");
const emailEl = document.getElementById("profileEmail");
const roleEl = document.getElementById("profileRole");
const lastSeenEl = document.getElementById("profileLastSeen");

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

onAuthStateChanged(auth, async (user) => {
    if (!user) return;

    const fallbackName = user.displayName || user.email || "User";
    if (nameEl) nameEl.textContent = fallbackName;
    if (emailEl) emailEl.textContent = user.email || "-";

    try {
        const profileSnap = await getDoc(doc(db, "users", user.uid));
        if (!profileSnap.exists()) {
            return;
        }

        const profile = profileSnap.data();
        if (nameEl) nameEl.textContent = profile.displayName || fallbackName;
        if (emailEl) emailEl.textContent = profile.email || user.email || "-";
        if (roleEl) roleEl.textContent = profile.role || "user";
        if (lastSeenEl) lastSeenEl.textContent = formatTimestamp(profile.lastSeenAt || profile.lastLoginAt || profile.updatedAt);
    } catch (_error) {
        if (roleEl) roleEl.textContent = "user";
    }
});
