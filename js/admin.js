import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-auth.js";
import {
    addDoc,
    collection,
    doc,
    getDoc,
    getDocs,
    limit,
    orderBy,
    query,
    serverTimestamp,
    updateDoc
} from "https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore-lite.js";
import { auth, db } from "./firebase-core.js?v=20260404-2";

let currentAuditUser = null;
let currentAuditRole = "user";
let inventoryCache = [];

function setText(id, value) {
    const node = document.getElementById(id);
    if (node) {
        node.textContent = value;
    }
}

function formatTime(value) {
    if (!value) return "-";
    if (typeof value.toDate === "function") {
        return value.toDate().toLocaleString();
    }
    if (typeof value.seconds === "number") {
        return new Date(value.seconds * 1000).toLocaleString();
    }
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? String(value) : parsed.toLocaleString();
}

function renderStatus(items) {
    const container = document.getElementById("auditStatusList");
    if (!container) return;

    container.innerHTML = items.map((item) => {
        const tone = item.status === "ok" ? "is-ok" : item.status === "warn" ? "is-warn" : "is-error";
        return `
            <article class="status-item ${tone}">
                <span class="status-dot" aria-hidden="true"></span>
                <div>
                    <h3 class="status-item__title">${item.title}</h3>
                    <p class="status-item__body">${item.body}</p>
                </div>
            </article>
        `;
    }).join("");
}

function toMillis(value) {
    if (!value) return 0;
    if (typeof value.toDate === "function") {
        return value.toDate().getTime();
    }
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? 0 : parsed.getTime();
}

function setInventoryMeta(text) {
    const node = document.getElementById("auditInventoryMeta");
    if (node) {
        node.textContent = text;
    }
}

function setEventsMeta(text) {
    const node = document.getElementById("auditEventsMeta");
    if (node) {
        node.textContent = text;
    }
}

function getInventoryFilterState() {
    const searchValue = (document.getElementById("auditUserSearch")?.value || "").trim().toLowerCase();
    const roleValue = document.getElementById("auditRoleFilter")?.value || "all";
    const statusValue = document.getElementById("auditStatusFilter")?.value || "all";

    return { searchValue, roleValue, statusValue };
}

function matchesSearch(user, searchValue) {
    if (!searchValue) return true;
    const haystack = [user.email, user.displayName, user.uid, user.id]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
    return haystack.includes(searchValue);
}

function applyInventoryFilters() {
    const { searchValue, roleValue, statusValue } = getInventoryFilterState();

    const filteredUsers = inventoryCache.filter((user) => {
        const role = user.role || "user";
        const isActive = user.isActive !== false;

        const roleMatch = roleValue === "all" || role === roleValue;
        const statusMatch = statusValue === "all"
            || (statusValue === "active" && isActive)
            || (statusValue === "inactive" && !isActive);

        return roleMatch && statusMatch && matchesSearch(user, searchValue);
    });

    renderInventory(filteredUsers);
}

function describeAuditEvent(event) {
    if (event.type === "account_status_update") {
        const action = event.nextActive ? "enabled" : "disabled";
        return `${event.actorEmail || "unknown"} ${action} account ${event.targetEmail || event.targetUid || "unknown"}.`;
    }
    if (event.type === "role_update") {
        return `${event.actorEmail || "unknown"} changed role for ${event.targetEmail || event.targetUid || "unknown"} to ${event.nextRole || "user"}.`;
    }
    return event.message || "Administrative action recorded.";
}

function renderAuditEvents(events) {
    const tbody = document.getElementById("auditEventsTableBody");
    const empty = document.getElementById("auditEventsEmpty");
    if (!tbody || !empty) return;

    if (!Array.isArray(events) || events.length === 0) {
        tbody.innerHTML = "";
        empty.hidden = false;
        setEventsMeta("No audit events recorded yet.");
        return;
    }

    empty.hidden = true;
    setEventsMeta(`Showing ${events.length} most recent admin events.`);

    tbody.innerHTML = events.map((event) => {
        return `
            <tr>
                <td>${formatTime(event.createdAt)}</td>
                <td>${event.actorEmail || "-"}</td>
                <td>${event.type || "-"}</td>
                <td>${describeAuditEvent(event)}</td>
            </tr>
        `;
    }).join("");
}

function getAdminCount() {
    return inventoryCache.filter((entry) => (entry.role || "user") === "admin").length;
}

