// src/main.tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Não foi possível encontrar o elemento root para montar o app');
}

const root = ReactDOM.createRoot(rootElement);

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// (Opcional) registro do service worker, se você estiver usando PWA.
// Se não tiver o arquivo /service-worker.js no projeto, pode remover este bloco.
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/service-worker.js')
      .catch((error) => {
        console.warn('Falha ao registrar o service worker:', error);
      });
  });
}
