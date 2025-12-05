// src/components/Login.tsx
import React from 'react';
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { auth } from '../firebaseConfig';

export const Login: React.FC = () => {
  const handleLogin = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      // O App.tsx escuta o onAuthStateChanged e cuida do resto
    } catch (error) {
      console.error('Erro ao fazer login com o Google:', error);
      alert('Não foi possível entrar com o Google. Tente novamente.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md text-center space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">
            FinanDrive
          </h1>
          <p className="text-slate-400 text-sm">
            Controle financeiro para motoristas de app
          </p>
        </div>

        <div className="bg-slate-800 p-8 rounded-2xl border border-slate-700 shadow-xl space-y-4">
          <button
            onClick={handleLogin}
            className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl transition-all active:scale-95 shadow-lg shadow-indigo-900/50 flex items-center justify-center gap-2"
          >
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-white/10 text-sm font-bold">
              G
            </span>
            <span>Entrar com Google</span>
          </button>

          <p className="text-xs text-slate-500 mt-2">
            Seus dados ficam salvos na nuvem, separados por motorista.
          </p>
        </div>
      </div>
    </div>
  );
};
