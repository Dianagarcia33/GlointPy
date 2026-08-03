// Service Worker para recibir notificaciones Push en segundo plano con Firebase Cloud Messaging (FCM)

importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-messaging-compat.js');

// Configuración predeterminada de Firebase FCM para Service Worker
const firebaseConfig = {
  apiKey: "AIzaSy_demo_key_gloint",
  authDomain: "gloint-app.firebaseapp.com",
  projectId: "gloint-app",
  storageBucket: "gloint-app.appspot.com",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:demoappgloint"
};

firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Notificación Push recibida en segundo plano: ', payload);
  const notificationTitle = payload.notification?.title || 'GLOINT Notificación';
  const notificationOptions = {
    body: payload.notification?.body || '',
    icon: '/favicon.ico',
    data: payload.data || {}
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
