import React, { useState, useEffect } from 'react';
import { X, Check, Gauge, Clock, DollarSign } from 'lucide-react';

// IMPORTANT: Use local calendar date (not UTC) to avoid saving shifts after ~21:00–22:00
// as the next day in Brazil (UTC-3) when using toISOString().
const getLocalISODate = (d: Date = new Date()) => {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

interface ShiftModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: { amount: number; description: string; date: string; mileage: number; durationHours: number }) => void;
  initialData: { amount: number; mileage: number; durationHours: number } | null;
}

export const ShiftModal: React.FC<ShiftModalProps> = ({ isOpen, onClose, onSave, initialData }) => {
  const [amount, setAmount] = useState('');
  const [mileage, setMileage] = useState('');
  const [hours, setHours] = useState('');
  
  useEffect(() => {
    if (initialData && isOpen) {
      setAmount(initialData.amount.toFixed(2));
      setMileage(initialData.mileage.toString());
      setHours(initialData.durationHours.toFixed(2));
    }
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      onSave({
        amount: parseFloat(amount),
        description: 'Turno Finalizado',
        date: getLocalISODate(),
        mileage: parseFloat(mileage),
        durationHours: parseFloat(hours)
      });
      onClose();
    } catch (err) {
      console.error('Erro ao salvar turno:', err);
      window.alert('Não foi possível salvar o turno. Se persistir, feche e abra o app novamente.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="bg-slate-50 p-4 border-b border-slate-100 flex justify-between items-center">
          <h2 className="font-bold text-lg text-slate-800">Resumo do Turno</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Total Bruto (R$)</label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                type="number"
                step="0.01"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-emerald-50 border border-emerald-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none font-bold text-xl text-emerald-700"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">KM Total</label>
              <div className="relative">
                <Gauge className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input
                  type="number"
                  value={mileage}
                  onChange={e => setMileage(e.target.value)}
                  className="w-full pl-9 pr-2 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-500 outline-none text-slate-800"
                  required
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Horas</label>
              <div className="relative">
                <Clock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input
                  type="number"
                  step="0.1"
                  value={hours}
                  onChange={e => setHours(e.target.value)}
                  className="w-full pl-9 pr-2 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-500 outline-none text-slate-800"
                  required
                />
              </div>
            </div>
          </div>

          <p className="text-xs text-slate-400 text-center pt-2">
            Ao salvar, as despesas lançadas durante o turno também serão registradas.
          </p>

          <button
            type="submit"
            className="w-full py-3.5 rounded-xl text-white font-bold text-lg shadow-lg shadow-emerald-200 bg-emerald-600 hover:bg-emerald-500 flex justify-center items-center gap-2 mt-4 active:scale-95 transition-all"
          >
            <Check size={20} /> Salvar no Histórico
          </button>
        </form>
      </div>
    </div>
  );
};
