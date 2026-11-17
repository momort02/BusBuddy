
import {
    initializeApp
} from "https://www.gstatic.com/firebasejs/11.6.0/firebase-app.js";

import {
    getAuth,
    onAuthStateChanged,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    updateProfile
} from "https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js";

import {
    getFirestore,
    collection,
    doc,
    setDoc,
    getDoc,
    addDoc,
    updateDoc,
    query,
    where,
    onSnapshot,
    serverTimestamp,
    arrayUnion
} from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";

import { firebaseConfig } from "./firebase-config.js";
import { t, getDict, setLanguage, currentLang } from "./i18n.js";

const $ = (id) => document.getElementById(id);

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

let authMode = "login";
let currentUser = null;
let groupUnsub = null;
let activeGroupUnsub = null;
let responsesUnsub = null;
let activeGroupId = null;
let activeGroupData = null;
let activeTrips = [];
let activeResponses = [];
let groupRequestToken = 0;

const toast = (message) => {
    const element = $("toast");
    if (!element) return;

    element.textContent = message;
    element.classList.add("show");

    setTimeout(() => element.classList.remove("show"), 2600);
};

const showError = (id, message = "") => {
    const element = $(id);
    if (element) element.textContent = message;
};

const code = () => {
    const bytes = new Uint8Array(5);
    crypto.getRandomValues(bytes);

    return Array.from(bytes, byte => (byte % 36).toString(36))
        .join("")
        .toUpperCase();
};

const todayKey = () => {
    const date = new Date();

    return [
        date.getFullYear(),
        String(date.getMonth() + 1).padStart(2, "0"),
        String(date.getDate()).padStart(2, "0")
    ].join("-");
};

const safe = (value = "") => String(value).replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
}[char]));

function stopGroupListeners() {
    if (activeGroupUnsub) {
        activeGroupUnsub();
        activeGroupUnsub = null;
    }

    if (responsesUnsub) {
        responsesUnsub();
        responsesUnsub = null;
    }
}

function stopAllListeners() {
    if (groupUnsub) {
        groupUnsub();
        groupUnsub = null;
    }

    stopGroupListeners();

    activeGroupId = null;
    activeGroupData = null;
    activeTrips = [];
    activeResponses = [];
    groupRequestToken++;
}

function applyAppLanguage(lang) {
    setLanguage(lang);

    const langToggle = $("langToggle");
    if (langToggle) {
        langToggle.textContent = lang === "fr" ? "EN" : "FR";
    }

    setAuthMode(authMode);

    const days = getDict().days;

    document.querySelectorAll("#daysCheckboxes label").forEach(label => {
        const input = label.querySelector("input");
        const span = label.querySelector("span");

        if (!input || !span) return;

        const dayIndex = Number(input.value);
        span.textContent = days[dayIndex] ?? "";
    });

    if (currentUser) {
        const welcomeTitle = $("welcomeTitle");

        if (welcomeTitle) {
            welcomeTitle.textContent =
                `${t("hello")} ${currentUser.displayName || currentUser.email?.split("@")[0] || ""}`;
        }

        listenGroups();

        if ($("groupDetailDialog")?.open && activeGroupData) {
            const trips = activeTrips.map(trip => ({
                ...trip,
                responses: activeResponses.filter(response => response.tripId === trip.id)
            }));

            renderGroupDetail(trips);
        }
    }
}

$("langToggle")?.addEventListener("click", () => {
    applyAppLanguage(currentLang === "fr" ? "en" : "fr");
});

function setAuthMode(mode) {
    authMode = mode;

    document.querySelectorAll("[data-auth-tab]").forEach(button => {
        button.classList.toggle("active", button.dataset.authTab === mode);
    });

    const authSubmit = $("authSubmit");
    const password = $("password");

    if (authSubmit) {
        authSubmit.textContent = mode === "login" ? t("loginBtn") : t("registerBtn");
    }

    if (password) {
        password.autocomplete = mode === "login" ? "current-password" : "new-password";
    }

    showError("authError", "");
}

document.querySelectorAll("[data-auth-tab]").forEach(button => {
    button.addEventListener("click", () => setAuthMode(button.dataset.authTab));
});

