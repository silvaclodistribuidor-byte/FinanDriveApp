import React, { useState, useEffect } from 'react';
import { X, Check, DollarSign, Fuel } from 'lucide-react';
import { ExpenseCategory } from '../types';

interface ShiftEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  category: 'uber' | '99' | 'indrive' | 'private' | 'km' | 'expense' | null;
  onSave: (value: number, description?: string, expenseCat?: ExpenseCategory) => void;
  categories: string[];
}

export const ShiftEntryModal: React.FC<ShiftEntryModalProps> = ({ isOpen, onClose, category, onSave, categories }) => {
  const [value, setValue] = useState('');
  const [description, setDescription] = useState('');
  const [expenseType, setExpenseType] = useState<ExpenseCategory>('Combustível');

  useEffect(() => {
    if (isOpen) {
      setValue('');
      setDescription('');
      setExpenseType('Combustível');
    }
  }, [isOpen]);

  if (!isOpen || !category) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const numVal = parseFloat(value.replace(',', '.'));
    if (isNaN(numVal)) return;
    
    onSave(numVal, description, category === 'expense' ? expenseType : undefined);
    onClose();
  };

  const getTitle = () => {
    switch (category) {
      case 'uber': return 'Ganho Uber';
      case '99': return 'Ganho 99';
      case 'indrive': return 'Ganho InDrive';
      case 'private': return 'Ganho Particular';
      case 'km': return 'Adicionar KM';
      case 'expense': return 'Adicionar Gasto';
      default: return '';
    }
  };

  const getColor = () => {
    switch (category) {
      case 'uber': return 'text-slate-800';
      case '99': return 'text-yellow-600';
      case 'indrive': return 'text-green-600';
      case 'private': return 'text-indigo-600';
      case 'km': return 'text-blue-600';
      case 'expense': return 'text-rose-600';
      default: return 'text-slate-800';
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end md:items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-t-2xl md:rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden animate-in slide-in-from-bottom-10 md:zoom-in-95 duration-200">
        <div className="p-4 border-b border-slate-100 flex justify-between items-center">
          <h2 className={`font-bold text-lg ${getColor()}`}>{getTitle()}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
              {category === 'km' ? 'Quilometragem' : 'Valor'}
            </label>
            <div className="relative">
              {category !== 'km' && (
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              )}
              <input
                type="number"
                step={category === 'km' ? "1" : "0.01"}
                value={value}
                onChange={e => setValue(e.target.value)}
                className={`w-full ${category !== 'km' ? 'pl-10' : 'px-4'} pr-4 py-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-500 outline-none font-bold text-2xl text-slate-800`}
                placeholder="0"
                autoFocus
                required
              />
            </div>
          </div>

          {category === 'expense' && (
            <>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Tipo</label>
                <div className="relative">
                  <Fuel className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <select
                    value={expenseType}
                    onChange={e => setExpenseType(e.target.value as ExpenseCategory)}
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-500 outline-none text-slate-800 appearance-none"
                  >
                    {categories.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Descrição</label>
                <input
                  type="text"
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-500 outline-none text-slate-800"
                  placeholder="Detalhes (Opcional)"
                />
              </div>
            </>
          )}

          <button
            type="submit"
            className={`w-full py-4 rounded-xl text-white font-bold text-lg shadow-lg flex justify-center items-center gap-2 mt-4 active:scale-95 transition-all
              ${category === 'expense' ? 'bg-rose-600 hover:bg-rose-500' : 'bg-slate-900 hover:bg-slate-800'}
            `}
          >
            <Check size={20} /> Confirmar
          </button>
        </form>
      </div>
    </div>
  );
};