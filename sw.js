
// Service Worker PWA - BusBuddy

self.addEventListener("install", event => {
    self.skipWaiting();
});

self.addEventListener("activate", event => {
    event.waitUntil(self.clients.claim());
});

// Construire les URL en respectant le sous-dossier du projet
function appUrl(path = "./") {
    return new URL(path, self.registration.scope).href;
}

// Gestion des requêtes
self.addEventListener("fetch", event => {
    if (
        event.request.method !== "GET" ||
        new URL(event.request.url).origin !== self.location.origin
    ) {
        return;
    }

    event.respondWith(
        fetch(event.request).catch(async () => {
            const cached = await caches.match(event.request);
            if (cached) return cached;
            throw new Error("Ressource indisponible hors ligne");
        })
    );
});

// Réception des notifications
self.addEventListener("push", event => {
    let data = {
        title: "BusBuddy",
        body: "Une mise à jour de ton groupe est disponible."
    };

    try {
        if (event.data) {
            data = { ...data, ...event.data.json() };
        }
    } catch {
        // Données de notification invalides
    }

    event.waitUntil(
        self.registration.showNotification(data.title, {
            body: data.body,
            icon: appUrl("icons/icon-192.png"),
            badge: appUrl("icons/icon-192.png"),
            data: {
                url: appUrl(data.url || "./")
            }
        })
    );
});

// Clic sur une notification
self.addEventListener("notificationclick", event => {
    event.notification.close();

    const targetUrl = event.notification.data?.url || appUrl("./");

    event.waitUntil(
        self.clients.matchAll({
            type: "window",
            includeUncontrolled: true
        }).then(async windows => {
            for (const client of windows) {
                if (client.url.startsWith(self.registration.scope)) {
                    await client.focus();

                    if (client.url !== targetUrl && "navigate" in client) {
                        await client.navigate(targetUrl);
                    }

                    return;
                }
            }

            return self.clients.openWindow(targetUrl);
        })
    );
});