$("authForm")?.addEventListener("submit", async event => {
    event.preventDefault();
    showError("authError", "");

    try {
        const email = $("email")?.value.trim();
        const password = $("password")?.value;

        if (!email || !password) {
            throw new Error(t("requiredFields"));
        }

        if (authMode === "register") {
            const credential = await createUserWithEmailAndPassword(auth, email, password);
            const displayName = email.split("@")[0];

            await updateProfile(credential.user, { displayName });

            await setDoc(doc(db, "users", credential.user.uid), {
                email,
                displayName,
                createdAt: serverTimestamp()
            });
        } else {
            await signInWithEmailAndPassword(auth, email, password);
        }
    } catch (error) {
        showError("authError", friendlyError(error));
    }
});

function friendlyError(error) {
    const errors = getDict().errors || {};

    return errors[error.code] ||
        errors[error.message] ||
        error.message ||
        errors.default ||
        "Une erreur est survenue.";
}

onAuthStateChanged(auth, user => {
    currentUser = user;
    stopAllListeners();

    if (!user) {
        $("authView")?.classList.remove("hidden");
        $("appView")?.classList.add("hidden");
        $("logoutBtn")?.classList.add("hidden");

        const dialog = $("groupDetailDialog");
        if (dialog?.open) dialog.close();

        return;
    }

    $("authView")?.classList.add("hidden");
    $("appView")?.classList.remove("hidden");
    $("logoutBtn")?.classList.remove("hidden");

    const welcomeTitle = $("welcomeTitle");

    if (welcomeTitle) {
        welcomeTitle.textContent =
            `${t("hello")} ${user.displayName || user.email?.split("@")[0] || ""}`;
    }

    listenGroups();
});

$("logoutBtn")?.addEventListener("click", async () => {
    try {
        await signOut(auth);
    } catch (error) {
        toast(friendlyError(error));
    }
});

function listenGroups() {
    if (!currentUser) return;

    if (groupUnsub) {
        groupUnsub();
        groupUnsub = null;
    }

    const groupsQuery = query(
        collection(db, "groups"),
        where("memberIds", "array-contains", currentUser.uid)
    );

    groupUnsub = onSnapshot(groupsQuery, snapshot => {
        const host = $("groupsList");
        if (!host) return;

        host.innerHTML = "";
        $("emptyGroups")?.classList.toggle("hidden", !snapshot.empty);

        snapshot.forEach(groupDocument => {
            const group = groupDocument.data();
            const button = document.createElement("button");

            button.className = "group-card";

            const meta = t("groupCardMeta", {
                n: (group.memberIds || []).length,
                code: safe(group.inviteCode || "")
            });

            button.innerHTML = `
                <div>
                    <h3>${safe(group.name || "")}</h3>
                    <p>${meta}</p>
                </div>
                <span class="group-arrow">›</span>
            `;

            button.addEventListener("click", () => openGroup(groupDocument.id));
            host.append(button);
        });
    }, error => {
        toast(`${t("syncError")} ${error.message}`);
    });
}

$("createGroupBtn")?.addEventListener("click", () => {
    $("groupDialog")?.showModal();
});

$("groupForm")?.addEventListener("submit", async event => {
    event.preventDefault();
    showError("groupError", "");

    try {
        if (!currentUser) throw new Error(t("authRequired"));

        const name = $("groupName")?.value.trim();
        if (!name) throw new Error(t("groupNameRequired"));

        const inviteCode = code();

        const groupRef = await addDoc(collection(db, "groups"), {
            name,
            ownerId: currentUser.uid,
            memberIds: [currentUser.uid],
            inviteCode,
            createdAt: serverTimestamp()
        });

        await setDoc(doc(db, "invites", inviteCode), {
            groupId: groupRef.id,
            createdBy: currentUser.uid,
            createdAt: serverTimestamp()
        });

        $("groupDialog")?.close();
        $("groupName").value = "";

        toast(t("groupCreated"));
        await openGroup(groupRef.id);

    } catch (error) {
        showError("groupError", friendlyError(error));
    }
});

$("joinGroupForm")?.addEventListener("submit", async event => {
    event.preventDefault();
    showError("joinError", "");

    try {
        if (!currentUser) throw new Error(t("authRequired"));

        const inviteCode = $("inviteCode")?.value.trim().toUpperCase();

        if (!inviteCode) throw new Error(t("inviteCodeRequired"));

        const inviteSnapshot = await getDoc(doc(db, "invites", inviteCode));

        if (!inviteSnapshot.exists()) {
            throw new Error(t("codeNotFound"));
        }

        const targetGroupId = inviteSnapshot.data().groupId;

        if (!targetGroupId) throw new Error(t("groupNotFound"));

        const groupRef = doc(db, "groups", targetGroupId);
        const groupSnapshot = await getDoc(groupRef);

        if (!groupSnapshot.exists()) {
            throw new Error(t("groupNotFound"));
        }

        await updateDoc(groupRef, {
            memberIds: arrayUnion(currentUser.uid)
        });

        $("inviteCode").value = "";

        toast(t("groupJoined"));
        await openGroup(targetGroupId);

    } catch (error) {
        showError("joinError", friendlyError(error));
    }
});

