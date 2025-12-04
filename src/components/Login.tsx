
import React from 'react';

export const Login: React.FC = () => {
  
  const handleLogin = async () => {
    // Mock login for demo environment
    const demoUser = { uid: "demo-user-123", email: "motorista@demo.com" };
    localStorage.setItem("finandrive_demo_user", JSON.stringify(demoUser));
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md text-center space-y-6">
        <div>
          <h1 className="text-4xl font-extrabold text-white tracking-tight mb-2">FinanDrive</h1>
          <p className="text-slate-400">Gestão inteligente para motoristas de app.</p>
        </div>
        <div className="bg-slate-800 p-8 rounded-2xl border border-slate-700 shadow-xl">
           <button 
            onClick={handleLogin}
            className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl transition-all active:scale-95 shadow-lg shadow-indigo-900/50"
           >
             Entrar Modo Demo
           </button>
           <p className="text-xs text-slate-500 mt-4">
             Ambiente de demonstração (Offline).
           </p>
        </div>
      </div>
    </div>
  );
};
