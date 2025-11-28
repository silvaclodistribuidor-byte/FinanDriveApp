import React, { useState } from 'react';
import { Sparkles, Loader2, Lightbulb } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { Transaction } from '../types';
import { getFinancialAdvice } from '../services/geminiService';

interface AiAdvisorProps {
  transactions: Transaction[];
}

export const AiAdvisor: React.FC<AiAdvisorProps> = ({ transactions }) => {
  const [advice, setAdvice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleGetAdvice = async () => {
    setLoading(true);
    // Calc simple stats for the service
    const balance = transactions.reduce((acc, t) => acc + (t.type === 'INCOME' ? t.amount : -t.amount), 0);
    // Mock pending bills total for this specific component or pass it in. 
    // For simplicity, we assume some logic or use passed props in real app. 
    // Here we'll just pass 0 if not available, or you could enhance the Props.
    
    const result = await getFinancialAdvice(transactions, balance, 0);
    setAdvice(result);
    setLoading(false);
  };

  return (
    <div className="bg-gradient-to-br from-indigo-900 to-slate-900 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
      <div className="absolute top-0 right-0 p-4 opacity-5">
        <Sparkles size={120} />
      </div>
      
      <div className="relative z-10">
        <h3 className="text-lg font-bold flex items-center gap-2 mb-3">
          <Sparkles className="text-yellow-400" />
          IA Advisor
        </h3>
        
        {!advice && !loading && (
          <div className="text-center py-6">
            <p className="text-slate-300 text-sm mb-4">
              Receba dicas personalizadas sobre seus ganhos e gastos com nossa Inteligência Artificial.
            </p>
            <button
              onClick={handleGetAdvice}
              className="bg-white text-indigo-900 px-4 py-2 rounded-lg font-bold text-sm hover:bg-indigo-50 transition-colors shadow-lg"
            >
              Gerar Análise
            </button>
          </div>
        )}

        {loading && (
          <div className="flex flex-col items-center justify-center py-6 text-slate-300">
            <Loader2 className="animate-spin mb-2" size={32} />
            <p className="text-xs animate-pulse">Analisando seus dados...</p>
          </div>
        )}

        {advice && (
          <div className="bg-white/10 rounded-xl p-4 backdrop-blur-sm border border-white/10">
            <div className="prose prose-invert prose-sm max-w-none text-slate-100">
               <ReactMarkdown>{advice}</ReactMarkdown>
            </div>
            <button 
              onClick={() => setAdvice(null)}
              className="mt-4 text-xs text-indigo-300 hover:text-white underline"
            >
              Nova análise
            </button>
          </div>
        )}
      </div>
    </div>
  );
};