async function applyUserStatusChange(userId, nextActive, button) {
    const actionLabel = nextActive ? "enable" : "disable";
    const targetUser = inventoryCache.find((entry) => entry.id === userId);
    const targetLabel = targetUser?.email || userId;
    const confirmed = window.confirm(`Confirm ${actionLabel} account: ${targetLabel}?`);
    if (!confirmed) {
        return;
    }

    button.disabled = true;

    try {
        await updateDoc(doc(db, "users", userId), {
            isActive: nextActive,
            updatedAt: serverTimestamp()
        });
        await logAdminAuditEvent({
            type: "account_status_update",
            actorUid: currentAuditUser?.uid || "unknown",
            actorEmail: currentAuditUser?.email || "unknown",
            targetUid: userId,
            targetEmail: targetUser?.email || "unknown",
            nextActive,
            action: actionLabel
        });
        await refreshAuditData();
    } catch (error) {
        button.disabled = false;
        setInventoryMeta(`Failed to update account status: ${error?.message || "Unknown error"}`);
    }
}

async function applyUserRoleChange(userId, nextRole, button) {
    const targetUser = inventoryCache.find((entry) => entry.id === userId);
    const targetLabel = targetUser?.email || userId;
    const currentRole = targetUser?.role || "user";

    if (nextRole === currentRole) {
        return;
    }

    if (currentRole === "admin" && nextRole === "user" && getAdminCount() <= 1) {
        setInventoryMeta("Cannot demote the last remaining admin account.");
        return;
    }

    const confirmed = window.confirm(`Confirm role change for ${targetLabel}: ${currentRole} -> ${nextRole}?`);
    if (!confirmed) {
        return;
    }

    button.disabled = true;

    try {
        await updateDoc(doc(db, "users", userId), {
            role: nextRole,
            updatedAt: serverTimestamp()
        });
        await logAdminAuditEvent({
            type: "role_update",
            actorUid: currentAuditUser?.uid || "unknown",
            actorEmail: currentAuditUser?.email || "unknown",
            targetUid: userId,
            targetEmail: targetUser?.email || "unknown",
            previousRole: currentRole,
            nextRole
        });
        await refreshAuditData();
    } catch (error) {
        button.disabled = false;
        setInventoryMeta(`Failed to update role: ${error?.message || "Unknown error"}`);
    }
}

async function logAdminAuditEvent(event) {
    try {
        await addDoc(collection(db, "adminAuditEvents"), {
            ...event,
            createdAt: serverTimestamp()
        });
    } catch (_error) {
        // Logging failure should not block primary admin actions.
    }
}

function renderInventory(users) {
    const tbody = document.getElementById("auditUsersTableBody");
    const empty = document.getElementById("auditInventoryEmpty");
    if (!tbody || !empty) return;

    if (!Array.isArray(users) || users.length === 0) {
        tbody.innerHTML = "";
        empty.hidden = false;
        if (inventoryCache.length > 0) {
            empty.textContent = "No users match your current filters.";
            setInventoryMeta("No users match your current filters.");
        } else {
            empty.textContent = "No user profiles found.";
            setInventoryMeta("No Firestore user profiles found in this project yet.");
        }
        return;
    }

    empty.textContent = "No user profiles found.";
    empty.hidden = true;
    const adminCount = users.filter((user) => user.role === "admin").length;
    const activeCount = users.filter((user) => user.isActive !== false).length;
    setInventoryMeta(`${users.length} profiles, ${adminCount} admins, ${activeCount} active accounts.`);

    tbody.innerHTML = users.map((user) => {
        const roleClass = user.role === "admin" ? "is-admin" : "is-user";
        const active = user.isActive !== false;
        const statusClass = active ? "is-active" : "is-inactive";
        const statusActionLabel = active ? "Disable" : "Enable";
        const currentRole = user.role || "user";
        const nextRole = currentRole === "admin" ? "user" : "admin";
        const roleActionLabel = currentRole === "admin" ? "Demote" : "Promote";
        const isSelf = currentAuditUser && user.id === currentAuditUser.uid;
        const isLastAdmin = currentRole === "admin" && getAdminCount() <= 1;
        const roleDisabled = isSelf || isLastAdmin;

        return `
            <tr>
                <td>${user.email || "-"}</td>
                <td><span class="user-badge ${roleClass}">${user.role || "user"}</span></td>
                <td><span class="user-badge ${statusClass}">${active ? "active" : "inactive"}</span></td>
                <td>${formatTime(user.lastLoginAt || user.updatedAt || user.createdAt)}</td>
                <td>
                    <div class="user-actions">
                        <button
                            class="user-action-button"
                            type="button"
                            data-action="toggle-active"
                            data-user-id="${user.id}"
                            data-next-active="${active ? "false" : "true"}"
                            ${isSelf ? "disabled" : ""}
                        >${isSelf ? "Current Admin" : statusActionLabel}</button>
                        <button
                            class="user-action-button user-action-button--alt"
                            type="button"
                            data-action="change-role"
                            data-user-id="${user.id}"
                            data-next-role="${nextRole}"
                            ${roleDisabled ? "disabled" : ""}
                        >${roleDisabled && isSelf ? "Protected" : roleActionLabel}</button>
                    </div>
                </td>
            </tr>
        `;
    }).join("");

    tbody.querySelectorAll("[data-user-id]").forEach((button) => {
        button.addEventListener("click", async () => {
            const userId = button.getAttribute("data-user-id");
            if (!userId) {
                return;
            }

            const action = button.getAttribute("data-action") || "";

            if (action === "toggle-active") {
                const nextActive = button.getAttribute("data-next-active") === "true";
                await applyUserStatusChange(userId, nextActive, button);
                return;
            }

            if (action === "change-role") {
                const nextRole = button.getAttribute("data-next-role") || "user";
                await applyUserRoleChange(userId, nextRole, button);
            }
        });
    });
}

