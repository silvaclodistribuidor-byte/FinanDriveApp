/* eslint-disable no-undef */
importScripts('https://www.gstatic.com/firebasejs/9.22.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.22.2/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyCs9k3dtWeUnpwj_mwTviGTr_K-GhtJA_A",
  authDomain: "finandriveapp.firebaseapp.com",
  projectId: "finandriveapp",
  storageBucket: "finandriveapp.appspot.com",
  messagingSenderId: "877667982188",
  appId: "1:877667982188:web:e42cb3d73ae04e53393149"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const title = payload?.notification?.title || 'FinanDrive';
  const options = {
    body: payload?.notification?.body,
    data: payload?.data || {},
    icon: '/favicon.ico',
  };
  self.registration.showNotification(title, options);
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification?.data?.url || '/?admin=1';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
      return undefined;
    })
  );
});