async function openGroup(groupId) {
    if (!currentUser) return;

    const requestToken = ++groupRequestToken;

    try {
        const snapshot = await getDoc(doc(db, "groups", groupId));

        if (requestToken !== groupRequestToken) return;

        if (!snapshot.exists()) {
            toast(t("groupNotFound"));
            return;
        }

        const group = snapshot.data();

        if (!(group.memberIds || []).includes(currentUser.uid)) {
            toast(t("groupNotFound"));
            return;
        }

        stopGroupListeners();

        activeGroupId = groupId;
        activeGroupData = group;
        activeTrips = [];
        activeResponses = [];

        renderGroupDetail([]);
        $("groupDetailDialog")?.showModal();

        activeGroupUnsub = onSnapshot(
            query(collection(db, "trips"), where("groupId", "==", groupId)),
            tripsSnapshot => {
                if (activeGroupId !== groupId) return;

                activeTrips = tripsSnapshot.docs.map(document => ({
                    id: document.id,
                    ...document.data()
                }));

                renderCurrentGroup();
            },
            error => toast(`${t("syncError")} ${error.message}`)
        );

        responsesUnsub = onSnapshot(
            query(
                collection(db, "responses"),
                where("groupId", "==", groupId),
                where("date", "==", todayKey())
            ),
            responsesSnapshot => {
                if (activeGroupId !== groupId) return;

                activeResponses = responsesSnapshot.docs.map(document => ({
                    id: document.id,
                    ...document.data()
                }));

                renderCurrentGroup();
            },
            error => toast(`${t("syncError")} ${error.message}`)
        );

    } catch (error) {
        if (requestToken === groupRequestToken) {
            toast(friendlyError(error));
        }
    }
}

function renderCurrentGroup() {
    const trips = activeTrips.map(trip => ({
        ...trip,
        responses: activeResponses.filter(response => response.tripId === trip.id)
    }));

    renderGroupDetail(trips);
}

function renderGroupDetail(trips = []) {
    if (!currentUser || !activeGroupData) return;

    const group = activeGroupData;
    const isOwner = group.ownerId === currentUser.uid;

    const content = $("groupDetailContent");
    if (!content) return;

    content.innerHTML = `
        <div class="detail-top">
            <div>
                <p class="eyebrow">${t("groupEyebrow")}</p>
                <h2>${safe(group.name || "")}</h2>
                <p class="muted">${t("membersCount", { n: (group.memberIds || []).length })}</p>
            </div>
            <button class="icon-btn" id="closeGroup" aria-label="${t("closeLabel")}">×</button>
        </div>

        <div class="code-box">
            <div>
                <small class="muted">${t("inviteCodeLabel")}</small>
                <br>
                <strong>${safe(group.inviteCode || "")}</strong>
            </div>
            <button class="secondary" id="copyCode">${t("copyBtn")}</button>
        </div>

        <div class="detail-actions">
            <button class="primary" id="addTrip">${t("addTripBtn")}</button>
            ${isOwner ? `<button class="ghost" id="refreshCode">${t("newCodeBtn")}</button>` : ""}
        </div>

        <h3>${t("todaysTrips")}</h3>

        <div id="tripCards">
            ${trips.length
                ? trips.map(trip => tripHtml(trip)).join("")
                : `<p class="muted">${t("noTripsYet")}</p>`}
        </div>
    `;

    $("closeGroup").onclick = () => {
        $("groupDetailDialog")?.close();
        stopGroupListeners();

        activeGroupId = null;
        activeGroupData = null;
        activeTrips = [];
        activeResponses = [];
    };

    $("copyCode").onclick = async () => {
        try {
            await navigator.clipboard.writeText(group.inviteCode || "");
            toast(t("codeCopied"));
        } catch {
            toast(t("copyError"));
        }
    };

    $("addTrip").onclick = () => $("tripDialog")?.showModal();

    const refreshCodeButton = $("refreshCode");

    if (refreshCodeButton) {
        refreshCodeButton.onclick = async () => {
            try {
                const newCode = code();

                await setDoc(doc(db, "invites", newCode), {
                    groupId: activeGroupId,
                    createdBy: currentUser.uid,
                    createdAt: serverTimestamp()
                });

                await updateDoc(doc(db, "groups", activeGroupId), {
                    inviteCode: newCode
                });

                activeGroupData.inviteCode = newCode;

                renderCurrentGroup();
                toast(t("codeRenewed"));

            } catch (error) {
                toast(friendlyError(error));
            }
        };
    }

    document.querySelectorAll("[data-answer]").forEach(button => {
        button.onclick = () => answer(
            button.dataset.trip,
            button.dataset.answer
        );
    });
}

