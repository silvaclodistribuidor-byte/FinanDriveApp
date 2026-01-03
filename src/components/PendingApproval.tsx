import React from 'react';

interface PendingApprovalProps {
  phone?: string;
  onCancel?: () => void;
}

export const PendingApproval: React.FC<PendingApprovalProps> = ({ phone, onCancel }) => {
  return (
    <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-slate-800/80 border border-slate-700 rounded-2xl p-6 shadow-xl text-center space-y-4">
        <h1 className="text-xl font-bold">Aguardando liberação</h1>
        <p className="text-sm text-slate-300">
          Seu cadastro foi enviado para análise. Assim que for aprovado, você poderá acessar o app normalmente.
        </p>
        {phone && (
          <div className="text-xs text-slate-400">
            Telefone cadastrado: <span className="font-semibold text-slate-200">{phone}</span>
          </div>
        )}
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="w-full rounded-xl border border-slate-500 text-slate-200 py-2 text-sm font-semibold hover:bg-slate-700/60 transition-colors"
          >
            Cancelar solicitação
          </button>
        )}
      </div>
    </div>
  );
};
