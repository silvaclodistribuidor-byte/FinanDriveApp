import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  workDays: number[];
  onSaveWorkDays: (days: number[]) => void;
  categories: string[];
  onAddCategory: (name: string) => void;
  onEditCategory: (oldName: string, newName: string) => void;
  onDeleteCategory: (name: string) => void;

  // metas
  monthlySalaryGoal: number;
  monthlyWorkingDays: number;
  onSaveGoals: (salary: number, days: number) => void;
}

const weekDays = [
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
  const [newCategory, setNewCategory] = useState('');
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [editCategoryName, setEditCategoryName] = useState('');
  const [localMonthlySalaryGoal, setLocalMonthlySalaryGoal] = useState<string>('');
  const [localMonthlyWorkingDays, setLocalMonthlyWorkingDays] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      setLocalWorkDays(workDays);
      setLocalMonthlySalaryGoal(monthlySalaryGoal ? String(monthlySalaryGoal) : '');
      setLocalMonthlyWorkingDays(monthlyWorkingDays ? String(monthlyWorkingDays) : '');
    }
  }, [isOpen, workDays, monthlySalaryGoal, monthlyWorkingDays]);

  if (!isOpen) return null;

  const toggleWorkDay = (dayId: number) => {
    setLocalWorkDays(prev =>
      prev.includes(dayId) ? prev.filter(d => d !== dayId) : [...prev, dayId]
    );
  };

  const handleSaveWorkDaysClick = () => {
    if (localWorkDays.length === 0) {
      alert('Selecione pelo menos um dia de trabalho.');
      return;
    }
    onSaveWorkDays(localWorkDays);
    alert('Dias de trabalho salvos com sucesso!');
  };

  const handleAddCategoryClick = () => {
    const trimmed = newCategory.trim();
    if (!trimmed) return;
    onAddCategory(trimmed);
    setNewCategory('');
  };

  const handleEditCategoryClick = (category: string) => {
    setEditingCategory(category);
    setEditCategoryName(category);
  };

  const handleSaveCategoryEdit = () => {
    if (!editingCategory) return;
    const trimmed = editCategoryName.trim();
    if (!trimmed) return;
    onEditCategory(editingCategory, trimmed);
    setEditingCategory(null);
    setEditCategoryName('');
  };

  const handleDeleteCategoryClick = (category: string) => {
    if (window.confirm(`Tem certeza que deseja excluir a categoria "${category}"?`)) {
      onDeleteCategory(category);
    }
  };

  const handleSaveGoalsClick = () => {
    const salaryNumber = parseFloat(localMonthlySalaryGoal.replace(',', '.'));
    const daysNumber = parseInt(localMonthlyWorkingDays, 10);

    if (isNaN(salaryNumber) || salaryNumber <= 0) {
      alert('Informe uma meta mensal válida (maior que zero).');
      return;
    }

    if (isNaN(daysNumber) || daysNumber <= 0) {
      alert('Informe um número de dias trabalhados no mês válido (maior que zero).');
      return;
    }

    onSaveGoals(salaryNumber, daysNumber);
    alert('Metas salvas com sucesso!');
  };

  return (
    <div className="modal-backdrop settings-modal-backdrop">
      <div className="modal settings-modal">
        <div className="settings-modal-header">
          <h2>Configurações</h2>
          <button onClick={onClose} className="icon-button">
            <X size={20} />
          </button>
        </div>

        <div className="settings-modal-content">
          <section className="settings-section">
            <h3>Dias de Trabalho na Semana</h3>
            <p>Selecione os dias em que você normalmente trabalha.</p>
            <div className="weekdays-grid">
              {weekDays.map(day => (
                <button
                  key={day.id}
                  className={
                    localWorkDays.includes(day.id)
                      ? 'weekday-button active'
                      : 'weekday-button'
                  }
                  onClick={() => toggleWorkDay(day.id)}
                >
                  {day.label}
                </button>
              ))}
            </div>
            <button
              onClick={handleSaveWorkDaysClick}
              className="btn-primary settings-save-button"
            >
              Salvar Dias de Trabalho
            </button>
          </section>

          <section className="settings-section">
            <h3>Categorias de Despesas</h3>
            <p>Gerencie as categorias utilizadas no seu dia a dia.</p>

            <div className="categories-list">
              {categories.map(category => (
                <div key={category} className="category-item">
                  {editingCategory === category ? (
                    <>
                      <input
                        type="text"
                        value={editCategoryName}
                        onChange={(e) => setEditCategoryName(e.target.value)}
                      />
                      <button
                        className="btn-primary btn-small"
                        onClick={handleSaveCategoryEdit}
                      >
                        Salvar
                      </button>
                      <button
                        className="btn-secondary btn-small"
                        onClick={() => {
                          setEditingCategory(null);
                          setEditCategoryName('');
                        }}
                      >
                        Cancelar
                      </button>
                    </>
                  ) : (
                    <>
                      <span>{category}</span>
                      <div className="category-actions">
                        <button
                          className="btn-secondary btn-small"
                          onClick={() => handleEditCategoryClick(category)}
                        >
                          Editar
                        </button>
                        <button
                          className="btn-danger btn-small"
                          onClick={() => handleDeleteCategoryClick(category)}
                        >
                          Excluir
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>

            <div className="add-category-row">
              <input
                type="text"
                placeholder="Nova categoria"
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
              />
              <button
                className="btn-primary"
                onClick={handleAddCategoryClick}
              >
                Adicionar
              </button>
            </div>
          </section>

          <section className="settings-section">
            <h3>Metas de Faturamento</h3>
            <p>Defina sua meta mensal e os dias trabalhados para calcular a meta diária.</p>
            <div className="goals-grid">
              <div className="goal-field">
                <label>Meta Mensal de Faturamento (R$)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={localMonthlySalaryGoal}
                  onChange={(e) => setLocalMonthlySalaryGoal(e.target.value)}
                  placeholder="Ex: 8000"
                />
              </div>
              <div className="goal-field">
                <label>Dias Trabalhados no Mês</label>
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={localMonthlyWorkingDays}
                  onChange={(e) => setLocalMonthlyWorkingDays(e.target.value)}
                  placeholder="Ex: 26"
                />
              </div>
            </div>
            <button
              onClick={handleSaveGoalsClick}
              className="btn-primary settings-save-button"
            >
              Salvar Metas
            </button>
          </section>
        </div>
      </div>
    </div>
  );
};
