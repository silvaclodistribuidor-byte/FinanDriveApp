import React, { useState, useEffect } from 'react';
import { X, Calendar as CalendarIcon, CheckCircle2, RefreshCcw } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  workDays: number[]; // Generic preference (0-6)
  onSaveWorkDays: (days: number[]) => void;
  plannedWorkDates: string[]; // Specific dates YYYY-MM-DD
  onSavePlannedDates: (dates: string[]) => void;
  monthlySalaryGoal: number;
  onSaveSalaryGoal: (val: number) => void;
  categories: string[];
  onAddCategory: (name: string) => void;
  onEditCategory: (old: string, newName: string) => void;
  onDeleteCategory: (name: string) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ 
  isOpen, 
  onClose, 
  workDays, 
  onSaveWorkDays,
  plannedWorkDates,
  onSavePlannedDates,
  monthlySalaryGoal,
  onSaveSalaryGoal
}) => {
  const [localSalary, setLocalSalary] = useState('');
  const [currentMonth, setCurrentMonth] = useState(new Date());

  useEffect(() => {
    setLocalSalary(monthlySalaryGoal.toString());
  }, [monthlySalaryGoal, isOpen]);

  if (!isOpen) return null;

  const daysOfWeek = [
    { id: 0, label: 'D' }, { id: 1, label: 'S' }, { id: 2, label: 'T' },
    { id: 3, label: 'Q' }, { id: 4, label: 'Q' }, { id: 5, label: 'S' }, { id: 6, label: 'S' }
  ];

  // Generic Preference Toggle
  const toggleGenericDay = (id: number) => {
    if (workDays.includes(id)) {
      onSaveWorkDays(workDays.filter(d => d !== id));
    } else {
      onSaveWorkDays([...workDays, id].sort());
    }
  };

  // Calendar Logic
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const days = new Date(year, month + 1, 0).getDate();
    return Array.from({ length: days }, (_, i) => {
      const d = new Date(year, month, i + 1);
      const dateStr = [
        d.getFullYear(),
        String(d.getMonth() + 1).padStart(2, '0'),
        String(d.getDate()).padStart(2, '0')
      ].join('-');
      return { date: d, dateStr, dayOfWeek: d.getDay() };
    });
  };

  const daysInCurrentMonth = getDaysInMonth(currentMonth);
  const todayStr = [
    new Date().getFullYear(),
    String(new Date().getMonth() + 1).padStart(2, '0'),
    String(new Date().getDate()).padStart(2, '0')
  ].join('-');

  const togglePlannedDate = (dateStr: string) => {
    if (plannedWorkDates.includes(dateStr)) {
      onSavePlannedDates(plannedWorkDates.filter(d => d !== dateStr));
    } else {
      onSavePlannedDates([...plannedWorkDates, dateStr].sort());
    }
  };

  const applyGenericToMonth = () => {
    const newDates = new Set(plannedWorkDates);
    // Remove all dates from this month first to avoid duplicates/stale state
    daysInCurrentMonth.forEach(d => {
      if (newDates.has(d.dateStr)) newDates.delete(d.dateStr);
    });
    
    // Add based on generic preference
    daysInCurrentMonth.forEach(d => {
      if (workDays.includes(d.dayOfWeek)) {
        newDates.add(d.dateStr);
      }
    });
    onSavePlannedDates(Array.from(newDates).sort());
  };

  const handleSalaryBlur = () => {
    const val = parseFloat(localSalary);
    if (!isNaN(val)) onSaveSalaryGoal(val);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl p-6 my-8">
        <div className="flex justify-between items-center mb-6 border-b border-slate-100 pb-4">
          <h3 className="font-bold text-xl text-slate-800">Planejamento & Metas</h3>
          <button onClick={() => { handleSalaryBlur(); onClose(); }}><X size={24} className="text-slate-400 hover:text-slate-600" /></button>
        </div>

        <div className="space-y-6">
          {/* Salary Goal */}
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">Meta de Salário Bruto (Mês)</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">R$</span>
              <input 
                type="number" 
                value={localSalary}
                onChange={e => setLocalSalary(e.target.value)}
                onBlur={handleSalaryBlur}
                className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-lg font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none"
                placeholder="0.00"
              />
            </div>
            <p className="text-xs text-slate-500 mt-2">Valor total que você deseja faturar no mês (incluindo as contas).</p>
          </div>

          <hr className="border-slate-100" />

          {/* Generic Days */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="block text-sm font-bold text-slate-700">Dias da Semana Padrão</label>
              <button onClick={applyGenericToMonth} className="text-[10px] bg-indigo-50 text-indigo-600 px-2 py-1 rounded-md font-bold flex items-center gap-1 hover:bg-indigo-100 transition-colors">
                <RefreshCcw size={10} /> Aplicar ao Mês
              </button>
            </div>
            <div className="flex justify-between gap-1 mb-2">
              {daysOfWeek.map(day => (
                <button 
                  key={day.id} 
                  onClick={() => toggleGenericDay(day.id)}
                  className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-all ${workDays.includes(day.id) ? 'bg-slate-800 text-white shadow-md' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'}`}
                >
                  {day.label}
                </button>
              ))}
            </div>
          </div>

          {/* Calendar Planner */}
          <div>
             <label className="block text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
               <CalendarIcon size={16} /> 
               Planejamento de {currentMonth.toLocaleDateString('pt-BR', { month: 'long' })}
             </label>
             
             <div className="grid grid-cols-7 gap-1">
                {['D','S','T','Q','Q','S','S'].map((d, i) => (
                  <div key={i} className="text-center text-[10px] font-bold text-slate-400 uppercase py-1">{d}</div>
                ))}
                
                {/* Empty slots for start of month */}
                {Array.from({ length: daysInCurrentMonth[0].dayOfWeek }).map((_, i) => (
                  <div key={`empty-${i}`} />
                ))}

                {daysInCurrentMonth.map(day => {
                  const isSelected = plannedWorkDates.includes(day.dateStr);
                  const isPast = day.dateStr < todayStr;
                  const isToday = day.dateStr === todayStr;

                  return (
                    <button
                      key={day.dateStr}
                      onClick={() => togglePlannedDate(day.dateStr)}
                      className={`
                        aspect-square rounded-lg flex flex-col items-center justify-center text-xs font-medium transition-all relative
                        ${isSelected 
                          ? isPast 
                            ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' // Past & Worked
                            : 'bg-indigo-600 text-white shadow-md shadow-indigo-200 scale-105' // Future Work
                          : 'bg-slate-50 text-slate-400 hover:bg-slate-100' // Off
                        }
                        ${isToday ? 'ring-2 ring-indigo-400 ring-offset-1 z-10' : ''}
                      `}
                    >
                      {day.date.getDate()}
                      {isSelected && !isPast && <div className="w-1 h-1 bg-white rounded-full mt-0.5" />}
                    </button>
                  );
                })}
             </div>
             <p className="text-xs text-slate-500 mt-2">Selecione os dias exatos que pretende trabalhar para calibrar a meta diária.</p>
          </div>
          
          <button onClick={() => { handleSalaryBlur(); onClose(); }} className="w-full bg-slate-900 text-white font-bold py-3 rounded-xl hover:bg-slate-800 transition-colors">
            Concluir Configuração
          </button>
        </div>
      </div>
    </div>
  );
};
