import React, { useState, useEffect, useMemo } from 'react';
import { 
  Wallet, 
  TrendingUp, 
  Calendar, 
  Settings, 
  Plus, 
  ArrowUpCircle, 
  ArrowDownCircle, 
  Target,
  AlertCircle
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell 
} from 'recharts';

// Importing types and components. 
// Assuming standard structure based on your project description.
// If your paths are slightly different, please adjust the imports.
import { Transaction, Bill, ExpenseType } from './types';
import SettingsModal from './components/SettingsModal';
import AddTransactionModal from './components/AddTransactionModal';
import BillsModal from './components/BillsModal';
import { 
  getTransactions, 
  getBills, 
  getUserSettings 
} from './services/firestoreService';

function App() {
  // --- Global State ---
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [bills, setBills] = useState<Bill[]>([]);
  const [monthlySalaryGoal, setMonthlySalaryGoal] = useState<number>(0);
  const [monthlyWorkingDays, setMonthlyWorkingDays] = useState<number>(26);
  const [loading, setLoading] = useState(true);

  // --- Modals State ---
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isAddTxOpen, setIsAddTxOpen] = useState(false);
  const [isBillsOpen, setIsBillsOpen] = useState(false);

  // --- Initial Data Load ---
  useEffect(() => {
    // In a real scenario, these would be async calls to Firestore
    // For this generated file, we initialize with empty or fetch if services exist
    const fetchData = async () => {
      try {
        setLoading(true);
        // Mocking fetch or using imported services
        // const txs = await getTransactions();
        // const userBills = await getBills();
        // const settings = await getUserSettings();
        // setTransactions(txs);
        // setBills(userBills);
        // setMonthlySalaryGoal(settings.salaryGoal);
        // setMonthlyWorkingDays(settings.workingDays);
        
        // Simulating data for the example to work immediately if services aren't connected
        // Remove this in production and use real service calls
        setMonthlySalaryGoal(prev => prev || 3000); 
        setMonthlyWorkingDays(prev => prev || 26);
      } catch (error) {
        console.error("Error loading data", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // --- Helpers ---
  const formatCurrency = (value: number, compact = false) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      notation: compact ? 'compact' : 'standard',
    }).format(value);
  };

  const todayStr = new Date().toISOString().split('T')[0];

  // --- Calculations ---

  // 1. Metas Diárias (CORRIGIDO)
  const goals = useMemo(() => {
    const now = new Date();
    const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    
    const billsThisMonth = bills.filter(b => b.dueDate.startsWith(currentMonthStr));
    const totalMonthlyBills = billsThisMonth.reduce((acc, b) => acc + b.amount, 0);
    
    // Evita divisão por zero
    const workingDays = monthlyWorkingDays > 0 ? monthlyWorkingDays : 26;
    
    // Quanto eu preciso pagar de conta por dia
    const dailyBillsGoal = totalMonthlyBills / workingDays;
    
    // Quanto eu quero faturar por dia (Bruto Alvo)
    const dailySalaryGoal = monthlySalaryGoal / workingDays;

    // --- CORREÇÃO DE LÓGICA ---
    // Antes: dailyTotalGoal = dailyBillsGoal + dailySalaryGoal; (Somava contas + salário)
    // Agora: dailyTotalGoal = dailySalaryGoal;
    // O valor que o motorista gira (salary) já deve englobar o pagamento das contas.
    // Ex: Meta 500. Se contas são 300, ele gira 500, paga 300, sobra 200.
    const dailyTotalGoal = dailySalaryGoal;

    return {
      dailyBillsGoal,
      dailySalaryGoal,
      dailyTotalGoal,
      hasGoals: dailySalaryGoal > 0, // Se tem meta de salário, tem meta total
      hasBills: totalMonthlyBills > 0
    };
  }, [bills, monthlySalaryGoal, monthlyWorkingDays]);

  // 2. Saldo Hoje
  const netToday = useMemo(() => {
    const todayTxs = transactions.filter(t => t.date.startsWith(todayStr));
    const income = todayTxs.filter(t => t.type === 'income').reduce((acc, t) => acc + t.amount, 0);
    const expense = todayTxs.filter(t => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0);
    return income - expense;
  }, [transactions, todayStr]);

  // 3. Saldo Mês
  const netMonth = useMemo(() => {
    const now = new Date();
    const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const monthTxs = transactions.filter(t => t.date.startsWith(currentMonthStr));
    const income = monthTxs.filter(t => t.type === 'income').reduce((acc, t) => acc + t.amount, 0);
    const expense = monthTxs.filter(t => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0);
    return income - expense;
  }, [transactions]);

  // 4. Lógica de Status da Meta
  // Define a cor e a mensagem baseada no progresso em relação a Contas e Meta Total
  let goalExplanation = "Defina suas metas em Configurações.";
  let progressColor = "bg-gray-200";
  let progressPercentage = 0;
  let statusTextColor = "text-gray-500";

  if (goals.hasGoals) {
    // Porcentagem visual baseada na meta total (salary)
    progressPercentage = Math.min((netToday / goals.dailyTotalGoal) * 100, 100);

    if (netToday < goals.dailyBillsGoal) {
      // Zona de Perigo: Ainda não pagou o custo fixo do dia
      goalExplanation = "Você ainda não cobriu o valor das contas de hoje.";
      progressColor = "bg-red-500";
      statusTextColor = "text-red-600";
    } else if (netToday < goals.dailyTotalGoal) {
      // Zona de Lucro: Contas pagas, agora é buscar o salário
      goalExplanation = "Contas do dia cobertas. Busque a meta de salário!";
      progressColor = "bg-yellow-500";
      statusTextColor = "text-yellow-600";
    } else {
      // Zona de Sucesso: Meta batida
      goalExplanation = "Meta total do dia batida! Ótimo trabalho.";
      progressColor = "bg-green-500";
      statusTextColor = "text-green-600";
    }
  }

  // --- Handlers ---
  const handleAddTransaction = (newTx: Transaction) => {
    setTransactions(prev => [newTx, ...prev]);
    setIsAddTxOpen(false);
  };

  const handleUpdateSettings = (salary: number, days: number) => {
    setMonthlySalaryGoal(salary);
    setMonthlyWorkingDays(days);
    setIsSettingsOpen(false);
  };

  const handleUpdateBills = (newBills: Bill[]) => {
    setBills(newBills);
  };

  return (
    <div className="min-h-screen bg-gray-50 font-sans pb-24">
      {/* Header */}
      <header className="bg-blue-600 text-white p-4 pb-12 rounded-b-[2rem] shadow-lg sticky top-0 z-10">
        <div className="flex justify-between items-center mb-4 max-w-4xl mx-auto">
          <div className="flex items-center gap-2">
            <div className="bg-white/20 p-2 rounded-lg">
              <Wallet size={24} className="text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold">FinanDrive</h1>
              <p className="text-blue-100 text-xs">Gestão para Motoristas</p>
            </div>
          </div>
          <div className="flex gap-2">
             <button 
              onClick={() => setIsBillsOpen(true)}
              className="p-2 bg-white/20 rounded-full hover:bg-white/30 transition"
            >
              <Calendar size={20} />
            </button>
            <button 
              onClick={() => setIsSettingsOpen(true)}
              className="p-2 bg-white/20 rounded-full hover:bg-white/30 transition"
            >
              <Settings size={20} />
            </button>
          </div>
        </div>

        {/* Main Status Card - Floating overlap handled by margins later */}
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-blue-100 mb-1">Resultado Líquido (Hoje)</p>
          <h2 className="text-4xl font-extrabold">{formatCurrency(netToday)}</h2>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 -mt-8 space-y-6">
        
        {/* Info Cards Grid */}
        <div className="grid grid-cols-2 gap-4">
          {/* Card 1: Meta Turno */}
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between">
            <div className="flex items-start justify-between mb-2">
              <div className="p-2 bg-blue-50 rounded-lg">
                <Target size={18} className="text-blue-600" />
              </div>
              <span className="text-xs font-semibold text-gray-400 uppercase">Meta Turno</span>
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-800">
                {formatCurrency(goals.dailyTotalGoal, true)}
              </p>
              <div className="text-[10px] text-gray-400 flex flex-col mt-1">
                 <span>Contas: {formatCurrency(goals.dailyBillsGoal, true)}</span>
                 <span>Salário: {formatCurrency(goals.dailySalaryGoal, true)}</span>
              </div>
            </div>
          </div>

          {/* Card 2: Acumulado Mês */}
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between">
            <div className="flex items-start justify-between mb-2">
              <div className="p-2 bg-green-50 rounded-lg">
                <TrendingUp size={18} className="text-green-600" />
              </div>
              <span className="text-xs font-semibold text-gray-400 uppercase">Mês Atual</span>
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-800">
                {formatCurrency(netMonth, true)}
              </p>
               <p className="text-[10px] text-gray-400 mt-1">
                Líquido acumulado
              </p>
            </div>
          </div>
        </div>

        {/* Progress Section */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
          <div className="flex justify-between items-end mb-2">
             <h3 className="font-semibold text-gray-700">Progresso do Dia</h3>
             <span className={`text-xs font-bold px-2 py-1 rounded-full bg-gray-100 ${statusTextColor}`}>
               {Math.round(progressPercentage)}%
             </span>
          </div>
          
          <div className="w-full bg-gray-100 rounded-full h-3 mb-3 overflow-hidden">
            <div 
              className={`h-3 rounded-full transition-all duration-500 ${progressColor}`} 
              style={{ width: `${progressPercentage}%` }}
            ></div>
          </div>

          <div className="flex items-start gap-2 bg-gray-50 p-3 rounded-xl">
             <AlertCircle size={16} className={`mt-0.5 flex-shrink-0 ${statusTextColor}`} />
             <p className="text-xs text-gray-600 leading-tight">
               {goalExplanation}
             </p>
          </div>
        </div>

        {/* Recent Transactions */}
        <div>
          <h3 className="text-lg font-bold text-gray-800 mb-3 px-1">Últimos Lançamentos</h3>
          <div className="space-y-3">
            {transactions.length === 0 ? (
              <div className="text-center py-8 text-gray-400 bg-white rounded-2xl border border-dashed border-gray-200">
                <p>Nenhuma movimentação hoje</p>
              </div>
            ) : (
              transactions.slice(0, 5).map((tx) => (
                <div key={tx.id} className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`p-3 rounded-full ${tx.type === 'income' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                      {tx.type === 'income' ? <ArrowUpCircle size={20} /> : <ArrowDownCircle size={20} />}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-800">{tx.description || (tx.type === 'income' ? 'Corrida' : 'Gasto')}</p>
                      <p className="text-xs text-gray-400">{new Date(tx.date).toLocaleDateString('pt-BR')}</p>
                    </div>
                  </div>
                  <span className={`font-bold ${tx.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                    {tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount)}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </main>

      {/* Floating Action Button */}
      <button 
        onClick={() => setIsAddTxOpen(true)}
        className="fixed bottom-6 right-6 bg-blue-600 text-white p-4 rounded-full shadow-xl hover:bg-blue-700 active:scale-95 transition-all z-50 flex items-center justify-center"
      >
        <Plus size={28} />
      </button>

      {/* Modals */}
      <SettingsModal 
        isOpen={isSettingsOpen} 
        onClose={() => setIsSettingsOpen(false)}
        currentSalaryGoal={monthlySalaryGoal}
        currentWorkingDays={monthlyWorkingDays}
        onSave={handleUpdateSettings}
      />

      <AddTransactionModal
        isOpen={isAddTxOpen}
        onClose={() => setIsAddTxOpen(false)}
        onSave={handleAddTransaction}
      />

      <BillsModal
        isOpen={isBillsOpen}
        onClose={() => setIsBillsOpen(false)}
        bills={bills}
        onUpdateBills={handleUpdateBills}
      />

    </div>
  );
}

export default App;
