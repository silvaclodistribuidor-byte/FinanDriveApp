import React, { useState } from 'react';
import { X } from 'lucide-react';
import { TransactionType, Category } from '../types';

interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: any) => void;
  onSaveBill: (data: any) => void;
  categories: Category[];
}

export const TransactionModal: React.FC<TransactionModalProps> = ({ isOpen, onClose, onSave, categories }) => {
  const [type, setType] = useState<TransactionType>(TransactionType.EXPENSE);
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [selectedCatId, setSelectedCatId] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  if (!isOpen) return null;

  // Filter categories based on transaction type
  const availableCategories = categories.filter(c => c.type === 'both' || (type === TransactionType.EXPENSE ? c.type === 'expense' : c.type === 'income'));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const cat = categories.find(c => c.id === selectedCatId);

    onSave({
      type,
      amount: parseFloat(amount),
      description,
      category: cat ? cat.name : 'Outros', // Fallback name
      categoryId: selectedCatId,
      date
    });
    onClose();
    setAmount('');
    setDescription('');
    setSelectedCatId('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
        <div className="flex justify-between items-center p-4 border-b border-slate-100">
          <h3 className="font-bold text-lg text-slate-800">Nova Transação</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div className="flex gap-2 p-1 bg-slate-100 rounded-lg">
            <button type="button" onClick={() => setType(TransactionType.EXPENSE)} className={`flex-1 py-2 text-sm font-bold rounded-md transition-all ${type === TransactionType.EXPENSE ? 'bg-white text-rose-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Despesa</button>
            <button type="button" onClick={() => setType(TransactionType.INCOME)} className={`flex-1 py-2 text-sm font-bold rounded-md transition-all ${type === TransactionType.INCOME ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Receita</button>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Valor (R$)</label>
            <input type="number" step="0.01" required value={amount} onChange={e => setAmount(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xl font-bold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500" placeholder="0,00" />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Descrição</label>
            <input type="text" required value={description} onChange={e => setDescription(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500" placeholder="Ex: Abastecimento" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Categoria</label>
              <select value={selectedCatId} onChange={e => setSelectedCatId(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500">
                <option value="">Selecione...</option>
                {availableCategories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Data</label>
              <input type="date" required value={date} onChange={e => setDate(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
          </div>
          <button type="submit" className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-colors shadow-lg shadow-indigo-200">Salvar Lançamento</button>
        </form>
      </div>
    </div>
  );
};
