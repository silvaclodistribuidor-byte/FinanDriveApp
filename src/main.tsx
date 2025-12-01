// src/main.tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// Error Boundary para evitar "tela branca da morte"
class RootErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; message: string }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: unknown) {
    return {
      hasError: true,
      message: error instanceof Error ? error.message : String(error),
    };
  }

  componentDidCatch(error: unknown, info: React.ErrorInfo) {
    console.error('[FinanDrive] Erro na raiz do app:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 text-center">
            <h1 className="text-xl font-bold text-red-600 mb-2">
              Ocorreu um erro ao carregar o FinanDrive
            </h1>
            <p className="text-sm text-slate-700 mb-4">
              Tente recarregar a página. Se o problema continuar, tire um print desta tela
              e me envie:
            </p>
            <code className="block text-xs bg-slate-900 text-green-200 p-3 rounded-lg text-left overflow-x-auto">
              {this.state.message}
            </code>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  console.error('Não foi possível encontrar o elemento root para montar o app');
} else {
  const root = ReactDOM.createRoot(rootElement);

  root.render(
    <React.StrictMode>
      <RootErrorBoundary>
        <App />
      </RootErrorBoundary>
    </React.StrictMode>
  );
}

// ❌ TEMPORARIAMENTE DESLIGADO: service worker
// Se quiser reativar depois que tudo estiver 100%:
// if ('serviceWorker' in navigator) {
//   window.addEventListener('load', () => {
//     navigator.serviceWorker
//       .register('/service-worker.js')
//       .catch((error) => {
//         console.warn('Falha ao registrar o service worker:', error);
//       });
//   });
// }
