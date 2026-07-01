// Firebase Messaging Service Worker
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyBRlnxEIZd8xarQVebBBCf4QewLGaO3vqI",
  authDomain: "rifugio-23142.firebaseapp.com",
  projectId: "rifugio-23142",
  storageBucket: "rifugio-23142.firebasestorage.app",
  messagingSenderId: "955776778929",
  appId: "1:955776778929:web:83720e2a7cb58b201bd890"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const { title, body } = payload.notification;
  self.registration.showNotification(title, {
    body,
    icon: '/static/icon-192.png',
    badge: '/static/icon-192.png',
    tag: 'yan-message',
    renotify: true,
  });
});
