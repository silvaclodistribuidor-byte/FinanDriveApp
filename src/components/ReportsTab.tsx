import React, { useMemo, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area
} from 'recharts';
import { Filter } from 'lucide-react';
import { Transaction, TransactionType } from '../types';
import { formatCurrencyPtBr } from '../utils/currency';

interface ReportsTabProps {
  transactions: Transaction[];
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

export const ReportsTab: React.FC<ReportsTabProps> = ({ transactions, showValues }) => {
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

  const chartData = useMemo(() => {
    const { start, end } = getRangeDates();

    const dataMap = new Map<string, { date: string; income: number; expense: number }>();
    const sorted = [...transactions].sort((a, b) => a.date.localeCompare(b.date));

    sorted.forEach(t => {
      if (shiftRange === 'custom' && !start) return;
      const d = parseDateFromInput(t.date);
      if (start && (d < start || d > end)) return;
      const existing = dataMap.get(t.date) || { date: t.date.substring(5), income: 0, expense: 0 };
      if (t.type === TransactionType.INCOME) existing.income += t.amount;
      else existing.expense += t.amount;
      dataMap.set(t.date, existing);
    });

    return Array.from(dataMap.values());
  }, [transactions, shiftRange, shiftStart, shiftEnd]);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex flex-col items-center gap-3">
        <div className="flex flex-wrap justify-center gap-2 bg-slate-100 p-1 rounded-xl text-xs font-semibold">
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

        {shiftRange === 'custom' && (
          <div className="flex flex-wrap items-center gap-2 bg-slate-50 p-3 rounded-xl border border-slate-200 w-full md:w-auto">
            <input type="date" value={shiftStart} onChange={e => setShiftStart(e.target.value)} className="px-2 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500 w-full md:w-auto" />
            <span className="text-slate-400"><Filter size={16} /></span>
            <input type="date" value={shiftEnd} onChange={e => setShiftEnd(e.target.value)} className="px-2 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500 w-full md:w-auto" />
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <h3 className="font-bold text-slate-800 mb-6">Ganhos vs Despesas</h3>
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
