import React, { useState } from 'react';
import { X, Check, DollarSign, Calendar, Tag, FileText, Clock, Gauge } from 'lucide-react';
import { TransactionType, Bill } from '../types';

interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: any) => void;
  onSaveBill: (data: Omit<Bill, 'id'>) => void;
  categories: string[];
}

export const TransactionModal: React.FC<TransactionModalProps> = ({ isOpen, onClose, onSave, onSaveBill, categories }) => {
  const [type, setType] = useState<TransactionType>(TransactionType.EXPENSE);
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [category, setCategory] = useState('');
  
  // Specific fields
  const [mileage, setMileage] = useState('');
  const [duration, setDuration] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [isBill, setIsBill] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(amount.replace(',', '.'));
    
    if (isNaN(numAmount) || !description) return;

    if (type === TransactionType.EXPENSE && isBill) {
      onSaveBill({
        amount: numAmount,
        description,
        dueDate: dueDate || date,
        isPaid: false,
        category: category || 'Outros'
      });
    } else {
      onSave({
        type,
        amount: numAmount,
        description,
        date,
        category: type === TransactionType.EXPENSE ? (category || 'Outros') : undefined,
        mileage: type === TransactionType.INCOME ? parseFloat(mileage) || 0 : undefined,
        durationHours: type === TransactionType.INCOME ? parseFloat(duration) || 0 : undefined,
      });
    }
    
    // Reset
    setAmount('');
    setDescription('');
    setMileage('');
    setDuration('');
    setCategory('');
    setIsBill(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="bg-slate-50 p-4 border-b border-slate-100 flex justify-between items-center">
          <h2 className="font-bold text-lg text-slate-800">Nova Transação</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="flex bg-slate-100 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => { setType(TransactionType.INCOME); setIsBill(false); }}
              className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${type === TransactionType.INCOME ? 'bg-emerald-500 text-white shadow-md' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Entrada
            </button>
            <button
              type="button"
              onClick={() => setType(TransactionType.EXPENSE)}
              className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${type === TransactionType.EXPENSE ? 'bg-rose-500 text-white shadow-md' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Saída
            </button>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Valor (R$)</label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                type="number"
                step="0.01"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-lg text-slate-800"
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
                className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-slate-800"
                placeholder={type === TransactionType.INCOME ? "Ex: Uber Segunda Manhã" : "Ex: Abastecimento"}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Data</label>
              <div className="relative">
                <input
                  type="date"
                  value={date}
                  onChange={e => setDate(e.target.value)}
                  className="w-full px-3 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-slate-800 text-sm"
                  required
                />
              </div>
            </div>
            
            {type === TransactionType.EXPENSE && (
               <div className="flex items-center pt-5">
                 <input 
                    type="checkbox" 
                    id="isBill" 
                    checked={isBill} 
                    onChange={e => setIsBill(e.target.checked)}
                    className="w-5 h-5 text-indigo-600 rounded focus:ring-indigo-500 border-gray-300"
                 />
                 <label htmlFor="isBill" className="ml-2 block text-sm text-slate-700 font-medium">
                   É uma conta?
                 </label>
               </div>
            )}
          </div>

          {isBill && type === TransactionType.EXPENSE && (
             <div>
                <label className="block text-xs font-bold text-rose-500 uppercase mb-1">Data de Vencimento</label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={e => setDueDate(e.target.value)}
                  className="w-full px-3 py-3 bg-rose-50 border border-rose-200 rounded-xl focus:ring-2 focus:ring-rose-500 outline-none text-slate-800 text-sm"
                  required
                />
             </div>
          )}

          {type === TransactionType.EXPENSE && (
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Categoria</label>
              <div className="relative">
                <Tag className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <select
                  value={category}
                  onChange={e => setCategory(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-slate-800 appearance-none"
                >
                  <option value="" disabled>Selecione...</option>
                  {categories.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>
          )}

          {type === TransactionType.INCOME && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">KM Rodados</label>
                <div className="relative">
                  <Gauge className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <input
                    type="number"
                    value={mileage}
                    onChange={e => setMileage(e.target.value)}
                    className="w-full pl-9 pr-2 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-slate-800"
                    placeholder="0"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Horas Trab.</label>
                <div className="relative">
                  <Clock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <input
                    type="number"
                    step="0.5"
                    value={duration}
                    onChange={e => setDuration(e.target.value)}
                    className="w-full pl-9 pr-2 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-slate-800"
                    placeholder="0"
                  />
                </div>
              </div>
            </div>
          )}

          <button
            type="submit"
            className={`w-full py-3.5 rounded-xl text-white font-bold text-lg shadow-lg flex justify-center items-center gap-2 mt-4 transition-transform active:scale-95 ${type === TransactionType.INCOME ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-200' : 'bg-rose-600 hover:bg-rose-500 shadow-rose-200'}`}
          >
            <Check size={20} /> Salvar Lançamento
          </button>
        </form>
      </div>
    </div>
  );
};
