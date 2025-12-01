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
  LogOut
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
import { Transaction, TransactionType, ExpenseCategory, ShiftState, Bill } from './types';
import { onAuthStateChanged, User } from "firebase/auth";

const formatCurrency = (value: number) =>
  value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const formatDate = (value: string) => {
  const date = new Date(value);
  return date.toLocaleDateString('pt-BR');
};

const getToday = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getStartOfWeek = (date: Date) => {
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(date.setDate(diff));
  const year = monday.getFullYear();
  const month = String(monday.getMonth() + 1).padStart(2, '0');
  const dayStr = String(monday.getDate()).padStart(2, '0');
  return `${year}-${month}-${dayStr}`;
};

const getStartOfMonth = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}-01`;
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
  
  return (
    <text x={x} y={y} fill="white" textAnchor={'middle'} dominantBaseline="central" className="text-[10px] font-bold">
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
};

function App() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [bills, setBills] = useState<Bill[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedTab, setSelectedTab] = useState<'dashboard' | 'transactions' | 'bills' | 'reports'>('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isTransModalOpen, setIsTransModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [isShiftModalOpen, setIsShiftModalOpen] = useState(false);
  const [isBillModalOpen, setIsBillModalOpen] = useState(false);
  const [editingBill, setEditingBill] = useState<Bill | null>(null);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [workDays, setWorkDays] = useState<number>(26);
  const [selectedDate, setSelectedDate] = useState<string>(getToday());
  const [selectedPeriod, setSelectedPeriod] = useState<'today' | 'week' | 'month' | 'custom'>('today');
  const [customStart, setCustomStart] = useState(getToday());
  const [customEnd, setCustomEnd] = useState(getToday());
  const [hideValues, setHideValues] = useState(false);

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
    lastUberBalance: 0,
    lastN99Balance: 0,
    lastIndriveBalance: 0,
    lastPrivateBalance: 0,
    expenses: 0,
    expenseList: [],
    km: 0
  });

  const timerRef = useRef<number | null>(null);
  const [resetConfirmData, setResetConfirmData] = useState<{
    category: 'uber' | '99' | 'indrive' | 'private';
    newValue: number;
  } | null>(null);

  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [isLoadingData, setIsLoadingData] = useState(false);

  // 1. Monitorar Autenticação
  useEffect(() => {
    if (!auth) {
      setAuthLoading(false);
      return;
    }
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // 2. Carregar dados do Firestore quando o usuário logar
  useEffect(() => {
    if (!user) return;
    setIsLoadingData(true);
    loadAppData(user.uid)
      .then((data) => {
        if (data) {
          if (data.transactions) setTransactions(data.transactions);
          else setTransactions([]);

          if (data.bills) setBills(data.bills);
          else setBills([]);

          if (data.categories) setCategories(data.categories);
        } else {
          setTransactions([]);
          setBills([]);
        }
      })
      .finally(() => setIsLoadingData(false));
  }, [user]);

  // 3. Salvar dados sempre que transações, contas ou categorias mudarem
  useEffect(() => {
    if (!user || isLoadingData) return;
    
    const payload = { transactions, bills, categories };
    saveAppData(payload, user.uid).catch((error) => {
      console.error("Erro ao salvar dados no Firestore:", error);
    });
  }, [transactions, bills, categories, user, isLoadingData]);

  // Timer do Turno
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

  // --- Handlers

  const handleAddTransaction = (transaction: Omit<Transaction, 'id'>) => {
    const newTransaction: Transaction = { ...transaction, id: Math.random().toString(36).substring(2) };
    setTransactions(prev => [...prev, newTransaction]);
  };

  const handleUpdateTransaction = (transaction: Transaction) => {
    setTransactions(prev => prev.map(t => t.id === transaction.id ? transaction : t));
  };

  const handleDeleteTransaction = (id: string) => {
    setTransactions(prev => prev.filter(t => t.id !== id));
  };

  const handleSaveShift = (data: { amount: number; description: string; date: string; mileage: number; durationHours: number }) => {
    const { amount, description, date, mileage, durationHours } = data;
    
    const newTransaction: Transaction = {
      id: Math.random().toString(36).substring(2),
      type: TransactionType.INCOME,
      amount,
      description,
      date,
      mileage,
      durationHours
    };

    setTransactions(prev => [...prev, newTransaction]);

    // Reset shift state
    setShiftState({
      isActive: false,
      isPaused: false,
      startTime: null,
      elapsedSeconds: 0,
      earnings: { uber: 0, n99: 0, indrive: 0, private: 0 },
      lastUberBalance: 0,
      lastN99Balance: 0,
      lastIndriveBalance: 0,
      lastPrivateBalance: 0,
      expenses: 0,
      expenseList: [],
      km: 0
    });
  };

  const handleSaveBill = (billData: Omit<Bill, 'id'> & { id?: string }) => {
    if (billData.id) {
      setBills(prev => prev.map(b => b.id === billData.id ? billData as Bill : b));
      setEditingBill(null);
    } else {
      setBills(prev => [...prev, { ...billData, id: Math.random().toString(36).substring(2) }]);
    }
  };

  const handleDeleteBill = (id: string) => {
    setBills(prev => prev.filter(b => b.id !== id));
  };

  const handleAddCategory = (name: string) => {
    setCategories(prev => [...prev, name]);
  };

  const handleEditCategory = (oldName: string, newName: string) => {
    setCategories(prev => prev.map(c => c === oldName ? newName : c));
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

    // Lógica especial para Apps (Uber, 99, InDrive, Particular) em modo atualização inteligente
    if (entryCategory === 'uber' || entryCategory === '99' || entryCategory === 'indrive' || entryCategory === 'private') {
      let lastBalance = 0;

      if (entryCategory === 'uber') {
        lastBalance = shiftState.lastUberBalance;
      } else if (entryCategory === '99') {
        lastBalance = shiftState.lastN99Balance;
      } else if (entryCategory === 'indrive') {
        lastBalance = shiftState.lastIndriveBalance;
      } else if (entryCategory === 'private') {
        lastBalance = shiftState.lastPrivateBalance;
      }

      // Se o novo valor for menor que o último saldo informado, pedimos confirmação
      if (value < lastBalance) {
        setResetConfirmData({
          category: entryCategory,
          newValue: value
        });
        return;
      }

      // Caso normal: novo saldo maior ou igual ao anterior -> usamos a diferença como ganho
      setShiftState(prev => {
        const newState = { ...prev };

        if (entryCategory === 'uber') {
          const diff = value - prev.lastUberBalance;
          newState.earnings.uber += diff;
          newState.lastUberBalance = value;
        } else if (entryCategory === '99') {
          const diff = value - prev.lastN99Balance;
          newState.earnings.n99 += diff;
          newState.lastN99Balance = value;
        } else if (entryCategory === 'indrive') {
          const diff = value - prev.lastIndriveBalance;
          newState.earnings.indrive += diff;
          newState.lastIndriveBalance = value;
        } else if (entryCategory === 'private') {
          const diff = value - prev.lastPrivateBalance;
          newState.earnings.private += diff;
          newState.lastPrivateBalance = value;
        }

        return newState;
      });

      return;
    }

    // KM continua somando
    if (entryCategory === 'km') {
      setShiftState(prev => ({
        ...prev,
        km: prev.km + value
      }));
      return;
    }

    // Despesas continuam somando e registrando lista
    if (entryCategory === 'expense') {
      setShiftState(prev => {
        const newState = { ...prev };
        newState.expenses += value;
        if (description && expenseCategory) {
          newState.expenseList = [
            ...newState.expenseList,
            { amount: value, description, category: expenseCategory, timestamp: Date.now() }
          ];
        }
        return newState;
      });
      return;
    }
  };

  const handleStartShift = () => {
    setShiftState(prev => ({ 
      ...prev, 
      isActive: true, 
      isPaused: false, 
      startTime: Date.now(),
      // garante que um novo turno sempre começa com saldos zerados
      earnings: { uber: 0, n99: 0, indrive: 0, private: 0 },
      lastUberBalance: 0,
      lastN99Balance: 0,
      lastIndriveBalance: 0,
      lastPrivateBalance: 0,
      expenses: 0,
      expenseList: [],
      km: 0,
      elapsedSeconds: 0
    }));
  };

  const handlePauseShift = () => {
    setShiftState(prev => ({ ...prev, isPaused: !prev.isPaused }));
  };

  const handleStopShift = () => {
    setShiftState(prev => ({ ...prev, isPaused: true }));
    setIsShiftModalOpen(true);
  };

  const handleConfirmReset = () => {
    if (!resetConfirmData) return;
    const { category, newValue } = resetConfirmData;

    setShiftState(prev => {
      const newState = { ...prev };

      // Aqui consideramos que a plataforma zerou e o novo valor é ganho inteiro a partir do zero
      if (category === 'uber') {
        newState.earnings.uber += newValue;
        newState.lastUberBalance = newValue;
      } else if (category === '99') {
        newState.earnings.n99 += newValue;
        newState.lastN99Balance = newValue;
      } else if (category === 'indrive') {
        newState.earnings.indrive += newValue;
        newState.lastIndriveBalance = newValue;
      } else if (category === 'private') {
        newState.earnings.private += newValue;
        newState.lastPrivateBalance = newValue;
      }

      return newState;
    });

    setResetConfirmData(null);
  };

  const handleCancelReset = () => {
    setResetConfirmData(null);
  };

  const getLastBalanceForCategory = (category: 'uber' | '99' | 'indrive' | 'private'): number => {
    if (category === 'uber') return shiftState.lastUberBalance;
    if (category === '99') return shiftState.lastN99Balance;
    if (category === 'indrive') return shiftState.lastIndriveBalance;
    return shiftState.lastPrivateBalance;
  };

  const handleEditStartTime = () => {
    if (!shiftState.isActive) return;
    const currentStart = shiftState.startTime ? new Date(shiftState.startTime) : new Date();
    const defaultTime = `${String(currentStart.getHours()).padStart(2, '0')}:${String(currentStart.getMinutes()).padStart(2, '0')}`;
    const newTimeStr = window.prompt("Ajustar horário de início (HH:mm):", defaultTime);
    
    if (newTimeStr && /^\d{2}:\d{2}$/.test(newTimeStr)) {
      const [h, m] = newTimeStr.split(':').map(Number);
      const newStart = new Date(currentStart);
      newStart.setHours(h, m, 0, 0);
      setShiftState(prev => ({
        ...prev,
        startTime: newStart.getTime()
      }));
    }
  };

  const filteredTransactions = useMemo(() => {
    let start: Date;
    let end: Date;
    
    switch (selectedPeriod) {
      case 'today':
        start = parseDateFromInput(selectedDate);
        end = new Date(start);
        end.setHours(23, 59, 59, 999);
        break;
      case 'week':
        start = parseDateFromInput(getStartOfWeek(parseDateFromInput(selectedDate)));
        end = new Date(start);
        end.setDate(end.getDate() + 6);
        end.setHours(23, 59, 59, 999);
        break;
      case 'month':
        start = parseDateFromInput(getStartOfMonth(parseDateFromInput(selectedDate)));
        end = new Date(start);
        end.setMonth(end.getMonth() + 1);
        end.setDate(0);
        end.setHours(23, 59, 59, 999);
        break;
      case 'custom':
        start = parseDateFromInput(customStart);
        end = parseDateFromInput(customEnd);
        end.setHours(23, 59, 59, 999);
        break;
      default:
        start = parseDateFromInput(getToday());
        end = new Date(start);
        end.setHours(23, 59, 59, 999);
    }

    return transactions.filter(t => {
      const tDate = parseDateFromInput(t.date);
      return tDate >= start && tDate <= end;
    });
  }, [transactions, selectedPeriod, selectedDate, customStart, customEnd]);

  const filteredHistory = useMemo(() => {
    let start: Date | null = null;
    let end: Date | null = null;

    switch (historyRange) {
      case 'today':
        start = parseDateFromInput(getToday());
        end = new Date(start);
        end.setHours(23, 59, 59, 999);
        break;
      case 'week':
        start = parseDateFromInput(getStartOfWeek(new Date()));
        end = new Date(start);
        end.setDate(end.getDate() + 6);
        end.setHours(23, 59, 59, 999);
        break;
      case 'month':
        start = parseDateFromInput(getStartOfMonth(new Date()));
        end = new Date(start);
        end.setMonth(end.getMonth() + 1);
        end.setDate(0);
        end.setHours(23, 59, 59, 999);
        break;
      case 'custom':
        if (historyCustomStart && historyCustomEnd) {
          start = parseDateFromInput(historyCustomStart);
          end = parseDateFromInput(historyCustomEnd);
          end.setHours(23, 59, 59, 999);
        }
        break;
      case 'all':
      default:
        start = null;
        end = null;
    }

    if (!start || !end) return transactions;

    return transactions.filter(t => {
      const tDate = parseDateFromInput(t.date);
      return tDate >= start && tDate <= end;
    });
  }, [transactions, historyRange, historyCustomStart, historyCustomEnd]);

  const totals = useMemo(() => {
    const income = filteredTransactions
      .filter(t => t.type === TransactionType.INCOME)
      .reduce((acc, t) => acc + t.amount, 0);
    const expense = filteredTransactions
      .filter(t => t.type === TransactionType.EXPENSE)
      .reduce((acc, t) => acc + t.amount, 0);
    const balance = income - expense;
    return { income, expense, balance };
  }, [filteredTransactions]);

  const historyTotals = useMemo(() => {
    const income = filteredHistory
      .filter(t => t.type === TransactionType.INCOME)
      .reduce((acc, t) => acc + t.amount, 0);
    const expense = filteredHistory
      .filter(t => t.type === TransactionType.EXPENSE)
      .reduce((acc, t) => acc + t.amount, 0);
    return { income, expense, balance: income - expense };
  }, [filteredHistory]);

  const currentShiftTotal = shiftState.earnings.uber + shiftState.earnings.n99 + shiftState.earnings.indrive + shiftState.earnings.private;
  const currentShiftLiquid = currentShiftTotal - shiftState.expenses;
  const currentShiftMinutes = Math.floor(shiftState.elapsedSeconds / 60);
  const currentShiftHoursPrecise = shiftState.elapsedSeconds / 3600;

  const categoryData = useMemo(() => {
    const map: Record<string, number> = {};
    filteredTransactions.forEach(t => {
      if (t.type === TransactionType.EXPENSE && t.category) {
        map[t.category] = (map[t.category] || 0) + t.amount;
      }
    });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [filteredTransactions]);

  const COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#22d3ee', '#6366f1', '#a855f7'];

  const handleLogout = async () => {
    await logoutUser();
    setUser(null);
    setTransactions([]);
    setBills([]);
    setCategories([]);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-slate-300">Carregando FinanDrive...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white flex">
      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-40 w-72 bg-slate-900 border-r border-slate-800 transform transition-transform duration-200 ease-in-out
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:static md:translate-x-0`}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-500 flex items-center justify-center">
              <Wallet size={18} className="text-emerald-950" />
            </div>
            <div>
              <h1 className="font-bold text-lg text-white">FinanDrive</h1>
              <p className="text-xs text-slate-400">Painel financeiro do motorista</p>
            </div>
          </div>
          <button
            onClick={() => setIsSidebarOpen(false)}
            className="md:hidden text-slate-400 hover:text-slate-200"
          >
            <CloseIcon size={22} />
          </button>
        </div>

        <div className="px-4 py-3 border-b border-slate-800 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-sm font-bold">
            {user.displayName?.[0]?.toUpperCase() || 'M'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold truncate">{user.displayName || 'Motorista'}</p>
            <p className="text-xs text-slate-400 truncate">{user.email}</p>
          </div>
          <button
            onClick={handleLogout}
            className="p-2 rounded-lg border border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white"
          >
            <LogOut size={16} />
          </button>
        </div>

        <nav className="p-4 space-y-1">
          <button
            onClick={() => setSelectedTab('dashboard')}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition
              ${selectedTab === 'dashboard' ? 'bg-slate-800 text-white' : 'text-slate-300 hover:bg-slate-800/60'}`}
          >
            <LayoutDashboard size={18} />
            <span>Painel</span>
          </button>
          <button
            onClick={() => setSelectedTab('transactions')}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition
              ${selectedTab === 'transactions' ? 'bg-slate-800 text-white' : 'text-slate-300 hover:bg-slate-800/60'}`}
          >
            <History size={18} />
            <span>Movimentações</span>
          </button>
          <button
            onClick={() => setSelectedTab('bills')}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition
              ${selectedTab === 'bills' ? 'bg-slate-800 text-white' : 'text-slate-300 hover:bg-slate-800/60'}`}
          >
            <TrendingDown size={18} />
            <span>Contas</span>
          </button>
          <button
            onClick={() => setSelectedTab('reports')}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition
              ${selectedTab === 'reports' ? 'bg-slate-800 text-white' : 'text-slate-300 hover:bg-slate-800/60'}`}
          >
            <PieChartIcon size={18} />
            <span>Relatórios</span>
          </button>
        </nav>

        <div className="mt-auto p-4 border-t border-slate-800 flex items-center justify-between text-xs text-slate-500">
          <span>Versão 1.0</span>
          <button
            onClick={() => setIsSettingsModalOpen(true)}
            className="flex items-center gap-2 text-slate-400 hover:text-slate-200"
          >
            <Settings size={16} />
            Configurações
          </button>
        </div>
      </aside>

      {/* Conteúdo principal */}
      <main className="flex-1 flex flex-col min-h-screen">
        <header className="flex items-center justify-between px-4 py-3 border-b border-slate-800 bg-slate-950/80 backdrop-blur md:px-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="md:hidden p-2 rounded-lg bg-slate-900 text-slate-300 border border-slate-700"
            >
              <Menu size={18} />
            </button>
            <div>
              <p className="text-xs text-slate-400">Resumo do período</p>
              <h2 className="text-lg font-semibold text-white">
                {selectedTab === 'dashboard' && 'Painel Geral'}
                {selectedTab === 'transactions' && 'Movimentações'}
                {selectedTab === 'bills' && 'Contas a Pagar'}
                {selectedTab === 'reports' && 'Relatórios e Histórico'}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setHideValues(!hideValues)}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-xs text-slate-300 hover:bg-slate-800"
            >
              {hideValues ? <EyeOff size={14} /> : <Eye size={14} />}
              <span>{hideValues ? 'Mostrar valores' : 'Ocultar valores'}</span>
            </button>
          </div>
        </header>

        <div className="flex-1 p-4 md:p-6 space-y-6">
          {selectedTab === 'dashboard' && (
            <>
              {/* Filtros de período */}
              <div className="flex flex-wrap gap-3 items-end">
                <div className="flex gap-2 bg-slate-900 rounded-xl p-1 border border-slate-800">
                  <button
                    onClick={() => setSelectedPeriod('today')}
                    className={`px-3 py-2 text-xs rounded-lg flex items-center gap-1 ${selectedPeriod === 'today' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-slate-200'}`}
                  >
                    <Clock size={14} />
                    Hoje
                  </button>
                  <button
                    onClick={() => setSelectedPeriod('week')}
                    className={`px-3 py-2 text-xs rounded-lg flex items-center gap-1 ${selectedPeriod === 'week' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-slate-200'}`}
                  >
                    <CalendarClock size={14} />
                    Semana
                  </button>
                  <button
                    onClick={() => setSelectedPeriod('month')}
                    className={`px-3 py-2 text-xs rounded-lg flex items-center gap-1 ${selectedPeriod === 'month' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-slate-200'}`}
                  >
                    <Gauge size={14} />
                    Mês
                  </button>
                  <button
                    onClick={() => setSelectedPeriod('custom')}
                    className={`px-3 py-2 text-xs rounded-lg flex items-center gap-1 ${selectedPeriod === 'custom' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-slate-200'}`}
                  >
                    <Filter size={14} />
                    Personalizado
                  </button>
                </div>

                {selectedPeriod === 'custom' ? (
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="text-slate-400">Período:</span>
                    <input
                      type="date"
                      className="bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs text-slate-200"
                      value={customStart}
                      onChange={e => setCustomStart(e.target.value)}
                    />
                    <span className="text-slate-500">até</span>
                    <input
                      type="date"
                      className="bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs text-slate-200"
                      value={customEnd}
                      onChange={e => setCustomEnd(e.target.value)}
                    />
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <span>Data base:</span>
                    <input
                      type="date"
                      className="bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs text-slate-200"
                      value={selectedDate}
                      onChange={e => setSelectedDate(e.target.value)}
                    />
                  </div>
                )}
              </div>

              {/* Cards principais */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4">
                <StatCard
                  title="Faturamento"
                  value={hideValues ? '•••••' : formatCurrency(totals.income)}
                  subtitle="Ganhos brutos no período"
                  icon={ArrowUpCircle}
                  iconColor="text-emerald-400"
                  bgColor="bg-emerald-500/10"
                />
                <StatCard
                  title="Despesas"
                  value={hideValues ? '•••••' : formatCurrency(totals.expense)}
                  subtitle="Custos lançados no período"
                  icon={ArrowDownCircle}
                  iconColor="text-rose-400"
                  bgColor="bg-rose-500/10"
                />
                <StatCard
                  title="Resultado"
                  value={hideValues ? '•••••' : formatCurrency(totals.balance)}
                  subtitle="Saldo líquido (ganhos - despesas)"
                  icon={Wallet}
                  iconColor={totals.balance >= 0 ? 'text-emerald-400' : 'text-rose-400'}
                  bgColor={totals.balance >= 0 ? 'bg-emerald-500/10' : 'bg-rose-500/10'}
                />
                <StatCard
                  title="Turno atual"
                  value={hideValues ? '•••••' : formatCurrency(currentShiftLiquid)}
                  subtitle={shiftState.isActive ? 'Turno em andamento' : 'Nenhum turno ativo'}
                  icon={Clock}
                  iconColor={shiftState.isActive ? 'text-emerald-400' : 'text-slate-400'}
                  bgColor="bg-slate-500/10"
                />
              </div>

              {/* Gráfico de categorias + turno */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <div className="bg-slate-900 rounded-2xl border border-slate-800 p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center">
                        <PieChartIcon size={16} className="text-slate-300" />
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold text-white">Despesas por Categoria</h3>
                        <p className="text-xs text-slate-400">Distribuição das despesas no período</p>
                      </div>
                    </div>
                  </div>
                  <div className="h-64">
                    {categoryData.length === 0 ? (
                      <div className="h-full flex items-center justify-center text-xs text-slate-500">
                        Nenhuma despesa categorizada neste período.
                      </div>
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={categoryData}
                            dataKey="value"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            outerRadius={80}
                            labelLine={false}
                            label={renderCustomizedLabel}
                          >
                            {categoryData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(value: any) => formatCurrency(Number(value))} />
                          <Legend
                            verticalAlign="bottom"
                            height={36}
                            formatter={(value: any) => <span className="text-xs text-slate-300">{value}</span>}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                </div>

                <div className="bg-slate-900 rounded-2xl border border-slate-800 p-4 flex flex-col gap-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center">
                        <Target size={16} className="text-emerald-400" />
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold text-white">Turno do Motorista</h3>
                        <p className="text-xs text-slate-400">Controle rápido do turno em tempo real</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleEditStartTime}
                        className="px-2 py-1 rounded-lg bg-slate-800 border border-slate-700 text-[10px] text-slate-300 hover:bg-slate-700"
                      >
                        Ajustar início
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="bg-slate-800/60 rounded-xl p-3 flex flex-col gap-1">
                      <span className="text-slate-400 flex items-center gap-1 text-[11px]">
                        <Clock size={12} />
                        Duração
                      </span>
                      <span className="text-sm font-semibold text-white">
                        {currentShiftMinutes} min
                      </span>
                    </div>
                    <div className="bg-slate-800/60 rounded-xl p-3 flex flex-col gap-1">
                      <span className="text-slate-400 flex items-center gap-1 text-[11px]">
                        <Gauge size={12} />
                        KM Rodados
                      </span>
                      <span className="text-sm font-semibold text-white">
                        {shiftState.km.toFixed(0)} km
                      </span>
                    </div>
                    <div className="bg-slate-800/60 rounded-xl p-3 flex flex-col gap-1">
                      <span className="text-slate-400 flex items-center gap-1 text-[11px]">
                        <Wallet size={12} />
                        Bruto
                      </span>
                      <span className="text-sm font-semibold text-emerald-400">
                        {hideValues ? '•••••' : formatCurrency(currentShiftTotal)}
                      </span>
                    </div>
                    <div className="bg-slate-800/60 rounded-xl p-3 flex flex-col gap-1">
                      <span className="text-slate-400 flex items-center gap-1 text-[11px]">
                        <TrendingDown size={12} />
                        Despesas
                      </span>
                      <span className="text-sm font-semibold text-rose-400">
                        {hideValues ? '•••••' : formatCurrency(shiftState.expenses)}
                      </span>
                    </div>
                  </div>

                  <div className="bg-slate-900 border border-slate-700 rounded-xl p-3 flex items-center justify-between">
                    <div>
                      <p className="text-[11px] text-slate-400">Líquido do turno</p>
                      <p className={`text-lg font-bold ${currentShiftLiquid >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {hideValues ? '•••••' : formatCurrency(currentShiftLiquid)}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      {!shiftState.isActive ? (
                        <button
                          onClick={handleStartShift}
                          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold"
                        >
                          <Play size={14} />
                          Iniciar turno
                        </button>
                      ) : (
                        <>
                          <button
                            onClick={handlePauseShift}
                            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold ${
                              shiftState.isPaused
                                ? 'bg-emerald-600 hover:bg-emerald-500'
                                : 'bg-yellow-500 hover:bg-yellow-400 text-slate-900'
                            }`}
                          >
                            <Pause size={14} />
                            {shiftState.isPaused ? 'Retomar' : 'Pausar'}
                          </button>
                          <button
                            onClick={handleStopShift}
                            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-xs font-semibold"
                          >
                            <StopCircle size={14} />
                            Encerrar
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs">
                    <button
                      onClick={() => handleOpenEntry('uber')}
                      disabled={!shiftState.isActive || shiftState.isPaused}
                      className="bg-slate-800/80 hover:bg-slate-700 rounded-xl px-3 py-2 flex justify-between w-full items-start disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-lg bg-white flex items-center justify-center">
                          <span className="text-black font-bold text-xs">U</span>
                        </div>
                        <div className="flex flex-col">
                          <span className="font-semibold text-xs text-white">Uber</span>
                          <span className="text-[10px] text-slate-400">Atualizar saldo</span>
                        </div>
                      </div>
                      <div className="text-right text-xs font-semibold text-emerald-300">
                        {hideValues ? '•••••' : formatCurrency(shiftState.earnings.uber)}
                      </div>
                    </button>

                    <button
                      onClick={() => handleOpenEntry('99')}
                      disabled={!shiftState.isActive || shiftState.isPaused}
                      className="bg-yellow-400 hover:bg-yellow-300 rounded-xl px-3 py-2 flex justify-between w-full items-start disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-lg bg-black flex items-center justify-center">
                          <span className="text-yellow-400 font-bold text-xs">99</span>
                        </div>
                        <div className="flex flex-col">
                          <span className="font-semibold text-xs text-black">99</span>
                          <span className="text-[10px] text-black/70">Atualizar saldo</span>
                        </div>
                      </div>
                      <div className="text-right text-xs font-semibold text-black/80">
                        {hideValues ? '•••••' : formatCurrency(shiftState.earnings.n99)}
                      </div>
                    </button>

                    <button
                      onClick={() => handleOpenEntry('indrive')}
                      disabled={!shiftState.isActive || shiftState.isPaused}
                      className="bg-green-600 hover:bg-green-500 rounded-xl px-3 py-2 flex justify-between w-full items-start disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-lg bg-white flex items-center justify-center">
                          <span className="text-green-600 font-bold text-xs">In</span>
                        </div>
                        <div className="flex flex-col">
                          <span className="font-semibold text-xs text-white">InDrive</span>
                          <span className="text-[10px] text-green-100">Atualizar saldo</span>
                        </div>
                      </div>
                      <div className="text-right text-xs font-semibold text-emerald-100">
                        {hideValues ? '•••••' : formatCurrency(shiftState.earnings.indrive)}
                      </div>
                    </button>

                    <button
                      onClick={() => handleOpenEntry('private')}
                      disabled={!shiftState.isActive || shiftState.isPaused}
                      className="bg-slate-700 hover:bg-slate-600 rounded-xl px-3 py-2 flex justify-between w-full items-start disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-lg bg-white/20 flex items-center justify-center">
                          <Wallet size={14} className="text-white" />
                        </div>
                        <div className="flex flex-col">
                          <span className="font-semibold text-xs text-white">Particular</span>
                          <span className="text-[10px] text-slate-300">Atualizar saldo</span>
                        </div>
                      </div>
                      <div className="text-right text-xs font-semibold text-slate-100">
                        {hideValues ? '•••••' : formatCurrency(shiftState.earnings.private)}
                      </div>
                    </button>

                    <button
                      onClick={() => handleOpenEntry('km')}
                      disabled={!shiftState.isActive || shiftState.isPaused}
                      className="bg-blue-600 hover:bg-blue-500 rounded-xl px-3 py-2 flex justify-between w-full items-start disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-lg bg-white flex items-center justify-center">
                          <Fuel size={14} className="text-blue-600" />
                        </div>
                        <div className="flex flex-col">
                          <span className="font-semibold text-xs text-white">KM</span>
                          <span className="text-[10px] text-blue-100">Adicionar quilometragem</span>
                        </div>
                      </div>
                      <div className="text-right text-xs font-semibold text-blue-100">
                        {shiftState.km.toFixed(0)} km
                      </div>
                    </button>

                    <button
                      onClick={() => handleOpenEntry('expense')}
                      disabled={!shiftState.isActive || shiftState.isPaused}
                      className="bg-rose-600 hover:bg-rose-500 rounded-xl px-3 py-2 flex justify-between w-full items-start disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-lg bg-white flex items-center justify-center">
                          <TrendingDown size={14} className="text-rose-600" />
                        </div>
                        <div className="flex flex-col">
                          <span className="font-semibold text-xs text-white">Gastos</span>
                          <span className="text-[10px] text-rose-100">Adicionar despesa</span>
                        </div>
                      </div>
                      <div className="text-right text-xs font-semibold text-rose-100">
                        {hideValues ? '•••••' : formatCurrency(shiftState.expenses)}
                      </div>
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}

          {selectedTab === 'transactions' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                  <History size={16} />
                  Histórico de Movimentações
                </h3>
                <button
                  onClick={() => { setEditingTransaction(null); setIsTransModalOpen(true); }}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold"
                >
                  <Plus size={14} />
                  Nova Movimentação
                </button>
              </div>

              <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden">
                <div className="grid grid-cols-4 text-[11px] text-slate-400 border-b border-slate-800">
                  <div className="px-3 py-2">Data</div>
                  <div className="px-3 py-2">Descrição</div>
                  <div className="px-3 py-2 text-right">Valor</div>
                  <div className="px-3 py-2 text-right">Ações</div>
                </div>
                {filteredTransactions.length === 0 ? (
                  <div className="p-4 text-xs text-slate-500">
                    Nenhuma movimentação encontrada para o período selecionado.
                  </div>
                ) : (
                  <div className="divide-y divide-slate-800">
                    {filteredTransactions.map(t => (
                      <div key={t.id} className="grid grid-cols-4 text-xs items-center">
                        <div className="px-3 py-2 text-slate-300">{formatDate(t.date)}</div>
                        <div className="px-3 py-2">
                          <span className="text-slate-200">{t.description}</span>
                          {t.category && (
                            <span className="ml-2 text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">
                              {t.category}
                            </span>
                          )}
                        </div>
                        <div className={`px-3 py-2 text-right font-semibold ${t.type === TransactionType.INCOME ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {hideValues ? '•••••' : formatCurrency(t.amount)}
                        </div>
                        <div className="px-3 py-2 text-right flex justify-end gap-2">
                          <button
                            onClick={() => { setEditingTransaction(t); setIsTransModalOpen(true); }}
                            className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            onClick={() => handleDeleteTransaction(t.id)}
                            className="p-1.5 rounded-lg bg-rose-600/20 text-rose-400 hover:bg-rose-600/30"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {selectedTab === 'bills' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                  <TrendingDown size={16} />
                  Contas a Pagar
                </h3>
                <button
                  onClick={() => { setEditingBill(null); setIsBillModalOpen(true); }}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold"
                >
                  <Plus size={14} />
                  Nova Conta
                </button>
              </div>

              <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden">
                <div className="grid grid-cols-5 text-[11px] text-slate-400 border-b border-slate-800">
                  <div className="px-3 py-2">Descrição</div>
                  <div className="px-3 py-2 text-right">Valor</div>
                  <div className="px-3 py-2 text-center">Vencimento</div>
                  <div className="px-3 py-2 text-center">Status</div>
                  <div className="px-3 py-2 text-right">Ações</div>
                </div>
                {bills.length === 0 ? (
                  <div className="p-4 text-xs text-slate-500">
                    Nenhuma conta cadastrada. Clique em &quot;Nova Conta&quot; para adicionar.
                  </div>
                ) : (
                  <div className="divide-y divide-slate-800">
                    {bills
                      .slice()
                      .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
                      .map(bill => {
                        const todayStr = getToday();
                        const isOverdue = !bill.isPaid && bill.dueDate < todayStr;
                        const isToday = !bill.isPaid && bill.dueDate === todayStr;

                        return (
                          <div key={bill.id} className="grid grid-cols-5 text-xs items-center">
                            <div className="px-3 py-2 text-slate-200">{bill.description}</div>
                            <div className="px-3 py-2 text-right font-semibold text-slate-100">
                              {hideValues ? '•••••' : formatCurrency(bill.amount)}
                            </div>
                            <div className="px-3 py-2 text-center text-slate-300">
                              {formatDateBr(bill.dueDate)}
                            </div>
                            <div className="px-3 py-2 text-center">
                              {bill.isPaid ? (
                                <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                                  <CheckCircle2 size={12} />
                                  Pago
                                </span>
                              ) : isOverdue ? (
                                <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/30">
                                  <AlertCircle size={12} />
                                  Atrasado
                                </span>
                              ) : isToday ? (
                                <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30">
                                  <Clock size={12} />
                                  Vence hoje
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-slate-700/40 text-slate-300 border border-slate-600/50">
                                  Em aberto
                                </span>
                              )}
                            </div>
                            <div className="px-3 py-2 text-right flex justify-end gap-2">
                              <button
                                onClick={() => {
                                  setEditingBill(bill);
                                  setIsBillModalOpen(true);
                                }}
                                className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700"
                              >
                                <Edit2 size={14} />
                              </button>
                              <button
                                onClick={() => handleDeleteBill(bill.id)}
                                className="p-1.5 rounded-lg bg-rose-600/20 text-rose-400 hover:bg-rose-600/30"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                )}
              </div>
            </div>
          )}

          {selectedTab === 'reports' && (
            <ReportsTab
              transactions={transactions}
              hideValues={hideValues}
              historyRange={historyRange}
              setHistoryRange={setHistoryRange}
              historyCustomStart={historyCustomStart}
              setHistoryCustomStart={setHistoryCustomStart}
              historyCustomEnd={historyCustomEnd}
              setHistoryCustomEnd={setHistoryCustomEnd}
            />
          )}
        </div>
      </main>

      {/* Modals */}
      <TransactionModal
        isOpen={isTransModalOpen}
        onClose={() => { setIsTransModalOpen(false); setEditingTransaction(null); }}
        onSave={editingTransaction ? handleUpdateTransaction : handleAddTransaction}
        initialData={editingTransaction}
        categories={categories}
      />
      <ShiftModal
        isOpen={isShiftModalOpen}
        onClose={() => setIsShiftModalOpen(false)}
        onSave={handleSaveShift}
        initialData={shiftState.isActive ? { amount: currentShiftLiquid, mileage: shiftState.km, durationHours: currentShiftHoursPrecise } : null}
      />
      <ShiftEntryModal
        isOpen={entryModalOpen}
        onClose={() => setEntryModalOpen(false)}
        category={entryCategory}
        onSave={handleEntrySave}
        categories={categories}
      />
      {resetConfirmData && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl p-6 space-y-4">
            <h2 className="font-bold text-lg text-slate-800">Confirmar reinício do saldo</h2>
            <p className="text-sm text-slate-600">
              O valor informado é menor que o último saldo registrado para essa plataforma.
              Isso aconteceu porque o aplicativo (Uber, 99, etc.) zerou o saldo e começou um novo dia?
            </p>
            <div className="bg-slate-50 rounded-xl p-4 text-sm text-slate-700 space-y-1">
              <div className="flex justify-between">
                <span className="font-semibold">Último saldo:</span>
                <span>{formatCurrency(getLastBalanceForCategory(resetConfirmData.category))}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-semibold">Novo saldo informado:</span>
                <span>{formatCurrency(resetConfirmData.newValue)}</span>
              </div>
            </div>
            <div className="flex flex-col md:flex-row gap-3 justify-end pt-2">
              <button
                type="button"
                onClick={handleCancelReset}
                className="flex-1 md:flex-none px-4 py-3 rounded-xl border border-slate-200 text-slate-700 font-semibold text-sm hover:bg-slate-50 active:scale-95 transition"
              >
                Não, digitei errado
              </button>
              <button
                type="button"
                onClick={handleConfirmReset}
                className="flex-1 md:flex-none px-4 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm active:scale-95 transition flex items-center justify-center gap-2"
              >
                <CheckCircle2 size={18} />
                Sim, a plataforma zerou
              </button>
            </div>
          </div>
        </div>
      )}

      <BillModal
        isOpen={isBillModalOpen}
        onClose={() => { setIsBillModalOpen(false); setEditingBill(null); }}
        onSave={handleSaveBill}
        initialData={editingBill}
        categories={categories}
      />
      <SettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        workDays={workDays}
        onSaveWorkDays={setWorkDays}
        categories={categories}
        onAddCategory={handleAddCategory}
        onEditCategory={handleEditCategory}
        onDeleteCategory={handleDeleteCategory}
      />
    </div>
  );
}

export default App;
