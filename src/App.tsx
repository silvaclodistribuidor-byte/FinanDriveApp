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
  ArrowUpRight,
  ArrowDownRight,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  LogIn,
  LogOut,
  AlertTriangle,
  Plus,
  Trash2,
  Edit2,
  Eye,
  EyeOff,
  Fuel,
  Settings,
  PieChart as PieChartIcon,
  Filter,
  ArrowDownCircle,
  ArrowUpCircle,
  CheckCircle2,
  AlertCircle,
  Info
} from "lucide-react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { Login } from "./components/Login";
import { StatCard } from "./components/StatCard";
import { TransactionModal } from "./components/TransactionModal";
import { ShiftModal } from "./components/ShiftModal";
import { ShiftEntryModal } from "./components/ShiftEntryModal";
import { BillModal } from "./components/BillModal";
import { SettingsModal } from "./components/SettingsModal";
import { ReportsTab } from "./components/ReportsTab";
import { loadAppData, saveAppData, auth, logoutUser, createDriverDocIfMissing } from "./services/firestoreService";
import { Transaction, TransactionType, ExpenseCategory, Bill, ShiftState, DEFAULT_CATEGORIES, Category } from "./types";
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

const createInitialShiftState = (): ShiftState => ({
  isActive: false,
  isPaused: false,
  startTime: null,
  elapsedSeconds: 0,
  earnings: { uber: 0, n99: 0, indrive: 0, private: 0 },
  expenses: 0,
  expenseList: [],
  km: 0,
});

const buildInitialAppState = () => ({
  transactions: INITIAL_TRANSACTIONS,
  bills: INITIAL_BILLS,
  categories: DEFAULT_CATEGORIES,
  shiftState: createInitialShiftState(),
  workDays: [1, 2, 3, 4, 5, 6],
  plannedWorkDates: [],
  monthlySalaryGoal: 0,
  openingBalances: {},
});

const formatCurrency = (value: number): string =>
  value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 2,
  });

const safeNumber = (value: any): number => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

const countBusinessDays = (dates: string[]) => {
  const set = new Set(dates);
  return set.size;
};

const getCurrentMonthKey = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
};

const extractMonthKey = (dateStr: string): string | null => {
  if (!dateStr) return null;
  const [y, m] = dateStr.split('-');
  if (!y || !m) return null;
  return `${y}-${m}`;
};

const computePlannedWorkDates = (workDays: number[]): string[] => {
  const today = new Date();
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);
  const dates: string[] = [];

  for (let d = new Date(monthStart); d < nextMonth; d.setDate(d.getDate() + 1)) {
    const dayOfWeek = d.getDay();
    const mappedDay = dayOfWeek === 0 ? 7 : dayOfWeek;
    if (workDays.includes(mappedDay)) {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      dates.push(`${y}-${m}-${day}`);
    }
  }

  return dates;
};

const filterTransactionsByRange = (
  transactions: Transaction[],
  range: 'today' | 'week' | 'month' | 'all' | 'custom',
  customStart?: string,
  customEnd?: string
) => {
  const now = new Date();
  const today = getTodayString();
  let startDate: Date | null = null;
  let endDate: Date | null = null;

  switch (range) {
    case 'today':
      startDate = parseDateFromInput(today);
      endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + 1);
      break;
    case 'week': {
      const day = now.getDay();
      const sunday = new Date(now);
      sunday.setDate(now.getDate() - day);
      sunday.setHours(0, 0, 0, 0);

      const nextSunday = new Date(sunday);
      nextSunday.setDate(sunday.getDate() + 7);

      const targetSunday = new Date(nextSunday.getFullYear(), nextSunday.getMonth(), nextSunday.getDate());
      if (now.getDay() === 0) {
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        endDate = new Date(now);
        endDate.setDate(now.getDate() + 1);
      } else {
        startDate = targetSunday;
        startDate.setDate(targetSunday.getDate() - 7);
        endDate = new Date(startDate);
        endDate.setDate(startDate.getDate() + 7);
      }
      break;
    }
    case 'month': {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
      break;
    }
    case 'custom':
      if (customStart) startDate = parseDateFromInput(customStart);
      if (customEnd) {
        endDate = parseDateFromInput(customEnd);
        endDate.setDate(endDate.getDate() + 1);
      }
      break;
    case 'all':
    default:
      return transactions;
  }

  if (!startDate || !endDate) return transactions;

  return transactions.filter(t => {
    const d = parseDateFromInput(t.date);
    return d >= startDate! && d < endDate!;
  });
};

