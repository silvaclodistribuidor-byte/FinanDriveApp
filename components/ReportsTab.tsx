import React from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  AreaChart, Area 
} from 'recharts';
import { Transaction, TransactionType } from '../types';

interface ReportsTabProps {
  transactions: Transaction[];
  showValues: boolean;
}

export const ReportsTab: React.FC<ReportsTabProps> = ({ transactions, showValues }) => {
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

  const formatCurrency = (val: number) => 
    showValues ? `R$ ${val.toFixed(2)}` : '****';

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
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
                  formatter={(value: number) => [formatCurrency(value), '']}
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
                     return [formatCurrency(net), 'Lucro Líquido'];
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