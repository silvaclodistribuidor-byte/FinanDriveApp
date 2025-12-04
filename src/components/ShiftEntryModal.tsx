import React, { useState } from 'react';
import { X } from 'lucide-react';
import { ExpenseCategory, Category } from '../types';

interface ShiftEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  category: 'uber' | '99' | 'indrive' | 'private' | 'km' | 'expense' | null;
  onSave: (value: number, description?: string, expenseCategory?: ExpenseCategory) => void;
  categories: Category[];
}

export const ShiftEntryModal: React.FC<ShiftEntryModalProps> = ({ isOpen, onClose, category, onSave, categories }) => {
  const [value, setValue] = useState('');
  const [desc, setDesc] = useState('');
  // We still use the ExpenseCategory type for the ShiftState structure, but UI draws from dynamic categories
  const [expCat, setExpCat] = useState<ExpenseCategory>('outros');

  if (!isOpen || !category) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(parseFloat(value), desc, expCat);
    onClose();
    setValue('');
    setDesc('');
  };

  const getTitle = () => {
    switch(category) {
      case 'uber': return 'Ganhos Uber';
      case '99': return 'Ganhos 99Pop';
      case 'indrive': return 'Ganhos InDrive';
      case 'private': return 'Ganhos Particular';
      case 'km': return 'Adicionar KM';
      case 'expense': return 'Adicionar Despesa';
      default: return 'Lançamento';
    }
  };

  // Filter for expense categories for the dropdown
  // Note: For ShiftExpenses, we are simplifying to map dynamic categories to fixed enum for now, 
  // or we just let user pick a general type. 
  // Given the complexity of refactoring ShiftState entirely, we will keep the hardcoded simple types for Quick Shift Entry
  // but allow the user to type a description.
  // Ideally, this modal would also use dynamic categories, but "Shift Expense" is usually quick (Fuel/Food).
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl">
        <div className="flex justify-between items-center p-4 border-b border-slate-800">
          <h3 className="font-bold text-lg text-white">{getTitle()}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white"><X size={20} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">{category === 'km' ? 'Quilometragem' : 'Valor (R$)'}</label>
            <input type="number" step="0.01" required autoFocus value={value} onChange={e => setValue(e.target.value)} className="w-full p-4 bg-slate-950 border border-slate-800 rounded-xl text-2xl font-bold text-white outline-none focus:border-indigo-500" placeholder="0" />
          </div>
          
          {category === 'expense' && (
            <>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Descrição</label>
                <input type="text" required value={desc} onChange={e => setDesc(e.target.value)} className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-white outline-none focus:border-indigo-500" placeholder="Ex: Gasolina" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Tipo</label>
                <select value={expCat} onChange={e => setExpCat(e.target.value as ExpenseCategory)} className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-white outline-none focus:border-indigo-500">
                  <option value="combustivel">Combustível</option>
                  <option value="alimentacao">Alimentação</option>
                  <option value="manutencao">Manutenção</option>
                  <option value="outros">Outros</option>
                </select>
              </div>
            </>
          )}

          <button type="submit" className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl transition-colors">
            Confirmar
          </button>
        </form>
      </div>
    </div>
  );
};
