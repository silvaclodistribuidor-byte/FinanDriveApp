import React, {
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  BarChart3,
  CalendarDays,
  Car,
  Clock,
  Edit2,
  LogOut,
  Menu,
  Settings,
  Target,
  Wallet,
  X,
} from "lucide-react";
import { onAuthStateChanged, User } from "firebase/auth";

import {
  Transaction,
  TransactionType,
  Bill,
  ShiftState,
} from "./types";

import {
  auth,
  loadAppData,
  logoutUser,
  saveAppData,
  getOrCreateUserSubscription,
  checkSubscriptionStatus,
} from "./services/firestoreService";

import { SettingsModal } from "./components/SettingsModal";
import { Login } from "./components/Login";

// =======================
// Helpers
// =======================

const formatCurrency = (value: number): string => {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 2,
  });
};

const getTodayString = (): string => {
  const d = new Date();
  const year = d.getFullYear();
  const month = `${d.getMonth() + 1}`.padStart(2, "0");
  const day = `${d.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const parseDateFromInput = (value: string): Date => {
  // Espera "YYYY-MM-DD"
  const [yearString, monthString, dayString] = value.split("-");
  const year = Number(yearString);
  const month = Number(monthString);
  const day = Number(dayString);
  return new Date(year, month - 1, day);
};

const formatTime = (seconds: number): string => {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${String(h).padStart(2, "0")}h ${String(m).padStart(
    2,
    "0"
  )}min`;
};

// =======================
// Estados iniciais
// =======================

const INITIAL_TRANSACTIONS: Transaction[] = [];
const INITIAL_BILLS: Bill[] = [];

const DEFAULT_CATEGORIES: string[] = [
  "Combustível",
  "Alimentação",
  "Manutenção",
  "Seguro/Impostos",
  "Limpeza",
  "Internet/Celular",
  "Outros",
];

const INITIAL_SHIFT_STATE: ShiftState = {
  isActive: false,
  isPaused: false,
  startTime: null,
  elapsedSeconds: 0,
  earnings: {
    uber: 0,
    n99: 0,
    indrive: 0,
    private: 0,
  },
  expenses: 0,
  km: 0,
};

// =======================
// Componente principal
// =======================

