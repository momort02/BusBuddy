import { initializeApp } from "https://gstatic.com";
import { getAuth, onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, updateProfile } from "https://gstatic.com";
import { getFirestore, collection, doc, setDoc, getDoc, getDocs, addDoc, updateDoc, query, where, onSnapshot, serverTimestamp, arrayUnion } from "https://gstatic.com";
import { firebaseConfig } from "./firebase-config.js";
import { t, getDict, setLanguage, currentLang } from "./i18n.js";

const $ = (id) => document.getElementById(id);
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
let authMode = "login", currentUser = null, groupUnsub = null, activeGroupUnsub = null, responsesUnsub = null, activeGroupId = null, activeGroupData = null, activeTrips = [], activeResponses = [];

// Initialisation de la langue au chargement
function applyAppLanguage(lang) {
    setLanguage(lang);
    $("langToggle").textContent = lang === "fr" ? "EN" : "FR";
    setAuthMode(authMode);
    
    // Mise à jour des jours dans le formulaire
    const days = getDict().days;
    document.querySelectorAll("#daysCheckboxes label").forEach(lbl => {
        const dayIndex = Number(lbl.querySelector("input").value);
        lbl.querySelector("span").textContent = days[dayIndex];
    });

    if (currentUser) {
        $("welcomeTitle").textContent = `${t("hello")} ${currentUser.displayName || currentUser.email.split("@")}`;
        listenGroups();
        if ($("groupDetailDialog").open && activeGroupData) {
            renderGroupDetail(activeTrips.map(tr => ({ ...tr, responses: activeResponses.filter(r => r.tripId === tr.id) })));
        }
    }
}

$("langToggle").addEventListener("click", () => {
    applyAppLanguage(currentLang === "fr" ? "en" : "fr");
});

const toast = (message) => { $("toast").textContent = message; $("toast").classList.add("show"); setTimeout(() => $("toast").classList.remove("show"), 2600); };
const showError = (id, message) => { $(id).textContent = message || ""; };
const code = () => Math.random().toString(36).slice(2, 8).toUpperCase();
const todayKey = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };
const safe = (s = "") => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "'" }[c]));

function setAuthMode(mode) {
    authMode = mode;
    document.querySelectorAll("[data-auth-tab]").forEach(b => b.classList.toggle("active", b.dataset.authTab === mode));
    $("authSubmit").textContent = mode === "login" ? t("loginBtn") : t("registerBtn");
    $("password").autocomplete = mode === "login" ? "current-password" : "new-password";
    showError("authError", "");
}

document.querySelectorAll("[data-auth-tab]").forEach(b => b.addEventListener("click", () => setAuthMode(b.dataset.authTab)));

$("authForm").addEventListener("submit", async e => {
    e.preventDefault();
    showError("authError", "");
    try {
        const email = $("email").value.trim(), password = $("password").value;
        if (authMode === "register") {
            const cred = await createUserWithEmailAndPassword(auth, email, password);
            await updateProfile(cred.user, { displayName: email.split("@") });
            await setDoc(doc(db, "users", cred.user.uid), { email, displayName: cred.user.displayName, createdAt: serverTimestamp() });
        } else {
            await signInWithEmailAndPassword(auth, email, password);
        }
    } catch (err) {
        showError("authError", friendlyError(err));
    }
});

function friendlyError(e) {
    const errors = getDict().errors;
    return errors[e.code] || e.message || errors.default;
}

onAuthStateChanged(auth, user => {
    currentUser = user;
    if (groupUnsub) { groupUnsub(); groupUnsub = null; }
    if (!user) {
        $("authView").classList.remove("hidden");
        $("appView").classList.add("hidden");
        $("logoutBtn").classList.add("hidden");
        return;
    }
    $("authView").classList.add("hidden");
    $("appView").classList.remove("hidden");
    $("logoutBtn").classList.remove("hidden");
    $("welcomeTitle").textContent = `${t("hello")} ${user.displayName || user.email.split("@")}`;
    listenGroups();
});

$("logoutBtn").addEventListener("click", () => signOut(auth));

function listenGroups() {
    if (!currentUser) return;
    if (groupUnsub) groupUnsub();
    const q = query(collection(db, "groups"), where("memberIds", "array-contains", currentUser.uid));
    groupUnsub = onSnapshot(q, snap => {
        const host = $("groupsList");
        host.innerHTML = "";
        $("emptyGroups").classList.toggle("hidden", !snap.empty);
        snap.forEach(d => {
            const g = d.data();
            const b = document.createElement("button");
            b.className = "group-card";
            const meta = t("groupCardMeta", { n: (g.memberIds || []).length, code: safe(g.inviteCode || "") });
            b.innerHTML = `<div><h3>${safe(g.name)}</h3><p>${meta}</p></div><span class="group-arrow">›</span>`;
            b.addEventListener("click", () => openGroup(d.id));
            host.append(b);
        });
    }, e => toast(t("syncError") + e.message));
}

