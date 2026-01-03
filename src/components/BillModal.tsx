import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { BillFormData, Category } from '../types';

interface BillModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: BillFormData) => void;
  initialData: any;
  categories: Category[];
}

export const BillModal: React.FC<BillModalProps> = ({ isOpen, onClose, onSave, initialData, categories }) => {
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [selectedCatId, setSelectedCatId] = useState('');
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrenceMonths, setRecurrenceMonths] = useState('1');

  // Filter for expense-compatible categories
  const expenseCategories = categories.filter(c => c.type === 'expense' || c.type === 'both');

  useEffect(() => {
    if (initialData) {
      setDescription(initialData.description);
      setAmount(initialData.amount);
      setDueDate(initialData.dueDate);
      setIsRecurring(false);
      setRecurrenceMonths('1');
      // Try to find category by ID, or fallback to name matching if migrated
      if (initialData.categoryId) {
        setSelectedCatId(initialData.categoryId);
      } else if (initialData.category) {
        const found = categories.find(c => c.name === initialData.category);
        if (found) setSelectedCatId(found.id);
      }
    } else {
      setDescription('');
      setAmount('');
      setDueDate('');
      setSelectedCatId('');
      setIsRecurring(false);
      setRecurrenceMonths('1');
    }
  }, [initialData, isOpen, categories]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cat = categories.find(c => c.id === selectedCatId);
    
    const monthsToCreate = initialData
      ? 1
      : Math.max(1, parseInt(recurrenceMonths, 10) || 1);

    onSave({
      description,
      amount: parseFloat(amount),
      dueDate,
      isPaid: initialData?.isPaid || false,
      categoryId: selectedCatId,
      category: cat ? cat.name : undefined,
      recurrenceMonths: isRecurring ? monthsToCreate : 1,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-bold text-lg text-slate-800">{initialData ? 'Editar Conta' : 'Nova Conta'}</h3>
          <button onClick={onClose}><X size={20} className="text-slate-400" /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Descrição</label>
            <input type="text" placeholder="Ex: Seguro do Carro" required value={description} onChange={e => setDescription(e.target.value)} className="w-full p-3 border border-slate-200 rounded-xl" />
          </div>
          <div>
             <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Valor</label>
             <input type="number" step="0.01" placeholder="0.00" required value={amount} onChange={e => setAmount(e.target.value)} className="w-full p-3 border border-slate-200 rounded-xl" />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
             <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Vencimento</label>
                <input type="date" required value={dueDate} onChange={e => setDueDate(e.target.value)} className="w-full p-3 border border-slate-200 rounded-xl" />
             </div>
             <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Categoria</label>
                <select value={selectedCatId} onChange={e => setSelectedCatId(e.target.value)} className="w-full p-3 border border-slate-200 rounded-xl bg-white">
                  <option value="">Selecione...</option>
                  {expenseCategories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
             </div>
          </div>

          {!initialData && (
            <div className="rounded-xl border border-slate-200 p-3 space-y-3">
              <label className="flex items-center gap-2 text-xs font-bold text-slate-600 uppercase">
                <input
                  type="checkbox"
                  checked={isRecurring}
                  onChange={e => setIsRecurring(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
                Conta recorrente
              </label>
              <div className="flex items-center gap-3">
                <label className="text-xs font-bold text-slate-500 uppercase">Meses</label>
                <input
                  type="number"
                  min="1"
                  max="60"
                  value={recurrenceMonths}
                  onChange={e => setRecurrenceMonths(e.target.value)}
                  disabled={!isRecurring}
                  className="w-24 p-2 border border-slate-200 rounded-lg disabled:bg-slate-100"
                />
                <span className="text-xs text-slate-400">Lançar por quantos meses</span>
              </div>
            </div>
          )}
          
          <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white p-3 rounded-xl font-bold transition-colors">Salvar</button>
        </form>
      </div>
    </div>
  );
};
