import React, { useState, useEffect } from 'react';
import { X, Calendar, Tag, Trash2, Plus, Target, DollarSign, Briefcase } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  // Dados existentes
  workDays: number[];
  onSaveWorkDays: (days: number[]) => void;
  categories: string[];
  onAddCategory: (name: string) => void;
  onEditCategory: (oldName: string, newName: string) => void;
  onDeleteCategory: (name: string) => void;
  // Novos dados de meta
  monthlySalaryGoal: number;
  monthlyWorkingDays: number;
  onSaveGoals: (salary: number, days: number) => void;
}

const WEEKDAYS = [
  { id: 0, label: 'Dom' },
  { id: 1, label: 'Seg' },
  { id: 2, label: 'Ter' },
  { id: 3, label: 'Qua' },
  { id: 4, label: 'Qui' },
  { id: 5, label: 'Sex' },
  { id: 6, label: 'Sáb' },
];

export const SettingsModal: React.FC<SettingsModalProps> = ({ 
  isOpen, onClose, 
  workDays, onSaveWorkDays, 
  categories, onAddCategory, onDeleteCategory,
  monthlySalaryGoal, monthlyWorkingDays, onSaveGoals
}) => {
  const [newCat, setNewCat] = useState('');
  
  // Estados locais para as metas
  const [salaryInput, setSalaryInput] = useState('');
  const [daysInput, setDaysInput] = useState('');

  // Atualiza inputs quando o modal abre ou props mudam
  useEffect(() => {
    if (isOpen) {
      setSalaryInput(monthlySalaryGoal ? monthlySalaryGoal.toString() : '');
      setDaysInput(monthlyWorkingDays ? monthlyWorkingDays.toString() : '');
    }
  }, [isOpen, monthlySalaryGoal, monthlyWorkingDays]);

  if (!isOpen) return null;

  const toggleDay = (day: number) => {
    if (workDays.includes(day)) {
      onSaveWorkDays(workDays.filter(d => d !== day));
    } else {
      onSaveWorkDays([...workDays, day].sort());
    }
  };

  const handleAddCat = (e: React.FormEvent) => {
    e.preventDefault();
    if(newCat) {
      onAddCategory(newCat);
      setNewCat('');
    }
  };

  const handleSaveAll = () => {
    // Converter inputs para número
    const salary = parseFloat(salaryInput.replace(',', '.')) || 0;
    const days = parseInt(daysInput) || 26; // Default seguro
    onSaveGoals(salary, days);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col">
        <div className="bg-slate-50 p-4 border-b border-slate-100 flex justify-between items-center">
          <h2 className="font-bold text-lg text-slate-800">Configurações</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-8 overflow-y-auto">
          
          {/* Seção de Metas Financeiras */}
          <section className="bg-indigo-50/50 p-4 rounded-xl border border-indigo-100">
            <h3 className="text-sm font-bold text-indigo-700 uppercase mb-4 flex items-center gap-2">
              <Target size={18} /> Definição de Metas
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                  Meta de Faturamento (Bruto)
                </label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <input 
                    type="number"
                    value={salaryInput}
                    onChange={e => setSalaryInput(e.target.value)}
                    placeholder="Ex: 3000"
                    className="w-full pl-9 pr-3 py-2.5 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-slate-800 font-bold"
                  />
                </div>
                <p className="text-[10px] text-slate-400 mt-1">Total que você quer faturar no mês (já incluindo o valor das contas).</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                  Dias Trabalhados / Mês
                </label>
                <div className="relative">
                  <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <input 
                    type="number"
                    max="31"
                    value={daysInput}
                    onChange={e => setDaysInput(e.target.value)}
                    placeholder="Ex: 26"
                    className="w-full pl-9 pr-3 py-2.5 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-slate-800 font-bold"
                  />
                </div>
                <p className="text-[10px] text-slate-400 mt-1">Usado para calcular a meta diária.</p>
              </div>
            </div>
          </section>

          <hr className="border-slate-100" />

          {/* Work Days (Apenas visual/referência por enquanto, ou para lógica futura) */}
          <section>
            <h3 className="text-sm font-bold text-slate-500 uppercase mb-3 flex items-center gap-2">
              <Calendar size={16} /> Dias da Semana (Referência)
            </h3>
            <div className="flex justify-between gap-2">
              {WEEKDAYS.map(day => (
                <button
                  key={day.id}
                  onClick={() => toggleDay(day.id)}
                  className={`flex-1 aspect-square rounded-xl text-sm font-bold transition-all ${
                    workDays.includes(day.id)
                      ? 'bg-slate-800 text-white shadow-md'
                      : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
                  }`}
                >
                  {day.label}
                </button>
              ))}
            </div>
          </section>

          <hr className="border-slate-100" />

          {/* Categories */}
          <section>
            <h3 className="text-sm font-bold text-slate-500 uppercase mb-3 flex items-center gap-2">
              <Tag size={16} /> Categorias de Gastos
            </h3>
            
            <form onSubmit={handleAddCat} className="flex gap-2 mb-4">
              <input 
                value={newCat}
                onChange={e => setNewCat(e.target.value)}
                placeholder="Nova categoria..."
                className="flex-1 px-4 py-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
              />
              <button type="submit" className="bg-indigo-600 text-white p-2 rounded-lg hover:bg-indigo-500 transition-colors">
                <Plus size={20} />
              </button>
            </form>

            <div className="flex flex-wrap gap-2">
              {categories.map(cat => (
                <div key={cat} className="group flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-full text-sm text-slate-700">
                  {cat}
                  <button 
                    onClick={() => onDeleteCategory(cat)}
                    className="text-slate-400 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          </section>
        </div>
        
        <div className="p-4 border-t border-slate-100 bg-slate-50">
           <button onClick={handleSaveAll} className="w-full py-3 rounded-xl bg-slate-900 text-white font-bold hover:bg-slate-800 transition-colors shadow-lg">
             Salvar Alterações
           </button>
        </div>
      </div>
    </div>
  );
};