async function loadAuditEvents() {
    const tbody = document.getElementById("auditEventsTableBody");
    if (tbody) {
        tbody.innerHTML = "";
    }
    setEventsMeta("Refreshing audit events...");

    try {
        const eventsQuery = query(collection(db, "adminAuditEvents"), orderBy("createdAt", "desc"), limit(25));
        const snapshot = await getDocs(eventsQuery);
        const events = snapshot.docs.map((entry) => ({ id: entry.id, ...entry.data() }));
        renderAuditEvents(events);
    } catch (error) {
        renderAuditEvents([]);
        setEventsMeta(`Unable to load audit events: ${error?.message || "Unknown error"}`);
    }
}

async function refreshAuditData() {
    await Promise.all([loadUserInventory(), loadAuditEvents()]);
}

async function loadUserInventory() {
    const tbody = document.getElementById("auditUsersTableBody");
    if (tbody) {
        tbody.innerHTML = "";
    }
    setInventoryMeta("Refreshing user inventory...");

    try {
        const usersQuery = query(collection(db, "users"), orderBy("updatedAt", "desc"));
        const snapshot = await getDocs(usersQuery);
        const users = snapshot.docs.map((entry) => ({ id: entry.id, ...entry.data() }));
        users.sort((left, right) => toMillis(right.updatedAt || right.createdAt) - toMillis(left.updatedAt || left.createdAt));
        inventoryCache = users;
        applyInventoryFilters();
    } catch (error) {
        inventoryCache = [];
        renderInventory([]);
        setInventoryMeta(`Unable to load user inventory: ${error?.message || "Unknown error"}`);
    }
}

async function checkTmdb() {
    const bearer = String(window.TMDB_BEARER_TOKEN || "").trim();
    const apiKey = String(window.TMDB_API_KEY || "").trim();
    if (!bearer && !apiKey) {
        return {
            status: "error",
            title: "TMDB Runtime Config",
            body: "No TMDB token or API key is loaded into the page runtime."
        };
    }

    const headers = bearer ? { Authorization: `Bearer ${bearer}`, "Content-Type": "application/json" } : undefined;
    const query = !bearer && apiKey ? `?api_key=${encodeURIComponent(apiKey)}` : "";

    try {
        const response = await fetch(`https://api.themoviedb.org/3/trending/movie/week${query}`, { headers });
        if (!response.ok) {
            return {
                status: "error",
                title: "TMDB Reachability",
                body: `TMDB request failed with status ${response.status}.`
            };
        }

        const payload = await response.json();
        const count = Array.isArray(payload.results) ? payload.results.length : 0;
        return {
            status: "ok",
            title: "TMDB Reachability",
            body: `TMDB responded successfully and returned ${count} trending movies.`
        };
    } catch (error) {
        return {
            status: "error",
            title: "TMDB Reachability",
            body: `TMDB request failed at runtime: ${error?.message || "Unknown error"}.`
        };
    }
}

