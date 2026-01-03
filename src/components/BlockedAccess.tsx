import React from 'react';

interface BlockedAccessProps {
  email?: string | null;
  onLogout?: () => void;
}

export const BlockedAccess: React.FC<BlockedAccessProps> = ({ email, onLogout }) => {
  return (
    <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-slate-800/80 border border-slate-700 rounded-2xl p-6 shadow-xl text-center space-y-4">
        <h1 className="text-xl font-bold">Acesso negado</h1>
        <p className="text-sm text-slate-300">
          Seu acesso foi bloqueado. Entre em contato com o suporte para mais informações.
        </p>
        {email && (
          <div className="text-xs text-slate-400">
            Conta: <span className="font-semibold text-slate-200">{email}</span>
          </div>
        )}
        {onLogout && (
          <button
            type="button"
            onClick={onLogout}
            className="w-full rounded-xl border border-slate-500 text-slate-200 py-2 text-sm font-semibold hover:bg-slate-700/60 transition-colors"
          >
            Sair
          </button>
        )}
      </div>
    </div>
  );
};
