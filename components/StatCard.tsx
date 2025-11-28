import React from 'react';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string;
  icon: LucideIcon;
  colorClass: string;
  trend?: string;
  trendUp?: boolean;
}

export const StatCard: React.FC<StatCardProps> = ({ title, value, icon: Icon, colorClass, trend, trendUp }) => {
  return (
    <div className={`${colorClass} rounded-xl p-5 text-white shadow-lg relative overflow-hidden group`}>
      <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
        <Icon size={80} />
      </div>
      <div className="relative z-10">
        <p className="text-slate-200 text-sm font-medium mb-1 flex items-center gap-1">
          <Icon size={14} /> {title}
        </p>
        <h3 className="text-3xl font-bold mb-1">{value}</h3>
        {trend && (
          <p className={`text-xs font-bold mt-1 ${trendUp ? 'text-emerald-300' : 'text-rose-300'}`}>
            {trend}
          </p>
        )}
      </div>
    </div>
  );
};