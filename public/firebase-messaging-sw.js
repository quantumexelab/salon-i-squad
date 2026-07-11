/* Firebase Cloud Messaging — background push handler.
 * Kept separate from next-pwa's sw.js (scoped under FCM push scope).
 */
/* eslint-disable no-undef */
importScripts(
  "https://www.gstatic.com/firebasejs/12.15.0/firebase-app-compat.js",
  "https://www.gstatic.com/firebasejs/12.15.0/firebase-messaging-compat.js",
);

firebase.initializeApp({
  apiKey: "AIzaSyAk3oT98CuYeoead2gm4RdDTAcsfMglCeQ",
  authDomain: "salon-i-squad.firebaseapp.com",
  projectId: "salon-i-squad",
  storageBucket: "salon-i-squad.firebasestorage.app",
  messagingSenderId: "411462006326",
  appId: "1:411462006326:web:0e94dee47c445232eb8a97",
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const notification = payload.notification || {};
  const title = notification.title || "Salon I Squad";
  const options = {
    body: notification.body || "",
    icon: notification.icon || "/icons/icon-192.png",
    badge: "/icons/icon-192.png",
    data: payload.data || {},
  };

  self.registration.showNotification(title, options);
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl =
    (event.notification.data && event.notification.data.url) || "/booking";

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if ("focus" in client) {
            client.navigate(targetUrl);
            return client.focus();
          }
        }
        if (self.clients.openWindow) {
          return self.clients.openWindow(targetUrl);
        }
        return undefined;
      }),
  );
});
