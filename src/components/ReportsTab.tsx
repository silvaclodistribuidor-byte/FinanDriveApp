import React, { useMemo, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area
} from 'recharts';
import { Clock, Route, Filter, Target } from 'lucide-react';
import { Transaction, TransactionType, Bill } from '../types';
import { formatCurrencyPtBr } from '../utils/currency';

interface ReportsTabProps {
  transactions: Transaction[];
  bills: Bill[];
  showValues: boolean;
}

const parseDateFromInput = (dateStr: string) => {
  if (!dateStr) return new Date();
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d);
};

const formatCurrency = (val: number, showValues: boolean) =>
  showValues ? formatCurrencyPtBr(val) : '****';

const defaultRange = 'month' as const;

type RangeType = 'today' | 'week' | 'month' | 'custom';

export const ReportsTab: React.FC<ReportsTabProps> = ({ transactions, bills, showValues }) => {
  const [shiftRange, setShiftRange] = useState<RangeType>(defaultRange);
  const [shiftStart, setShiftStart] = useState('');
  const [shiftEnd, setShiftEnd] = useState('');

  const getRangeDates = (): { start: Date | null; end: Date } => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const end = new Date(today);
    end.setHours(23, 59, 59, 999);

    if (shiftRange === 'today') return { start: today, end };
    if (shiftRange === 'week') {
      const d = new Date(today);
      const day = d.getDay();
      const diff = d.getDate() - day + (day === 0 ? -6 : 1);
      d.setDate(diff);
      d.setHours(0, 0, 0, 0);
      return { start: d, end };
    }
    if (shiftRange === 'month') {
      const d = new Date(today.getFullYear(), today.getMonth(), 1);
      d.setHours(0, 0, 0, 0);
      return { start: d, end };
    }
    if (shiftRange === 'custom') {
      if (!shiftStart || !shiftEnd) return { start: null, end };
      const start = parseDateFromInput(shiftStart);
      const customEnd = parseDateFromInput(shiftEnd);
      customEnd.setHours(23, 59, 59, 999);
      start.setHours(0, 0, 0, 0);
      return { start, end: customEnd };
    }
    return { start: null, end };
  };

  // Aggregate data by day (last 7 days active)
  const getLast7DaysData = () => {
    const dataMap = new Map<string, { date: string, income: number, expense: number }>();
    
    // Sort transactions by date asc
    const sorted = [...transactions].sort((a, b) => a.date.localeCompare(b.date));
    
    sorted.forEach(t => {
      const existing = dataMap.get(t.date) || { date: t.date.substring(5), income: 0, expense: 0 };
      if (t.type === TransactionType.INCOME) existing.income += t.amount;
      else existing.expense += t.amount;
      dataMap.set(t.date, existing);
    });

    return Array.from(dataMap.values()).slice(-7); 
  };

  const chartData = getLast7DaysData();

  const shiftSummaries = useMemo(() => {
    const { start, end } = getRangeDates();

    const incomes = transactions.filter(t => {
      const hasShiftFields = t.durationHours !== undefined || t.mileage !== undefined || (t.description || '').toLowerCase().includes('turno');
      if (!hasShiftFields || t.type !== TransactionType.INCOME) return false;
      if (!start) return true;
      const d = parseDateFromInput(t.date);
      return d >= start && d <= end;
    });

    return incomes.map(income => {
      const relatedExpenses = transactions.filter(t =>
        t.type === TransactionType.EXPENSE &&
        t.date === income.date &&
        ((t.description || '').toLowerCase().includes('turno') || income.id === t.id)
      );

      const expenseSum = relatedExpenses.reduce((acc, curr) => acc + curr.amount, 0);
      const net = income.amount - expenseSum;
      const km = income.mileage || 0;
      const hours = income.durationHours || 0;

      return {
        id: income.id,
        date: income.date,
        gross: income.amount,
        net,
        km,
        hours,
        rsKm: km > 0 ? net / km : 0,
        rsHour: hours > 0 ? net / hours : 0,
      };
    }).sort((a, b) => b.date.localeCompare(a.date));
  }, [transactions, shiftRange, shiftStart, shiftEnd]);

  const shiftTotals = useMemo(() => {
    const totalKm = shiftSummaries.reduce((acc, s) => acc + s.km, 0);
    const totalHours = shiftSummaries.reduce((acc, s) => acc + s.hours, 0);
    const totalNet = shiftSummaries.reduce((acc, s) => acc + s.net, 0);

    return {
      totalKm,
      totalHours,
      totalNet,
      rsPerKm: totalKm > 0 ? totalNet / totalKm : 0,
      rsPerHour: totalHours > 0 ? totalNet / totalHours : 0,
    };
  }, [shiftSummaries]);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-slate-800">Relatório de Turnos</h3>
            <div className="flex bg-slate-100 p-1 rounded-xl overflow-x-auto max-w-full text-xs font-semibold">
              {(['today', 'week', 'month', 'custom'] as RangeType[]).map(range => (
                <button
                  key={range}
                  onClick={() => setShiftRange(range)}
                  className={`px-3 py-1 rounded-lg transition-all whitespace-nowrap ${shiftRange === range ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  {range === 'today' && 'Hoje'}
                  {range === 'week' && 'Semana'}
                  {range === 'month' && 'Mês'}
                  {range === 'custom' && 'Período'}
                </button>
              ))}
            </div>
          </div>

          {shiftRange === 'custom' && (
            <div className="flex items-center gap-2 bg-slate-50 p-3 rounded-xl border border-slate-200">
              <input type="date" value={shiftStart} onChange={e => setShiftStart(e.target.value)} className="px-2 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500 w-full" />
              <span className="text-slate-400"><Filter size={16} /></span>
              <input type="date" value={shiftEnd} onChange={e => setShiftEnd(e.target.value)} className="px-2 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500 w-full" />
            </div>
          )}

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-3">
              <div className="flex items-center gap-2 text-xs font-bold text-indigo-600 uppercase"><Target size={14} /> R$/km</div>
              <div className="text-lg md:text-2xl font-bold text-indigo-700">{formatCurrency(shiftTotals.rsPerKm, showValues)}</div>
              <p className="text-[11px] text-indigo-500 mt-1">Baseado no lucro líquido do período.</p>
            </div>
            <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3">
              <div className="flex items-center gap-2 text-xs font-bold text-emerald-600 uppercase"><Clock size={14} /> R$/h</div>
              <div className="text-lg md:text-2xl font-bold text-emerald-700">{formatCurrency(shiftTotals.rsPerHour, showValues)}</div>
              <p className="text-[11px] text-emerald-500 mt-1">Lucro líquido dividido pelas horas.</p>
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-700 uppercase"><Clock size={14} /> Horas Líquidas</div>
              <div className="text-lg md:text-2xl font-bold text-slate-800">{shiftTotals.totalHours.toFixed(2)}h</div>
              <p className="text-[11px] text-slate-500 mt-1">Soma das horas trabalhadas no período.</p>
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-700 uppercase"><Route size={14} /> Km rodados</div>
              <div className="text-lg md:text-2xl font-bold text-slate-800">{shiftTotals.totalKm.toFixed(1)} km</div>
              <p className="text-[11px] text-slate-500 mt-1">Total de km nos turnos filtrados.</p>
            </div>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
            <h4 className="font-bold text-slate-800 mb-3">Turnos detalhados</h4>
            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {shiftSummaries.length === 0 && (
                <div className="text-slate-500 text-sm flex items-center gap-2"><Filter size={14} />Nenhum turno encontrado para o filtro.</div>
              )}
              {shiftSummaries.map(shift => (
                <div key={shift.id} className="bg-white border border-slate-200 rounded-lg p-3 shadow-sm">
                  <div className="flex justify-between text-xs text-slate-500 mb-1">
                    <span>{new Date(shift.date).toLocaleDateString('pt-BR')}</span>
                    <span>{shift.hours.toFixed(2)}h • {shift.km.toFixed(1)} km</span>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm font-semibold text-slate-800">
                    <div>Bruto: {formatCurrency(shift.gross, showValues)}</div>
                    <div>Líquido: {formatCurrency(shift.net, showValues)}</div>
                    <div>R$/km: {formatCurrency(shift.rsKm, showValues)}</div>
                    <div>R$/h: {formatCurrency(shift.rsHour, showValues)}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <h3 className="font-bold text-slate-800 mb-6">Ganhos vs Despesas (Últimos dias)</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="date" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{fill: '#64748b', fontSize: 12}} 
                  dy={10}
                />
                <YAxis 
                  hide 
                />
                <Tooltip 
                  cursor={{fill: '#f8fafc'}}
                  contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}}
                  formatter={(value: number) => [formatCurrency(value, showValues), '']}
                />
                <Bar dataKey="income" name="Ganhos" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={20} />
                <Bar dataKey="expense" name="Despesas" fill="#f43f5e" radius={[4, 4, 0, 0]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <h3 className="font-bold text-slate-800 mb-6">Evolução do Lucro</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="date" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{fill: '#64748b', fontSize: 12}} 
                  dy={10}
                />
                <Tooltip 
                   contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}}
                   formatter={(value: number, name: string, props: any) => {
                     // Calculate net for tooltip
                     if (name === 'income') return undefined; // hide raw
                     const item = props.payload;
                     const net = item.income - item.expense;
                     return [formatCurrency(net, showValues), 'Lucro Líquido'];
                   }}
                />
                <Area 
                  type="monotone" 
                  dataKey="income" // We just map structure, logic is visual
                  stroke="#10b981" 
                  fillOpacity={1} 
                  fill="url(#colorProfit)" 
                  strokeWidth={3}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
      
      <div className="bg-slate-900 rounded-2xl p-6 text-white text-center">
         <h4 className="text-lg font-bold mb-2">Resumo Geral</h4>
         <p className="text-slate-400 max-w-lg mx-auto">
           A análise detalhada ajuda a identificar os dias mais lucrativos. 
           Utilize o filtro de histórico para ver dados mais antigos.
         </p>
      </div>
    </div>
  );
};