async function checkFirestore(user) {
    if (!user) {
        return {
            status: "warn",
            title: "Firestore Profile Storage",
            body: "No signed-in user is available for a Firestore profile check."
        };
    }

    try {
        const snap = await getDoc(doc(db, "users", user.uid));
        if (snap.exists()) {
            return {
                status: "ok",
                title: "Firestore Profile Storage",
                body: "A users/{uid} profile document exists and can be read from this project."
            };
        }

        return {
            status: "warn",
            title: "Firestore Profile Storage",
            body: "The Firestore backend is reachable, but no users/{uid} profile document exists for this admin account."
        };
    } catch (error) {
        return {
            status: "warn",
            title: "Firestore Profile Storage",
            body: `Firestore is not usable for profile storage right now: ${error?.message || "Unknown error"}.`
        };
    }
}

async function buildAudit(user) {
    const tokenResult = await user.getIdTokenResult();
    const role = tokenResult.claims.role || (tokenResult.claims.admin ? "admin" : "user");
    currentAuditUser = user;
    currentAuditRole = role;
    const runtimeConfig = window.INDEV_CONFIG || {};
    const firebaseConfig = runtimeConfig.firebase || {};
    const tmdbReady = Boolean(String(window.TMDB_BEARER_TOKEN || window.TMDB_API_KEY || "").trim());
    const firebaseReady = Boolean(firebaseConfig.projectId);

    setText("auditUserEmail", user.email || "-");
    setText("auditUserRole", role);
    setText("auditProjectId", firebaseConfig.projectId || "Not configured");
    setText("auditLastRefresh", new Date().toLocaleString());
    setText("auditDisplayName", user.displayName || "-");
    setText("auditUid", user.uid || "-");
    setText("auditClaimsSummary", Object.keys(tokenResult.claims).sort().join(", ") || "No custom claims");
    setText("auditCurrentPath", window.location.pathname);

    const [tmdbStatus, firestoreStatus] = await Promise.all([
        checkTmdb(),
        checkFirestore(user)
    ]);

    const configStatus = {
        status: tmdbReady && firebaseReady ? "ok" : "error",
        title: "Runtime Config",
        body: tmdbReady && firebaseReady
            ? `Firebase project ${firebaseConfig.projectId} and TMDB runtime config are both loaded.`
            : "Required runtime config is missing from the current page load."
    };

    const claimStatus = {
        status: role === "admin" ? "ok" : "error",
        title: "Admin Claim",
        body: role === "admin"
            ? "This session contains the admin claim and can access admin-only routes."
            : "This session does not contain the admin claim."
    };

    renderStatus([configStatus, claimStatus, tmdbStatus, firestoreStatus]);

    const note = document.getElementById("auditNotes");
    if (note) {
        note.textContent = firestoreStatus.status === "ok"
            ? "Admin route access and runtime health checks passed. Firestore profile storage is also available."
            : "Admin route access is working. TMDB is checked live. Firestore profile storage still needs project setup if you want persistent profile documents.";
    }

    if (role === "admin") {
        await refreshAuditData();
    }
}

function bindInventoryRefresh() {
    const button = document.getElementById("auditRefreshButton");
    if (!button) return;

    button.addEventListener("click", async () => {
        if (currentAuditRole !== "admin") {
            setInventoryMeta("Only admins can refresh the user inventory.");
            return;
        }

        await refreshAuditData();
    });
}

function bindEventsRefresh() {
    const button = document.getElementById("auditEventsRefreshButton");
    if (!button) return;

    button.addEventListener("click", async () => {
        if (currentAuditRole !== "admin") {
            setEventsMeta("Only admins can refresh audit events.");
            return;
        }

        await loadAuditEvents();
    });
}

function bindInventoryFilters() {
    const searchInput = document.getElementById("auditUserSearch");
    const roleSelect = document.getElementById("auditRoleFilter");
    const statusSelect = document.getElementById("auditStatusFilter");

    if (searchInput) {
        searchInput.addEventListener("input", () => {
            applyInventoryFilters();
        });
    }

    if (roleSelect) {
        roleSelect.addEventListener("change", () => {
            applyInventoryFilters();
        });
    }

    if (statusSelect) {
        statusSelect.addEventListener("change", () => {
            applyInventoryFilters();
        });
    }
}

bindInventoryRefresh();
bindInventoryFilters();
bindEventsRefresh();

onAuthStateChanged(auth, async (user) => {
    if (!user) {
        setText("auditNotes", "Sign in as an admin to run audit checks.");
        return;
    }

    try {
        await buildAudit(user);
    } catch (error) {
        renderStatus([
            {
                status: "error",
                title: "Audit Runner",
                body: `The audit page failed to initialize: ${error?.message || "Unknown error"}.`
            }
        ]);
        setText("auditNotes", "Audit initialization failed.");
    }
});