const App: React.FC = () => {
  // Auth
  const [user, setUser] = useState<User | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  // App data
  const [transactions, setTransactions] = useState<Transaction[]>(
    INITIAL_TRANSACTIONS
  );
  const [bills, setBills] = useState<Bill[]>(INITIAL_BILLS);
  const [categories, setCategories] =
    useState<string[]>(DEFAULT_CATEGORIES);

  // NOVO: metas globais
  const [monthlySalaryGoal, setMonthlySalaryGoal] =
    useState<number>(0);
  const [monthlyWorkingDays, setMonthlyWorkingDays] =
    useState<number>(26);

  // UI
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [activeTab, setActiveTab] = useState<"dashboard" | "shift">(
    "dashboard"
  );
  const [showValues, setShowValues] = useState(true);
  const [isSettingsModalOpen, setIsSettingsModalOpen] =
    useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const [workDays, setWorkDays] = useState<number[]>([
    1, 2, 3, 4, 5, 6,
  ]);

  const [shiftState, setShiftState] =
    useState<ShiftState>(INITIAL_SHIFT_STATE);

  const [subscriptionStatus, setSubscriptionStatus] =
    useState<"loading" | "active" | "expired">("loading");

  // =======================
  // Auth listener
  // =======================

  useEffect(() => {
    if (!auth) {
      setIsAuthLoading(false);
      return;
    }

    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      setIsAuthLoading(false);

      if (firebaseUser) {
        // Assinatura
        const sub = await getOrCreateUserSubscription(
          firebaseUser.uid
        );
        if (sub) {
          const status = checkSubscriptionStatus(sub);
          setSubscriptionStatus(status);
        } else {
          setSubscriptionStatus("expired");
        }
      } else {
        setSubscriptionStatus("loading");
      }
    });

    return () => unsub();
  }, []);

  // =======================
  // Carregar dados do Firestore
  // =======================

  useEffect(() => {
    if (!user) return;
    setIsLoadingData(true);

    loadAppData(user.uid)
      .then((data: any) => {
        if (data) {
          if (data.transactions)
            setTransactions(data.transactions);
          else setTransactions([]);

          if (data.bills) setBills(data.bills);
          else setBills([]);

          if (data.categories) setCategories(data.categories);

          if (typeof data.shiftState === "object") {
            setShiftState({
              ...INITIAL_SHIFT_STATE,
              ...data.shiftState,
            });
          }

          if (typeof data.monthlySalaryGoal === "number") {
            setMonthlySalaryGoal(data.monthlySalaryGoal);
          }

          if (typeof data.monthlyWorkingDays === "number") {
            setMonthlyWorkingDays(data.monthlyWorkingDays);
          }
        } else {
          setTransactions([]);
          setBills([]);
        }
      })
      .finally(() => setIsLoadingData(false));
  }, [user]);

  // =======================
  // Salvar dados sempre que mudarem
  // =======================

  useEffect(() => {
    if (!user || isLoadingData) return;

    const payload = {
      transactions,
      bills,
      categories,
      shiftState,
      monthlySalaryGoal,
      monthlyWorkingDays,
    };

    saveAppData(payload as any, user.uid).catch((error) => {
      console.error("Erro ao salvar dados no Firestore:", error);
    });
  }, [
    transactions,
    bills,
    categories,
    shiftState,
    monthlySalaryGoal,
    monthlyWorkingDays,
    user,
    isLoadingData,
  ]);

  // =======================
  // Timer do turno
  // =======================

  useEffect(() => {
    if (shiftState.isActive && !shiftState.isPaused) {
      const interval = setInterval(() => {
        setShiftState((prev) => ({
          ...prev,
          elapsedSeconds: prev.elapsedSeconds + 1,
        }));
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [shiftState.isActive, shiftState.isPaused]);

  // =======================
  // Lógica de turno
  // =======================

  const startShift = () => {
    const now = new Date();
    setShiftState({
      ...INITIAL_SHIFT_STATE,
      isActive: true,
      isPaused: false,
      startTime: now.toISOString(),
      elapsedSeconds: 0,
    });
  };

  const pauseShift = () => {
    setShiftState((prev) => ({
      ...prev,
      isPaused: true,
    }));
  };

  const resumeShift = () => {
    setShiftState((prev) => ({
      ...prev,
      isPaused: false,
    }));
  };

  const endShift = () => {
    setShiftState((prev) => ({
      ...prev,
      isActive: false,
      isPaused: false,
    }));
  };

  const handleEditShiftTime = () => {
    const value = window.prompt(
      "Informe o tempo de turno em minutos (ex: 360 para 6h):",
      Math.floor(shiftState.elapsedSeconds / 60).toString()
    );
    if (!value) return;
    const minutes = parseInt(value, 10);
    if (Number.isNaN(minutes) || minutes < 0) return;

    setShiftState((prev) => ({
      ...prev,
      elapsedSeconds: minutes * 60,
    }));
  };

  // =======================
  // Estatísticas / Metas
  // =======================

  const stats = useMemo(() => {
    const totalIncome = transactions
      .filter((t) => t.type === TransactionType.INCOME)
      .reduce((acc, curr) => acc + curr.amount, 0);

    const totalExpense = transactions
      .filter((t) => t.type === TransactionType.EXPENSE)
      .reduce((acc, curr) => acc + curr.amount, 0);

    const incomeTransactions = transactions.filter(
      (t) => t.type === TransactionType.INCOME
    );
    const totalKm = incomeTransactions.reduce(
      (acc, curr) => acc + (curr.mileage || 0),
      0
    );
    const totalHours = incomeTransactions.reduce(
      (acc, curr) => acc + (curr.durationHours || 0),
      0
    );

    const earningsPerKm =
      totalKm > 0 ? totalIncome / totalKm : 0;
    const earningsPerHour =
      totalHours > 0 ? totalIncome / totalHours : 0;

    const netProfit = totalIncome - totalExpense;
    const profitMargin =
      totalIncome > 0 ? (netProfit / totalIncome) * 100 : 0;

    const todayStr = getTodayString();

    const incomeToday = transactions
      .filter(
        (t) =>
          t.type === TransactionType.INCOME &&
          t.date === todayStr
      )
      .reduce((acc, t) => acc + t.amount, 0);

    const expensesToday = transactions
      .filter(
        (t) =>
          t.type === TransactionType.EXPENSE &&
          t.date === todayStr
      )
      .reduce((acc, t) => acc + t.amount, 0);

    const netToday = incomeToday - expensesToday;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth();

    const billsThisMonth = bills.filter((b) => {
      if (!b.dueDate) return false;
      const d = parseDateFromInput(b.dueDate);
      return (
        d.getFullYear() === currentYear &&
        d.getMonth() === currentMonth
      );
    });

    const monthlyBillsTotal = billsThisMonth.reduce(
      (acc, b) => acc + b.amount,
      0
    );

    const baseWorkingDays =
      monthlyWorkingDays && monthlyWorkingDays > 0
        ? monthlyWorkingDays
        : workDays && workDays.length > 0
        ? workDays.length * 4
        : 26;

    const dailyBillsGoal =
      baseWorkingDays > 0
        ? monthlyBillsTotal / baseWorkingDays
        : 0;
    const dailySalaryGoal =
      baseWorkingDays > 0
        ? monthlySalaryGoal / baseWorkingDays
        : 0;
    const dailyTotalGoal = dailyBillsGoal + dailySalaryGoal;

    const pendingBillsTotal = bills
      .filter((b) => !b.isPaid)
      .reduce((acc, b) => acc + b.amount, 0);

    let dailyStatus:
      | "none"
      | "belowBills"
      | "between"
      | "aboveSalary" = "none";
    let goalExplanation = "";

    if (dailyTotalGoal > 0) {
      if (netToday < dailyBillsGoal - 1e-6) {
        dailyStatus = "belowBills";
        goalExplanation =
          "Você ainda não cobriu o valor das contas de hoje.";
      } else if (netToday < dailyTotalGoal - 1e-6) {
        dailyStatus = "between";
        goalExplanation =
          "Contas do dia cobertas. Continue para bater a meta de salário.";
      } else {
        dailyStatus = "aboveSalary";
        goalExplanation =
          "Meta total (contas + salário) batida hoje. Excelente!";
      }
    } else if (pendingBillsTotal > 0) {
      goalExplanation =
        "Defina sua meta de salário e dias trabalhados nas Configurações para calcular a meta diária.";
    } else {
      goalExplanation =
        "Parabéns! Nenhuma conta pendente e nenhuma meta configurada.";
    }

    return {
      totalIncome,
      totalExpense,
      netProfit,
      profitMargin,
      earningsPerKm,
      earningsPerHour,
      pendingBillsTotal,
      earningsToday: incomeToday,
      expensesToday,
      netToday,
      dailyBillsGoal,
      dailySalaryGoal,
      dailyTotalGoal,
      dailyGoal: dailyTotalGoal,
      dailyStatus,
      goalExplanation,
    };
  }, [
    transactions,
    bills,
    workDays,
    monthlySalaryGoal,
    monthlyWorkingDays,
  ]);

  // =======================
  // Metas dentro do turno
  // =======================

  const currentShiftTotal =
    shiftState.earnings.uber +
    shiftState.earnings.n99 +
    shiftState.earnings.indrive +
    shiftState.earnings.private;
  const currentShiftLiquid =
    currentShiftTotal - shiftState.expenses;

  let shiftGoalStatus:
    | "none"
    | "belowBills"
    | "between"
    | "aboveSalary" = "none";

  if (stats.dailyTotalGoal > 0) {
    if (
      currentShiftLiquid <
      (stats.dailyBillsGoal || 0) - 1e-6
    ) {
      shiftGoalStatus = "belowBills";
    } else if (
      currentShiftLiquid <
      (stats.dailyTotalGoal || 0) - 1e-6
    ) {
      shiftGoalStatus = "between";
    } else {
      shiftGoalStatus = "aboveSalary";
    }
  }

  // =======================
  // Categorias helpers
  // =======================

  const handleAddCategory = (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    if (categories.includes(trimmed)) return;
    setCategories((prev) => [...prev, trimmed]);
  };

  const handleEditCategory = (
    oldName: string,
    newName: string
  ) => {
    const trimmed = newName.trim();
    if (!trimmed) return;
    setCategories((prev) =>
      prev.map((cat) => (cat === oldName ? trimmed : cat))
    );
  };

  const handleDeleteCategory = (name: string) => {
    setCategories((prev) => prev.filter((c) => c !== name));
  };

  // =======================
  // Logout
  // =======================

  const handleLogout = async () => {
    await logoutUser();
    setUser(null);
  };

  // =======================
  // Render
  // =======================

  if (isAuthLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-slate-100 text-sm">
          Carregando FinanDrive...
        </div>
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  return (
    <div className="min-h-screen bg-slate-900 text-slate-50">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur">
        <div className="max-w-5xl mx-auto px-3 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              className="md:hidden p-2 rounded-full hover:bg-slate-800"
              onClick={() =>
                setMobileMenuOpen((prev) => !prev)
              }
            >
              {mobileMenuOpen ? (
                <X size={18} />
              ) : (
                <Menu size={18} />
              )}
            </button>
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-xl bg-indigo-600 flex items-center justify-center shadow-lg">
                <Car size={18} className="text-white" />
              </div>
              <div>
                <h1 className="text-sm md:text-base font-bold">
                  FinanDrive
                </h1>
                <p className="text-[11px] text-slate-400 hidden md:block">
                  Gestão profissional para motoristas de app
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() =>
                setShowValues((prev) => !prev)
              }
              className="hidden md:inline-flex px-3 py-1.5 text-[11px] rounded-full border border-slate-700 text-slate-300 hover:bg-slate-800"
            >
              {showValues ? "Ocultar valores" : "Mostrar valores"}
            </button>
            <button
              onClick={() => setIsSettingsModalOpen(true)}
              className="p-2 rounded-full border border-slate-700 hover:bg-slate-800"
            >
              <Settings size={16} />
            </button>
            <button
              onClick={handleLogout}
              className="p-2 rounded-full border border-slate-700 hover:bg-slate-800"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <nav className="border-t border-slate-800">
          <div className="max-w-5xl mx-auto px-3 flex gap-3 overflow-x-auto text-xs">
            <button
              onClick={() => setActiveTab("dashboard")}
              className={`py-2 border-b-2 transition-all flex items-center gap-1 ${
                activeTab === "dashboard"
                  ? "border-indigo-500 text-white"
                  : "border-transparent text-slate-400 hover:text-slate-100"
              }`}
            >
              <BarChart3 size={14} />
              Resumo
            </button>
            <button
              onClick={() => setActiveTab("shift")}
              className={`py-2 border-b-2 transition-all flex items-center gap-1 ${
                activeTab === "shift"
                  ? "border-indigo-500 text-white"
                  : "border-transparent text-slate-400 hover:text-slate-100"
              }`}
            >
              <Clock size={14} />
              Turno
            </button>
          </div>
        </nav>
      </header>

      {/* Conteúdo */}
      <main className="max-w-5xl mx-auto px-3 py-4 space-y-4">
        {/* Aviso de assinatura */}
        {subscriptionStatus === "expired" && (
          <div className="rounded-xl border border-amber-400/40 bg-amber-950/50 text-amber-100 text-xs px-3 py-2 flex items-center gap-2">
            <CalendarDays size={14} />
            <span>
              Seu período de teste expirou. Entre em contato com o
              suporte para ativar sua assinatura.
            </span>
          </div>
        )}

        {activeTab === "dashboard" && (
          <>
            {/* Cards principais */}
            <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="bg-slate-900 rounded-xl p-3 border border-slate-800 shadow">
                <p className="text-[11px] text-slate-400 mb-1">
                  Receita total
                </p>
                <p className="text-xl font-bold">
                  {formatCurrency(
                    showValues ? stats.totalIncome : 0
                  )}
                </p>
              </div>
              <div className="bg-slate-900 rounded-xl p-3 border border-slate-800 shadow">
                <p className="text-[11px] text-slate-400 mb-1">
                  Despesas totais
                </p>
                <p className="text-xl font-bold">
                  {formatCurrency(
                    showValues ? stats.totalExpense : 0
                  )}
                </p>
              </div>
              <div className="bg-slate-900 rounded-xl p-3 border border-slate-800 shadow">
                <p className="text-[11px] text-slate-400 mb-1">
                  Lucro líquido
                </p>
                <p className="text-xl font-bold">
                  {formatCurrency(
                    showValues ? stats.netProfit : 0
                  )}
                </p>
                <p className="text-[11px] text-slate-400">
                  Margem:{" "}
                  {stats.profitMargin.toFixed(1)}%
                </p>
              </div>
              <div className="bg-slate-900 rounded-xl p-3 border border-slate-800 shadow">
                <p className="text-[11px] text-slate-400 mb-1">
                  Contas pendentes
                </p>
                <p className="text-xl font-bold">
                  {formatCurrency(
                    showValues ? stats.pendingBillsTotal : 0
                  )}
                </p>
              </div>
            </section>

            {/* Meta diária geral */}
            <section className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="bg-slate-900 rounded-xl p-3 border border-slate-800">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="text-[11px] text-slate-400">
                      Meta diária (real)
                    </p>
                    <p className="text-lg font-semibold">
                      {formatCurrency(
                        showValues ? stats.dailyGoal : 0
                      )}
                    </p>
                  </div>
                  <Target className="text-indigo-400" />
                </div>
                <p className="text-[11px] text-slate-400">
                  {stats.goalExplanation}
                </p>
              </div>

              <div className="bg-slate-900 rounded-xl p-3 border border-slate-800">
                <p className="text-[11px] text-slate-400 mb-1">
                  Hoje
                </p>
                <p className="text-sm text-slate-300">
                  Receita:{" "}
                  <strong>
                    {formatCurrency(
                      showValues ? stats.earningsToday : 0
                    )}
                  </strong>
                </p>
                <p className="text-sm text-slate-300">
                  Despesas:{" "}
                  <strong>
                    {formatCurrency(
                      showValues ? stats.expensesToday : 0
                    )}
                  </strong>
                </p>
                <p className="text-sm text-slate-300">
                  Lucro líquido:{" "}
                  <strong>
                    {formatCurrency(
                      showValues ? stats.netToday : 0
                    )}
                  </strong>
                </p>
              </div>
            </section>
          </>
        )}

        {activeTab === "shift" && (
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold flex items-center gap-2">
                <Clock size={16} /> Turno atual
              </h2>
              <div className="flex items-center gap-2 text-xs">
                {!shiftState.isActive ? (
                  <button
                    onClick={startShift}
                    className="px-3 py-1.5 rounded-full bg-emerald-600 text-white font-semibold text-xs hover:bg-emerald-700"
                  >
                    Iniciar turno
                  </button>
                ) : (
                  <>
                    {!shiftState.isPaused ? (
                      <button
                        onClick={pauseShift}
                        className="px-3 py-1.5 rounded-full bg-amber-600 text-white font-semibold text-xs hover:bg-amber-700"
                      >
                        Pausar
                      </button>
                    ) : (
                      <button
                        onClick={resumeShift}
                        className="px-3 py-1.5 rounded-full bg-emerald-600 text-white font-semibold text-xs hover:bg-emerald-700"
                      >
                        Retomar
                      </button>
                    )}
                    <button
                      onClick={endShift}
                      className="px-3 py-1.5 rounded-full bg-slate-700 text-white font-semibold text-xs hover:bg-slate-600"
                    >
                      Encerrar
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Cards do turno */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-3 shrink-0">
              {/* Tempo */}
              <div className="bg-slate-900/80 rounded-xl p-3 border border-slate-800 shadow-lg flex flex-col justify-center items-center relative group">
                <div className="text-slate-500 text-[10px] font-bold tracking-widest uppercase mb-1 flex items-center gap-2">
                  <Clock size={10} /> Tempo
                </div>
                <div className="text-3xl md:text-4xl font-mono font-bold text-white tracking-tighter">
                  {formatTime(shiftState.elapsedSeconds).split(
                    " "
                  )[0]}
                  <span className="text-base md:text-xl text-slate-500 ml-1">
                    {formatTime(shiftState.elapsedSeconds)
                      .split(" ")
                      .slice(1)
                      .join(" ")}
                  </span>
                </div>
                {shiftState.isActive && (
                  <button
                    onClick={handleEditShiftTime}
                    className="absolute top-2 right-2 inline-flex items-center justify-center rounded-full bg-slate-800/80 hover:bg-slate-700 text-slate-100 p-1.5 text-xs border border-white/10"
                  >
                    <Edit2 size={14} />
                  </button>
                )}
              </div>

              {/* Líquido */}
              <div className="bg-gradient-to-br from-emerald-900 via-emerald-800 to-emerald-700 rounded-xl p-3 border border-emerald-500/40 shadow-lg flex flex-col justify-center items-center relative overflow-hidden">
                <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_top,_#22c55e,_transparent_60%)]" />
                <div className="relative z-10">
                  <div className="text-emerald-400/80 text-[10px] font-bold tracking-widest uppercase mb-1 flex items-center gap-2">
                    <Wallet size={10} /> Líquido
                  </div>
                  <div className="text-3xl md:text-4xl font-bold text-emerald-100 tracking-tight">
                    {formatCurrency(
                      showValues ? currentShiftLiquid : 0
                    )}
                  </div>
                </div>
              </div>

              {/* Meta do turno */}
              <div
                className={`rounded-xl p-3 border shadow-lg flex flex-col justify-center relative overflow-hidden ${
                  shiftGoalStatus === "aboveSalary"
                    ? "bg-emerald-900/80 border-emerald-400/60"
                    : shiftGoalStatus === "between"
                    ? "bg-amber-900/70 border-amber-400/60"
                    : shiftGoalStatus === "belowBills"
                    ? "bg-rose-900/70 border-rose-400/60"
                    : "bg-slate-900/70 border-slate-700"
                }`}
              >
                <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_top,_#4f46e5,_transparent_60%)]" />
                <div className="relative z-10">
                  <div className="text-slate-300 text-[10px] font-bold tracking-widest uppercase mb-1 flex items-center gap-2">
                    <Target size={10} /> Meta do turno
                  </div>
                  <div className="text-[11px] text-slate-300 mb-1">
                    <span className="block">
                      Contas:{" "}
                      {formatCurrency(
                        showValues
                          ? stats.dailyBillsGoal || 0
                          : 0
                      )}
                    </span>
                    <span className="block">
                      Salário:{" "}
                      {formatCurrency(
                        showValues
                          ? stats.dailySalaryGoal || 0
                          : 0
                      )}
                    </span>
                  </div>
                  <div className="text-lg md:text-2xl font-bold text-white">
                    {formatCurrency(
                      showValues
                        ? stats.dailyTotalGoal || 0
                        : 0
                    )}
                  </div>
                  {stats.dailyTotalGoal > 0 && (
                    <p className="mt-1 text-[11px] text-slate-200">
                      {shiftGoalStatus === "belowBills" &&
                        "Abaixo da meta mínima para cobrir as contas de hoje."}
                      {shiftGoalStatus === "between" &&
                        "Contas do dia cobertas. Continue para bater a meta de salário."}
                      {shiftGoalStatus === "aboveSalary" &&
                        "Meta total (contas + salário) batida neste turno!"}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </section>
        )}
      </main>

      {/* Modal de Configurações */}
      <SettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        workDays={workDays}
        onSaveWorkDays={setWorkDays}
        categories={categories}
        onAddCategory={handleAddCategory}
        onEditCategory={handleEditCategory}
        onDeleteCategory={handleDeleteCategory}
        monthlySalaryGoal={monthlySalaryGoal}
        monthlyWorkingDays={monthlyWorkingDays}
        onSaveGoals={(salary, days) => {
          setMonthlySalaryGoal(salary);
          setMonthlyWorkingDays(days);
        }}
      />
    </div>
  );
};

export default App;