const computeMinimumForBills = (
  bills: Bill[],
  openingBalances: Record<string, number>,
  monthlySalaryGoal: number,
  dateFilter?: (bill: Bill) => boolean
) => {
  const today = new Date();
  const todayStr = getTodayString();
  const currentMonthKey = getCurrentMonthKey();

  const filteredBills = bills.filter(bill => {
    if (bill.isPaid) return false;
    const billMonthKey = extractMonthKey(bill.dueDate);
    if (billMonthKey !== currentMonthKey) return false;
    if (dateFilter && !dateFilter(bill)) return false;
    return true;
  });

  const totalBills = filteredBills.reduce((sum, bill) => sum + bill.amount, 0);
  const totalOpeningBalance = Object.values(openingBalances || {}).reduce((sum, v) => sum + v, 0);

  const effectiveOpeningBalance = Math.max(0, totalOpeningBalance);
  const remainingBillsAfterCash = Math.max(0, totalBills - effectiveOpeningBalance);

  const totalSalaryGoal = monthlySalaryGoal || 0;

  const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const dayOfMonth = today.getDate();
  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  const daysRemainingIncludingToday = daysInMonth - dayOfMonth + 1;

  const monthlyBillsAndSalary = remainingBillsAfterCash + totalSalaryGoal;

  const avgPerDay = daysRemainingIncludingToday > 0
    ? monthlyBillsAndSalary / daysRemainingIncludingToday
    : monthlyBillsAndSalary;

  const overdueAndTodayBills = filteredBills.filter(bill => {
    const billDate = parseDateFromInput(bill.dueDate);
    const billDateStr = bill.dueDate;
    return billDateStr <= todayStr;
  });

  const overdueAndTodayTotal = overdueAndTodayBills.reduce((sum, bill) => sum + bill.amount, 0);
  const overdueAfterCash = Math.max(0, overdueAndTodayTotal - effectiveOpeningBalance);

  return {
    totalBills,
    effectiveOpeningBalance,
    remainingBillsAfterCash,
    totalSalaryGoal,
    monthlyBillsAndSalary,
    avgPerDay,
    overdueAndTodayTotal,
    overdueAfterCash,
  };
};

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [hasLoadedData, setHasLoadedData] = useState(false);
  const [hasPendingChanges, setHasPendingChanges] = useState(false);
  const isHydratingRef = useRef(false);
  const hydrationCompleteRef = useRef(false);

  const [transactions, setTransactions] = useState<Transaction[]>(INITIAL_TRANSACTIONS);
  const [bills, setBills] = useState<Bill[]>(INITIAL_BILLS);
  const [categories, setCategories] = useState<Category[]>(DEFAULT_CATEGORIES);

  const [isLoadingData, setIsLoadingData] = useState(false);
  const [workDays, setWorkDays] = useState<number[]>([1, 2, 3, 4, 5, 6]);
  const [plannedWorkDates, setPlannedWorkDates] = useState<string[]>([]);
  const [monthlySalaryGoal, setMonthlySalaryGoal] = useState(0);
  const [openingBalances, setOpeningBalances] = useState<Record<string, number>>({});

  const [showValues, setShowValues] = useState(true);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'bills' | 'history' | 'shift' | 'reports'>('dashboard');

  const [isTransModalOpen, setIsTransModalOpen] = useState(false);
  const [isShiftModalOpen, setIsShiftModalOpen] = useState(false);
  const [isBillModalOpen, setIsBillModalOpen] = useState(false);
  const [editingBill, setEditingBill] = useState<Bill | null>(null);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [entryModalOpen, setEntryModalOpen] = useState(false);

  const [historyRange, setHistoryRange] = useState<'today' | 'week' | 'month' | 'all' | 'custom'>('all');
  const [historyCustomStart, setHistoryCustomStart] = useState('');
  const [historyCustomEnd, setHistoryCustomEnd] = useState('');
  const [entryCategory, setEntryCategory] = useState<'uber' | '99' | 'indrive' | 'private' | 'km' | 'expense' | null>(null);

  const [shiftState, setShiftState] = useState<ShiftState>(() => createInitialShiftState());

  const timerRef = useRef<number | null>(null);
  const shiftStartRef = useRef<number | null>(null);
  const elapsedBaseRef = useRef<number>(0);

  const clearShiftTimer = () => {
    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  useEffect(() => {
    if (!shiftState.isActive) {
      clearShiftTimer();
      shiftStartRef.current = null;
      elapsedBaseRef.current = 0;
      return;
    }

    if (shiftState.isPaused) {
      clearShiftTimer();
      shiftStartRef.current = null;
      elapsedBaseRef.current = shiftState.elapsedSeconds;
      return;
    }

    clearShiftTimer();
    const baselineStart = shiftState.startTime ?? Date.now();
    const deltaFromStart = Math.max(0, Math.floor((Date.now() - baselineStart) / 1000));
    const normalizedElapsed = Math.max(shiftState.elapsedSeconds, 
      elapsedBaseRef.current + deltaFromStart);

    if (normalizedElapsed !== shiftState.elapsedSeconds) {
      elapsedBaseRef.current = normalizedElapsed;
      setShiftState(prev => ({ ...prev, elapsedSeconds: normalizedElapsed }));
    } else {
      elapsedBaseRef.current = shiftState.elapsedSeconds;
    }

    shiftStartRef.current = Date.now();

    const intervalId = window.setInterval(() => {
      if (!shiftStartRef.current) return;
      const elapsedSinceResume = Math.max(0, Math.floor((Date.now() - shiftStartRef.current) / 1000));
      const nextElapsed = elapsedBaseRef.current + elapsedSinceResume;
      setShiftState(prev => ({ ...prev, elapsedSeconds: nextElapsed }));
    }, 1000);

    timerRef.current = intervalId;

    return () => {
      clearShiftTimer();
    };
  }, [shiftState.isActive, shiftState.isPaused, shiftState.startTime]);

  useEffect(() => {
    if (!isLoadingData && user && workDays.length > 0) {
      const today = new Date();
      const currentMonthStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
      
      const hasPlanForThisMonth = plannedWorkDates.some(d => d.startsWith(currentMonthStr));
      if (!hasPlanForThisMonth) {
        const newPlanned = computePlannedWorkDates(workDays);
        setPlannedWorkDates(newPlanned);
      }
    }
  }, [isLoadingData, user, workDays, plannedWorkDates]);

  useEffect(() => {
    if (!auth) {
      setAuthLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);

      if (!currentUser) {
        clearShiftTimer();
        setHasLoadedData(false);
        setHasPendingChanges(false);
        isHydratingRef.current = false;
        hydrationCompleteRef.current = false;
        setTransactions([]);
        setBills([]);
        setCategories(DEFAULT_CATEGORIES);
        setShiftState(createInitialShiftState());
        setWorkDays([1, 2, 3, 4, 5, 6]);
        setPlannedWorkDates([]);
        setMonthlySalaryGoal(0);
        setOpeningBalances({});
        return;
      }

      console.log('[app] onAuthStateChanged -> start hydration', { userId: currentUser.uid });

      setHasLoadedData(false);
      setHasPendingChanges(false);
      setIsLoadingData(true);
      isHydratingRef.current = true;
      hydrationCompleteRef.current = false;

      let cancelled = false;

      loadAppData(currentUser.uid)
        .then(async ({ data, exists }) => {
          if (cancelled) return;

          if (exists && data) {
            console.log('[app] hydration: doc exists, applying state', {
              userId: currentUser.uid,
              summary: {
                transactions: Array.isArray(data.transactions) ? data.transactions.length : 0,
                bills: Array.isArray(data.bills) ? data.bills.length : 0,
                categories: Array.isArray(data.categories) ? data.categories.length : 0,
                hasShiftState: Boolean(data.shiftState),
              },
            });

            if (data.transactions) setTransactions(data.transactions);
            else setTransactions([]);

            if (data.bills) setBills(data.bills);
            else setBills([]);

            if (data.categories) {
              if (data.categories.length > 0 && typeof data.categories[0] === 'string') {
                const migratedCats: Category[] = data.categories.map((c: string, i: number) => ({
                  id: `migrated_${i}_${Date.now()}`,
                  name: c,
                  type: 'both',
                  driverId: currentUser.uid,
                }));
                setCategories(migratedCats);
              } else {
                setCategories(data.categories);
              }
            } else {
              setCategories(DEFAULT_CATEGORIES);
            }

            if (data.workDays) setWorkDays(data.workDays);
            if (data.plannedWorkDates) setPlannedWorkDates(data.plannedWorkDates);
            if (data.monthlySalaryGoal) setMonthlySalaryGoal(data.monthlySalaryGoal);
            if (data.openingBalances) setOpeningBalances(data.openingBalances);
            if (data.shiftState) {
              let hydratedShiftState: ShiftState = { ...data.shiftState };

              // Ajuste extra: se o turno estiver ativo e não pausado quando o app reabre,
              // corrige o elapsedSeconds considerando o tempo de relógio desde startTime.
              if (hydratedShiftState.isActive && !hydratedShiftState.isPaused && hydratedShiftState.startTime) {
                const now = Date.now();
                const baseStart =
                  typeof hydratedShiftState.startTime === 'number'
                    ? hydratedShiftState.startTime
                    : new Date(hydratedShiftState.startTime).getTime();

                if (baseStart && Number.isFinite(baseStart)) {
                  const secondsSinceStart = Math.max(
                    0,
                    Math.floor((now - baseStart) / 1000)
                  );
                  const previousElapsed = hydratedShiftState.elapsedSeconds ?? 0;
                  const normalizedElapsed = Math.max(previousElapsed, secondsSinceStart);

                  hydratedShiftState = {
                    ...hydratedShiftState,
                    elapsedSeconds: normalizedElapsed,
                  };
                }
              }

              setShiftState(hydratedShiftState);
            } else {
              setShiftState(createInitialShiftState());
            }
          } else {
            console.log('[app] hydration: doc missing, seeding defaults', { userId: currentUser.uid });
            const initial = buildInitialAppState();
            setTransactions(initial.transactions);
            setBills(initial.bills);
            setCategories(initial.categories);
            setShiftState(initial.shiftState);
            setWorkDays(initial.workDays);
            setPlannedWorkDates(initial.plannedWorkDates);
            setMonthlySalaryGoal(initial.monthlySalaryGoal);
            setOpeningBalances(initial.openingBalances);

            await createDriverDocIfMissing(initial, currentUser.uid);
          }
        })
        .catch((error) => {
          console.error('Erro ao carregar dados do usuário:', error);
          const initial = buildInitialAppState();
          setTransactions(initial.transactions);
          setBills(initial.bills);
          setCategories(initial.categories);
          setShiftState(initial.shiftState);
          setWorkDays(initial.workDays);
          setPlannedWorkDates(initial.plannedWorkDates);
          setMonthlySalaryGoal(initial.monthlySalaryGoal);
          setOpeningBalances(initial.openingBalances);
        })
        .finally(() => {
          if (cancelled) return;
          setHasLoadedData(true);
          setIsLoadingData(false);
          hydrationCompleteRef.current = true;
          isHydratingRef.current = false;
        });

      return () => {
        cancelled = true;
        isHydratingRef.current = false;
        hydrationCompleteRef.current = false;
      };
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user || !hasLoadedData || isLoadingData || isHydratingRef.current || !hydrationCompleteRef.current) return;
    console.log('[app] local state changed -> pending changes flagged', {
      userId: user?.uid,
      guard: {
        hasLoadedData,
        isLoadingData,
        isHydrating: isHydratingRef.current,
        hydrationComplete: hydrationCompleteRef.current,
      },
    });
    setHasPendingChanges(true);
  }, [transactions, bills, categories, shiftState, workDays, plannedWorkDates, monthlySalaryGoal, openingBalances, user, hasLoadedData, isLoadingData]);

  useEffect(() => {
    if (!user || isLoadingData || !hasLoadedData || !hasPendingChanges || isHydratingRef.current || !hydrationCompleteRef.current) return;

    const payload = {
      transactions,
      bills,
      categories,
      shiftState,
      workDays,
      plannedWorkDates,
      monthlySalaryGoal,
      openingBalances,
    };

    console.log('[app] auto-save triggered', {
      userId: user.uid,
      summary: {
        transactions: payload.transactions.length,
        bills: payload.bills.length,
        categories: payload.categories.length,
        hasShiftState: Boolean(payload.shiftState),
      },
      guards: {
        hasLoadedData,
        isLoadingData,
        hasPendingChanges,
        isHydrating: isHydratingRef.current,
        hydrationComplete: hydrationCompleteRef.current,
      },
    });

    saveAppData(payload, user.uid)
      .then(() => setHasPendingChanges(false))
      .catch((error) => {
        console.error("Erro ao salvar dados no Firestore:", error);
      });
  }, [transactions, bills, categories, shiftState, workDays, plannedWorkDates, monthlySalaryGoal, openingBalances, user, isLoadingData, hasLoadedData, hasPendingChanges]);

  const stats = useMemo(() => {
    const currentMonthKey = getCurrentMonthKey();
    const filterCurrentMonth = (dateStr: string) => extractMonthKey(dateStr) === currentMonthKey;

    const currentMonthTransactions = transactions.filter(t => filterCurrentMonth(t.date));
    const currentMonthIncomes = currentMonthTransactions.filter(t => t.type === TransactionType.INCOME);
    const currentMonthExpenses = currentMonthTransactions.filter(t => t.type === TransactionType.EXPENSE);

    const totalIncomes = currentMonthIncomes.reduce((sum, t) => sum + t.amount, 0);
    const totalExpenses = currentMonthExpenses.reduce((sum, t) => sum + t.amount, 0);
    const netProfitFinance = totalIncomes - totalExpenses;

    const shiftEarningsTotal = safeNumber(shiftState.earnings?.uber) + safeNumber(shiftState.earnings?.n99) + safeNumber(shiftState.earnings?.indrive) + safeNumber(shiftState.earnings?.private);
    const shiftTotalExpenses = safeNumber(shiftState.expenses);
    const netProfitShift = shiftEarningsTotal - shiftTotalExpenses;

    const hasActiveShift = shiftState.isActive || shiftState.elapsedSeconds > 0 || shiftEarningsTotal > 0 || shiftTotalExpenses > 0;
    const combinedNetProfit = hasActiveShift ? netProfitFinance + netProfitShift : netProfitFinance;

    const minutesWorked =
      hasActiveShift && shiftState.elapsedSeconds > 0
        ? shiftState.elapsedSeconds / 60
        : 0;

    const hrsWorked = minutesWorked / 60;
    const netPerHour = hrsWorked > 0 ? combinedNetProfit / hrsWorked : 0;

    const netPerKm =
      shiftState.km > 0 ? combinedNetProfit / shiftState.km : 0;

    const minutesWorkedShift =
      shiftState.elapsedSeconds > 0 ? shiftState.elapsedSeconds / 60 : 0;
    const hrsWorkedShift = minutesWorkedShift / 60;
    const netPerHourShift =
      hasActiveShift && hrsWorkedShift > 0 ? netProfitShift / hrsWorkedShift : 0;

    const baseWorkedKm = shiftState.km > 0 ? shiftState.km : 0;
    const netPerKmShift =
      hasActiveShift && baseWorkedKm > 0 ? netProfitShift / baseWorkedKm : 0;

    const plannedDatesCurrentMonth = plannedWorkDates.filter(d => d.startsWith(currentMonthKey));
    const totalWorkingDaysPlanned = countBusinessDays(plannedDatesCurrentMonth);

    const todayStr = getTodayString();
    const pastOrTodayPlanned = plannedDatesCurrentMonth.filter(d => d <= todayStr);
    const daysAlreadyWorkedPlanned = countBusinessDays(pastOrTodayPlanned);

    const effectiveMonthlyGoal = safeNumber(monthlySalaryGoal);
    const remainingToMonthlyGoal = Math.max(0, effectiveMonthlyGoal - netProfitFinance);

    const { 
      totalBills,
      effectiveOpeningBalance,
      remainingBillsAfterCash,
      totalSalaryGoal,
      monthlyBillsAndSalary,
      avgPerDay,
      overdueAndTodayTotal,
      overdueAfterCash,
    } = computeMinimumForBills(
      bills,
      openingBalances,
      monthlySalaryGoal,
      undefined
    );

    const combinedGoal = effectiveMonthlyGoal + totalBills;
    const combinedRemaining = Math.max(0, combinedGoal - (netProfitFinance + effectiveOpeningBalance));

    const overdueAndTodayResult = computeMinimumForBills(
      bills,
      openingBalances,
      monthlySalaryGoal,
      (bill) => {
        const billDateStr = bill.dueDate;
        return billDateStr <= todayStr;
      }
    );

    const dayOfMonth = new Date().getDate();
    const daysInMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();
    const daysRemainingIncludingToday = daysInMonth - dayOfMonth + 1;

    const netProfitForGoals = netProfitFinance;
    const effectiveBillsAfterCash = Math.max(0, totalBills - effectiveOpeningBalance);
    const totalGoalForMonth = effectiveBillsAfterCash + effectiveMonthlyGoal;
    const remainingGoalForMonth = Math.max(0, totalGoalForMonth - netProfitForGoals);

    const dailyGoal =
      daysRemainingIncludingToday > 0 ? remainingGoalForMonth / daysRemainingIncludingToday : remainingGoalForMonth;

    const dailyGoalFrozen = dailyGoal;

    const remainingForToday = dailyGoalFrozen;

    const overdueAfterCashToday = overdueAndTodayResult.overdueAfterCash;
    const salaryShare =
      totalGoalForMonth > 0
        ? (effectiveMonthlyGoal / totalGoalForMonth) * dailyGoalFrozen
        : 0;
    const billsShare = dailyGoalFrozen - salaryShare;

    const cashOnHand = netProfitFinance + Math.max(0, effectiveOpeningBalance);

    const remainingTodayBills =
      billsShare - Math.max(0, cashOnHand - salaryShare);

    const remainingTodaySalary =
      salaryShare - Math.max(0, cashOnHand - billsShare);

    const accountsRemainingWithShift = Math.max(0, billsShare - combinedNetProfit);

    const todayBills = bills.filter(b => b.dueDate === todayStr && !b.isPaid);
    const todayBillsTotal = todayBills.reduce((sum, b) => sum + b.amount, 0);
    const remainingAccountsToday = Math.max(0, todayBillsTotal - netProfitFinance);

    const upcomingBills = bills
      .filter(b => !b.isPaid)
      .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
      .slice(0, 3);

    return {
      netProfit: combinedNetProfit,
      netProfitFinance,
      netProfitShift,
      totalIncomes,
      totalExpenses,
      netPerHour,
      netPerKm,
      netPerHourShift,
      netPerKmShift,
      hoursWorked: hrsWorked,
      hoursWorkedShift: hrsWorkedShift,
      kmDriven: shiftState.km,
      totalWorkingDaysPlanned,
      daysAlreadyWorkedPlanned,
      remainingToMonthlyGoal,
      totalBills,
      openingBalance: effectiveOpeningBalance,
      remainingBillsAfterCash,
      overdueAndTodayTotal,
      overdueAfterCash,
      monthlyBillsAndSalary,
      avgPerDay,
      monthlySalaryGoal: effectiveMonthlyGoal,
      monthlyGoalTotal: combinedGoal,
      monthlyGoalRemaining: combinedRemaining,
      dailyGoal,
      remainingForToday,
      remainingAccountsToday,
      remainingSalaryToday: Math.max(0, remainingTodaySalary),
      remainingTodayBills: Math.max(0, remainingTodayBills),
      accountsRemainingWithShift,
      cashOnHand,
      shiftEarningsTotal,
      shiftTotalExpenses,
      overdueAfterCashToday,
      todayBillsTotal,
      upcomingBills,
      totalGoalForMonth,
      remainingGoalForMonth,
      S: effectiveMonthlyGoal,
    };
  }, [transactions, bills, shiftState, workDays, plannedWorkDates, monthlySalaryGoal, openingBalances]);

  const handleLogout = async () => {
    await logoutUser();
    clearShiftTimer();
    setTransactions([]);
    setBills([]);
    setCategories(DEFAULT_CATEGORIES);
    setShiftState(createInitialShiftState());
    setWorkDays([1, 2, 3, 4, 5, 6]);
    setPlannedWorkDates([]);
    setMonthlySalaryGoal(0);
    setOpeningBalances({});
  };

  const handleAddCategory = (name: string) => {
    if (!name) return;
    const trimmed = name.trim();
    if (!trimmed) return;
    if (categories.some(c => c.name.toLowerCase() === trimmed.toLowerCase())) return;

    const newCategory: Category = {
      id: `cat_${Date.now()}`,
      name: trimmed,
      type: 'both',
      driverId: user?.uid || '',
    };

    setCategories(prev => [...prev, newCategory]);
  };

  const handleEditCategory = (id: string, newName: string) => {
    if (!newName) return;
    const trimmed = newName.trim();
    if (!trimmed) return;
    if (categories.some(c => c.name.toLowerCase() === trimmed.toLowerCase() && c.id !== id)) return;

    setCategories(prev =>
      prev.map(c => (c.id === id ? { ...c, name: trimmed } : c))
    );

    setTransactions(prev =>
      prev.map(t => (t.categoryId === id ? { ...t, category: trimmed } : t))
    );
    setBills(prev =>
      prev.map(b => (b.categoryId === id ? { ...b, category: trimmed } : b))
    );
  };

  const handleDeleteCategory = (id: string) => {
    setCategories(prev => prev.filter(c => c.id !== id));
  };

  const handleOpenEntry = (category: 'uber' | '99' | 'indrive' | 'private' | 'km' | 'expense') => {
    if (!shiftState.isActive || shiftState.isPaused) return;
    setEntryCategory(category);
    setEntryModalOpen(true);
  };

  const handleShiftValueChange = (category: 'uber' | '99' | 'indrive' | 'private' | 'km' | 'expense', value: number, description?: string) => {
    setShiftState(prev => {
      const newState: ShiftState = { ...prev };

      if (category === 'km') {
        newState.km = Math.max(0, (newState.km || 0) + value);
      } else if (category === 'expense') {
        const newExpense = {
          id: `exp_${Date.now()}`,
          amount: value,
          description: description || 'Despesa de turno',
          category: 'Outros' as ExpenseCategory,
        };
        newState.expenseList = [...(newState.expenseList || []), newExpense];
        newState.expenses = (newState.expenses || 0) + value;
      } else {
        if (!newState.earnings) {
          newState.earnings = { uber: 0, n99: 0, indrive: 0, private: 0 };
        }
        if (category === 'uber') {
          newState.earnings.uber = (newState.earnings.uber || 0) + value;
        } else if (category === '99') {
          newState.earnings.n99 = (newState.earnings.n99 || 0) + value;
        } else if (category === 'indrive') {
          newState.earnings.indrive = (newState.earnings.indrive || 0) + value;
        } else if (category === 'private') {
          newState.earnings.private = (newState.earnings.private || 0) + value;
        }
      }

      return newState;
    });
  };

  const formatElapsedTime = (seconds: number): string => {
    if (!Number.isFinite(seconds) || seconds < 0) seconds = 0;
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const handleStartShift = () => {
    if (shiftState.isActive && !shiftState.isPaused) return;

    clearShiftTimer();
    elapsedBaseRef.current = 0;

    const startTime = Date.now();
    shiftStartRef.current = startTime;

    setShiftState({
      isActive: true,
      isPaused: false,
      startTime,
      elapsedSeconds: 0,
      earnings: { uber: 0, n99: 0, indrive: 0, private: 0 },
      expenses: 0,
      expenseList: [],
      km: 0,
    });
  };

  const handlePauseShift = () => {
    setShiftState(prev => {
      if (!prev.isActive) return prev;

      if (prev.isPaused) {
        const resumeNow = Date.now();
        shiftStartRef.current = resumeNow;
        elapsedBaseRef.current = prev.elapsedSeconds;
        return { ...prev, isPaused: false, startTime: resumeNow };
      }

      const startTs = shiftStartRef.current ?? prev.startTime ?? Date.now();
      const elapsedSinceStart = Math.max(0, Math.floor((Date.now() - startTs) / 1000));
      const updatedElapsed = Math.max(
        prev.elapsedSeconds,
        elapsedBaseRef.current + elapsedSinceStart
      );

      elapsedBaseRef.current = updatedElapsed;
      shiftStartRef.current = null;
      clearShiftTimer();

      return { ...prev, isPaused: true, elapsedSeconds: updatedElapsed };
    });
  };

  const handleStopShift = () => {
    clearShiftTimer();

    const finalizeElapsed = (prev: ShiftState) => {
      if (!prev.isActive || prev.isPaused) return prev.elapsedSeconds;

      const startTs = shiftStartRef.current ?? prev.startTime ?? Date.now();
      const elapsedSinceStart = Math.max(0, Math.floor((Date.now() - startTs) / 1000));

      return Math.max(prev.elapsedSeconds, elapsedBaseRef.current + elapsedSinceStart);
    };

    setShiftState(prev => ({
      ...prev,
      isPaused: true,
      elapsedSeconds: finalizeElapsed(prev),
    }));

    shiftStartRef.current = null;
    elapsedBaseRef.current = 0;
    setIsShiftModalOpen(true);
  };

  const handleResetShift = () => {
    clearShiftTimer();
    shiftStartRef.current = null;
    elapsedBaseRef.current = 0;
    setShiftState(createInitialShiftState());
  };

  const handleEditStartTime = (newTime: string) => {
    const [hStr, mStr] = newTime.split(':');
    const h = parseInt(hStr, 10);
    const m = parseInt(mStr, 10);

    if (Number.isNaN(h) || Number.isNaN(m)) return;

    const now = new Date();
    const newStartDate = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      h,
      m,
      0,
      0
    );

    const newStartMs = newStartDate.getTime();
    const nowMs = Date.now();

    const recalculatedElapsed = Math.max(
      0,
      Math.floor((nowMs - newStartMs) / 1000)
    );

    elapsedBaseRef.current = 0;
    shiftStartRef.current = shiftState.isPaused ? null : nowMs;

    setShiftState(prev => ({
      ...prev,
      startTime: newStartMs,
      elapsedSeconds: recalculatedElapsed,
    }));
  };

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
    
    const resetShiftState = createInitialShiftState();
    setShiftState(resetShiftState);

    if (user) {
      saveAppData({ 
        transactions: newTransactions,
        bills,
        categories,
        shiftState: resetShiftState,
        workDays,
        plannedWorkDates,
        monthlySalaryGoal,
        openingBalances,
      }, user.uid);
    }
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

  const handleEditBillClick = (bill: Bill) => { setEditingBill(bill); setIsBillModalOpen(true); };
  const toggleBillPaid = (id: string) => { setBills(prev => prev.map(b => (b.id === id ? { ...b, isPaid: !b.isPaid } : b))); };
  const handleDeleteBill = (id: string) => { setBills(prev => prev.filter(b => b.id !== id)); };
  const handleDeleteTransaction = (id: string) => { setTransactions(prev => prev.filter(t => t.id !== id)); };

  const filteredHistory = useMemo(() => {
    return filterTransactionsByRange(transactions, historyRange, historyCustomStart, historyCustomEnd);
  }, [transactions, historyRange, historyCustomStart, historyCustomEnd]);

  const pieData = useMemo(() => {
    const expenseByCategory: { [key: string]: number } = {};
    bills.forEach(bill => {
      if (!bill.isPaid) {
        const catName = bill.category || 'Outros';
        if (!expenseByCategory[catName]) expenseByCategory[catName] = 0;
        expenseByCategory[catName] += bill.amount;
      }
    });

    return Object.entries(expenseByCategory).map(([name, value]) => ({
      name,
      value,
    }));
  }, [bills]);

  const COLORS = ['#F97316', '#22C55E', '#3B82F6', '#8B5CF6', '#EC4899', '#EAB308', '#0EA5E9'];

  const hasActiveShift = shiftState.isActive || shiftState.elapsedSeconds > 0 || (shiftState.earnings && (
    shiftState.earnings.uber > 0 ||
    shiftState.earnings.n99 > 0 ||
    shiftState.earnings.indrive > 0 ||
    shiftState.earnings.private > 0
  ));

  const shiftStatusLabel = !shiftState.isActive
    ? 'Nenhum turno ativo'
    : shiftState.isPaused
      ? 'Turno pausado'
      : 'Turno em andamento';

  const shiftStatusColor = !shiftState.isActive
    ? 'bg-slate-700 text-slate-100'
    : shiftState.isPaused
      ? 'bg-amber-500 text-black'
      : 'bg-emerald-500 text-white';

  const remainingDailyGoal = stats.remainingForToday;
  const remainingSalaryToday = stats.remainingSalaryToday;
  const remainingAccountsTodayShift = stats.accountsRemainingWithShift;

  const handleHistoryRangeChange = (range: 'today' | 'week' | 'month' | 'all' | 'custom') => {
    setHistoryRange(range);
    if (range !== 'custom') {
      setHistoryCustomStart('');
      setHistoryCustomEnd('');
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
          <p className="text-sm text-slate-300">Carregando FinanDrive...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  const now = new Date();
  const hours = now.getHours();
  const greeting =
    hours < 12 ? 'Bom dia' :
    hours < 18 ? 'Boa tarde' :
    'Boa noite';

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50">
      <div className="max-w-5xl mx-auto flex flex-col min-h-screen">
        <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur-md sticky top-0 z-20">
          <div className="px-4 py-3 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <button
                className="md:hidden inline-flex items-center justify-center w-9 h-9 rounded-full border border-slate-700 bg-slate-900 hover:bg-slate-800 transition-colors"
                onClick={() => setMobileMenuOpen(prev => !prev)}
              >
                {mobileMenuOpen ? (
                  <CloseIcon className="w-5 h-5 text-slate-100" />
                ) : (
                  <Menu className="w-5 h-5 text-slate-100" />
                )}
              </button>
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-blue-500 to-emerald-400 flex items-center justify-center shadow-lg shadow-blue-500/40">
                  <Gauge className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-xs text-slate-400">{greeting},</p>
                  <h1 className="font-semibold text-slate-50 tracking-tight">
                    FinanDrive <span className="text-xs text-emerald-400/80 ml-1">BETA</span>
                  </h1>
                </div>
              </div>
            </div>

            <div className="hidden md:flex items-center gap-2">
              <button
                onClick={() => setShowValues(v => !v)}
                className="text-xs px-3 py-1.5 rounded-full border border-slate-700 bg-slate-900 hover:bg-slate-800 flex items-center gap-2 text-slate-200"
              >
                {showValues ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                {showValues ? 'Ocultar valores' : 'Mostrar valores'}
              </button>
              <button
                onClick={() => setIsSettingsModalOpen(true)}
                className="text-xs px-3 py-1.5 rounded-full border border-slate-700 bg-slate-900 hover:bg-slate-800 flex items-center gap-1.5 text-slate-200"
              >
                <Settings className="w-3.5 h-3.5" />
                Configurações
              </button>
              <button
                onClick={handleLogout}
                className="text-xs px-3 py-1.5 rounded-full border border-rose-500/40 bg-rose-950/60 hover:bg-rose-900 flex items-center gap-1.5 text-rose-100"
              >
                <LogOut className="w-3.5 h-3.5" />
                Sair
              </button>
            </div>
          </div>

          <div className="px-4 pb-3 flex items-center justify-between gap-3">
            <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium ${shiftStatusColor}`}>
              <Clock className="w-3.5 h-3.5" />
              <span>{shiftStatusLabel}</span>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={handleStartShift}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-emerald-500 hover:bg-emerald-400 text-emerald-950 shadow shadow-emerald-500/40"
              >
                <Play className="w-3.5 h-3.5" />
                Iniciar
              </button>
              <button
                onClick={handlePauseShift}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border border-amber-400/60 bg-amber-950/70 hover:bg-amber-900 text-amber-100"
              >
                <Pause className="w-3.5 h-3.5" />
                Pausar
              </button>
              <button
                onClick={handleStopShift}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border border-rose-500/60 bg-rose-950/70 hover:bg-rose-900 text-rose-100"
              >
                <StopCircle className="w-3.5 h-3.5" />
                Encerrar
              </button>
            </div>
          </div>

          <nav className="border-t border-slate-800">
            <div className="px-2 md:px-4">
              <div className="flex md:hidden overflow-x-auto no-scrollbar gap-1 py-2">
                {[
                  { id: 'dashboard', label: 'Painel', icon: LayoutDashboard },
                  { id: 'shift', label: 'Turno', icon: Clock },
                  { id: 'bills', label: 'Contas', icon: Wallet },
                  { id: 'history', label: 'Histórico', icon: History },
                  { id: 'reports', label: 'Relatórios', icon: PieChartIcon },
                ].map(tab => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => {
                        setActiveTab(tab.id as any);
                        setMobileMenuOpen(false);
                      }}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs border ${
                        isActive
                          ? 'bg-blue-600 border-blue-500 text-white'
                          : 'bg-slate-950 border-slate-700 text-slate-200 hover:bg-slate-900'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      {tab.label}
                    </button>
                  );
                })}
              </div>

              <div className="hidden md:flex items-center gap-1 py-2">
                {[
                  { id: 'dashboard', label: 'Painel Geral', icon: LayoutDashboard },
                  { id: 'shift', label: 'Turno', icon: Clock },
                  { id: 'bills', label: 'Contas & Metas', icon: Wallet },
                  { id: 'history', label: 'Histórico', icon: History },
                  { id: 'reports', label: 'Relatórios', icon: PieChartIcon },
                ].map(tab => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id as any)}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs border transition-colors ${
                        isActive
                          ? 'bg-blue-600 border-blue-500 text-white shadow-sm shadow-blue-500/40'
                          : 'bg-slate-950 border-slate-700 text-slate-200 hover:bg-slate-900'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      {tab.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </nav>
        </header>

        <main className="flex-1 px-4 py-3 space-y-4">
          {isLoadingData && (
            <div className="mb-3">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900 border border-slate-700 text-xs text-slate-300">
                <Info className="w-3.5 h-3.5 text-blue-400" />
                Sincronizando dados com a nuvem...
              </div>
            </div>
          )}

          {activeTab === 'dashboard' && (
            <section className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <StatCard
                  title="Lucro líquido (real)"
                  icon={Wallet}
                  value={showValues ? stats.netProfit : null}
                  description="Saldo final considerando entradas e saídas"
                  highlight
                  extraInfoLines={
                    showValues
                      ? [
                          `Despesas do mês: ${formatCurrency(stats.totalExpenses)}`,
                          `Caixa atual: ${formatCurrency(stats.cashOnHand)}`,
                        ]
                      : []
                  }
                />
                <StatCard
                  title="Meta Mensal (real)"
                  icon={Target}
                  value={showValues ? stats.remainingToMonthlyGoal : null}
                  description="Falta para bater a meta de salário"
                  extraInfoLines={
                    showValues
                      ? [
                          `Meta do mês: ${formatCurrency(stats.S)}`,
                          stats.remainingToMonthlyGoal <= 0
                            ? 'Meta alcançada! Tudo que vier é lucro.'
                            : stats.netProfit <= 0
                              ? 'Comece o mês virando o jogo, foco no lucro.'
                              : 'Mantenha o ritmo para bater a meta.'
                        ]
                      : []
                  }
                />
                <StatCard
                  title="Rendimento do mês"
                  icon={Gauge}
                  value={showValues ? stats.netPerHour : null}
                  description="Lucro líquido por hora trabalhada"
                  extraInfoLines={
                    showValues
                      ? [
                          `Horas no mês: ${stats.hoursWorked.toFixed(1)}h`,
                          `R$/km: ${stats.netPerKm.toFixed(2)}`
                        ]
                      : []
                  }
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-start">
                <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-3 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <h2 className="text-sm font-semibold text-slate-50 flex items-center gap-1.5">
                        <CalendarClock className="w-4 h-4 text-blue-400" />
                        Progresso do mês
                      </h2>
                      <p className="text-xs text-slate-400">
                        Baseado nos dias planejados para trabalhar
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[11px] text-slate-400">
                        Dias planejados
                      </p>
                      <p className="text-sm font-semibold text-slate-50">
                        {stats.totalWorkingDaysPlanned || 0} dias
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-[11px] text-slate-400">
                      <span>Meta de salário + contas</span>
                      {showValues && (
                        <span>{formatCurrency(stats.monthlyGoalTotal)}</span>
                      )}
                    </div>
                    <div className="relative h-2.5 rounded-full bg-slate-800 overflow-hidden">
                      <div
                        className="absolute inset-y-0 left-0 bg-gradient-to-r from-emerald-400 to-blue-500 transition-all"
                        style={{
                          width: stats.monthlyGoalTotal > 0
                            ? `${Math.min(100, (stats.monthlyGoalTotal - stats.monthlyGoalRemaining) / stats.monthlyGoalTotal * 100)}%`
                            : '0%',
                        }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-slate-400">
                      <span>Progresso atual</span>
                      {showValues && (
                        <span>
                          {formatCurrency(stats.monthlyGoalTotal - stats.monthlyGoalRemaining)} de{" "}
                          {formatCurrency(stats.monthlyGoalTotal)}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 mt-2">
                    <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-2.5">
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-[11px] text-slate-400 flex items-center gap-1">
                          <ArrowUpRight className="w-3 h-3 text-emerald-400" />
                          Faturado no mês
                        </span>
                      </div>
                      <p className="mt-0.5 text-sm font-semibold text-slate-50">
                        {showValues ? formatCurrency(stats.netProfitFinance) : '•••••'}
                      </p>
                    </div>
                    <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-2.5">
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-[11px] text-slate-400 flex items-center gap-1">
                          <ArrowDownRight className="w-3 h-3 text-rose-400" />
                          Despesas do mês
                        </span>
                      </div>
                      <p className="mt-0.5 text-sm font-semibold text-slate-50">
                        {showValues ? formatCurrency(stats.totalExpenses) : '•••••'}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-3 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <h2 className="text-sm font-semibold text-slate-50 flex items-center gap-1.5">
                        <TrendingDown className="w-4 h-4 text-amber-400" />
                        Próximos pagamentos
                      </h2>
                      <p className="text-xs text-slate-400">
                        Contas em aberto ordenadas pelo vencimento
                      </p>
                    </div>
                    {showValues && (
                      <div className="text-right">
                        <p className="text-[11px] text-slate-400">
                          Total de contas do mês
                        </p>
                        <p className="text-sm font-semibold text-slate-50">
                          {formatCurrency(stats.totalBills)}
                        </p>
                      </div>
                    )}
                  </div>

                  {stats.upcomingBills.length === 0 ? (
                    <div className="flex items-center gap-2 text-xs text-slate-400 bg-slate-950/70 border border-slate-800 rounded-xl px-3 py-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Não há contas em aberto cadastradas para este mês.</span>
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      {stats.upcomingBills.map((bill) => (
                        <div
                          key={bill.id}
                          className="flex items-center justify-between gap-2 bg-slate-950/70 border border-slate-800 rounded-xl px-3 py-2"
                        >
                          <div>
                            <p className="text-xs font-medium text-slate-100 flex items-center gap-1.5">
                              <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-blue-500/10 border border-blue-500/40 text-[10px] text-blue-300">
                                {bill.category?.[0] || 'C'}
                              </span>
                              {bill.description || bill.category || 'Conta'}
                            </p>
                            <p className="text-[11px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                              <CalendarClock className="w-3 h-3 text-slate-500" />
                              Vence em {formatDateBr(bill.dueDate)}
                            </p>
                          </div>
                          {showValues && (
                            <div className="text-right">
                              <p className="text-xs font-semibold text-slate-50">
                                {formatCurrency(bill.amount)}
                              </p>
                              <p className="text-[11px] text-amber-400 flex items-center justify-end gap-1 mt-0.5">
                                <AlertCircle className="w-3 h-3" />
                                Em aberto
                              </p>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {showValues && (
                    <div className="mt-2 grid grid-cols-2 gap-2 text-[11px] text-slate-300">
                      <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-2 flex flex-col gap-0.5">
                        <span className="flex items-center gap-1 text-slate-400">
                          <ArrowDownCircle className="w-3 h-3 text-amber-400" />
                          Cobertura necessária (mês)
                        </span>
                        <span className="font-semibold text-slate-50">
                          {formatCurrency(stats.remainingBillsAfterCash)}
                        </span>
                      </div>
                      <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-2 flex flex-col gap-0.5">
                        <span className="flex items-center gap-1 text-slate-400">
                          <ArrowUpCircle className="w-3 h-3 text-emerald-400" />
                          Salário alvo
                        </span>
                        <span className="font-semibold text-slate-50">
                          {formatCurrency(stats.monthlySalaryGoal)}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </section>
          )}

          {activeTab === 'shift' && (
            <section className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-3 flex flex-col gap-2">
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-[11px] text-slate-400 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-emerald-400" />
                      Tempo de turno
                    </span>
                  </div>
                  <p className="text-lg font-semibold text-slate-50">
                    {formatElapsedTime(shiftState.elapsedSeconds)}
                  </p>
                  <p className="text-[11px] text-slate-500">
                    {shiftState.isActive
                      ? shiftState.isPaused
                        ? 'Pausado - retome para continuar contando.'
                        : 'Contando apenas quando o turno está ativo.'
                      : 'Inicie o turno para começar a contagem.'}
                  </p>
                </div>

                <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-3 flex flex-col gap-2">
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-[11px] text-slate-400 flex items-center gap-1">
                      <Gauge className="w-3.5 h-3.5 text-blue-400" />
                      R$/hora (turno)
                    </span>
                  </div>
                  <p className="text-lg font-semibold text-slate-50">
                    {showValues ? formatCurrency(stats.netPerHourShift || 0) : '•••••'}
                  </p>
                  <p className="text-[11px] text-slate-500">
                    Considerando somente o período do turno atual.
                  </p>
                </div>

                <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-3 flex flex-col gap-2">
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-[11px] text-slate-400 flex items-center gap-1">
                      <Fuel className="w-3.5 h-3.5 text-emerald-400" />
                      R$/km (turno)
                    </span>
                  </div>
                  <p className="text-lg font-semibold text-slate-50">
                    {showValues ? formatCurrency(stats.netPerKmShift || 0) : '•••••'}
                  </p>
                  <p className="text-[11px] text-slate-500">
                    Baseado nos lançamentos de KM e despesas do turno.
                  </p>
                </div>

                <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-3 flex flex-col gap-2">
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-[11px] text-slate-400 flex items-center gap-1">
                      <Wallet className="w-3.5 h-3.5 text-emerald-400" />
                      Líquido do turno
                    </span>
                  </div>
                  <p className="text-lg font-semibold text-slate-50">
                    {showValues ? formatCurrency(stats.netProfitShift || 0) : '•••••'}
                  </p>
                  <p className="text-[11px] text-slate-500">
                    Entradas do turno menos as despesas lançadas nele.
                  </p>
                </div>
              </div>

              <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-3 space-y-3">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <div>
                    <h2 className="text-sm font-semibold text-slate-50 flex items-center gap-1.5">
                      <Target className="w-4 h-4 text-emerald-400" />
                      Meta diária do dia (real)
                    </h2>
                    <p className="text-xs text-slate-400">
                      Considerando salário alvo, contas do mês e saldo em caixa.
                    </p>
                  </div>
                  {showValues && (
                    <div className="text-right">
                      <p className="text-[11px] text-slate-400">
                        Meta total do dia
                      </p>
                      <p className="text-sm font-semibold text-slate-50">
                        {formatCurrency(stats.dailyGoal || 0)}
                      </p>
                    </div>
                  )}
                </div>

                <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-2.5 flex items-center justify-between gap-2">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[11px] text-slate-400">Faturado do dia</span>
                    <span className="text-sm font-semibold text-emerald-400">
                      {showValues ? formatCurrency(stats.netProfitFinance) : '•••••'}
                    </span>
                  </div>
                  <div className="flex flex-col items-end gap-0.5">
                    <span className="text-[11px] text-slate-400">
                      Falta para a meta
                    </span>
                    <span className="text-sm font-semibold text-slate-50">
                      {showValues
                        ? formatCurrency(Math.max(0, remainingDailyGoal || 0))
                        : '•••••'}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-2.5">
                    <p className="text-[11px] text-slate-400 flex items-center gap-1">
                      <ArrowRight className="w-3 h-3 text-emerald-400" />
                      Falta p/ meta salário (hoje)
                    </p>
                    <p className="mt-1 text-sm font-semibold text-slate-50">
                      {showValues ? formatCurrency(Math.max(0, remainingSalaryToday || 0)) : '•••••'}
                    </p>
                  </div>
                  <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-2.5">
                    <p className="text-[11px] text-slate-400 flex items-center gap-1">
                      <ArrowRight className="w-3 h-3 text-amber-400" />
                      Falta p/ meta contas (hoje)
                    </p>
                    <p className="mt-1 text-sm font-semibold text-slate-50">
                      {showValues ? formatCurrency(Math.max(0, remainingAccountsTodayShift || 0)) : '•••••'}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-1">
                  <button
                    onClick={() => handleOpenEntry('uber')}
                    className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl border border-slate-700 bg-slate-950 hover:bg-slate-900 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center justify-center w-6 h-6 rounded-lg bg-slate-800 text-xs font-semibold">
                        U
                      </span>
                      <span className="text-[11px] text-slate-200 text-left">
                        Uber
                      </span>
                    </div>
                    {showValues && (
                      <span className="text-xs font-semibold text-emerald-400">
                        {formatCurrency(shiftState.earnings.uber || 0)}
                      </span>
                    )}
                  </button>

                  <button
                    onClick={() => handleOpenEntry('99')}
                    className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl border border-slate-700 bg-slate-950 hover:bg-slate-900 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center justify-center w-6 h-6 rounded-lg bg-slate-800 text-xs font-semibold">
                        99
                      </span>
                      <span className="text-[11px] text-slate-200 text-left">
                        99
                      </span>
                    </div>
                    {showValues && (
                      <span className="text-xs font-semibold text-emerald-400">
                        {formatCurrency(shiftState.earnings.n99 || 0)}
                      </span>
                    )}
                  </button>

                  <button
                    onClick={() => handleOpenEntry('indrive')}
                    className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl border border-slate-700 bg-slate-950 hover:bg-slate-900 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center justify-center w-6 h-6 rounded-lg bg-slate-800 text-xs font-semibold">
                        IN
                      </span>
                      <span className="text-[11px] text-slate-200 text-left">
                        InDrive
                      </span>
                    </div>
                    {showValues && (
                      <span className="text-xs font-semibold text-emerald-400">
                        {formatCurrency(shiftState.earnings.indrive || 0)}
                      </span>
                    )}
                  </button>

                  <button
                    onClick={() => handleOpenEntry('private')}
                    className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl border border-slate-700 bg-slate-950 hover:bg-slate-900 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center justify-center w-6 h-6 rounded-lg bg-slate-800 text-xs font-semibold">
                        P
                      </span>
                      <span className="text-[11px] text-slate-200 text-left">
                        Particular
                      </span>
                    </div>
                    {showValues && (
                      <span className="text-xs font-semibold text-emerald-400">
                        {formatCurrency(shiftState.earnings.private || 0)}
                      </span>
                    )}
                  </button>

                  <button
                    onClick={() => handleOpenEntry('km')}
                    className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl border border-slate-700 bg-slate-950 hover:bg-slate-900 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center justify-center w-6 h-6 rounded-lg bg-slate-800 text-xs font-semibold">
                        KM
                      </span>
                      <span className="text-[11px] text-slate-200 text-left">
                        Quilometragem
                      </span>
                    </div>
                    {showValues && (
                      <span className="text-xs font-semibold text-emerald-400">
                        {shiftState.km} km
                      </span>
                    )}
                  </button>

                  <button
                    onClick={() => handleOpenEntry('expense')}
                    className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl border border-slate-700 bg-slate-950 hover:bg-slate-900 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center justify-center w-6 h-6 rounded-lg bg-slate-800 text-xs font-semibold">
                        R$
                      </span>
                      <span className="text-[11px] text-slate-200 text-left">
                        Despesa do turno
                      </span>
                    </div>
                    {showValues && (
                      <span className="text-xs font-semibold text-rose-400">
                        {formatCurrency(shiftState.expenses || 0)}
                      </span>
                    )}
                  </button>
                </div>

                {shiftState.expenseList.length > 0 && (
                  <div className="mt-2 bg-slate-950/80 border border-slate-800 rounded-xl p-2.5 space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] text-slate-400 flex items-center gap-1">
                        <TrendingDown className="w-3 h-3 text-rose-400" />
                        Despesas deste turno
                      </span>
                      {showValues && (
                        <span className="text-[11px] text-slate-300">
                          Total: {formatCurrency(shiftState.expenses || 0)}
                        </span>
                      )}
                    </div>
                    <div className="max-h-28 overflow-y-auto space-y-1">
                      {shiftState.expenseList.map(exp => (
                        <div
                          key={exp.id}
                          className="flex items-center justify-between gap-2 text-[11px] text-slate-300"
                        >
                          <span className="truncate">{exp.description}</span>
                          {showValues && (
                            <span className="text-rose-300">
                              {formatCurrency(exp.amount)}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="mt-2 flex items-center justify-between gap-2 text-[11px] text-slate-400">
                  <div className="flex items-center gap-1.5">
                    <AlertTriangle className="w-3 h-3 text-amber-400" />
                    <span>
                      O tempo só conta quando o turno está ativo e não pausado. Se o app fechar e o turno continuar ativo, ao voltar ele tenta recuperar o tempo pelo relógio.
                    </span>
                  </div>
                  <button
                    onClick={handleResetShift}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded-full border border-slate-700 text-[11px] text-slate-300 hover:bg-slate-900"
                  >
                    Zerar turno
                  </button>
                </div>
              </div>
            </section>
          )}

          {activeTab === 'bills' && (
            <section className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <StatCard
                  title="Caixa atual (real)"
                  icon={Wallet}
                  value={showValues ? stats.cashOnHand : null}
                  description="Lucro líquido + saldo inicial do mês"
                  extraInfoLines={
                    showValues
                      ? [
                          `Lucro líquido do mês: ${formatCurrency(stats.netProfitFinance)}`,
                          `Saldo inicial: ${formatCurrency(stats.openingBalance)}`,
                        ]
                      : []
                  }
                />
                <StatCard
                  title="Cobertura de contas"
                  icon={TrendingDown}
                  value={showValues ? stats.remainingBillsAfterCash : null}
                  description="Contas do mês menos o saldo em caixa"
                  extraInfoLines={
                    showValues
                      ? [
                          `Total de contas: ${formatCurrency(stats.totalBills)}`,
                          `Coberto por caixa: ${formatCurrency(stats.totalBills - stats.remainingBillsAfterCash)}`,
                        ]
                      : []
                  }
                />
                <StatCard
                  title="Pressão do dia"
                  icon={AlertTriangle}
                  value={showValues ? stats.overdueAfterCashToday : null}
                  description="Contas vencidas/para hoje sem cobertura"
                  extraInfoLines={
                    showValues
                      ? [
                          `Contas vencidas+hoje: ${formatCurrency(stats.overdueAndTodayTotal)}`,
                          `Caixa considerado: ${formatCurrency(stats.openingBalance)}`,
                        ]
                      : []
                  }
                />
              </div>

              <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-3 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <h2 className="text-sm font-semibold text-slate-50 flex items-center gap-1.5">
                      <Wallet className="w-4 h-4 text-emerald-400" />
                      Contas do mês
                    </h2>
                    <p className="text-xs text-slate-400">
                      Use esta área para controlar vencimentos e metas de cobertura.
                    </p>
                  </div>
                  <button
                    onClick={() => { setEditingBill(null); setIsBillModalOpen(true); }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white shadow shadow-blue-500/40"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Nova conta
                  </button>
                </div>

                {bills.length === 0 ? (
                  <div className="flex items-center gap-2 text-xs text-slate-400 bg-slate-950/70 border border-slate-800 rounded-xl px-3 py-2">
                    <Info className="w-3.5 h-3.5 text-blue-400" />
                    <span>Nenhuma conta cadastrada ainda. Adicione suas contas fixas e variáveis do mês.</span>
                  </div>
                ) : (
                  <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
                    {bills
                      .slice()
                      .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
                      .map(bill => (
                        <div
                          key={bill.id}
                          className="flex items-center gap-2 bg-slate-950/80 border border-slate-800 rounded-xl px-3 py-2 text-xs"
                        >
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-slate-100 truncate">
                              {bill.description || bill.category || 'Conta'}
                            </p>
                            <p className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                              <CalendarClock className="w-3 h-3" />
                              Vence em {formatDateBr(bill.dueDate)}
                            </p>
                          </div>
                          <div className="flex flex-col items-end gap-0.5">
                            {showValues && (
                              <p className="font-semibold text-slate-50">
                                {formatCurrency(bill.amount)}
                              </p>
                            )}
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => toggleBillPaid(bill.id)}
                                className={`px-2 py-0.5 rounded-full text-[11px] border ${
                                  bill.isPaid
                                    ? 'bg-emerald-500/10 border-emerald-500/60 text-emerald-200'
                                    : 'bg-amber-500/10 border-amber-500/60 text-amber-200'
                                }`}
                              >
                                {bill.isPaid ? 'Paga' : 'Em aberto'}
                              </button>
                              <button
                                onClick={() => handleEditBillClick(bill)}
                                className="p-1 rounded-full hover:bg-slate-800 text-slate-300"
                              >
                                <Edit2 className="w-3 h-3" />
                              </button>
                              <button
                                onClick={() => handleDeleteBill(bill.id)}
                                className="p-1 rounded-full hover:bg-slate-800 text-rose-300"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            </section>
          )}

          {activeTab === 'history' && (
            <section className="space-y-4">
              <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-3 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <h2 className="text-sm font-semibold text-slate-50 flex items-center gap-1.5">
                      <History className="w-4 h-4 text-blue-400" />
                      Histórico de lançamentos
                    </h2>
                    <p className="text-xs text-slate-400">
                      Filtros rápidos para analisar seu desempenho.
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {(['today', 'week', 'month', 'all'] as const).map(range => (
                      <button
                        key={range}
                        onClick={() => handleHistoryRangeChange(range)}
                        className={`text-[11px] px-2.5 py-1 rounded-full border ${
                          historyRange === range
                            ? 'bg-blue-600 border-blue-500 text-white'
                            : 'bg-slate-950 border-slate-700 text-slate-200 hover:bg-slate-900'
                        }`}
                      >
                        {range === 'today'
                          ? 'Hoje'
                          : range === 'week'
                            ? 'Semana'
                            : range === 'month'
                              ? 'Mês'
                              : 'Tudo'}
                      </button>
                    ))}
                    <button
                      onClick={() => handleHistoryRangeChange('custom')}
                      className={`text-[11px] px-2.5 py-1 rounded-full border ${
                        historyRange === 'custom'
                          ? 'bg-blue-600 border-blue-500 text-white'
                          : 'bg-slate-950 border-slate-700 text-slate-200 hover:bg-slate-900'
                      }`}
                    >
                      Personalizado
                    </button>
                  </div>
                </div>

                {historyRange === 'custom' && (
                  <div className="flex flex-wrap items-center gap-2 text-[11px]">
                    <div className="flex items-center gap-1">
                      <span className="text-slate-300">De:</span>
                      <input
                        type="date"
                        value={historyCustomStart}
                        onChange={e => setHistoryCustomStart(e.target.value)}
                        className="bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-[11px] text-slate-100"
                      />
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-slate-300">Até:</span>
                      <input
                        type="date"
                        value={historyCustomEnd}
                        onChange={e => setHistoryCustomEnd(e.target.value)}
                        className="bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-[11px] text-slate-100"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-3 space-y-2">
                {filteredHistory.length === 0 ? (
                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <Info className="w-3.5 h-3.5 text-blue-400" />
                    <span>Nenhum lançamento encontrado nesse período.</span>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-800">
                    {filteredHistory.map((t) => (
                      <div
                        key={t.id}
                        className="flex items-center justify-between gap-2 py-1.5"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] ${
                            t.type === TransactionType.INCOME
                              ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/40'
                              : 'bg-rose-500/10 text-rose-300 border border-rose-500/40'
                          }`}>
                            {t.type === TransactionType.INCOME ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-medium text-slate-100 truncate">
                              {t.description || (t.type === TransactionType.INCOME ? 'Entrada' : 'Despesa')}
                            </p>
                            <p className="text-[11px] text-slate-400 flex items-center gap-1">
                              <CalendarClock className="w-3 h-3" />
                              {formatDateBr(t.date)} • {t.category || 'Sem categoria'}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {showValues && (
                            <span className={`text-xs font-semibold ${
                              t.type === TransactionType.INCOME ? 'text-emerald-400' : 'text-rose-400'
                            }`}>
                              {formatCurrency(t.amount)}
                            </span>
                          )}
                          <button
                            onClick={() => handleDeleteTransaction(t.id)}
                            className="p-1 rounded-full hover:bg-slate-800 text-slate-400"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>
          )}

          {activeTab === 'reports' && (
            <section className="space-y-4">
              <ReportsTab
                transactions={transactions}
                bills={bills}
                shiftState={shiftState}
                showValues={showValues}
              />
            </section>
          )}
        </main>

        <footer className="border-t border-slate-800 bg-slate-950/90">
          <div className="max-w-5xl mx-auto px-4 py-2.5 flex items-center justify-between gap-2">
            <p className="text-[11px] text-slate-500">
              FinanDrive • Assistente financeiro para motoristas de app
            </p>
            <p className="text-[11px] text-slate-500 flex items-center gap-1">
              <Gauge className="w-3 h-3" />
              Versão BETA em evolução contínua
            </p>
          </div>
        </footer>
      </div>

      {entryModalOpen && entryCategory && (
        <ShiftEntryModal
          isOpen={entryModalOpen}
          onClose={() => setEntryModalOpen(false)}
          category={entryCategory}
          onConfirm={handleShiftValueChange}
        />
      )}

      {isShiftModalOpen && (
        <ShiftModal
          isOpen={isShiftModalOpen}
          onClose={() => setIsShiftModalOpen(false)}
          onConfirm={handleSaveShift}
          shiftState={shiftState}
        />
      )}

      {isTransModalOpen && (
        <TransactionModal
          isOpen={isTransModalOpen}
          onClose={() => setIsTransModalOpen(false)}
          onSave={handleAddTransaction}
          categories={categories}
        />
      )}

      {isBillModalOpen && (
        <BillModal
          isOpen={isBillModalOpen}
          onClose={() => { setIsBillModalOpen(false); setEditingBill(null); }}
          onSave={handleSaveBill}
          editingBill={editingBill}
          categories={categories}
        />
      )}

      {isSettingsModalOpen && (
        <SettingsModal
          isOpen={isSettingsModalOpen}
          onClose={() => setIsSettingsModalOpen(false)}
          workDays={workDays}
          onWorkDaysChange={setWorkDays}
          plannedWorkDates={plannedWorkDates}
          onPlannedWorkDatesChange={setPlannedWorkDates}
          monthlySalaryGoal={monthlySalaryGoal}
          onMonthlySalaryGoalChange={setMonthlySalaryGoal}
          openingBalances={openingBalances}
          onOpeningBalancesChange={setOpeningBalances}
          categories={categories}
          onAddCategory={handleAddCategory}
          onEditCategory={handleEditCategory}
          onDeleteCategory={handleDeleteCategory}
        />
      )}
    </div>
  );
}

export default App;
