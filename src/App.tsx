import React, { useState, useMemo, useEffect, useRef } from "react";
import { 
  LayoutDashboard, 
  Wallet, 
  TrendingDown, 
  History,
  Menu,
  X as CloseIcon,
  Clock,
  Gauge,
  CalendarClock,
  Target,
  Play,
  Pause,
  StopCircle,
  Fuel,
  Plus,
  Trash2,
  Edit2,
  Settings,
  Eye,
  EyeOff,
  PieChart as PieChartIcon,
  Filter,
  ChevronRight,
  ArrowDownCircle,
  ArrowUpCircle
} from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { StatCard } from './components/StatCard';
import { TransactionModal } from './components/TransactionModal';
import { ShiftModal } from './components/ShiftModal';
import { ShiftEntryModal } from './components/ShiftEntryModal';
import { BillModal } from './components/BillModal';
import { SettingsModal } from './components/SettingsModal';
import { ReportsTab } from './components/ReportsTab';
import { loadAppData, saveAppData } from "./services/firestoreService";
import { Transaction, TransactionType, ExpenseCategory, Bill, ShiftState, DEFAULT_CATEGORIES } from './types';

// Force refresh ID: v2

const getTodayString = () => {
  const now = new Date();
  return [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, '0'),
    String(now.getDate()).padStart(2, '0')
  ].join('-');
};

const getFutureDateString = (daysToAdd: number) => {
  const date = new Date();
  date.setDate(date.getDate() + daysToAdd);
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0')
  ].join('-');
};

const parseDateFromInput = (dateStr: string) => {
  if (!dateStr) return new Date();
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d);
};

const formatDateBr = (dateStr: string) => {
  if (!dateStr) return '-';
  const date = parseDateFromInput(dateStr);
  return date.toLocaleDateString('pt-BR');
};

const RADIAN = Math.PI / 180;
const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);

  if (percent < 0.05) return null;

  return (
    <text
      x={x}
      y={y}
      fill="white"
      textAnchor="middle"
      dominantBaseline="central"
      className="text-xs font-bold"
    >
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
};

const INITIAL_TRANSACTIONS: Transaction[] = [
  { id: '1', type: TransactionType.INCOME, amount: 250.50, description: 'Turno Manhã (Ontem)', date: getFutureDateString(-1), mileage: 120, durationHours: 5 },
  { id: '2', type: TransactionType.EXPENSE, amount: 150.00, description: 'Tanque Cheio', category: 'Combustível', date: getFutureDateString(-1) },
  { id: '3', type: TransactionType.INCOME, amount: 320.00, description: 'Turno Hoje Cedo', date: getTodayString(), mileage: 180, durationHours: 8 },
];

const INITIAL_BILLS: Bill[] = [
  { id: '101', description: 'Manutenção Preventiva', amount: 850.00, dueDate: getFutureDateString(2), isPaid: false, category: 'Manutenção' },
  { id: '102', description: 'Seguro do Carro', amount: 210.90, dueDate: getFutureDateString(3), isPaid: false, category: 'Seguro/Impostos' },
  { id: '103', description: 'IPVA Parcela', amount: 3558.00, dueDate: getFutureDateString(4), isPaid: false, category: 'Seguro/Impostos' },
];

