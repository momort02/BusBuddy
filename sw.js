// Service worker PWA. La réception FCM nécessite la configuration du SDK Firebase Messaging.
self.addEventListener("install",event=>{self.skipWaiting();});
self.addEventListener("activate",event=>{event.waitUntil(self.clients.claim());});
self.addEventListener("fetch",event=>{
  if(event.request.method!=="GET" || new URL(event.request.url).origin!==self.location.origin)return;
  event.respondWith(fetch(event.request).catch(()=>caches.match(event.request)));
});
self.addEventListener("push",event=>{
  let data={title:"BusBuddy",body:"Une mise à jour de ton groupe est disponible."};
  try{if(event.data)data={...data,...event.data.json()};}catch{}
  event.waitUntil(self.registration.showNotification(data.title,{body:data.body,icon:"/icons/icon-192.png",badge:"/icons/icon-192.png",data:{url:data.url||"/"}}));
});
self.addEventListener("notificationclick",event=>{event.notification.close();event.waitUntil(clients.matchAll({type:"window",includeUncontrolled:true}).then(list=>{for(const c of list){if("focus"in c)return c.focus();}return clients.openWindow(event.notification.data?.url||"/");}));});
