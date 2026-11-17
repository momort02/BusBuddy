const translations = {
  fr: {
    pageTitle: "BusBuddy",
    pageDesc: "Organisez vos trajets et partagez vos réponses avec vos proches.",
    brandLabel: "BusBuddy accueil",
    logout: "Déconnexion",
    heroEyebrow: "VOS TRAJETS, ENSEMBLE",
    heroTitle: "Vous prenez<br>le même bus ?",
    heroSub: "Sachez qui sera au rendez-vous, sans devoir envoyer un message à chaque fois.",
    tabLogin: "Connexion",
    tabRegister: "Créer un compte",
    emailLabel: "Adresse e-mail",
    emailPlaceholder: "vous@exemple.fr",
    passwordLabel: "Mot de passe",
    passwordPlaceholder: "6 caractères minimum",
    loginBtn: "Se connecter",
    registerBtn: "Créer mon compte",
    personalSpace: "ESPACE PERSONNEL",
    hello: "Bonjour",
    enableNotif: "Activer les notifications",
    today: "AUJOURD'HUI",
    myGroups: "Mes groupes",
    newGroupBtn: "+ Groupe",
    noGroupsTitle: "Pas encore de groupe",
    noGroupsSub: "Crée un groupe et invite tes amis avec un code.",
    joinGroupTitle: "Rejoindre un groupe",
    joinGroupSub: "Entre le code d'invitation reçu.",
    codePlaceholder: "CODE",
    joinBtn: "Rejoindre",
    newGroupEyebrow: "NOUVEAU GROUPE",
    createGroupTitle: "Créer un groupe",
    closeLabel: "Fermer",
    groupNameLabel: "Nom du groupe",
    groupNamePlaceholder: "Ex. Les bus du lycée",
    createGroupSubmit: "Créer le groupe",
    newTripEyebrow: "NOUVEAU TRAJET",
    addTripTitle: "Ajouter un trajet",
    tripNameLabel: "Nom du trajet",
    tripNamePlaceholder: "Bus du matin",
    tripTimeLabel: "Heure du départ",
    activeDaysLabel: "Jours actifs",
    reminderLabel: "Quand recevoir la question ?",
    deadlineLabel: "Heure limite de réponse",
    saveTripSubmit: "Enregistrer le trajet",
    footerBeta: "Bêta privée",
    days: ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"],
    status: { yes: "Oui", no: "Non", unsure: "Je ne sais pas", pending: "En attente" },
    answer-actions: {yes: "Oui", no: "Non", unsure: "Je ne sais pas"},
    // Messages dynamiques JS
    membersCount: "{n} membre(s)",
    groupCardMeta: "{n} membre(s) · Code {code}",
    syncError: "Erreur de synchronisation : ",
    groupCreated: "Groupe créé",
    codeNotFound: "Code introuvable.",
    groupJoined: "Groupe rejoint",
    groupNotFound: "Groupe introuvable",
    groupEyebrow: "GROUPE",
    inviteCodeLabel: "CODE D'INVITATION",
    copyBtn: "Copier",
    addTripBtn: "+ Ajouter un trajet",
    newCodeBtn: "Nouveau code",
    todaysTrips: "Trajets du jour",
    noTripsYet: "Aucun trajet pour le moment. Ajoute le premier.",
    codeCopied: "Code copié",
    errors: {
      "auth/email-already-in-use": "Cette adresse e-mail possède déjà un compte.",
      "auth/invalid-email": "Adresse e-mail invalide.",
      "auth/weak-password": "Le mot de passe doit contenir au moins 6 caractères.",
      "auth/invalid-credential": "Adresse e-mail ou mot de passe incorrect.",
      "auth/network-request-failed": "Connexion réseau impossible.",
      default: "Une erreur est survenue."
    }
  },
  en: {
    pageTitle: "BusBuddy",
    pageDesc: "Organize your trips and share your responses with your loved ones.",
    brandLabel: "BusBuddy home",
    logout: "Log out",
    heroEyebrow: "YOUR TRIPS, TOGETHER",
    heroTitle: "Taking<br>the same bus?",
    heroSub: "Know who will be there, without having to send a message every time.",
    tabLogin: "Log in",
    tabRegister: "Create an account",
    emailLabel: "Email address",
    emailPlaceholder: "you@example.com",
    passwordLabel: "Password",
    passwordPlaceholder: "6 characters minimum",
    loginBtn: "Log in",
    registerBtn: "Create my account",
    personalSpace: "PERSONAL SPACE",
    hello: "Hello",
    enableNotif: "Enable notifications",
    today: "TODAY",
    myGroups: "My groups",
    newGroupBtn: "+ Group",
    noGroupsTitle: "No groups yet",
    noGroupsSub: "Create a group and invite your friends with a code.",
    joinGroupTitle: "Join a group",
    joinGroupSub: "Enter the invite code you received.",
    codePlaceholder: "CODE",
    joinBtn: "Join",
    newGroupEyebrow: "NEW GROUP",
    createGroupTitle: "Create a group",
    closeLabel: "Close",
    groupNameLabel: "Group name",
    groupNamePlaceholder: "E.g. High school buses",
    createGroupSubmit: "Create group",
    newTripEyebrow: "NEW TRIP",
    addTripTitle: "Add a trip",
    tripNameLabel: "Trip name",
    tripNamePlaceholder: "Morning bus",
    tripTimeLabel: "Departure time",
    activeDaysLabel: "Active days",
    reminderLabel: "When to receive the question?",
    deadlineLabel: "Response deadline",
    saveTripSubmit: "Save trip",
    footerBeta: "Private beta",
    days: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
    status: { yes: "Yes", no: "No", unsure: "Not sure", pending: "Pending" },
    // Dynamic JS messages
    membersCount: "{n} member(s)",
    groupCardMeta: "{n} member(s) · Code {code}",
    syncError: "Sync error: ",
    groupCreated: "Group created",
    codeNotFound: "Code not found.",
    groupJoined: "Joined group",
    groupNotFound: "Group not found",
    groupEyebrow: "GROUP",
    inviteCodeLabel: "INVITE CODE",
    copyBtn: "Copy",
    addTripBtn: "+ Add a trip",
    newCodeBtn: "New code",
    todaysTrips: "Today's trips",
    noTripsYet: "No trips yet. Add the first one.",
    codeCopied: "Code copied",
    errors: {
      "auth/email-already-in-use": "An account already exists with this email address.",
      "auth/invalid-email": "Invalid email address.",
      "auth/weak-password": "Password must be at least 6 characters long.",
      "auth/invalid-credential": "Incorrect email address or password.",
      "auth/network-request-failed": "Network connection failed.",
      default: "An error occurred."
    }
  }
};