function tripHtml(trip) {
    const statusLabels = getDict().status || {};
    const responses = Array.isArray(trip.responses) ? trip.responses : [];

    const members = (activeGroupData.memberIds || []).map(uid => {
        const response = responses.find(item => item.userId === uid);

        const name = uid === currentUser.uid
            ? t("you")
            : t("memberLabel", { id: uid.slice(0, 5) });

        const status = response?.status || "pending";
        const statusLabel = statusLabels[status] || statusLabels.pending || status;

        return `
            <div class="member-row">
                <span>${safe(name)}</span>
                <span class="status ${safe(status)}">${safe(statusLabel)}</span>
            </div>
        `;
    }).join("");

    return `
        <article class="trip-card">
            <div class="trip-head">
                <h3>${safe(trip.name || "")}</h3>
                <span>${safe(trip.departureTime || "")}</span>
            </div>

            <p class="muted" style="font-size:11px;margin-top:5px">
                ${t("todaysResponses")}
            </p>

            ${members}

            <div class="answer-actions">
                <button class="dataAnswer" data-trip="${safe(trip.id)}" data-answer="yes">${t("Yes")}</button>
                <button class="dataAnswer" data-trip="${safe(trip.id)}" data-answer="no">${t("No")}</button>
                <button class="dataAnswer" data-trip="${safe(trip.id)}" data-answer="unsure">${t("Unsure")}</button>
            </div>
        </article>
    `;
}

async function answer(tripId, status) {
    try {
        if (!currentUser || !activeGroupId) {
            throw new Error(t("authRequired"));
        }

        const allowedStatuses = ["yes", "no", "unsure"];

        if (!allowedStatuses.includes(status)) {
            throw new Error(t("responseError"));
        }

        const date = todayKey();
        const responseId = `${tripId}_${currentUser.uid}_${date}`;

        await setDoc(doc(db, "responses", responseId), {
            tripId,
            groupId: activeGroupId,
            userId: currentUser.uid,
            date,
            status,
            updatedAt: serverTimestamp()
        });

        toast(t("responseSaved"));

    } catch (error) {
        toast(`${t("responseError")} ${friendlyError(error)}`);
    }
}

$("tripForm")?.addEventListener("submit", async event => {
    event.preventDefault();
    showError("tripError", "");

    try {
        if (!currentUser || !activeGroupId) {
            throw new Error(t("authRequired"));
        }

        const name = $("tripName")?.value.trim();
        const departureTime = $("tripTime")?.value;
        const reminderTime = $("reminderTime")?.value;
        const deadlineTime = $("deadlineTime")?.value;

        if (!name || !departureTime || !reminderTime || !deadlineTime) {
            throw new Error(t("requiredFields"));
        }

        const days = [
            ...document.querySelectorAll('input[name="day"]:checked')
        ].map(input => Number(input.value));

        if (!days.length) {
            throw new Error(t("selectOneDay"));
        }

        await addDoc(collection(db, "trips"), {
            groupId: activeGroupId,
            name,
            departureTime,
            activeDays: days,
            reminderTime,
            deadlineTime,
            createdBy: currentUser.uid,
            createdAt: serverTimestamp()
        });

        $("tripDialog")?.close();
        $("tripForm").reset();

        toast(t("tripAdded"));

    } catch (error) {
        showError("tripError", friendlyError(error));
    }
});

$("notifyBtn")?.addEventListener("click", async () => {
    if (!("Notification" in window)) {
        toast(t("notifUnsupported"));
        return;
    }

    try {
        const permission = await Notification.requestPermission();

        toast(
            permission === "granted"
                ? t("notifGranted")
                : t("notifDenied")
        );
    } catch (error) {
        toast(friendlyError(error));
    }
});

if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
        navigator.serviceWorker.register("./sw.js")
            .catch(error => console.error(
                "Service worker registration failed:",
                error
            ));
    });
}

applyAppLanguage(currentLang);
