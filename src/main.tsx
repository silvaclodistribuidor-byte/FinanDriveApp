import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// Pega o elemento root do HTML
const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Elemento root não encontrado no index.html');
}

const root = ReactDOM.createRoot(rootElement);

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Registro do Service Worker para PWA
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/service-worker.js')
      .then((registration) => {
        console.log('Service Worker registrado com sucesso:', registration.scope);
      })
      .catch((error) => {
        console.error('Falha ao registrar o Service Worker:', error);
      });
  });
}
