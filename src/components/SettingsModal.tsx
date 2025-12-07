import React, { useState, useEffect } from 'react';
import { X, Calendar as CalendarIcon, CheckCircle2, RefreshCcw, Tags, Plus, Pencil, Trash2, Save } from 'lucide-react';
import { Category } from '../types';
import { formatCurrencyInputMask, parseCurrencyInputToNumber, formatCurrencyPtBr } from '../utils/currency';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  workDays: number[]; // Generic preference (0-6)
  onSaveWorkDays: (days: number[]) => void;
  plannedWorkDates: string[]; // Specific dates YYYY-MM-DD
  onSavePlannedDates: (dates: string[]) => void;
  monthlySalaryGoal: number;
  onSaveSalaryGoal: (val: number) => void;
  currentMonthKey: string;
  openingBalanceInput: string;
  openingBalanceValue: number;
  onChangeOpeningBalance: (value: string) => void;
  onBlurOpeningBalance: () => void;
  categories: Category[];
  onAddCategory: (name: string, type: 'income' | 'expense' | 'both') => void;
  onEditCategory: (id: string, name: string, type: 'income' | 'expense' | 'both') => void;
  onDeleteCategory: (id: string) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ 
  isOpen, 
  onClose, 
  workDays, 
  onSaveWorkDays,
  plannedWorkDates,
  onSavePlannedDates,
  monthlySalaryGoal,
  onSaveSalaryGoal,
  currentMonthKey,
  openingBalanceInput,
  openingBalanceValue,
  onChangeOpeningBalance,
  onBlurOpeningBalance,
  categories,
  onAddCategory,
  onEditCategory,
  onDeleteCategory
}) => {
  const [activeTab, setActiveTab] = useState<'goals' | 'categories'>('goals');
  const [localSalary, setLocalSalary] = useState('');
  const [currentMonth, setCurrentMonth] = useState(new Date());

  // Category Edit State
  const [editingCatId, setEditingCatId] = useState<string | null>(null);
  const [catName, setCatName] = useState('');
  const [catType, setCatType] = useState<'income' | 'expense' | 'both'>('expense');
  const [isAddingNew, setIsAddingNew] = useState(false);

  useEffect(() => {
    setLocalSalary(formatCurrencyPtBr(monthlySalaryGoal || 0));
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
    const numeric = parseCurrencyInputToNumber(localSalary);
    setLocalSalary(formatCurrencyPtBr(numeric));
    onSaveSalaryGoal(numeric);
  };

  const handleSalaryChange = (value: string) => {
    setLocalSalary(formatCurrencyInputMask(value));
  };

  // Category Handlers
  const startEdit = (cat: Category) => {
    setEditingCatId(cat.id);
    setCatName(cat.name);
    setCatType(cat.type);
    setIsAddingNew(false);
  };

  const startAdd = () => {
    setEditingCatId(null);
    setCatName('');
    setCatType('expense');
    setIsAddingNew(true);
  };

  const saveCategory = () => {
    if (!catName.trim()) return;
    
    if (isAddingNew) {
      onAddCategory(catName, catType);
    } else if (editingCatId) {
      onEditCategory(editingCatId, catName, catType);
    }
    
    setEditingCatId(null);
    setIsAddingNew(false);
    setCatName('');
  };

  const cancelEdit = () => {
    setEditingCatId(null);
    setIsAddingNew(false);
    setCatName('');
  };

  const deleteCat = (id: string) => {
    if (window.confirm('Tem certeza que deseja excluir esta categoria?')) {
      onDeleteCategory(id);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl p-6 my-8 flex flex-col max-h-[90vh]">
        <div className="flex justify-between items-center mb-4 border-b border-slate-100 pb-4 shrink-0">
          <h3 className="font-bold text-xl text-slate-800">Configurações</h3>
          <button onClick={() => { handleSalaryBlur(); onClose(); }}><X size={24} className="text-slate-400 hover:text-slate-600" /></button>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 shrink-0">
          <button 
            onClick={() => setActiveTab('goals')} 
            className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'goals' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
          >
            Metas & Planejamento
          </button>
          <button 
            onClick={() => setActiveTab('categories')} 
            className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'categories' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
          >
            Categorias
          </button>
        </div>

        <div className="overflow-y-auto pr-2">
          {activeTab === 'goals' ? (
            <div className="space-y-6">
              {/* Opening Balance */}
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Saldo inicial do mês</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">R$</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={openingBalanceInput}
                    onChange={e => onChangeOpeningBalance(e.target.value)}
                    onBlur={onBlurOpeningBalance}
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-lg font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none"
                    placeholder="0,00"
                  />
                </div>
                <p className="text-xs text-slate-500 mt-2">Valor salvo para {currentMonthKey}. Somado ao lucro do mês para cobrir contas pendentes, sem reduzir a meta salarial.</p>
                <p className="text-[11px] text-slate-400 mt-1">Atual: {formatCurrencyPtBr(openingBalanceValue || 0)}</p>
              </div>

              <hr className="border-slate-100" />

              {/* Salary Goal */}
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Meta de Salário Bruto (Mês)</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">R$</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={localSalary}
                    onChange={e => handleSalaryChange(e.target.value)}
                    onBlur={handleSalaryBlur}
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-lg font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none"
                    placeholder="0,00"
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
                    
                    {/* Empty slots */}
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
            </div>
          ) : (
            /* Categories Tab */
            <div className="space-y-4">
              <div className="flex justify-between items-center mb-4">
                <h4 className="text-sm font-bold text-slate-700">Gerenciar Categorias</h4>
                {!isAddingNew && !editingCatId && (
                  <button onClick={startAdd} className="text-xs bg-indigo-600 text-white px-3 py-2 rounded-lg flex items-center gap-1 hover:bg-indigo-700">
                    <Plus size={14} /> Nova Categoria
                  </button>
                )}
              </div>

              {(isAddingNew || editingCatId) && (
                 <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 mb-4 animate-in fade-in slide-in-from-top-2">
                    <h5 className="text-xs font-bold text-slate-500 uppercase mb-2">{isAddingNew ? 'Nova Categoria' : 'Editar Categoria'}</h5>
                    <div className="space-y-3">
                      <input 
                        type="text" 
                        value={catName} 
                        onChange={e => setCatName(e.target.value)} 
                        placeholder="Nome da Categoria"
                        className="w-full p-2 border rounded-lg text-sm"
                        autoFocus
                      />
                      <div className="flex gap-2">
                         <button type="button" onClick={() => setCatType('expense')} className={`flex-1 py-1.5 text-xs font-bold rounded border ${catType === 'expense' ? 'bg-rose-100 border-rose-200 text-rose-700' : 'bg-white border-slate-200 text-slate-500'}`}>Despesa</button>
                         <button type="button" onClick={() => setCatType('income')} className={`flex-1 py-1.5 text-xs font-bold rounded border ${catType === 'income' ? 'bg-emerald-100 border-emerald-200 text-emerald-700' : 'bg-white border-slate-200 text-slate-500'}`}>Receita</button>
                         <button type="button" onClick={() => setCatType('both')} className={`flex-1 py-1.5 text-xs font-bold rounded border ${catType === 'both' ? 'bg-slate-200 border-slate-300 text-slate-700' : 'bg-white border-slate-200 text-slate-500'}`}>Ambos</button>
                      </div>
                      <div className="flex gap-2 mt-2">
                        <button onClick={saveCategory} className="flex-1 bg-indigo-600 text-white py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1"><Save size={14} /> Salvar</button>
                        <button onClick={cancelEdit} className="flex-1 bg-white border border-slate-300 text-slate-600 py-2 rounded-lg text-xs font-bold">Cancelar</button>
                      </div>
                    </div>
                 </div>
              )}

              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {categories.map(cat => (
                  <div key={cat.id} className="flex justify-between items-center p-3 bg-white border border-slate-100 rounded-xl hover:shadow-sm transition-shadow">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${cat.type === 'expense' ? 'bg-rose-50 text-rose-500' : cat.type === 'income' ? 'bg-emerald-50 text-emerald-500' : 'bg-slate-100 text-slate-500'}`}>
                        <Tags size={16} />
                      </div>
                      <div>
                        <div className="text-sm font-bold text-slate-700">{cat.name}</div>
                        <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">{cat.type === 'both' ? 'Geral' : cat.type === 'expense' ? 'Despesa' : 'Receita'}</div>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <button onClick={() => startEdit(cat)} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg"><Pencil size={16} /></button>
                      <button onClick={() => deleteCat(cat.id)} className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg"><Trash2 size={16} /></button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        
        {activeTab === 'goals' && (
          <div className="mt-6 pt-4 border-t border-slate-100 shrink-0">
            <button onClick={() => { handleSalaryBlur(); onClose(); }} className="w-full bg-slate-900 text-white font-bold py-3 rounded-xl hover:bg-slate-800 transition-colors">
              Concluir Configuração
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