// Détecte la langue sauvegardée ou celle du navigateur
export let currentLang = localStorage.getItem("lang") || (navigator.language.startsWith("fr") ? "fr" : "en");

export function t(key, vars = {}) {
  let str = translations[currentLang][key] || translations.en[key] || key;
  for (const [k, v] of Object.entries(vars)) {
    str = str.replace(`{${k}}`, v);
  }
  return str;
}

export function getDict() {
  return translations[currentLang];
}

export function setLanguage(lang) {
  if (!translations[lang]) return;
  currentLang = lang;
  localStorage.setItem("lang", lang);
  document.documentElement.lang = lang;

  // Met à jour tous les textes HTML ayant data-i18n
  document.querySelectorAll("[data-i18n]").forEach(el => {
    const key = el.dataset.i18n;
    if (el.dataset.i18nHtml) el.innerHTML = t(key);
    else el.textContent = t(key);
  });

  // Met à jour les placeholders
  document.querySelectorAll("[data-i18n-placeholder]").forEach(el => {
    el.placeholder = t(el.dataset.i18nPlaceholder);
  });

  // Met à jour les aria-label
  document.querySelectorAll("[data-i18n-aria]").forEach(el => {
    el.setAttribute("aria-label", t(el.dataset.i18nAria));
  });

  // Met à jour la meta description
  const metaDesc = document.querySelector('meta[name="description"]');
  if (metaDesc) metaDesc.setAttribute("content", t("pageDesc"));
}