function App() {
  const [transactions, setTransactions] = useState<Transaction[]>(INITIAL_TRANSACTIONS);
  const [bills, setBills] = useState<Bill[]>(INITIAL_BILLS);
  const [categories, setCategories] = useState<string[]>(DEFAULT_CATEGORIES);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [workDays, setWorkDays] = useState<number[]>([1, 2, 3, 4, 5, 6]);
  const [showValues, setShowValues] = useState(true);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'bills' | 'history' | 'shift' | 'reports'>('dashboard');
  const [isTransModalOpen, setIsTransModalOpen] = useState(false);
  const [isShiftModalOpen, setIsShiftModalOpen] = useState(false);
  const [isBillModalOpen, setIsBillModalOpen] = useState(false);
  const [editingBill, setEditingBill] = useState<Bill | null>(null);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [historyRange, setHistoryRange] = useState<'today' | 'week' | 'month' | 'all' | 'custom'>('all');
  const [historyCustomStart, setHistoryCustomStart] = useState('');
  const [historyCustomEnd, setHistoryCustomEnd] = useState('');

  const [shiftState, setShiftState] = useState<ShiftState>({
    isActive: false,
    isPaused: false,
    startTime: null,
    elapsedSeconds: 0,
    earnings: { uber: 0, n99: 0, indrive: 0, private: 0 },
    expenses: 0,
    expenseList: [],
    km: 0
  });

  const [entryModalOpen, setEntryModalOpen] = useState(false);
  const [entryCategory, setEntryCategory] = useState<'uber' | '99' | 'indrive' | 'private' | 'km' | 'expense' | null>(null);

  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const data = await loadAppData();
        if (data) {
          if (data.transactions) setTransactions(data.transactions);
          if (data.bills) setBills(data.bills);
          if (data.categories) setCategories(data.categories);
        }
      } catch (error) {
        console.error("Erro ao carregar dados do Firestore:", error);
      } finally {
        setIsLoadingData(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (isLoadingData) return;
    const payload = { transactions, bills, categories };
    saveAppData(payload).catch((error) => {
      console.error("Erro ao salvar dados no Firestore:", error);
    });
  }, [transactions, bills, categories, isLoadingData]);

  useEffect(() => {
    if (shiftState.isActive && !shiftState.isPaused) {
      timerRef.current = window.setInterval(() => {
        setShiftState(prev => ({ ...prev, elapsedSeconds: prev.elapsedSeconds + 1 }));
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [shiftState.isActive, shiftState.isPaused]);

  const handleAddCategory = (name: string) => {
    if (name && !categories.includes(name)) {
      setCategories([...categories, name]);
    }
  };

  const handleEditCategory = (oldName: string, newName: string) => {
    if (!newName || categories.includes(newName)) return;
    setCategories(prev => prev.map(c => c === oldName ? newName : c));
    setTransactions(prev => prev.map(t => t.category === oldName ? { ...t, category: newName } : t));
    setBills(prev => prev.map(b => b.category === oldName ? { ...b, category: newName } : b));
  };

  const handleDeleteCategory = (name: string) => {
    setCategories(prev => prev.filter(c => c !== name));
  };

  const handleOpenEntry = (category: 'uber' | '99' | 'indrive' | 'private' | 'km' | 'expense') => {
    if (!shiftState.isActive || shiftState.isPaused) return;
    setEntryCategory(category);
    setEntryModalOpen(true);
  };

  const handleEntrySave = (value: number, description?: string, expenseCategory?: ExpenseCategory) => {
    if (!entryCategory) return;
    setShiftState(prev => {
      const newState = { ...prev };
      if (entryCategory === 'uber') newState.earnings.uber += value;
      else if (entryCategory === '99') newState.earnings.n99 += value;
      else if (entryCategory === 'indrive') newState.earnings.indrive += value;
      else if (entryCategory === 'private') newState.earnings.private += value;
      else if (entryCategory === 'km') newState.km += value;
      else if (entryCategory === 'expense') {
        newState.expenses += value;
        if (description && expenseCategory) {
          newState.expenseList = [
            ...newState.expenseList,
            { amount: value, description, category: expenseCategory, timestamp: Date.now() }
          ];
        }
      }
      return newState;
    });
  };

  const handleStartShift = () => {
    setShiftState(prev => ({ ...prev, isActive: true, isPaused: false, startTime: Date.now() }));
  };

  const handlePauseShift = () => {
    setShiftState(prev => ({ ...prev, isPaused: !prev.isPaused }));
  };

  const handleStopShift = () => {
    setShiftState(prev => ({ ...prev, isPaused: true }));
    setIsShiftModalOpen(true);
  };

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return `${h}h ${m.toString().padStart(2, '0')}m`;
  };

  const formatCurrency = (val: number, forceShow = false) => {
    if (!showValues && !forceShow) return 'R$ ****';
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  const stats = useMemo(() => {
    const totalIncome = transactions
      .filter(t => t.type === TransactionType.INCOME)
      .reduce((acc, curr) => acc + curr.amount, 0);

    const totalExpense = transactions
      .filter(t => t.type === TransactionType.EXPENSE)
      .reduce((acc, curr) => acc + curr.amount, 0);

    const incomeTransactions = transactions.filter(t => t.type === TransactionType.INCOME);
    const totalKm = incomeTransactions.reduce((acc, curr) => acc + (curr.mileage || 0), 0);
    const totalHours = incomeTransactions.reduce((acc, curr) => acc + (curr.durationHours || 0), 0);

    const earningsPerKm = totalKm > 0 ? totalIncome / totalKm : 0;
    const earningsPerHour = totalHours > 0 ? totalIncome / totalHours : 0;
    const netProfit = totalIncome - totalExpense;
    const profitMargin = totalIncome > 0 ? (netProfit / totalIncome) * 100 : 0;
    const pendingBillsTotal = bills.filter(b => !b.isPaid).reduce((acc, b) => acc + b.amount, 0);

    const sortedUnpaidBills = [...bills].filter(b => !b.isPaid).sort((a, b) => a.dueDate.localeCompare(b.dueDate));
    const todayStr = getTodayString();
    const earningsToday = transactions
      .filter(t => t.type === TransactionType.INCOME && t.date === todayStr)
      .reduce((acc, t) => acc + t.amount, 0);

    let maxRequiredDailyRate = 0;
    let goalExplanation = "";
    let cumulativeBillTotal = 0;
    const startingCash = Math.max(0, netProfit);
    const todayDate = new Date();
    todayDate.setHours(0, 0, 0, 0);

    if (sortedUnpaidBills.length === 0) {
      maxRequiredDailyRate = 0;
      goalExplanation = "Parabéns! Nenhuma conta pendente.";
    } else {
      for (const bill of sortedUnpaidBills) {
        cumulativeBillTotal += bill.amount;
        const totalNeededForThisMilestone = cumulativeBillTotal - startingCash;
        if (totalNeededForThisMilestone <= 0) continue;

        const dueDate = parseDateFromInput(bill.dueDate);
        let workingDays = 0;
        const tempDate = new Date(todayDate);

        if (dueDate < todayDate) {
          workingDays = 1;
        } else {
          const iterDate = new Date(tempDate);
          while (iterDate <= dueDate) {
            if (workDays.includes(iterDate.getDay())) {
              workingDays++;
            }
            iterDate.setDate(iterDate.getDate() + 1);
          }
        }
        if (workingDays === 0) workingDays = 1;
        const requiredRateForThisBill = totalNeededForThisMilestone / workingDays;
        if (requiredRateForThisBill > maxRequiredDailyRate) {
          maxRequiredDailyRate = requiredRateForThisBill;
          const dayLabel = workingDays === 1 ? 'dia' : 'dias';
          goalExplanation = `Foco: Quitar ${bill.description} em ${workingDays} ${dayLabel}.`;
        }
      }
    }
    if (maxRequiredDailyRate > 0 && !goalExplanation) {
      goalExplanation = "Calculada para garantir o pagamento de todas as contas.";
    }
    const dailyGoal = maxRequiredDailyRate;

    return { totalIncome, totalExpense, netProfit, profitMargin, earningsPerKm, earningsPerHour, dailyGoal, pendingBillsTotal, earningsToday, goalExplanation };
  }, [transactions, bills, workDays]);

  const filteredHistory = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    let start: Date | null = null;
    let end: Date | null = new Date(today);
    end.setHours(23, 59, 59, 999);

    if (historyRange === 'today') {
      start = today;
    } else if (historyRange === 'week') {
      const d = new Date(today);
      const day = d.getDay();
      const diff = d.getDate() - day + (day === 0 ? -6 : 1);
      d.setDate(diff);
      start = d;
    } else if (historyRange === 'month') {
      const d = new Date(today);
      d.setDate(1);
      start = d;
    } else if (historyRange === 'custom') {
      if (historyCustomStart && historyCustomEnd) {
        start = parseDateFromInput(historyCustomStart);
        end = parseDateFromInput(historyCustomEnd);
        end.setHours(23, 59, 59, 999);
      } else {
        return transactions;
      }
    } else {
      return transactions;
    }

    return transactions
      .filter(t => {
        const tDate = parseDateFromInput(t.date);
        return start ? (tDate >= start && tDate <= end!) : true;
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [transactions, historyRange, historyCustomStart, historyCustomEnd]);

  const historySummary = useMemo(() => {
    const income = filteredHistory.filter(t => t.type === TransactionType.INCOME).reduce((acc, t) => acc + t.amount, 0);
    const expense = filteredHistory.filter(t => t.type === TransactionType.EXPENSE).reduce((acc, t) => acc + t.amount, 0);
    return { income, expense, balance: income - expense };
  }, [filteredHistory]);

  const currentShiftTotal = shiftState.earnings.uber + shiftState.earnings.n99 + shiftState.earnings.indrive + shiftState.earnings.private;
  const currentShiftLiquid = currentShiftTotal - shiftState.expenses;
  const currentShiftHoursPrecise = shiftState.elapsedSeconds / 3600;
  const currentShiftRph = (currentShiftHoursPrecise > 0) ? currentShiftTotal / currentShiftHoursPrecise : 0;
  const currentShiftRpk = shiftState.km > 0 ? currentShiftTotal / shiftState.km : 0;

  const pieData = useMemo(() => [
    { name: 'Ganhos', value: stats.totalIncome, color: '#3b82f6' },
    { name: 'Despesas', value: stats.totalExpense, color: '#f43f5e' }
  ], [stats]);

  const handleAddTransaction = (data: any) => {
    const newTransaction: Transaction = { id: Math.random().toString(36).substr(2, 9), ...data };
    setTransactions(prev => [newTransaction, ...prev]);
  };

  const handleSaveShift = (data: { amount: number; description: string; date: string; mileage: number; durationHours: number }) => {
    const incomeTransaction: Transaction = {
      id: Math.random().toString(36).substr(2, 9),
      type: TransactionType.INCOME,
      category: undefined,
      ...data
    };
    const expenseTransactions: Transaction[] = shiftState.expenseList.map(exp => ({
      id: Math.random().toString(36).substr(2, 9),
      type: TransactionType.EXPENSE,
      amount: exp.amount,
      description: `${exp.description} (Turno)`,
      category: exp.category,
      date: data.date
    }));
    setTransactions(prev => [incomeTransaction, ...expenseTransactions, ...prev]);
    setShiftState({ isActive: false, isPaused: false, startTime: null, elapsedSeconds: 0, earnings: { uber: 0, n99: 0, indrive: 0, private: 0 }, expenses: 0, expenseList: [], km: 0 });
  };

  const handleSaveBill = (billData: Omit<Bill, 'id'>) => {
    if (editingBill) {
      setBills(prev => prev.map(b => (b.id === editingBill.id ? { ...b, ...billData } : b)));
      setEditingBill(null);
    } else {
      setBills(prev => [...prev, { ...billData, id: Math.random().toString(36).substr(2, 9) }]);
    }
    setIsBillModalOpen(false);
  };

  const handleEditBill = (bill: Bill) => { setEditingBill(bill); setIsBillModalOpen(true); };
  const toggleBillPaid = (id: string) => { setBills(prev => prev.map(b => (b.id === id ? { ...b, isPaid: !b.isPaid } : b))); };
  const handleDeleteBill = (id: string) => { setBills(prev => prev.filter(b => b.id !== id)); };
  const handleDeleteTransaction = (id: string) => { setTransactions(prev => prev.filter(t => t.id !== id)); };

  return (
    <div className="h-screen bg-slate-100 flex flex-col md:flex-row font-sans text-slate-900 overflow-hidden">
      {activeTab !== 'shift' && (
        <div className="md:hidden bg-slate-900 shadow-md p-4 flex justify-between items-center z-30 shrink-0">
          <div className="flex items-center justify-center w-full relative">
            <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="absolute left-0 text-slate-300">
              {mobileMenuOpen ? <CloseIcon /> : <Menu />}
            </button>
            <span className="font-bold text-lg text-white tracking-tight">FinanDrive</span>
            <button onClick={() => setShowValues(!showValues)} className="absolute right-0 text-slate-400">
              {showValues ? <Eye size={22} /> : <EyeOff size={22} />}
            </button>
          </div>
        </div>
      )}

      <aside className={`fixed inset-y-0 left-0 z-40 w-64 bg-slate-900 text-slate-300 transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0 shrink-0 ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} ${activeTab === 'shift' ? 'md:w-20 lg:w-64' : ''}`}>
        <div className="p-6 hidden md:flex justify-center items-center border-b border-slate-800 h-20">
          <span className={`font-extrabold text-2xl tracking-tight text-white ${activeTab === 'shift' ? 'md:hidden lg:block' : ''}`}>FinanDrive</span>
          {activeTab === 'shift' && <span className="hidden md:block lg:hidden font-bold text-white text-xl">FD</span>}
        </div>
        <nav className="p-4 space-y-2 mt-4 flex flex-col h-[calc(100%-6rem)]">
          <button onClick={() => { setActiveTab('dashboard'); setMobileMenuOpen(false); }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium ${activeTab === 'dashboard' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/20' : 'hover:bg-slate-800 hover:text-white'}`}>
            <LayoutDashboard size={20} /><span className={`${activeTab === 'shift' ? 'md:hidden lg:inline' : ''}`}>Visão Geral</span>
          </button>
          <button onClick={() => { setActiveTab('shift'); setMobileMenuOpen(false); }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium ${activeTab === 'shift' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/20' : 'hover:bg-slate-800 hover:text-white'}`}>
            <Play size={20} /><span className={`${activeTab === 'shift' ? 'md:hidden lg:inline' : ''}`}>Turno Atual</span>
          </button>
          <button onClick={() => { setActiveTab('reports'); setMobileMenuOpen(false); }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium ${activeTab === 'reports' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/20' : 'hover:bg-slate-800 hover:text-white'}`}>
            <PieChartIcon size={20} /><span className={`${activeTab === 'shift' ? 'md:hidden lg:inline' : ''}`}>Relatórios</span>
          </button>
          <button onClick={() => { setActiveTab('bills'); setMobileMenuOpen(false); }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium ${activeTab === 'bills' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/20' : 'hover:bg-slate-800 hover:text-white'}`}>
            <CalendarClock size={20} /><span className={`${activeTab === 'shift' ? 'md:hidden lg:inline' : ''}`}>Contas</span>
          </button>
          <button onClick={() => { setActiveTab('history'); setMobileMenuOpen(false); }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium ${activeTab === 'history' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/20' : 'hover:bg-slate-800 hover:text-white'}`}>
            <History size={20} /><span className={`${activeTab === 'shift' ? 'md:hidden lg:inline' : ''}`}>Histórico</span>
          </button>
          <div className="mt-auto">
            <button onClick={() => { setIsSettingsModalOpen(true); setMobileMenuOpen(false); }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium hover:bg-slate-800 hover:text-white text-slate-300`}>
              <Settings size={20} /><span className={`${activeTab === 'shift' ? 'md:hidden lg:inline' : ''}`}>Configurações</span>
            </button>
          </div>
        </nav>
      </aside>

      <main className={`flex-1 overflow-y-auto h-full ${activeTab === 'shift' ? 'bg-slate-950' : 'p-4 md:p-8'}`}>
        {activeTab !== 'shift' && (
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
            <div className="flex items-center gap-4">
              <div>
                <h1 className="text-2xl font-bold text-slate-800">
                  {activeTab === 'dashboard' ? 'Painel de Controle' : activeTab === 'reports' ? 'Relatórios de Ganhos' : activeTab === 'bills' ? 'Contas & Planejamento' : 'Histórico Completo'}
                </h1>
                <p className="text-slate-500 text-sm flex items-center gap-1">
                  {activeTab === 'dashboard' && stats.pendingBillsTotal > 0 ? (
                    <span className="text-rose-500 font-medium">Você tem {formatCurrency(stats.pendingBillsTotal)} em contas pendentes.</span>
                  ) : (
                    <span>Gestão profissional para motoristas.</span>
                  )}
                </p>
              </div>
              <button onClick={() => setShowValues(!showValues)} className="hidden md:flex p-2 text-slate-400 hover:text-indigo-600 bg-white hover:bg-slate-50 rounded-lg border border-slate-200 transition-colors" title={showValues ? 'Ocultar Valores' : 'Mostrar Valores'}>
                {showValues ? <Eye size={20} /> : <EyeOff size={20} />}
              </button>
            </div>
            <div className="flex flex-wrap gap-2 w-full md:w-auto">
              <button onClick={() => setIsTransModalOpen(true)} className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-white text-slate-700 border border-slate-200 px-4 py-2.5 rounded-xl hover:bg-slate-50 transition-all font-medium text-sm">
                <TrendingDown size={16} className="text-rose-500" />Novo Lançamento
              </button>
              <button onClick={() => { setActiveTab('shift'); handleStartShift(); }} className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-slate-900 text-white px-5 py-2.5 rounded-xl hover:bg-slate-800 transition-all shadow-lg shadow-slate-300 active:scale-95 font-medium">
                <Play size={18} />Iniciar Turno
              </button>
            </div>
          </div>
        )}

        {activeTab === 'shift' && (
          <div className="h-full flex flex-col p-3 md:p-6 max-w-7xl mx-auto overflow-hidden">
            <div className="flex justify-between items-center mb-3 shrink-0">
              <div className="flex items-center gap-3">
                <button onClick={() => setMobileMenuOpen(true)} className="md:hidden text-slate-400 p-2 bg-slate-900 rounded-lg"><Menu size={24} /></button>
                <div>
                  <div className="text-slate-400 text-[10px] uppercase tracking-widest font-bold mb-0.5">Status</div>
                  <div className={`flex items-center gap-2 text-sm md:text-base font-bold ${shiftState.isActive ? shiftState.isPaused ? 'text-yellow-400' : 'text-emerald-400 animate-pulse' : 'text-rose-400'}`}>
                    <div className={`w-2 h-2 rounded-full ${shiftState.isActive ? shiftState.isPaused ? 'bg-yellow-400' : 'bg-emerald-400' : 'bg-rose-400'}`}></div>
                    {shiftState.isActive ? shiftState.isPaused ? 'PAUSADO' : 'ONLINE' : 'OFFLINE'}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-4 text-right">
                <button onClick={() => setShowValues(!showValues)} className="text-slate-500 hover:text-slate-300">{showValues ? <Eye size={20} /> : <EyeOff size={20} />}</button>
                <div>
                  <div className="text-slate-400 text-[10px] uppercase tracking-widest font-bold mb-0.5">Hoje</div>
                  <div className="text-white text-sm font-medium">{new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}</div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3 shrink-0">
              <div className="bg-slate-900/80 rounded-xl p-3 border border-slate-800 shadow-lg col-span-2 flex flex-col justify-center items-center">
                <div className="text-slate-500 text-[10px] font-bold uppercase tracking-wider mb-1 flex items-center gap-2"><Clock size={10} /> Tempo</div>
                <div className="text-3xl md:text-4xl font-mono font-bold text-white tracking-tighter">
                  {formatTime(shiftState.elapsedSeconds).split(' ')[0]}
                  <span className="text-base md:text-xl text-slate-500 ml-1">{formatTime(shiftState.elapsedSeconds).split(' ').slice(1).join(' ')}</span>
                </div>
              </div>
              <div className="bg-gradient-to-br from-emerald-900 to-slate-900 rounded-xl p-3 border border-emerald-800/30 shadow-lg col-span-2 flex flex-col justify-center items-center relative overflow-hidden">
                <div className="text-emerald-400/80 text-[10px] font-bold uppercase tracking-wider mb-1 flex items-center gap-2"><Wallet size={10} /> Líquido</div>
                <div className="text-3xl md:text-4xl font-bold text-emerald-400 tracking-tight">{formatCurrency(currentShiftLiquid)}</div>
              </div>
            </div>

            <div className="flex-1 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2 mb-2 overflow-y-auto content-start">
              <button onClick={() => handleOpenEntry('uber')} disabled={!shiftState.isActive || shiftState.isPaused} className="bg-black hover:bg-slate-900 border border-slate-800 rounded-xl p-3 h-20 flex flex-col justify-between transition-all active:scale-95 disabled:opacity-40">
                <div className="flex justify-between w-full items-start"><div className="bg-slate-800 p-1.5 rounded-lg text-white font-bold text-xs">U</div><div className="text-slate-400 text-[10px] uppercase font-bold">Uber</div></div>
                <div className="text-white font-bold text-lg text-right">{formatCurrency(shiftState.earnings.uber)}</div>
              </button>
              <button onClick={() => handleOpenEntry('99')} disabled={!shiftState.isActive || shiftState.isPaused} className="bg-yellow-400 hover:bg-yellow-300 border border-yellow-500 rounded-xl p-3 h-20 flex flex-col justify-between transition-all active:scale-95 disabled:opacity-40">
                <div className="flex justify-between w-full items-start"><div className="bg-black/10 p-1.5 rounded-lg text-black font-bold text-xs">99</div><div className="text-black/60 text-[10px] uppercase font-bold">99Pop</div></div>
                <div className="text-black font-bold text-lg text-right">{formatCurrency(shiftState.earnings.n99)}</div>
              </button>
              <button onClick={() => handleOpenEntry('indrive')} disabled={!shiftState.isActive || shiftState.isPaused} className="bg-green-600 hover:bg-green-500 border border-green-500 rounded-xl p-3 h-20 flex flex-col justify-between transition-all active:scale-95 disabled:opacity-40">
                <div className="flex justify-between w-full items-start"><div className="bg-white/20 p-1.5 rounded-lg text-white font-bold text-xs">In</div><div className="text-green-100 text-[10px] uppercase font-bold">InDrive</div></div>
                <div className="text-white font-bold text-lg text-right">{formatCurrency(shiftState.earnings.indrive)}</div>
              </button>
              <button onClick={() => handleOpenEntry('private')} disabled={!shiftState.isActive || shiftState.isPaused} className="bg-slate-700 hover:bg-slate-600 border border-slate-600 rounded-xl p-3 h-20 flex flex-col justify-between transition-all active:scale-95 disabled:opacity-40">
                <div className="flex justify-between w-full items-start"><div className="bg-white/10 p-1.5 rounded-lg text-white"><Wallet size={14} /></div><div className="text-slate-300 text-[10px] uppercase font-bold">Partic.</div></div>
                <div className="text-white font-bold text-lg text-right">{formatCurrency(shiftState.earnings.private)}</div>
              </button>
              <button onClick={() => handleOpenEntry('km')} disabled={!shiftState.isActive || shiftState.isPaused} className="bg-blue-600 hover:bg-blue-500 border border-blue-500 rounded-xl p-3 h-20 flex flex-col justify-between transition-all active:scale-95 disabled:opacity-40">
                <div className="flex justify-between w-full items-start"><div className="bg-white/20 p-1.5 rounded-lg text-white"><Gauge size={14} /></div><div className="text-blue-100 text-[10px] uppercase font-bold">KM</div></div>
                <div className="text-white font-bold text-lg text-right">{shiftState.km.toFixed(1)}</div>
              </button>
              <button onClick={() => handleOpenEntry('expense')} disabled={!shiftState.isActive || shiftState.isPaused} className="bg-rose-600 hover:bg-rose-500 border border-rose-500 rounded-xl p-3 h-20 flex flex-col justify-between transition-all active:scale-95 disabled:opacity-40">
                <div className="flex justify-between w-full items-start"><div className="bg-white/20 p-1.5 rounded-lg text-white"><Fuel size={14} /></div><div className="text-rose-100 text-[10px] uppercase font-bold">Gasto</div></div>
                <div className="text-white font-bold text-lg text-right">{formatCurrency(shiftState.expenses)}</div>
              </button>
            </div>

            <div className="grid grid-cols-3 gap-2 mb-3 shrink-0">
              <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-800 flex flex-col items-center justify-center">
                <div className="text-slate-400 text-xs font-medium uppercase tracking-wide mb-1">R$ / Hora</div>
                <div className="text-xl md:text-2xl font-bold text-white">{formatCurrency(currentShiftRph)}</div>
              </div>
              <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-800 flex flex-col items-center justify-center">
                <div className="text-slate-400 text-xs font-medium uppercase tracking-wide mb-1">R$ / KM</div>
                <div className="text-xl md:text-2xl font-bold text-white">{formatCurrency(currentShiftRpk)}</div>
              </div>
              <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-800 flex flex-col items-center justify-center">
                <div className="text-slate-400 text-xs font-medium uppercase tracking-wide mb-1">Bruto</div>
                <div className="text-xl md:text-2xl font-bold text-blue-300">{formatCurrency(currentShiftTotal)}</div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 shrink-0 mt-auto pb-4">
              {!shiftState.isActive ? (
                <button onClick={handleStartShift} className="col-span-2 bg-indigo-600 hover:bg-indigo-500 text-white h-16 rounded-xl font-bold text-xl shadow-lg shadow-indigo-900/50 flex items-center justify-center gap-3 transition-all active:scale-[0.98] border border-indigo-500">
                  <Play size={24} fill="currentColor" />INICIAR TURNO
                </button>
              ) : (
                <>
                  <button onClick={handlePauseShift} className={`${shiftState.isPaused ? 'bg-emerald-600 hover:bg-emerald-500 border-emerald-500' : 'bg-slate-800 hover:bg-slate-700 border-slate-700'} text-white h-14 rounded-xl font-bold text-lg flex items-center justify-center gap-2 transition-all active:scale-[0.98] border shadow-lg`}>
                    {shiftState.isPaused ? <Play size={20} fill="currentColor" /> : <Pause size={20} fill="currentColor" />}
                    {shiftState.isPaused ? 'RETOMAR' : 'PAUSAR'}
                  </button>
                  <button onClick={handleStopShift} className="bg-rose-900/80 hover:bg-rose-900 text-rose-200 border border-rose-800 h-14 rounded-xl font-bold text-lg shadow-lg flex items-center justify-center gap-2 transition-all active:scale-[0.98]">
                    <StopCircle size={20} /> ENCERRAR
                  </button>
                </>
              )}
            </div>
          </div>
        )}

        {activeTab === 'dashboard' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4">
              <div className="bg-gradient-to-br from-indigo-600 to-blue-700 rounded-xl p-5 text-white shadow-lg relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity"><Target size={80} /></div>
                <div className="relative z-10">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-indigo-100 text-sm font-medium mb-1 flex items-center gap-1"><Target size={14} /> Meta Diária (Real)</p>
                      <h3 className="text-3xl font-bold mb-1">{formatCurrency(stats.dailyGoal)}</h3>
                    </div>
                    <button onClick={() => setIsSettingsModalOpen(true)} className="p-2 bg-white/10 hover:bg-white/20 rounded-lg text-white transition-colors z-20 backdrop-blur-sm" title="Configurar Dias de Trabalho"><Settings size={20} /></button>
                  </div>
                  <p className="text-xs text-indigo-200 mt-1 opacity-90 leading-tight">{stats.dailyGoal === 0 ? 'Parabéns! Seu caixa cobre suas contas futuras.' : stats.goalExplanation || 'Calculada para cobrir todas as contas futuras.'}</p>
                </div>
              </div>
              <StatCard title="Lucro Líquido" value={formatCurrency(stats.netProfit)} icon={Wallet} colorClass="bg-slate-800" trend={`${stats.profitMargin.toFixed(0)}% Margem`} trendUp={stats.profitMargin > 30} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="font-bold text-slate-800">Ganhos vs Despesas</h3>
                  <div className="text-xs text-slate-500">Visão Geral</div>
                </div>
                <div className="h-72 w-full flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={pieData} cx="50%" cy="50%" labelLine={false} label={renderCustomizedLabel} outerRadius="80%" dataKey="value">
                        {pieData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                      </Pie>
                      <Legend layout="vertical" verticalAlign="middle" align="right" iconType="circle" />
                      <Tooltip formatter={(value: number) => [showValues ? `R$ ${value.toFixed(2)}` : 'R$ ****', '']} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className="space-y-6">
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="font-bold text-slate-800 text-sm">Próximos Pagamentos</h3>
                    <button onClick={() => setActiveTab('bills')} className="text-indigo-600 text-xs hover:underline">Ver tudo</button>
                  </div>
                  <div className="space-y-3">
                    {bills.filter(b => !b.isPaid).slice(0, 3).map(bill => (
                      <div key={bill.id} className="flex justify-between items-center p-3 bg-slate-50 rounded-lg border border-slate-100">
                        <div>
                          <p className="text-sm font-semibold text-slate-700">{bill.description}</p>
                          <p className="text-xs text-rose-500 font-medium">Vence: {formatDateBr(bill.dueDate)}</p>
                        </div>
                        <span className="text-sm font-bold text-slate-800">{formatCurrency(bill.amount)}</span>
                      </div>
                    ))}
                    {bills.filter(b => !b.isPaid).length === 0 && <p className="text-center text-xs text-slate-400 py-4">Tudo pago! 🎉</p>}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'reports' && <ReportsTab transactions={transactions} showValues={showValues} />}
        
        {activeTab === 'bills' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
              <div>
                <h2 className="text-lg font-bold text-slate-800">Contas a Pagar</h2>
                <p className="text-slate-500 text-sm">Gerencie suas obrigações futuras e mantenha o caixa positivo.</p>
              </div>
              <button onClick={() => { setEditingBill(null); setIsBillModalOpen(true); }} className="flex items-center gap-2 bg-rose-600 text-white px-4 py-2 rounded-lg hover:bg-rose-700 transition-colors shadow-lg shadow-rose-200">
                <Plus size={16} /> Adicionar Conta
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {bills.map(bill => (
                <div key={bill.id} className={`p-5 rounded-xl border transition-all ${bill.isPaid ? 'bg-slate-50 border-slate-200 opacity-75' : 'bg-white border-rose-100 shadow-sm'}`}>
                  <div className="flex justify-between items-start mb-3">
                    <div className={`p-2 rounded-lg ${bill.isPaid ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>{bill.isPaid ? <Wallet size={20} /> : <CalendarClock size={20} />}</div>
                    <div className="flex items-center gap-2">
                      <span className={`text-lg font-bold ${bill.isPaid ? 'text-slate-500' : 'text-slate-800'}`}>{formatCurrency(bill.amount)}</span>
                      <div className="flex">
                        <button onClick={() => handleEditBill(bill)} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-full transition-colors" title="Editar conta"><Edit2 size={18} /></button>
                        <button onClick={() => handleDeleteBill(bill.id)} className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-full transition-colors" title="Excluir conta"><Trash2 size={18} /></button>
                      </div>
                    </div>
                  </div>
                  <div className="mb-1">
                    <h4 className={`font-semibold ${bill.isPaid ? 'text-slate-500 line-through' : 'text-slate-800'}`}>{bill.description}</h4>
                    {bill.category && <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">{bill.category}</span>}
                  </div>
                  <div className="flex justify-between items-center mt-4">
                    <span className="text-xs text-slate-500">Vencimento: {formatDateBr(bill.dueDate)}</span>
                    <button onClick={() => toggleBillPaid(bill.id)} className={`text-xs px-3 py-1 rounded-full border transition-colors ${bill.isPaid ? 'border-emerald-200 text-emerald-600 hover:bg-emerald-50' : 'border-slate-200 text-slate-600 hover:bg-slate-100'}`}>{bill.isPaid ? 'Marcar como Pendente' : 'Marcar como Pago'}</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'history' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="bg-white p-4 md:p-6 rounded-2xl shadow-sm border border-slate-200">
              <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-4">
                <div><h2 className="text-xl font-bold text-slate-800 flex items-center gap-2"><History className="text-indigo-600" /> Histórico de Transações</h2></div>
                <div className="flex bg-slate-100 p-1 rounded-xl overflow-x-auto max-w-full">
                  {(['today', 'week', 'month', 'all', 'custom'] as const).map(range => (
                    <button key={range} onClick={() => setHistoryRange(range)} className={`px-3 py-1.5 text-xs md:text-sm font-medium rounded-lg transition-all whitespace-nowrap ${historyRange === range ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                      {range === 'today' && 'Hoje'}{range === 'week' && 'Semana'}{range === 'month' && 'Mês'}{range === 'all' && 'Tudo'}{range === 'custom' && 'Outro'}
                    </button>
                  ))}
                </div>
              </div>
              {historyRange === 'custom' && (
                <div className="flex items-center gap-2 bg-slate-50 p-2 rounded-xl border border-slate-200 justify-center animate-in fade-in slide-in-from-top-2 mb-4">
                  <input type="date" value={historyCustomStart} onChange={e => setHistoryCustomStart(e.target.value)} className="px-2 py-1.5 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500 w-full md:w-auto" />
                  <span className="text-slate-400"><ChevronRight size={16} /></span>
                  <input type="date" value={historyCustomEnd} onChange={e => setHistoryCustomEnd(e.target.value)} className="px-2 py-1.5 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500 w-full md:w-auto" />
                </div>
              )}
              <div className="grid grid-cols-3 gap-2 md:gap-4 mt-2">
                <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-100 text-center">
                  <div className="text-xs text-emerald-600 font-bold uppercase mb-1 flex justify-center items-center gap-1"><ArrowUpCircle size={12} /> Entradas</div>
                  <div className="text-sm md:text-lg font-bold text-emerald-700">{formatCurrency(historySummary.income)}</div>
                </div>
                <div className="bg-rose-50 p-3 rounded-xl border border-rose-100 text-center">
                  <div className="text-xs text-rose-600 font-bold uppercase mb-1 flex justify-center items-center gap-1"><ArrowDownCircle size={12} /> Saídas</div>
                  <div className="text-sm md:text-lg font-bold text-rose-700">{formatCurrency(historySummary.expense)}</div>
                </div>
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-center">
                  <div className="text-xs text-slate-600 font-bold uppercase mb-1">Saldo</div>
                  <div className={`text-sm md:text-lg font-bold ${historySummary.balance >= 0 ? 'text-indigo-600' : 'text-rose-600'}`}>{formatCurrency(historySummary.balance)}</div>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="hidden md:grid grid-cols-12 bg-slate-50 border-b border-slate-200 p-4 text-xs font-semibold text-slate-500 uppercase">
                <div className="col-span-2">Data</div><div className="col-span-4">Descrição</div><div className="col-span-2">Categoria</div><div className="col-span-2">Eficiência</div><div className="col-span-1 text-right">Valor</div><div className="col-span-1 text-center">Ações</div>
              </div>
              <div className="divide-y divide-slate-100">
                {filteredHistory.length === 0 ? (
                  <div className="p-8 text-center text-slate-400"><Filter size={48} className="mx-auto mb-2 opacity-20" /><p>Nenhuma transação encontrada neste período.</p></div>
                ) : (
                  filteredHistory.map(t => (
                    <div key={t.id} className="hover:bg-slate-50 transition-colors">
                      <div className="hidden md:grid grid-cols-12 items-center p-4 text-sm">
                        <div className="col-span-2 text-slate-600">{formatDateBr(t.date)}</div>
                        <div className="col-span-4 font-medium text-slate-800">{t.description}</div>
                        <div className="col-span-2"><span className={`px-2 py-1 rounded text-xs border ${t.category ? 'bg-slate-100 text-slate-600 border-slate-200' : 'bg-emerald-100 text-emerald-700 border-emerald-200'}`}>{t.category || 'Entrada'}</span></div>
                        <div className="col-span-2 text-slate-500 text-xs">{t.mileage ? `${t.mileage}km • ${t.durationHours}h` : '-'}</div>
                        <div className={`col-span-1 font-bold text-right ${t.type === TransactionType.INCOME ? 'text-emerald-600' : 'text-rose-600'}`}>{t.type === TransactionType.INCOME ? '+' : '-'} {formatCurrency(t.amount)}</div>
                        <div className="col-span-1 text-center"><button onClick={() => handleDeleteTransaction(t.id)} className="text-slate-400 hover:text-rose-500 p-1"><CloseIcon size={16} /></button></div>
                      </div>
                      <div className="md:hidden p-4 flex justify-between items-center">
                        <div className="flex-1 min-w-0 pr-4">
                          <div className="font-semibold text-slate-800 truncate mb-1">{t.description}</div>
                          <div className="flex items-center gap-2 text-xs text-slate-500"><span>{formatDateBr(t.date)}</span><span>•</span><span className={`px-1.5 py-0.5 rounded ${t.type === TransactionType.INCOME ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>{t.category || 'Entrada'}</span></div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className={`font-bold ${t.type === TransactionType.INCOME ? 'text-emerald-600' : 'text-rose-600'}`}>{t.type === TransactionType.INCOME ? '+' : '-'} {formatCurrency(t.amount)}</div>
                          <button onClick={() => handleDeleteTransaction(t.id)} className="text-slate-300 hover:text-rose-500 p-1"><Trash2 size={18} /></button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </main>

      <TransactionModal isOpen={isTransModalOpen} onClose={() => setIsTransModalOpen(false)} onSave={handleAddTransaction} onSaveBill={handleSaveBill} categories={categories} />
      <ShiftModal isOpen={isShiftModalOpen} onClose={() => setIsShiftModalOpen(false)} onSave={handleSaveShift} initialData={shiftState.isActive || shiftState.isPaused ? { amount: currentShiftTotal, mileage: shiftState.km, durationHours: currentShiftHoursPrecise } : null} />
      <ShiftEntryModal isOpen={entryModalOpen} onClose={() => setEntryModalOpen(false)} category={entryCategory} onSave={handleEntrySave} categories={categories} />
      <BillModal isOpen={isBillModalOpen} onClose={() => { setIsBillModalOpen(false); setEditingBill(null); }} onSave={handleSaveBill} initialData={editingBill} categories={categories} />
      <SettingsModal isOpen={isSettingsModalOpen} onClose={() => setIsSettingsModalOpen(false)} workDays={workDays} onSaveWorkDays={setWorkDays} categories={categories} onAddCategory={handleAddCategory} onEditCategory={handleEditCategory} onDeleteCategory={handleDeleteCategory} />
    </div>
  );
}

export default App;
