import React, { useState, useEffect } from 'react';
import { X, Calendar, Tag, Trash2, Plus, Target } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  workDays: number[];
  onSaveWorkDays: (days: number[]) => void;
  categories: string[];
  onAddCategory: (name: string) => void;
  onEditCategory: (oldName: string, newName: string) => void;
  onDeleteCategory: (name: string) => void;

  // NOVO
  monthlySalaryGoal: number;
  monthlyWorkingDays: number;
  onSaveGoals: (salaryGoal: number, workingDays: number) => void;
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
  isOpen,
  onClose,
  workDays,
  onSaveWorkDays,
  categories,
  onAddCategory,
  onEditCategory,
  onDeleteCategory,
  monthlySalaryGoal,
  monthlyWorkingDays,
  onSaveGoals,
}) => {
  const [localWorkDays, setLocalWorkDays] = useState<number[]>(workDays);
  const [salaryInput, setSalaryInput] = useState<string>(
    monthlySalaryGoal ? monthlySalaryGoal.toString() : ''
  );
  const [workingDaysInput, setWorkingDaysInput] = useState<string>(
    monthlyWorkingDays ? monthlyWorkingDays.toString() : '26'
  );
  const [newCategoryName, setNewCategoryName] = useState<string>('');

  useEffect(() => {
    setLocalWorkDays(workDays);
  }, [workDays]);

  useEffect(() => {
    setSalaryInput(monthlySalaryGoal ? monthlySalaryGoal.toString() : '');
  }, [monthlySalaryGoal]);

  useEffect(() => {
    setWorkingDaysInput(
      monthlyWorkingDays ? monthlyWorkingDays.toString() : '26'
    );
  }, [monthlyWorkingDays]);

  if (!isOpen) return null;

  const toggleDay = (id: number) => {
    setLocalWorkDays((prev) =>
      prev.includes(id) ? prev.filter((d) => d !== id) : [...prev, id]
    );
  };

  const handleAddCategory = () => {
    const name = newCategoryName.trim();
    if (!name) return;
    onAddCategory(name);
    setNewCategoryName('');
  };

  const handleRenameCategory = (oldName: string) => {
    const newName = window.prompt('Novo nome para a categoria:', oldName);
    if (!newName || newName.trim() === '' || newName === oldName) return;
    onEditCategory(oldName, newName.trim());
  };

  const handleSave = () => {
    const salary =
      Number(
        salaryInput.replace(/[^0-9,\\.]/g, '').replace(',', '.')
      ) || 0;
    const workingDays = parseInt(workingDaysInput, 10) || 0;

    onSaveWorkDays(localWorkDays);
    onSaveGoals(salary, workingDays > 0 ? workingDays : 26);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100 bg-slate-50">
          <div className="flex items-center gap-2">
            <Calendar className="text-indigo-500" size={20} />
            <div>
              <h2 className="font-bold text-slate-800 text-base">
                Configurações de Metas
              </h2>
              <p className="text-xs text-slate-500">
                Ajuste metas diárias, dias de trabalho e categorias de
                despesas.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-5 space-y-6 max-h-[80vh] overflow-y-auto">
          {/* Metas do mês */}
          <section>
            <h3 className="flex items-center gap-2 text-sm font-bold text-slate-700 mb-2">
              <Target size={16} className="text-indigo-500" />
              Metas do mês
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">
                  Salário desejado no mês (R$)
                </label>
                <input
                  type="number"
                  inputMode="decimal"
                  min={0}
                  value={salaryInput}
                  onChange={(e) => setSalaryInput(e.target.value)}
                  placeholder="Ex: 8000"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/70 focus:border-indigo-500 bg-slate-50"
                />
                <p className="mt-1 text-[11px] text-slate-400">
                  Usado para calcular a meta diária de salário.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">
                  Dias trabalhados no mês
                </label>
                <input
                  type="number"
                  min={1}
                  max={31}
                  value={workingDaysInput}
                  onChange={(e) => setWorkingDaysInput(e.target.value)}
                  placeholder="Ex: 26"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/70 focus:border-indigo-500 bg-slate-50"
                />
                <p className="mt-1 text-[11px] text-slate-400">
                  Se não trabalhar em algum dia, ajuste este número para
                  manter o cálculo realista.
                </p>
              </div>
            </div>
          </section>

          <hr className="border-slate-100" />

          {/* Dias padrão da semana */}
          <section>
            <h3 className="flex items-center gap-2 text-sm font-bold text-slate-700 mb-2">
              <Calendar size={16} className="text-indigo-500" />
              Dias de trabalho na semana
            </h3>
            <p className="text-[11px] text-slate-400 mb-2">
              Esses dias são usados como base caso você não informe a
              quantidade de dias trabalhados no mês.
            </p>
            <div className="grid grid-cols-7 gap-1.5">
              {WEEKDAYS.map((day) => (
                <button
                  key={day.id}
                  type="button"
                  onClick={() => toggleDay(day.id)}
                  className={`py-1.5 text-xs rounded-full border transition-all ${
                    localWorkDays.includes(day.id)
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                      : 'bg-slate-50 text-slate-400 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {day.label}
                </button>
              ))}
            </div>
          </section>

          <hr className="border-slate-100" />

          {/* Categorias */}
          <section>
            <h3 className="flex items-center gap-2 text-sm font-bold text-slate-700 mb-2">
              <Tag size={16} className="text-indigo-500" />
              Categorias de despesas
            </h3>

            <div className="flex gap-2 mb-3">
              <input
                type="text"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                placeholder="Nova categoria (ex: Estacionamento)"
                className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/70 bg-slate-50"
              />
              <button
                type="button"
                onClick={handleAddCategory}
                className="inline-flex items-center gap-1 rounded-xl bg-indigo-600 text-white px-3 py-2 text-xs font-semibold hover:bg-indigo-700 active:scale-[0.98] transition-all shadow-sm"
              >
                <Plus size={14} />
                Adicionar
              </button>
            </div>

            <div className="space-y-1 max-h-44 overflow-y-auto">
              {categories.map((cat) => (
                <div
                  key={cat}
                  className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-xs"
                >
                  <span className="flex items-center gap-2 text-slate-700">
                    <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-indigo-100 text-[10px] font-bold text-indigo-600">
                      {cat[0]?.toUpperCase()}
                    </span>
                    {cat}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleRenameCategory(cat)}
                      className="text-[10px] px-2 py-1 rounded-full border border-slate-200 text-slate-500 hover:bg-slate-100"
                    >
                      Renomear
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeleteCategory(cat)}
                      className="p-1 rounded-full text-rose-500 hover:bg-rose-50"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
              {categories.length === 0 && (
                <p className="text-[11px] text-slate-400">
                  Nenhuma categoria personalizada ainda. Adicione
                  acima para organizar melhor seus gastos.
                </p>
              )}
            </div>
          </section>
        </div>

        <div className="px-5 py-3 border-t border-slate-100 bg-slate-50">
          <button
            type="button"
            onClick={handleSave}
            className="w-full inline-flex items-center justify-center rounded-xl bg-slate-900 text-white text-sm font-semibold py-2.5 hover:bg-slate-800 active:scale-[0.98] transition-all shadow-md"
          >
            Salvar e voltar
          </button>
        </div>
      </div>
    </div>
  );
};
