import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './i18n';

const rootElement = document.getElementById('app');
if (!rootElement) {
  throw new Error('Failed to find the root element');
}

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Register service worker
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/serviceWorker.js')
    .then((registration) => {
      console.log('Service Worker registered with scope:', registration.scope);

      // Listen for service worker updates
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // New content is available, notify user
              console.log('New content is available and will be used when all tabs for this page are closed.');
            }
          });
        }
      });
    })
    .catch((error) => {
      console.log('Service Worker registration failed:', error);
    });
}

// Monitor online/offline status
window.addEventListener('online', () => {
  console.log('App is back online');
  // Dispatch action to update offline state if needed
});

window.addEventListener('offline', () => {
  console.log('App is offline');
  // Dispatch action to update offline state if needed
});
