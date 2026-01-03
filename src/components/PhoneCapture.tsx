import React, { useState } from 'react';

interface PhoneCaptureProps {
  name?: string;
  email?: string | null;
  onSave: (phoneE164: string) => Promise<void> | void;
}

const onlyDigits = (value: string) => value.replace(/\D/g, '');

const formatPhoneE164 = (raw: string) => {
  const digits = onlyDigits(raw);
  if (digits.length < 10 || digits.length > 11) return null;
  return `+55${digits}`;
};

export const PhoneCapture: React.FC<PhoneCaptureProps> = ({ name, email, onSave }) => {
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const formatted = formatPhoneE164(phone);
    if (!formatted) {
      setError('Informe DDD + número (10 ou 11 dígitos).');
      return;
    }
    try {
      setSaving(true);
      await onSave(formatted);
    } catch (err) {
      console.error('Erro ao salvar telefone:', err);
      setError('Não foi possível salvar o telefone. Tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-slate-800/80 border border-slate-700 rounded-2xl p-6 shadow-xl">
        <h1 className="text-xl font-bold mb-2">Complete seu cadastro</h1>
        <p className="text-sm text-slate-300 mb-4">
          Precisamos do seu telefone para liberar o acesso ao FinanDrive.
        </p>
        <div className="text-xs text-slate-400 mb-4 space-y-1">
          {name && <div>Nome: {name}</div>}
          {email && <div>Email: {email}</div>}
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs uppercase font-semibold text-slate-400">Telefone (DDD + número)</label>
            <input
              type="tel"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              placeholder="(11) 99999-0000"
              className="mt-2 w-full rounded-xl border border-slate-600 bg-slate-900 px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          {error && <div className="text-xs text-rose-300">{error}</div>}
          <button
            type="submit"
            disabled={saving}
            className="w-full rounded-xl bg-indigo-600 hover:bg-indigo-500 transition-colors py-2 font-semibold disabled:opacity-70"
          >
            {saving ? 'Salvando...' : 'Salvar telefone'}
          </button>
        </form>
      </div>
    </div>
  );
};
