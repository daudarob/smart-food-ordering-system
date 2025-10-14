import React from 'react';
import ReactDOM from 'react-dom/client';
import { Provider } from 'react-redux';
import { store } from './redux/store';
import App from './App';
import './App.css';

ReactDOM.createRoot(document.getElementById('app')!).render(
  <Provider store={store}>
    <App />
  </Provider>,
);

// Register service worker
// if ('serviceWorker' in navigator) {
//   navigator.serviceWorker.register('/serviceWorker.js')
//     .then((registration) => {
//       console.log('Service Worker registered with scope:', registration.scope);
//     })
//     .catch((error) => {
//       console.log('Service Worker registration failed:', error);
//     });
// }
