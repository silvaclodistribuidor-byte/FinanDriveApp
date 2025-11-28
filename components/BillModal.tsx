import React, { useState, useEffect } from 'react';
import { X, Check, DollarSign, FileText, Tag, CalendarClock } from 'lucide-react';
import { Bill } from '../types';

interface BillModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Omit<Bill, 'id'>) => void;
  initialData: Bill | null;
  categories: string[];
}

export const BillModal: React.FC<BillModalProps> = ({ isOpen, onClose, onSave, initialData, categories }) => {
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [category, setCategory] = useState('');

  useEffect(() => {
    if (initialData) {
      setAmount(initialData.amount.toString());
      setDescription(initialData.description);
      setDueDate(initialData.dueDate);
      setCategory(initialData.category || '');
    } else {
      setAmount('');
      setDescription('');
      setDueDate('');
      setCategory('');
    }
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(amount.replace(',', '.'));
    if (isNaN(numAmount) || !description || !dueDate) return;

    onSave({
      amount: numAmount,
      description,
      dueDate,
      category: category || 'Outros',
      isPaid: initialData ? initialData.isPaid : false,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="bg-rose-50 p-4 border-b border-rose-100 flex justify-between items-center">
          <div className="flex items-center gap-2 text-rose-600">
            <CalendarClock size={24} />
            <h2 className="font-bold text-lg">{initialData ? 'Editar Conta' : 'Nova Conta'}</h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Valor (R$)</label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                type="number"
                step="0.01"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-rose-500 outline-none font-bold text-lg text-slate-800"
                placeholder="0,00"
                autoFocus
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Descrição</label>
            <div className="relative">
              <FileText className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                type="text"
                value={description}
                onChange={e => setDescription(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-rose-500 outline-none text-slate-800"
                placeholder="Ex: Prestação do Carro"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Vencimento</label>
            <input
              type="date"
              value={dueDate}
              onChange={e => setDueDate(e.target.value)}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-rose-500 outline-none text-slate-800"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Categoria</label>
            <div className="relative">
              <Tag className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <select
                value={category}
                onChange={e => setCategory(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-rose-500 outline-none text-slate-800 appearance-none"
              >
                <option value="" disabled>Selecione...</option>
                {categories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-3.5 rounded-xl text-white font-bold text-lg shadow-lg shadow-rose-200 bg-rose-600 hover:bg-rose-500 flex justify-center items-center gap-2 mt-4 transition-transform active:scale-95"
          >
            <Check size={20} /> Salvar Conta
          </button>
        </form>
      </div>
    </div>
  );
};