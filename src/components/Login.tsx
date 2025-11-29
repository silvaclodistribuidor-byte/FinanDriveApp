import React, { useState } from 'react';
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { auth } from '../services/firestoreService';
import { Car, ShieldCheck, TrendingUp, LogIn } from 'lucide-react';

export const Login: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError('');
    
    try {
      if (auth) {
        const provider = new GoogleAuthProvider();
        await signInWithPopup(auth, provider);
        // O App.tsx vai detectar a mudança de estado automaticamente
      } else {
        setError('Serviço de autenticação não disponível.');
      }
    } catch (err: any) {
      console.error(err);
      setError('Erro ao conectar com o Google. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col">
        <div className="bg-indigo-600 p-8 text-center">
          <div className="inline-flex bg-white/20 p-4 rounded-full mb-4">
            <Car size={48} className="text-white" />
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">FinanDrive</h1>
          <p className="text-indigo-100 mt-2 text-sm">Gestão Profissional para Motoristas</p>
        </div>

        <div className="p-8 space-y-6">
          <div className="space-y-4">
            <div className="flex items-center gap-3 text-slate-600">
              <div className="bg-emerald-100 p-2 rounded-lg text-emerald-600"><TrendingUp size={20} /></div>
              <p className="text-sm font-medium">Controle total dos seus ganhos</p>
            </div>
            <div className="flex items-center gap-3 text-slate-600">
              <div className="bg-blue-100 p-2 rounded-lg text-blue-600"><ShieldCheck size={20} /></div>
              <p className="text-sm font-medium">Seus dados salvos na nuvem</p>
            </div>
          </div>

          <div className="pt-4">
            <button
              onClick={handleGoogleLogin}
              disabled={loading}
              className="w-full flex items-center justify-center gap-3 bg-slate-900 hover:bg-slate-800 text-white py-4 rounded-xl font-bold transition-all active:scale-95 shadow-lg disabled:opacity-70"
            >
              {loading ? (
                <span>Carregando...</span>
              ) : (
                <>
                  <LogIn size={20} /> Entrar com Google
                </>
              )}
            </button>
            {error && <p className="text-rose-500 text-xs text-center mt-3">{error}</p>}
          </div>

          <p className="text-center text-xs text-slate-400">
            Acesso seguro e individual. Seus dados são privados.
          </p>
        </div>
      </div>
    </div>
  );
};
