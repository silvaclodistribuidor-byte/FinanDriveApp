import React, { useState } from 'react';
import { X, Calendar, Tag, Trash2, Plus } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  workDays: number[];
  onSaveWorkDays: (days: number[]) => void;
  categories: string[];
  onAddCategory: (name: string) => void;
  onEditCategory: (oldName: string, newName: string) => void;
  onDeleteCategory: (name: string) => void;
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
  isOpen, onClose, workDays, onSaveWorkDays, 
  categories, onAddCategory, onDeleteCategory 
}) => {
  const [newCat, setNewCat] = useState('');

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
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col">
        <div className="bg-slate-50 p-4 border-b border-slate-100 flex justify-between items-center">
          <h2 className="font-bold text-lg text-slate-800">Configurações</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-6 overflow-y-auto">
          {/* Work Days */}
          <section>
            <h3 className="text-sm font-bold text-slate-500 uppercase mb-3 flex items-center gap-2">
              <Calendar size={16} /> Dias de Trabalho
            </h3>
            <p className="text-xs text-slate-400 mb-3">Usado para calcular a meta diária necessária para pagar as contas.</p>
            <div className="flex justify-between gap-2">
              {WEEKDAYS.map(day => (
                <button
                  key={day.id}
                  onClick={() => toggleDay(day.id)}
                  className={`flex-1 aspect-square rounded-xl text-sm font-bold transition-all ${
                    workDays.includes(day.id)
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200'
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
           <button onClick={onClose} className="w-full py-3 rounded-xl bg-slate-900 text-white font-bold hover:bg-slate-800 transition-colors">
             Concluir
           </button>
        </div>
      </div>
    </div>
  );
};