$("createGroupBtn").addEventListener("click", () => $("groupDialog").showModal());

$("groupForm").addEventListener("submit", async e => {
    e.preventDefault();
    try {
        const name = $("groupName").value.trim();
        if (!name) return;
        const inviteCode = code();
        const ref = await addDoc(collection(db, "groups"), { name, ownerId: currentUser.uid, memberIds: [currentUser.uid], inviteCode, createdAt: serverTimestamp() });
        await setDoc(doc(db, "invites", inviteCode), { groupId: ref.id, createdBy: currentUser.uid, createdAt: serverTimestamp() });
        $("groupDialog").close();
        $("groupName").value = "";
        toast(t("groupCreated"));
        openGroup(ref.id);
    } catch (err) {
        showError("groupError", err.message);
    }
});

$("joinGroupForm").addEventListener("submit", async e => {
    e.preventDefault();
    showError("joinError", "");
    try {
        const c = $("inviteCode").value.trim().toUpperCase();
        const invite = await getDoc(doc(db, "invites", c));
        if (!invite.exists()) throw new Error(t("codeNotFound"));
        const targetId = invite.data().groupId;
        await updateDoc(doc(db, "groups", targetId), { memberIds: arrayUnion(currentUser.uid) });
        $("inviteCode").value = "";
        toast(t("groupJoined"));
        openGroup(targetId);
    } catch (err) {
        showError("joinError", err.message);
    }
});

async function openGroup(groupId) {
    activeGroupId = groupId;
    const snap = await getDoc(doc(db, "groups", groupId));
    if (!snap.exists()) return toast(t("groupNotFound"));
    activeGroupData = snap.data();
    activeTrips = [];
    activeResponses = [];
    renderGroupDetail();
    $("groupDetailDialog").showModal();
    if (activeGroupUnsub) activeGroupUnsub();
    if (responsesUnsub) responsesUnsub();
    activeGroupUnsub = onSnapshot(query(collection(db, "trips"), where("groupId", "==", groupId)), tripsSnap => {
        activeTrips = tripsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        renderGroupDetail(activeTrips.map(tr => ({ ...tr, responses: activeResponses.filter(r => r.tripId === tr.id) })));
    });
    responsesUnsub = onSnapshot(query(collection(db, "responses"), where("groupId", "==", groupId), where("date", "==", todayKey())), responsesSnap => {
        activeResponses = responsesSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        renderGroupDetail(activeTrips.map(tr => ({ ...tr, responses: activeResponses.filter(r => r.tripId === tr.id) })));
    });
}

function renderGroupDetail(trips = []) {
    const g = activeGroupData || {};
    const isOwner = g.ownerId === currentUser.uid;
    $("groupDetailContent").innerHTML = `
        <div class="detail-top">
            <div>
                <p class="eyebrow">${t("groupEyebrow")}</p>
                <h2>${safe(g.name)}</h2>
                <p class="muted">${t("membersCount", { n: (g.memberIds || []).length })}</p>
            </div>
            <button class="icon-btn" id="closeGroup" aria-label="${t("closeLabel")}">×</button>
        </div>
        <div class="code-box">
            <div>
                <small class="muted">${t("inviteCodeLabel")}</small><br>
                <strong>${safe(g.inviteCode || "")}</strong>
            </div>
            <button class="secondary" id="copyCode">${t("copyBtn")}</button>
        </div>
        <div class="detail-actions">
            <button class="primary" id="addTrip">${t("addTripBtn")}</button>
            ${isOwner ? `<button class="ghost" id="refreshCode">${t("newCodeBtn")}</button>` : ""}
        </div>
        <h3>${t("todaysTrips")}</h3>
        <div id="tripCards">${trips.length ? trips.map(tr => tripHtml(tr)).join("") : `<p class="muted">${t("noTripsYet")}</p>`}</div>
    `;
    $("closeGroup").onclick = () => {
        $("groupDetailDialog").close();
        if (activeGroupUnsub) { activeGroupUnsub(); activeGroupUnsub = null; }
        if (responsesUnsub) { responsesUnsub(); responsesUnsub = null; }
    };
    $("copyCode").onclick = async () => { await navigator.clipboard.writeText(g.inviteCode); toast(t("codeCopied")); };
    $("addTrip").onclick = () => $("tripDialog").showModal();
    if ($("refreshCode")) $("refreshCode").onclick = async () => {
        const oldCode = activeGroupData.inviteCode;
        const newCode = code();
        await set // <-- Collez la suite de votre code ici (en utilisant getDict().status et getDict().days dans tripHtml)
