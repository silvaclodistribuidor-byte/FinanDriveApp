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
  ArrowUpCircle,
  CheckCircle2,
  AlertCircle,
  LogOut,
  CalendarCheck
} from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { StatCard } from './components/StatCard';
import { TransactionModal } from './components/TransactionModal';
import { ShiftModal } from './components/ShiftModal';
import { ShiftEntryModal } from './components/ShiftEntryModal';
import { BillModal } from './components/BillModal';
import { SettingsModal } from './components/SettingsModal';
import { ReportsTab } from './components/ReportsTab';
import { Login } from './components/Login';
import { loadAppData, saveAppData, auth, logoutUser } from "./services/firestoreService";
import { Transaction, TransactionType, ExpenseCategory, Bill, ShiftState, DEFAULT_CATEGORIES } from './types';
import { onAuthStateChanged, User } from "firebase/auth";

const getTodayString = () => {
  const now = new Date();
  return [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, '0'),
    String(now.getDate()).padStart(2, '0')
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

const INITIAL_TRANSACTIONS: Transaction[] = [];
const INITIAL_BILLS: Bill[] = [];

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  // App Data State
  const [transactions, setTransactions] = useState<Transaction[]>(INITIAL_TRANSACTIONS);
  const [bills, setBills] = useState<Bill[]>(INITIAL_BILLS);
  const [categories, setCategories] = useState<string[]>(DEFAULT_CATEGORIES);
  
  // New Settings State
  const [workDays, setWorkDays] = useState<number[]>([1, 2, 3, 4, 5, 6]); // 0=Sun, 6=Sat (Generic Preference)
  const [plannedWorkDates, setPlannedWorkDates] = useState<string[]>([]); // Specific dates YYYY-MM-DD
  const [monthlySalaryGoal, setMonthlySalaryGoal] = useState<number>(0);

  // UI State
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [showValues, setShowValues] = useState(true);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'bills' | 'history' | 'shift' | 'reports'>('dashboard');
  
  // Modals
  const [isTransModalOpen, setIsTransModalOpen] = useState(false);
  const [isShiftModalOpen, setIsShiftModalOpen] = useState(false);
  const [isBillModalOpen, setIsBillModalOpen] = useState(false);
  const [editingBill, setEditingBill] = useState<Bill | null>(null);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [entryModalOpen, setEntryModalOpen] = useState(false);

  // Filter & Input State
  const [historyRange, setHistoryRange] = useState<'today' | 'week' | 'month' | 'all' | 'custom'>('all');
  const [historyCustomStart, setHistoryCustomStart] = useState('');
  const [historyCustomEnd, setHistoryCustomEnd] = useState('');
  const [entryCategory, setEntryCategory] = useState<'uber' | '99' | 'indrive' | 'private' | 'km' | 'expense' | null>(null);

  // Shift Logic
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

  const timerRef = useRef<number | null>(null);

  // 1. Monitor Authentication
  useEffect(() => {
    if(!auth) {
      setAuthLoading(false);
      return;
    }
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // 2. Load Data
  useEffect(() => {
    if (user) {
      setIsLoadingData(true);
      loadAppData(user.uid).then((data) => {
        if (data) {
          if (data.transactions) setTransactions(data.transactions);
          else setTransactions([]);
          
          if (data.bills) setBills(data.bills);
          else setBills([]);

          if (data.categories) setCategories(data.categories);
          
          // Settings
          if (data.workDays) setWorkDays(data.workDays);
          if (data.plannedWorkDates) setPlannedWorkDates(data.plannedWorkDates);
          if (data.monthlySalaryGoal) setMonthlySalaryGoal(data.monthlySalaryGoal);

          if (data.shiftState) setShiftState(data.shiftState);
        } else {
          setTransactions([]);
          setBills([]);
        }
        setIsLoadingData(false);
      });
    }
  }, [user]);

  // 3. Save Data
  useEffect(() => {
    if (!user || isLoadingData) return;
    const payload = { 
      transactions, 
      bills, 
      categories, 
      shiftState, 
      workDays, 
      plannedWorkDates, 
      monthlySalaryGoal 
    };
    saveAppData(payload, user.uid).catch((error) => {
      console.error("Erro ao salvar dados no Firestore:", error);
    });
  }, [transactions, bills, categories, shiftState, workDays, plannedWorkDates, monthlySalaryGoal, user, isLoadingData]);

  // Shift Timer
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

  // Initial Check: Populate planned dates if empty for current month based on generic preference
  useEffect(() => {
    if (!isLoadingData && user && workDays.length > 0) {
      const today = new Date();
      const currentMonthStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
      
      // Check if we have ANY planned dates for current month
      const hasPlanForThisMonth = plannedWorkDates.some(d => d.startsWith(currentMonthStr));
      
      if (!hasPlanForThisMonth) {
        // Auto-populate based on workDays preference
        const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
        const newDates = [...plannedWorkDates];
        for (let i = 1; i <= daysInMonth; i++) {
          const d = new Date(today.getFullYear(), today.getMonth(), i);
          const dateStr = [d.getFullYear(), String(d.getMonth() + 1).padStart(2, '0'), String(d.getDate()).padStart(2, '0')].join('-');
          if (workDays.includes(d.getDay())) {
             newDates.push(dateStr);
          }
        }
        // Only update if we actually added something
        if (newDates.length > plannedWorkDates.length) {
          setPlannedWorkDates(newDates);
        }
      }
    }
  }, [isLoadingData, user, workDays]); // Deliberately omitting plannedWorkDates from dep to avoid loop, though guarded inside.

  // --- Handlers ---

  const handleLogout = async () => {
    await logoutUser();
    setTransactions([]);
    setBills([]);
    setShiftState({ isActive: false, isPaused: false, startTime: null, elapsedSeconds: 0, earnings: { uber: 0, n99: 0, indrive: 0, private: 0 }, expenses: 0, expenseList: [], km: 0 });
  };

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
      if (entryCategory === 'uber') newState.earnings.uber = value;
      else if (entryCategory === '99') newState.earnings.n99 = value;
      else if (entryCategory === 'indrive') newState.earnings.indrive = value;
      else if (entryCategory === 'private') newState.earnings.private = value;
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

  const handleEditStartTime = () => {
    if (!shiftState.isActive) return;
    const currentStart = shiftState.startTime ? new Date(shiftState.startTime) : new Date();
    const defaultTime = `${String(currentStart.getHours()).padStart(2, '0')}:${String(currentStart.getMinutes()).padStart(2, '0')}`;
    const newTimeStr = window.prompt("Ajustar horário de início (HH:mm):", defaultTime);
    
    if (newTimeStr && /^\d{2}:\d{2}$/.test(newTimeStr)) {
      const [h, m] = newTimeStr.split(':').map(Number);
      const newStartDate = new Date();
      newStartDate.setHours(h, m, 0, 0);
      const newElapsed = Math.floor((Date.now() - newStartDate.getTime()) / 1000);
      setShiftState(prev => ({
        ...prev,
        startTime: newStartDate.getTime(),
        elapsedSeconds: Math.max(0, newElapsed)
      }));
    }
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

  // --- SMART CALCULATIONS ---
  const stats = useMemo(() => {
    const todayStr = getTodayString();
    const currentMonthPrefix = todayStr.substring(0, 7); // YYYY-MM

    // 1. Basic Stats
    const totalIncome = transactions.filter(t => t.type === TransactionType.INCOME).reduce((acc, curr) => acc + curr.amount, 0);
    const totalExpense = transactions.filter(t => t.type === TransactionType.EXPENSE).reduce((acc, curr) => acc + curr.amount, 0);
    const netProfit = totalIncome - totalExpense;
    const profitMargin = totalIncome > 0 ? (netProfit / totalIncome) * 100 : 0;
    
    // 2. Current Month Income
    const incomeThisMonth = transactions
      .filter(t => t.type === TransactionType.INCOME && t.date.startsWith(currentMonthPrefix))
      .reduce((acc, t) => acc + t.amount, 0);

    // 3. Pending Bills Logic
    const pendingBillsTotal = bills.filter(b => !b.isPaid).reduce((acc, b) => acc + b.amount, 0);
    const sortedUnpaidBills = [...bills].filter(b => !b.isPaid).sort((a, b) => a.dueDate.localeCompare(b.dueDate));

    // 4. Remaining Planned Work Days
    // Filter planned dates that are TODAY or in the FUTURE for this month
    const remainingPlannedDates = plannedWorkDates
      .filter(d => d.startsWith(currentMonthPrefix) && d >= todayStr)
      .sort();
    
    const countRemainingDays = remainingPlannedDates.length || 1; // Avoid div by zero

    // --- Goal Strategy A: Salary Based ---
    // How much more do I need to reach MonthlySalaryGoal?
    const salaryGoal = monthlySalaryGoal || 0;
    const amountNeededForSalary = Math.max(0, salaryGoal - incomeThisMonth);
    const dailyGoalBasedOnSalary = amountNeededForSalary / countRemainingDays;

    // --- Goal Strategy B: Cashflow Based (Bills) ---
    // Ensure we have enough cash by specific dates
    let maxRequiredDailyRateForBills = 0;
    let billGoalExplanation = "";
    
    // Simulate cashflow accumulation day by day using planned dates
    if (sortedUnpaidBills.length > 0) {
        let currentProjectedCash = Math.max(0, netProfit); // Start with current actual cash
        // We only care about bills due in the future to influence future daily goals
        // Past due bills increase immediate pressure (effectively due 'now')
        
        // This is a complex simulation, simplified here:
        // Identify the "tightest" bill constraint.
        // For each bill, determine (Amount - CurrentCash) / (WorkDaysUntilBill).
        // Take the maximum of these requirements.
        
        for (const bill of sortedUnpaidBills) {
            const billDate = bill.dueDate;
            // Count work days from today until bill date (inclusive)
            const availableWorkDays = remainingPlannedDates.filter(d => d <= billDate).length;
            const daysToCover = availableWorkDays === 0 ? 1 : availableWorkDays; // If due today/past, need it today (1 day)

            // Current net profit considers all past expenses/income.
            // We need to cover this specific bill amount.
            // Simplified: Treat all unpaid bills as a stack to clear.
            // If we have cash in hand, great. If not, divide shortage by days.
            
            // NOTE: A robust system would order all inflows/outflows. 
            // Here we use a conservative approach: 
            // Total Pending Bills / Total Remaining Days is the baseline. 
            // But if a big bill is due in 2 days, we spike the rate.
            
            // Let's assume cash in hand covers previous bills.
            // New Requirement = BillAmount / DaysToCover.
            // But we need to account for the CUMULATIVE need.
            
             // Revert to the accumulation logic from previous version, adapted to planned dates:
             // We need to reach 'CumulativeBillTotal' by 'BillDate'.
        }
        
        // Re-implementing the robust loop from original code, but using plannedWorkDates:
        let cumulativeBillTotal = 0;
        const startingCash = Math.max(0, netProfit); 
        
        for (const bill of sortedUnpaidBills) {
            cumulativeBillTotal += bill.amount;
            const totalNeededForMilestone = cumulativeBillTotal - startingCash;
            
            if (totalNeededForMilestone > 0) {
                 const billDueStr = bill.dueDate;
                 const workDaysUntilBill = remainingPlannedDates.filter(d => d <= billDueStr).length || 1;
                 const requiredRate = totalNeededForMilestone / workDaysUntilBill;
                 
                 if (requiredRate > maxRequiredDailyRateForBills) {
                     maxRequiredDailyRateForBills = requiredRate;
                     billGoalExplanation = `Foco: Quitar ${bill.description}`;
                 }
            }
        }
    }

    // --- Final Decision ---
    // The goal is the higher of the two: meet the salary ambition OR pay the bills.
    let finalDailyGoal = 0;
    let goalExplanation = "";

    if (dailyGoalBasedOnSalary >= maxRequiredDailyRateForBills) {
        finalDailyGoal = dailyGoalBasedOnSalary;
        goalExplanation = salaryGoal > 0 
            ? `Meta para atingir salário de ${formatCurrency(salaryGoal, true)}`
            : "Defina uma meta salarial nas configurações.";
    } else {
        finalDailyGoal = maxRequiredDailyRateForBills;
        goalExplanation = `Prioridade: ${billGoalExplanation || 'Cobrir contas pendentes'}`;
    }

    // Earnings Today
    const earningsToday = transactions.filter(t => t.type === TransactionType.INCOME && t.date === todayStr).reduce((acc, t) => acc + t.amount, 0);

    return { 
        totalIncome, 
        totalExpense, 
        netProfit, 
        profitMargin, 
        dailyGoal: finalDailyGoal, 
        pendingBillsTotal, 
        earningsToday, 
        goalExplanation,
        incomeThisMonth,
        remainingDays: countRemainingDays,
        salaryGoal
    };
  }, [transactions, bills, plannedWorkDates, monthlySalaryGoal]);

  const billsSummary = useMemo(() => ({
    paid: bills.filter(b => b.isPaid).reduce((acc, b) => acc + b.amount, 0),
    pending: bills.filter(b => !b.isPaid).reduce((acc, b) => acc + b.amount, 0)
  }), [bills]);

  const filteredHistory = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    let start: Date | null = null;
    let end: Date | null = new Date(today);
    end.setHours(23, 59, 59, 999);

    if (historyRange === 'today') start = today;
    else if (historyRange === 'week') {
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
      } else return transactions;
    } else return transactions;

    return transactions.filter(t => {
      const tDate = parseDateFromInput(t.date);
      return start ? (tDate >= start && tDate <= end!) : true;
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [transactions, historyRange, historyCustomStart, historyCustomEnd]);

  const historySummary = useMemo(() => {
    const income = filteredHistory.filter(t => t.type === TransactionType.INCOME).reduce((acc, t) => acc + t.amount, 0);
    const expense = filteredHistory.filter(t => t.type === TransactionType.EXPENSE).reduce((acc, t) => acc + t.amount, 0);
    return { income, expense, balance: income - expense };
  }, [filteredHistory]);

  const currentShiftTotal = shiftState.earnings.uber + shiftState.earnings.n99 + shiftState.earnings.indrive + shiftState.earnings.private;
  const currentShiftLiquid = currentShiftTotal - shiftState.expenses;
  const currentShiftMinutes = Math.floor(shiftState.elapsedSeconds / 60);
  const currentShiftRph = (currentShiftMinutes > 0) ? currentShiftTotal / (currentShiftMinutes / 60) : 0;
  const currentShiftRpk = shiftState.km > 0 ? currentShiftTotal / shiftState.km : 0;
  const currentShiftHoursPrecise = shiftState.elapsedSeconds / 3600;

  const pieData = useMemo(() => [
    { name: 'Ganhos', value: stats.totalIncome, color: '#3b82f6' },
    { name: 'Despesas', value: stats.totalExpense, color: '#f43f5e' }
  ], [stats]);

  // --- Actions ---

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
    
    const newTransactions = [incomeTransaction, ...expenseTransactions, ...transactions];
    setTransactions(newTransactions);
    
    // Reseta o estado do turno (inativo)
    const resetShiftState = { isActive: false, isPaused: false, startTime: null, elapsedSeconds: 0, earnings: { uber: 0, n99: 0, indrive: 0, private: 0 }, expenses: 0, expenseList: [], km: 0 };
    setShiftState(resetShiftState);
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

  // --- RENDER ---

  if (authLoading) return <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white">Carregando FinanDrive...</div>;

  if (!user) {
    return <Login />;
  }

  return (
    <div className="h-screen bg-slate-100 flex flex-col md:flex-row font-sans text-slate-900 overflow-hidden">
      {/* Mobile Header */}
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

      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-40 w-64 bg-slate-900 text-slate-300 transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0 shrink-0 ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} ${activeTab === 'shift' ? 'md:w-20 lg:w-64' : ''}`}>
        <div className="p-6 hidden md:flex flex-col justify-center items-center border-b border-slate-800 h-24">
          <span className={`font-extrabold text-2xl tracking-tight text-white ${activeTab === 'shift' ? 'md:hidden lg:block' : ''}`}>FinanDrive</span>
          {user.email && <span className="text-[10px] text-slate-500 mt-1 truncate max-w-full">{user.email}</span>}
          {activeTab === 'shift' && <span className="hidden md:block lg:hidden font-bold text-white text-xl">FD</span>}
        </div>
        <nav className="p-4 space-y-2 mt-4 flex flex-col h-[calc(100%-8rem)]">
          <button onClick={() => { setActiveTab('dashboard'); setMobileMenuOpen(false); }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium ${activeTab === 'dashboard' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/20' : 'hover:bg-slate-800 hover:text-white'}`}>
            <LayoutDashboard size={20} /><span className={`${activeTab === 'shift' ? 'md:hidden lg:inline' : ''}`}>Visão Geral</span>
          </button>
          <button onClick={() => { setActiveTab('shift'); setMobileMenuOpen(false); }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium ${activeTab === 'shift' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/20' : 'hover:bg-slate-800 hover:text-white'}`}>
            <Play size={20} /><span className={`${activeTab === 'shift' ? 'md:hidden lg:inline' : ''}`}>Turno</span>
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
          <div className="mt-auto space-y-2">
            <button onClick={() => { setIsSettingsModalOpen(true); setMobileMenuOpen(false); }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium hover:bg-slate-800 hover:text-white text-slate-300`}>
              <Settings size={20} /><span className={`${activeTab === 'shift' ? 'md:hidden lg:inline' : ''}`}>Configurações</span>
            </button>
            <button onClick={handleLogout} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium hover:bg-rose-900/30 hover:text-rose-400 text-slate-400`}>
              <LogOut size={20} /><span className={`${activeTab === 'shift' ? 'md:hidden lg:inline' : ''}`}>Sair</span>
            </button>
          </div>
        </nav>
      </aside>

      <main className={`flex-1 overflow-y-auto h-full ${activeTab === 'shift' ? 'bg-slate-950' : 'p-4 md:p-8'}`}>
        {/* Renderização condicional das abas */}
        {activeTab === 'shift' ? (
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
              <div className="bg-slate-900/80 rounded-xl p-3 border border-slate-800 shadow-lg col-span-2 flex flex-col justify-center items-center relative group">
                <div className="text-slate-500 text-[10px] font-bold uppercase tracking-wider mb-1 flex items-center gap-2"><Clock size={10} /> Tempo</div>
                <div className="text-3xl md:text-4xl font-mono font-bold text-white tracking-tighter">
                  {formatTime(shiftState.elapsedSeconds).split(' ')[0]}
                  <span className="text-base md:text-xl text-slate-500 ml-1">{formatTime(shiftState.elapsedSeconds).split(' ').slice(1).join(' ')}</span>
                </div>
                {shiftState.isActive && <button onClick={handleEditStartTime} className="absolute top-2 right-2 p-2 text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg shadow-md transition-colors z-20 border border-white/20"><Edit2 size={16} /></button>}
              </div>
              <div className="bg-gradient-to-br from-emerald-900 to-slate-900 rounded-xl p-3 border border-emerald-800/30 shadow-lg col-span-2 flex flex-col justify-center items-center relative overflow-hidden">
                <div className="text-emerald-400/80 text-[10px] font-bold uppercase tracking-wider mb-1 flex items-center gap-2"><Wallet size={10} /> Líquido</div>
                <div className="text-3xl md:text-4xl font-bold text-emerald-400 tracking-tight">{formatCurrency(currentShiftLiquid)}</div>
              </div>
            </div>

            <div className="flex-1 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2 mb-2 overflow-y-auto content-start">
              <button onClick={() => handleOpenEntry('uber')} disabled={!shiftState.isActive || shiftState.isPaused} className="bg-black hover:bg-slate-900 border border-slate-800 rounded-xl p-3 h-20 flex flex-col justify-between transition-all active:scale-95 disabled:opacity-40"><div className="flex justify-between w-full items-start"><div className="bg-slate-800 p-1.5 rounded-lg text-white font-bold text-xs">U</div><div className="text-slate-400 text-[10px] uppercase font-bold">Uber</div></div><div className="text-white font-bold text-lg text-right">{formatCurrency(shiftState.earnings.uber)}</div></button>
              <button onClick={() => handleOpenEntry('99')} disabled={!shiftState.isActive || shiftState.isPaused} className="bg-yellow-400 hover:bg-yellow-300 border border-yellow-500 rounded-xl p-3 h-20 flex flex-col justify-between transition-all active:scale-95 disabled:opacity-40"><div className="flex justify-between w-full items-start"><div className="bg-black/10 p-1.5 rounded-lg text-black font-bold text-xs">99</div><div className="text-black/60 text-[10px] uppercase font-bold">99Pop</div></div><div className="text-black font-bold text-lg text-right">{formatCurrency(shiftState.earnings.n99)}</div></button>
              <button onClick={() => handleOpenEntry('indrive')} disabled={!shiftState.isActive || shiftState.isPaused} className="bg-green-600 hover:bg-green-500 border border-green-500 rounded-xl p-3 h-20 flex flex-col justify-between transition-all active:scale-95 disabled:opacity-40"><div className="flex justify-between w-full items-start"><div className="bg-white/20 p-1.5 rounded-lg text-white font-bold text-xs">In</div><div className="text-green-100 text-[10px] uppercase font-bold">InDrive</div></div><div className="text-white font-bold text-lg text-right">{formatCurrency(shiftState.earnings.indrive)}</div></button>
              <button onClick={() => handleOpenEntry('private')} disabled={!shiftState.isActive || shiftState.isPaused} className="bg-slate-700 hover:bg-slate-600 border border-slate-600 rounded-xl p-3 h-20 flex flex-col justify-between transition-all active:scale-95 disabled:opacity-40"><div className="flex justify-between w-full items-start"><div className="bg-white/10 p-1.5 rounded-lg text-white"><Wallet size={14} /></div><div className="text-slate-300 text-[10px] uppercase font-bold">Partic.</div></div><div className="text-white font-bold text-lg text-right">{formatCurrency(shiftState.earnings.private)}</div></button>
              <button onClick={() => handleOpenEntry('km')} disabled={!shiftState.isActive || shiftState.isPaused} className="bg-blue-600 hover:bg-blue-500 border border-blue-500 rounded-xl p-3 h-20 flex flex-col justify-between transition-all active:scale-95 disabled:opacity-40"><div className="flex justify-between w-full items-start"><div className="bg-white/20 p-1.5 rounded-lg text-white"><Gauge size={14} /></div><div className="text-blue-100 text-[10px] uppercase font-bold">KM</div></div><div className="text-white font-bold text-lg text-right">{shiftState.km.toFixed(1)}</div></button>
              <button onClick={() => handleOpenEntry('expense')} disabled={!shiftState.isActive || shiftState.isPaused} className="bg-rose-600 hover:bg-rose-500 border border-rose-500 rounded-xl p-3 h-20 flex flex-col justify-between transition-all active:scale-95 disabled:opacity-40"><div className="flex justify-between w-full items-start"><div className="bg-white/20 p-1.5 rounded-lg text-white"><Fuel size={14} /></div><div className="text-rose-100 text-[10px] uppercase font-bold">Gasto</div></div><div className="text-white font-bold text-lg text-right">{formatCurrency(shiftState.expenses)}</div></button>
            </div>

            <div className="grid grid-cols-3 gap-2 mb-3 shrink-0">
              <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-800 flex flex-col items-center justify-center"><div className="text-slate-400 text-xs font-medium uppercase tracking-wide mb-1">R$ / Hora</div><div className="text-xl md:text-2xl font-bold text-white">{formatCurrency(currentShiftRph)}</div></div>
              <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-800 flex flex-col items-center justify-center"><div className="text-slate-400 text-xs font-medium uppercase tracking-wide mb-1">R$ / KM</div><div className="text-xl md:text-2xl font-bold text-white">{formatCurrency(currentShiftRpk)}</div></div>
              <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-800 flex flex-col items-center justify-center"><div className="text-slate-400 text-xs font-medium uppercase tracking-wide mb-1">Bruto</div><div className="text-xl md:text-2xl font-bold text-blue-300">{formatCurrency(currentShiftTotal)}</div></div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 shrink-0 mt-auto pb-4">
              {!shiftState.isActive ? (
                <button onClick={handleStartShift} className="col-span-2 bg-indigo-600 hover:bg-indigo-500 text-white h-16 rounded-xl font-bold text-xl shadow-lg shadow-indigo-900/50 flex items-center justify-center gap-3 transition-all active:scale-[0.98] border border-indigo-500"><Play size={24} fill="currentColor" />INICIAR TURNO</button>
              ) : (
                <>
                  <button onClick={handlePauseShift} className={`${shiftState.isPaused ? 'bg-emerald-600 hover:bg-emerald-500 border-emerald-500' : 'bg-slate-800 hover:bg-slate-700 border-slate-700'} text-white h-14 rounded-xl font-bold text-lg flex items-center justify-center gap-2 transition-all active:scale-[0.98] border shadow-lg`}>
                    {shiftState.isPaused ? <Play size={20} fill="currentColor" /> : <Pause size={20} fill="currentColor" />}
                    {shiftState.isPaused ? 'RETOMAR' : 'PAUSAR'}
                  </button>
                  <button onClick={handleStopShift} className="bg-rose-900/80 hover:bg-rose-900 text-rose-200 border border-rose-800 h-14 rounded-xl font-bold text-lg shadow-lg flex items-center justify-center gap-2 transition-all active:scale-[0.98]"><StopCircle size={20} /> ENCERRAR</button>
                </>
              )}
            </div>
          </div>
        ) : (
          /* Dashboard, Reports, Bills, History */
          <>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
              <div className="flex items-center gap-4">
                <div>
                  <h1 className="text-2xl font-bold text-slate-800">{activeTab === 'dashboard' ? 'Painel de Controle' : activeTab === 'reports' ? 'Relatórios de Ganhos' : activeTab === 'bills' ? 'Contas & Planejamento' : 'Histórico Completo'}</h1>
                  <p className="text-slate-500 text-sm flex items-center gap-1">
                    {activeTab === 'dashboard' && stats.pendingBillsTotal > 0 ? <span className="text-rose-500 font-medium">Você tem {formatCurrency(stats.pendingBillsTotal)} em contas pendentes.</span> : <span>Gestão profissional para motoristas.</span>}
                  </p>
                </div>
                <button onClick={() => setShowValues(!showValues)} className="hidden md:flex p-2 text-slate-400 hover:text-indigo-600 bg-white hover:bg-slate-50 rounded-lg border border-slate-200 transition-colors" title={showValues ? 'Ocultar Valores' : 'Mostrar Valores'}>{showValues ? <Eye size={20} /> : <EyeOff size={20} />}</button>
              </div>
              <div className="flex flex-wrap gap-2 w-full md:w-auto">
                <button onClick={() => setIsTransModalOpen(true)} className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-white text-slate-700 border border-slate-200 px-4 py-2.5 rounded-xl hover:bg-slate-50 transition-all font-medium text-sm"><TrendingDown size={16} className="text-rose-500" />Novo Lançamento</button>
              </div>
            </div>

            {/* Dashboard Content */}
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
                        <button onClick={() => setIsSettingsModalOpen(true)} className="p-2 bg-white/10 hover:bg-white/20 rounded-lg text-white transition-colors z-20 backdrop-blur-sm" title="Configurar Metas e Dias"><Settings size={20} /></button>
                      </div>
                      <p className="text-xs text-indigo-200 mt-1 opacity-90 leading-tight">{stats.dailyGoal === 0 ? 'Parabéns! Seu caixa cobre suas contas e metas.' : stats.goalExplanation}</p>
                    </div>
                  </div>
                  <StatCard title="Lucro Líquido" value={formatCurrency(stats.netProfit)} icon={Wallet} colorClass="bg-slate-800" trend={`${stats.profitMargin.toFixed(0)}% Margem`} trendUp={stats.profitMargin > 30} />
                </div>
                
                {/* Progress Bar for Salary Goal */}
                {stats.salaryGoal > 0 && (
                   <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-col gap-2">
                      <div className="flex justify-between text-sm font-bold text-slate-700">
                        <span>Progresso Mensal</span>
                        <span>{((stats.incomeThisMonth / stats.salaryGoal) * 100).toFixed(1)}%</span>
                      </div>
                      <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-emerald-500 rounded-full transition-all duration-1000 ease-out" 
                          style={{ width: `${Math.min(100, (stats.incomeThisMonth / stats.salaryGoal) * 100)}%` }} 
                        />
                      </div>
                      <div className="flex justify-between text-xs text-slate-500">
                         <span>Realizado: {formatCurrency(stats.incomeThisMonth)}</span>
                         <span>Meta: {formatCurrency(stats.salaryGoal)}</span>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-indigo-600 mt-1">
                        <CalendarCheck size={12} />
                        <span>Restam {stats.remainingDays} dias de trabalho planejados.</span>
                      </div>
                   </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                    <div className="flex justify-between items-center mb-6"><h3 className="font-bold text-slate-800">Ganhos vs Despesas</h3><div className="text-xs text-slate-500">Visão Geral</div></div>
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
                      <div className="flex justify-between items-center mb-4"><h3 className="font-bold text-slate-800 text-sm">Próximos Pagamentos</h3><button onClick={() => setActiveTab('bills')} className="text-indigo-600 text-xs hover:underline">Ver tudo</button></div>
                      <div className="space-y-3">
                        {bills.filter(b => !b.isPaid).slice(0, 3).map(bill => (
                          <div key={bill.id} className="flex justify-between items-center p-3 bg-slate-50 rounded-lg border border-slate-100">
                            <div><p className="text-sm font-semibold text-slate-700">{bill.description}</p><p className="text-xs text-rose-500 font-medium">Vence: {formatDateBr(bill.dueDate)}</p></div>
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

            {/* Reports Content */}
            {activeTab === 'reports' && <ReportsTab transactions={transactions} showValues={showValues} />}

            {/* Bills Content */}
            {activeTab === 'bills' && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white p-5 rounded-2xl shadow-sm border border-emerald-100 flex items-center justify-between">
                    <div><p className="text-xs font-bold text-emerald-600 uppercase mb-1">Total Pago</p><h3 className="text-2xl font-bold text-emerald-700">{formatCurrency(billsSummary.paid)}</h3></div>
                    <div className="bg-emerald-50 p-3 rounded-full text-emerald-600"><CheckCircle2 size={24} /></div>
                  </div>
                  <div className="bg-white p-5 rounded-2xl shadow-sm border border-rose-100 flex items-center justify-between">
                    <div><p className="text-xs font-bold text-rose-600 uppercase mb-1">A Pagar</p><h3 className="text-2xl font-bold text-rose-700">{formatCurrency(billsSummary.pending)}</h3></div>
                    <div className="bg-rose-50 p-3 rounded-full text-rose-600"><AlertCircle size={24} /></div>
                  </div>
                </div>
                <div className="flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                  <div><h2 className="text-lg font-bold text-slate-800">Contas a Pagar</h2><p className="text-slate-500 text-sm">Gerencie suas obrigações futuras.</p></div>
                  <button onClick={() => { setEditingBill(null); setIsBillModalOpen(true); }} className="flex items-center gap-2 bg-rose-600 text-white px-4 py-2 rounded-lg hover:bg-rose-700 transition-colors shadow-lg shadow-rose-200"><Plus size={16} /> Adicionar</button>
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
                      <div className="mb-1"><h4 className={`font-semibold ${bill.isPaid ? 'text-slate-500 line-through' : 'text-slate-800'}`}>{bill.description}</h4>{bill.category && <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">{bill.category}</span>}</div>
                      <div className="flex justify-between items-center mt-4">
                        <span className="text-xs text-slate-500">Vencimento: {formatDateBr(bill.dueDate)}</span>
                        <button onClick={() => toggleBillPaid(bill.id)} className={`text-xs px-3 py-1 rounded-full border transition-colors ${bill.isPaid ? 'border-emerald-200 text-emerald-600 hover:bg-emerald-50' : 'border-slate-200 text-slate-600 hover:bg-slate-100'}`}>{bill.isPaid ? 'Marcar como Pendente' : 'Marcar como Pago'}</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* History Content */}
            {activeTab === 'history' && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="bg-white p-4 md:p-6 rounded-2xl shadow-sm border border-slate-200">
                  <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-4">
                    <div><h2 className="text-xl font-bold text-slate-800 flex items-center gap-2"><History className="text-indigo-600" /> Histórico de Transações</h2></div>
                    <div className="flex bg-slate-100 p-1 rounded-xl overflow-x-auto max-w-full">
                      {(['today', 'week', 'month', 'all', 'custom'] as const).map(range => (
                        <button key={range} onClick={() => setHistoryRange(range)} className={`px-3 py-1.5 text-xs md:text-sm font-medium rounded-lg transition-all whitespace-nowrap ${historyRange === range ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>{range === 'today' && 'Hoje'}{range === 'week' && 'Semana'}{range === 'month' && 'Mês'}{range === 'all' && 'Tudo'}{range === 'custom' && 'Outro'}</button>
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
                    <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-100 text-center"><div className="text-xs text-emerald-600 font-bold uppercase mb-1 flex justify-center items-center gap-1"><ArrowUpCircle size={12} /> Entradas</div><div className="text-sm md:text-lg font-bold text-emerald-700">{formatCurrency(historySummary.income)}</div></div>
                    <div className="bg-rose-50 p-3 rounded-xl border border-rose-100 text-center"><div className="text-xs text-rose-600 font-bold uppercase mb-1 flex justify-center items-center gap-1"><ArrowDownCircle size={12} /> Saídas</div><div className="text-sm md:text-lg font-bold text-rose-700">{formatCurrency(historySummary.expense)}</div></div>
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-center"><div className="text-xs text-slate-600 font-bold uppercase mb-1">Saldo</div><div className={`text-sm md:text-lg font-bold ${historySummary.balance >= 0 ? 'text-indigo-600' : 'text-rose-600'}`}>{formatCurrency(historySummary.balance)}</div></div>
                  </div>
                </div>
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                  <div className="hidden md:grid grid-cols-12 bg-slate-50 border-b border-slate-200 p-4 text-xs font-semibold text-slate-500 uppercase"><div className="col-span-2">Data</div><div className="col-span-4">Descrição</div><div className="col-span-2">Categoria</div><div className="col-span-2">Eficiência</div><div className="col-span-1 text-right">Valor</div><div className="col-span-1 text-center">Ações</div></div>
                  <div className="divide-y divide-slate-100">
                    {filteredHistory.length === 0 ? <div className="p-8 text-center text-slate-400"><Filter size={48} className="mx-auto mb-2 opacity-20" /><p>Nenhuma transação encontrada neste período.</p></div> : filteredHistory.map(t => (
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
                    ))}
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </main>

      {/* Modals */}
      <TransactionModal isOpen={isTransModalOpen} onClose={() => setIsTransModalOpen(false)} onSave={handleAddTransaction} onSaveBill={handleSaveBill} categories={categories} />
      <ShiftModal isOpen={isShiftModalOpen} onClose={() => setIsShiftModalOpen(false)} onSave={handleSaveShift} initialData={shiftState.isActive || shiftState.isPaused ? { amount: currentShiftTotal, mileage: shiftState.km, durationHours: currentShiftHoursPrecise } : null} />
      <ShiftEntryModal isOpen={entryModalOpen} onClose={() => setEntryModalOpen(false)} category={entryCategory} onSave={handleEntrySave} categories={categories} />
      <BillModal isOpen={isBillModalOpen} onClose={() => { setIsBillModalOpen(false); setEditingBill(null); }} onSave={handleSaveBill} initialData={editingBill} categories={categories} />
      <SettingsModal 
        isOpen={isSettingsModalOpen} 
        onClose={() => setIsSettingsModalOpen(false)} 
        workDays={workDays} 
        onSaveWorkDays={setWorkDays} 
        plannedWorkDates={plannedWorkDates}
        onSavePlannedDates={setPlannedWorkDates}
        monthlySalaryGoal={monthlySalaryGoal}
        onSaveSalaryGoal={setMonthlySalaryGoal}
        categories={categories} 
        onAddCategory={handleAddCategory} 
        onEditCategory={handleEditCategory} 
        onDeleteCategory={handleDeleteCategory} 
      />
    </div>
  );
}

export default App;
