
import React, { useState } from 'react';
import { X, RefreshCcw, Save } from 'lucide-react';
import { ExpenseCategory, Category } from '../types';

interface ShiftEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  category: 'uber' | '99' | 'indrive' | 'private' | 'km' | 'expense' | null;
  currentValue?: number; // Current value in the shift state for this category
  onSave: (value: number, description?: string, expenseCategory?: ExpenseCategory) => void;
  categories: Category[];
}

export const ShiftEntryModal: React.FC<ShiftEntryModalProps> = ({ isOpen, onClose, category, currentValue = 0, onSave, categories }) => {
  const [value, setValue] = useState('');
  const [desc, setDesc] = useState('');
  const [expCat, setExpCat] = useState<ExpenseCategory>('outros');
  const [isConfirming, setIsConfirming] = useState(false); // State for confirmation screen

  if (!isOpen || !category) return null;

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

  const isPlatformApp = ['uber', '99', 'indrive'].includes(category);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const numValue = parseFloat(value);
    
    if (isNaN(numValue)) return;

    // Smart Logic: If it's a platform app, has a current value, and new value is smaller than current
    if (isPlatformApp && currentValue > 0 && numValue < currentValue) {
      setIsConfirming(true);
      return;
    }

    onSave(numValue, desc, expCat);
    closeAndReset();
  };

  const handleSum = () => {
    const numValue = parseFloat(value);
    if (isNaN(numValue)) return;
    onSave(currentValue + numValue, desc, expCat);
    closeAndReset();
  };

  const handleReplace = () => {
    const numValue = parseFloat(value);
    if (isNaN(numValue)) return;
    onSave(numValue, desc, expCat);
    closeAndReset();
  };

  const closeAndReset = () => {
    onClose();
    setTimeout(() => {
      setValue('');
      setDesc('');
      setIsConfirming(false);
    }, 100);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl">
        <div className="flex justify-between items-center p-4 border-b border-slate-800">
          <h3 className="font-bold text-lg text-white">{isConfirming ? 'Confirmar Ação' : getTitle()}</h3>
          <button onClick={closeAndReset} className="text-slate-400 hover:text-white"><X size={20} /></button>
        </div>
        
        {isConfirming ? (
          <div className="p-5 animate-in fade-in zoom-in duration-200">
            <p className="text-slate-300 text-sm mb-4 text-center">
              O valor informado (<span className="text-white font-bold">R$ {parseFloat(value).toFixed(2)}</span>) é menor que o atual (<span className="text-white font-bold">R$ {currentValue.toFixed(2)}</span>).
              <br/><br/>
              Isso é uma <strong>troca de turno / reinício do app</strong>?
            </p>
            <div className="space-y-3">
              <button onClick={handleSum} className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-colors">
                <RefreshCcw size={18} /> Sim, Somar ao Total
              </button>
              <button onClick={handleReplace} className="w-full py-3 bg-slate-700 hover:bg-slate-600 text-slate-200 font-bold rounded-xl flex items-center justify-center gap-2 transition-colors">
                <Save size={18} /> Não, Apenas Corrigir
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-4 space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                {category === 'km' ? 'Quilometragem' : 'Valor (R$)'}
                {isPlatformApp && currentValue > 0 && <span className="ml-2 text-indigo-400 font-normal normal-case">(Atual: R$ {currentValue.toFixed(2)})</span>}
              </label>
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
        )}
      </div>
    </div>
  );
};
