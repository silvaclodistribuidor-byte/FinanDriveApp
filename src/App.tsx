// src/App.tsx
import React, { useState, useMemo, useEffect, useRef } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Cell,
  PieChart,
  Pie,
} from "recharts";
import { SettingsModal } from "./components/SettingsModal";

// Types
enum TransactionType {
  INCOME = "income",
  EXPENSE = "expense",
}

type RideType = "uber" | "ninedine" | "indriver" | "private" | "km";

interface Transaction {
  id: string;
  date: string;
  type: TransactionType;
  description: string;
  amount: number;
  isDailyCost?: boolean;
}

interface ShiftEntry {
  rideType: RideType;
  amount: number;
  km?: number;
  description?: string;
  timestamp: string;
}

interface Shift {
  id: string;
  date: string;
  startTime: string;
  endTime?: string;
  totalAmount: number;
  totalKm: number;
  entries: ShiftEntry[];
  platformTotals: {
    uber: number;
    ninedine: number;
    indriver: number;
    private: number;
  };
  totalExpenses: number;
}

type BillCategory = "fixa" | "variável" | "assinatura" | "outros";

interface Bill {
  id: string;
  description: string;
  amount: number;
  category: BillCategory;
  dueDate: string;
  isPaid: boolean;
  monthly?: boolean;
}

interface Goal {
  dailyBillsGoal: number;
  dailySalaryGoal: number;
  dailyTotalGoal: number;
  hasGoals: boolean;
  hasBills: boolean;
}

type ActiveTab =
  | "dashboard"
  | "shift"
  | "reports"
  | "bills"
  | "history"
  | "settings";

type DashboardMode = "diario" | "semanal" | "mensal";

type SubscriptionPlan = "free" | "premium";

interface User {
  id: string;
  name: string;
  phone?: string;
  plan: SubscriptionPlan;
  planExpiresAt?: string;
}

interface ShiftFilter {
  startDate: string;
  endDate: string;
}

// Helper: format currency
const formatCurrency = (value: number): string =>
  value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

// Helper: format date
const formatDate = (date: Date): string =>
  date.toISOString().split("T")[0];

// Sample initial data
const initialTransactions: Transaction[] = [
  {
    id: "1",
    date: formatDate(new Date()),
    type: TransactionType.INCOME,
    description: "Corrida Uber",
    amount: 50,
  },
  {
    id: "2",
    date: formatDate(new Date()),
    type: TransactionType.EXPENSE,
    description: "Combustível",
    amount: 30,
  },
];

const initialBills: Bill[] = [
  {
    id: "1",
    description: "Aluguel",
    amount: 1200,
    category: "fixa",
    dueDate: "2024-03-05",
    isPaid: false,
    monthly: true,
  },
  {
    id: "2",
    description: "Internet",
    amount: 120,
    category: "assinatura",
    dueDate: "2024-03-10",
    isPaid: false,
    monthly: true,
  },
];

const initialShifts: Shift[] = [];

// Recharts formatting helpers
const currencyFormatter = (val: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
    val
  );

// Modal props
interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// Transaction Modal
interface TransactionModalProps extends ModalProps {
  onSave: (transaction: Transaction) => void;
}

const TransactionModal: React.FC<TransactionModalProps> = ({
  isOpen,
  onClose,
  onSave,
}) => {
  const [date, setDate] = useState(formatDate(new Date()));
  const [type, setType] = useState<TransactionType>(TransactionType.INCOME);
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [isDailyCost, setIsDailyCost] = useState(false);

  const handleSubmit = () => {
    if (!description || !amount) return;

    const transaction: Transaction = {
      id: Date.now().toString(),
      date,
      type,
      description,
      amount: parseFloat(amount),
      isDailyCost: type === TransactionType.EXPENSE && isDailyCost,
    };

    onSave(transaction);
    onClose();

    setDescription("");
    setAmount("");
    setIsDailyCost(false);
  };

  if (!isOpen) return null;

  return (
    <div className="modal-backdrop">
      <div className="modal">
        <h2>Lançar Entrada/Saída</h2>
        <div className="modal-content">
          <label>
            Data:
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </label>

          <label>
            Tipo:
            <select
              value={type}
              onChange={(e) => setType(e.target.value as TransactionType)}
            >
              <option value={TransactionType.INCOME}>Entrada</option>
              <option value={TransactionType.EXPENSE}>Saída</option>
            </select>
          </label>

          <label>
            Descrição:
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </label>

          <label>
            Valor (R$):
            <input
              type="number"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </label>

          {type === TransactionType.EXPENSE && (
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={isDailyCost}
                onChange={(e) => setIsDailyCost(e.target.checked)}
              />
              Custo diário de operação (combustível, alimentação, etc.)
            </label>
          )}
        </div>

        <div className="modal-actions">
          <button onClick={onClose} className="btn-secondary">
            Cancelar
          </button>
          <button onClick={handleSubmit} className="btn-primary">
            Salvar
          </button>
        </div>
      </div>
    </div>
  );
};

// Shift Modal
interface ShiftModalProps extends ModalProps {
  onStart: (shift: Shift) => void;
  onEnd: (shiftId: string) => void;
  activeShift?: Shift | null;
}

const ShiftModal: React.FC<ShiftModalProps> = ({
  isOpen,
  onClose,
  onStart,
  onEnd,
  activeShift,
}) => {
  const [date, setDate] = useState(formatDate(new Date()));
  const [startTime, setStartTime] = useState(
    new Date().toTimeString().substring(0, 5)
  );

  const handleStart = () => {
    if (!startTime) return;

    const newShift: Shift = {
      id: Date.now().toString(),
      date,
      startTime,
      totalAmount: 0,
      totalKm: 0,
      entries: [],
      platformTotals: {
        uber: 0,
        ninedine: 0,
        indriver: 0,
        private: 0,
      },
      totalExpenses: 0,
    };

    onStart(newShift);
    onClose();
  };

  const handleEnd = () => {
    if (!activeShift) return;
    onEnd(activeShift.id);
    onClose();
  };

  useEffect(() => {
    if (!isOpen) return;

    const now = new Date();
    setDate(formatDate(now));
    setStartTime(now.toTimeString().substring(0, 5));
  }, [isOpen]);

  if (!isOpen) return null;

  const isActive = !!activeShift;

  return (
    <div className="modal-backdrop">
      <div className="modal">
        <h2>{isActive ? "Encerrar Turno" : "Iniciar Turno"}</h2>
        <div className="modal-content">
          {!isActive && (
            <>
              <label>
                Data do Turno:
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </label>

              <label>
                Horário de Início:
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                />
              </label>
            </>
          )}

          {isActive && (
            <div className="shift-summary">
              <p>
                <strong>Turno iniciado em:</strong> {activeShift.date} às{" "}
                {activeShift.startTime}
              </p>
              <p>
                <strong>Total faturado:</strong>{" "}
                {formatCurrency(activeShift.totalAmount)}
              </p>
              <p>
                <strong>Total KM:</strong> {activeShift.totalKm.toFixed(1)} km
              </p>
            </div>
          )}
        </div>

        <div className="modal-actions">
          <button onClick={onClose} className="btn-secondary">
            Cancelar
          </button>
          <button
            onClick={isActive ? handleEnd : handleStart}
            className={isActive ? "btn-danger" : "btn-primary"}
          >
            {isActive ? "Encerrar Turno" : "Iniciar Turno"}
          </button>
        </div>
      </div>
    </div>
  );
};

// Shift Entry Modal
interface ShiftEntryModalProps extends ModalProps {
  onSave: (entry: ShiftEntry) => void;
  rideType?: RideType;
}

const ShiftEntryModal: React.FC<ShiftEntryModalProps> = ({
  isOpen,
  onClose,
  onSave,
  rideType: initialRideType,
}) => {
  const [rideType, setRideType] = useState<RideType>(
    initialRideType || "uber"
  );
  const [amount, setAmount] = useState("");
  const [km, setKm] = useState("");
  const [description, setDescription] = useState("");

  useEffect(() => {
    if (!isOpen) return;
    if (initialRideType) {
      setRideType(initialRideType);
    }
    setAmount("");
    setKm("");
    setDescription("");
  }, [isOpen, initialRideType]);

  const handleSubmit = () => {
    if (!amount && rideType !== "km") return;

    const entry: ShiftEntry = {
      rideType,
      amount: rideType === "km" ? 0 : parseFloat(amount),
      km: km ? parseFloat(km) : undefined,
      description,
      timestamp: new Date().toISOString(),
    };

    onSave(entry);
    onClose();
  };

  if (!isOpen) return null;

  const rideTypeLabel: Record<RideType, string> = {
    uber: "Uber",
    ninedine: "99",
    indriver: "InDrive",
    private: "Particular",
    km: "KM",
  };

  return (
    <div className="modal-backdrop">
      <div className="modal">
        <h2>Lançar Corrida / KM</h2>
        <div className="modal-content">
          <label>
            Tipo:
            <select
              value={rideType}
              onChange={(e) => setRideType(e.target.value as RideType)}
            >
              <option value="uber">Uber</option>
              <option value="ninedine">99</option>
              <option value="indriver">InDrive</option>
              <option value="private">Particular</option>
              <option value="km">KM (sem valor)</option>
            </select>
          </label>

          {rideType !== "km" && (
            <label>
              Valor (R$):
              <input
                type="number"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </label>
          )}

          <label>
            KM:
            <input
              type="number"
              step="0.1"
              value={km}
              onChange={(e) => setKm(e.target.value)}
            />
          </label>

          <label>
            Observações:
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </label>
        </div>

        <div className="modal-actions">
          <button onClick={onClose} className="btn-secondary">
            Cancelar
          </button>
          <button onClick={handleSubmit} className="btn-primary">
            Salvar {rideTypeLabel[rideType]}
          </button>
        </div>
      </div>
    </div>
  );
};

// Bill Modal
interface BillModalProps extends ModalProps {
  onSave: (bill: Bill) => void;
  initialBill?: Bill | null;
  categories: string[];
}

const BillModal: React.FC<BillModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialBill,
  categories,
}) => {
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState<BillCategory>("fixa");
  const [dueDate, setDueDate] = useState(formatDate(new Date()));
  const [isPaid, setIsPaid] = useState(false);
  const [monthly, setMonthly] = useState(true);

  useEffect(() => {
    if (!isOpen) return;

    if (initialBill) {
      setDescription(initialBill.description);
      setAmount(initialBill.amount.toString());
      setCategory(initialBill.category);
      setDueDate(initialBill.dueDate);
      setIsPaid(initialBill.isPaid);
      setMonthly(!!initialBill.monthly);
    } else {
      setDescription("");
      setAmount("");
      setCategory("fixa");
      setDueDate(formatDate(new Date()));
      setIsPaid(false);
      setMonthly(true);
    }
  }, [isOpen, initialBill]);

  const handleSubmit = () => {
    if (!description || !amount || !dueDate) return;

    const bill: Bill = {
      id: initialBill?.id || Date.now().toString(),
      description,
      amount: parseFloat(amount),
      category,
      dueDate,
      isPaid,
      monthly,
    };

    onSave(bill);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="modal-backdrop">
      <div className="modal">
        <h2>{initialBill ? "Editar Conta" : "Nova Conta"}</h2>
        <div className="modal-content">
          <label>
            Descrição:
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </label>

          <label>
            Valor (R$):
            <input
              type="number"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </label>

          <label>
            Categoria:
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as BillCategory)}
            >
              <option value="fixa">Fixa</option>
              <option value="variável">Variável</option>
              <option value="assinatura">Assinatura</option>
              <option value="outros">Outros</option>
            </select>
          </label>

          <label>
            Vencimento:
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </label>

          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={monthly}
              onChange={(e) => setMonthly(e.target.checked)}
            />
            Conta mensal recorrente
          </label>

          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={isPaid}
              onChange={(e) => setIsPaid(e.target.checked)}
            />
            Já está paga
          </label>
        </div>

        <div className="modal-actions">
          <button onClick={onClose} className="btn-secondary">
            Cancelar
          </button>
          <button onClick={handleSubmit} className="btn-primary">
            Salvar
          </button>
        </div>
      </div>
    </div>
  );
};

// Main App component
function App() {
  const [user, setUser] = useState<User | null>({
    id: "1",
    name: "Motorista",
    plan: "free",
  });

  const [activeTab, setActiveTab] = useState<ActiveTab>("dashboard");
  const [transactions, setTransactions] =
    useState<Transaction[]>(initialTransactions);
  const [shifts, setShifts] = useState<Shift[]>(initialShifts);
  const [bills, setBills] = useState<Bill[]>(initialBills);
  const [subscriptionModalOpen, setSubscriptionModalOpen] = useState(false);
  const [transactionModalOpen, setTransactionModalOpen] = useState(false);
  const [shiftModalOpen, setShiftModalOpen] = useState(false);
  const [entryModalOpen, setEntryModalOpen] = useState(false);
  const [billModalOpen, setBillModalOpen] = useState(false);
  const [billBeingEdited, setBillBeingEdited] = useState<Bill | null>(null);
  const [dashboardMode, setDashboardMode] =
    useState<DashboardMode>("diario");
  const [shiftFilter, setShiftFilter] = useState<ShiftFilter>({
    startDate: formatDate(new Date()),
    endDate: formatDate(new Date()),
  });
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  const [workDays, setWorkDays] = useState<number[]>([1, 2, 3, 4, 5, 6]);
  const [categories, setCategories] = useState<string[]>([
    "Combustível",
    "Alimentação",
    "Manutenção",
  ]);
  const [monthlySalaryGoal, setMonthlySalaryGoal] = useState<number>(0);
  const [monthlyWorkingDays, setMonthlyWorkingDays] = useState<number>(26);
  const [loginName, setLoginName] = useState<string>("");
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [activeShift, setActiveShift] = useState<Shift | null>(null);

  const dashboardRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const notFirstMarkupEaferTwoAddLogin = localStorage.getItem(
      "notFirstMarkupEaferTwoAddLogin"
    );
    if (notFirstMarkupEaferTwoAddLogin) {
      const savedUser = localStorage.getItem("user");
      if (savedUser) {
        setUser(JSON.parse(savedUser));
        setIsLoggedIn(true);
      }
      const savedTransactions = localStorage.getItem("transactions");
      if (savedTransactions) {
        setTransactions(JSON.parse(savedTransactions));
      }
      const savedShifts = localStorage.getItem("shifts");
      if (savedShifts) {
        setShifts(JSON.parse(savedShifts));
      }
      const savedBills = localStorage.getItem("bills");
      if (savedBills) {
        setBills(JSON.parse(savedBills));
      }
      const savedWorkDays = localStorage.getItem("workDays");
      if (savedWorkDays) {
        setWorkDays(JSON.parse(savedWorkDays));
      }
      const savedCategories = localStorage.getItem("categories");
      if (savedCategories) {
        setCategories(JSON.parse(savedCategories));
      }
      const savedMonthlySalaryGoal =
        localStorage.getItem("monthlySalaryGoal");
      if (savedMonthlySalaryGoal) {
        setMonthlySalaryGoal(parseFloat(savedMonthlySalaryGoal));
      }
      const savedMonthlyWorkingDays = localStorage.getItem(
        "monthlyWorkingDays"
      );
      if (savedMonthlyWorkingDays) {
        setMonthlyWorkingDays(parseInt(savedMonthlyWorkingDays, 10));
      }
      const savedActiveShift = localStorage.getItem("activeShift");
      if (savedActiveShift) {
        setActiveShift(JSON.parse(savedActiveShift));
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("notFirstMarkupEaferTwoAddLogin", "true");
    localStorage.setItem("transactions", JSON.stringify(transactions));
    localStorage.setItem("shifts", JSON.stringify(shifts));
    localStorage.setItem("bills", JSON.stringify(bills));
    localStorage.setItem("workDays", JSON.stringify(workDays));
    localStorage.setItem("categories", JSON.stringify(categories));
    localStorage.setItem(
      "monthlySalaryGoal",
      monthlySalaryGoal.toString()
    );
    localStorage.setItem(
      "monthlyWorkingDays",
      monthlyWorkingDays.toString()
    );
    if (user) {
      localStorage.setItem("user", JSON.stringify(user));
    }
    if (activeShift) {
      localStorage.setItem("activeShift", JSON.stringify(activeShift));
    } else {
      localStorage.removeItem("activeShift");
    }
  }, [
    transactions,
    shifts,
    bills,
    workDays,
    categories,
    monthlySalaryGoal,
    monthlyWorkingDays,
    user,
    activeShift,
  ]);

  // --- Calculations ---

  // 1. Metas Diárias (CORRIGIDAS)
  const goals: Goal = useMemo(() => {
    const now = new Date();
    const currentMonthStr = `${now.getFullYear()}-${String(
      now.getMonth() + 1
    ).padStart(2, "0")}`;

    const billsThisMonth = bills.filter((b) =>
      b.dueDate.startsWith(currentMonthStr)
    );
    const totalMonthlyBills = billsThisMonth.reduce(
      (acc, b) => acc + b.amount,
      0
    );

    // Evita divisão por zero
    const workingDays = monthlyWorkingDays > 0 ? monthlyWorkingDays : 26;

    // Meta diária apenas para cobrir as contas do mês
    const dailyBillsGoal = totalMonthlyBills / workingDays;
    // Meta diária de faturamento BRUTO (valor que o motorista quer girar no mês)
    const dailySalaryGoal = monthlySalaryGoal / workingDays;
    // CORREÇÃO: a meta total diária é o faturamento bruto desejado.
    // As contas saem de dentro desse valor, não são somadas por fora.
    const dailyTotalGoal = dailySalaryGoal;

    return {
      dailyBillsGoal,
      dailySalaryGoal,
      dailyTotalGoal,
      hasGoals: dailySalaryGoal > 0,
      hasBills: totalMonthlyBills > 0,
    };
  }, [bills, monthlySalaryGoal, monthlyWorkingDays]);

  // 2. Estatísticas Gerais
  const stats = useMemo(() => {
    const totalIncome = transactions
      .filter((t) => t.type === TransactionType.INCOME)
      .reduce((acc, curr) => acc + curr.amount, 0);
    const totalExpense = transactions
      .filter((t) => t.type === TransactionType.EXPENSE)
      .reduce((acc, curr) => acc + curr.amount, 0);
    const incomeTransactions = transactions.filter(
      (t) => t.type === TransactionType.INCOME
    ).length;
    const expenseTransactions = transactions.filter(
      (t) => t.type === TransactionType.EXPENSE
    ).length;

    return {
      totalIncome,
      totalExpense,
      balance: totalIncome - totalExpense,
      incomeTransactions,
      expenseTransactions,
    };
  }, [transactions]);

  // 3. Dashboard Data
  const dashboardData = useMemo(() => {
    const now = new Date();

    const filterByMode = (t: Transaction) => {
      const tDate = new Date(t.date);
      tDate.setHours(0, 0, 0, 0);

      if (dashboardMode === "diario") {
        return t.date === formatDate(now);
      }

      if (dashboardMode === "semanal") {
        const dayOfWeek = now.getDay();
        const diffToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
        const monday = new Date(now);
        monday.setDate(now.getDate() - diffToMonday);
        monday.setHours(0, 0, 0, 0);

        const sunday = new Date(monday);
        sunday.setDate(monday.getDate() + 6);
        sunday.setHours(23, 59, 59, 999);

        return tDate >= monday && tDate <= sunday;
      }

      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      monthStart.setHours(0, 0, 0, 0);
      monthEnd.setHours(23, 59, 59, 999);

      return tDate >= monthStart && tDate <= monthEnd;
    };

    const filteredTransactions = transactions.filter(filterByMode);

    const totalIncome = filteredTransactions
      .filter((t) => t.type === TransactionType.INCOME)
      .reduce((acc, curr) => acc + curr.amount, 0);
    const totalExpense = filteredTransactions
      .filter((t) => t.type === TransactionType.EXPENSE)
      .reduce((acc, curr) => acc + curr.amount, 0);
    const balance = totalIncome - totalExpense;

    const dailyCosts = filteredTransactions
      .filter(
        (t) => t.type === TransactionType.EXPENSE && t.isDailyCost
      )
      .reduce((acc, curr) => acc + curr.amount, 0);

    let daysWorked = 1;
    if (dashboardMode === "semanal") {
      const validWeekDays = [1, 2, 3, 4, 5, 6];
      daysWorked = validWeekDays.length;
    } else if (dashboardMode === "mensal") {
      daysWorked = monthlyWorkingDays || 26;
    }

    const netProfit = balance;
    const averageDailyProfit =
      dashboardMode === "diario" ? netProfit : netProfit / daysWorked;

    const goalProgress = goals.dailyTotalGoal
      ? (averageDailyProfit / goals.dailyTotalGoal) * 100
      : 0;

    let goalStatusMessage = "";
    let goalStatusColor = "";

    if (!goals.hasGoals) {
      goalStatusMessage =
        "Defina sua meta mensal no painel de Configurações.";
      goalStatusColor = "gray";
    } else if (!goals.hasBills) {
      if (averageDailyProfit < goals.dailyTotalGoal * 0.5) {
        goalStatusMessage =
          "Atenção: abaixo da metade da meta diária.";
        goalStatusColor = "red";
      } else if (
        averageDailyProfit >= goals.dailyTotalGoal * 0.5 &&
        averageDailyProfit < goals.dailyTotalGoal
      ) {
        goalStatusMessage = "Continue! Você está se aproximando da meta.";
        goalStatusColor = "orange";
      } else {
        goalStatusMessage = "Parabéns! Meta diária de faturamento batida.";
        goalStatusColor = "green";
      }
    } else {
      if (averageDailyProfit < goals.dailyBillsGoal) {
        goalStatusMessage =
          "Atenção: abaixo da meta mínima para cobrir as contas do mês.";
        goalStatusColor = "red";
      } else if (
        averageDailyProfit >= goals.dailyBillsGoal &&
        averageDailyProfit < goals.dailyTotalGoal
      ) {
        goalStatusMessage =
          "Continue! Já cobre as contas, siga em busca do salário desejado.";
        goalStatusColor = "orange";
      } else {
        goalStatusMessage =
          "Parabéns! Cobre as contas e seu salário desejado neste ritmo.";
        goalStatusColor = "green";
      }
    }

    return {
      totalIncome,
      totalExpense,
      balance,
      dailyCosts,
      netProfit,
      averageDailyProfit,
      goalProgress: Math.min(100, Math.max(0, goalProgress)),
      goalStatusMessage,
      goalStatusColor,
    };
  }, [
    transactions,
    dashboardMode,
    monthlyWorkingDays,
    goals.dailyTotalGoal,
    goals.dailyBillsGoal,
    goals.hasGoals,
    goals.hasBills,
  ]);

  const dailyIncomeExpenseData = useMemo(() => {
    const todayStr = formatDate(new Date());
    const todaysTransactions = transactions.filter(
      (t) => t.date === todayStr
    );

    return [
      {
        name: "Entradas",
        value: todaysTransactions
          .filter((t) => t.type === TransactionType.INCOME)
          .reduce((acc, curr) => acc + curr.amount, 0),
      },
      {
        name: "Saídas",
        value: todaysTransactions
          .filter((t) => t.type === TransactionType.EXPENSE)
          .reduce((acc, curr) => acc + curr.amount, 0),
      },
    ];
  }, [transactions]);

  const dailyExpensesBreakdownData = useMemo(() => {
    const todayStr = formatDate(new Date());
    const todaysExpenses = transactions.filter(
      (t) =>
        t.date === todayStr && t.type === TransactionType.EXPENSE
    );

    const byDescription: Record<string, number> = {};
    todaysExpenses.forEach((t) => {
      byDescription[t.description] =
        (byDescription[t.description] || 0) + t.amount;
    });

    return Object.entries(byDescription).map(([desc, value]) => ({
      name: desc,
      value,
    }));
  }, [transactions]);

  const shiftsSummary = useMemo(() => {
    const now = new Date();
    const todayStr = formatDate(now);

    const todayShifts = shifts.filter((shift) => shift.date === todayStr);
    const weekShifts = shifts.filter((shift) => {
      const shiftDate = new Date(shift.date);
      shiftDate.setHours(0, 0, 0, 0);
      const currentDay = now.getDay();
      const diffToMonday = currentDay === 0 ? 6 : currentDay - 1;
      const monday = new Date(now);
      monday.setDate(now.getDate() - diffToMonday);
      monday.setHours(0, 0, 0, 0);
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);
      sunday.setHours(23, 59, 59, 999);
      return shiftDate >= monday && shiftDate <= sunday;
    });

    const todayTotalRevenue = todayShifts.reduce(
      (acc, shift) => acc + shift.totalAmount,
      0
    );
    const todayTotalKm = todayShifts.reduce(
      (acc, shift) => acc + shift.totalKm,
      0
    );
    const todayAverageTicket =
      todayShifts.length > 0
        ? todayTotalRevenue / todayShifts.length
        : 0;

    const weekTotalRevenue = weekShifts.reduce(
      (acc, shift) => acc + shift.totalAmount,
      0
    );
    const weekTotalKm = weekShifts.reduce(
      (acc, shift) => acc + shift.totalKm,
      0
    );

    const todayPlatformTotals = todayShifts.reduce(
      (acc, shift) => ({
        uber: acc.uber + shift.platformTotals.uber,
        ninedine: acc.ninedine + shift.platformTotals.ninedine,
        indriver: acc.indriver + shift.platformTotals.indriver,
        private: acc.private + shift.platformTotals.private,
      }),
      { uber: 0, ninedine: 0, indriver: 0, private: 0 }
    );

    const weeklyPlatformTotals = weekShifts.reduce(
      (acc, shift) => ({
        uber: acc.uber + shift.platformTotals.uber,
        ninedine: acc.ninedine + shift.platformTotals.ninedine,
        indriver: acc.indriver + shift.platformTotals.indriver,
        private: acc.private + shift.platformTotals.private,
      }),
      { uber: 0, ninedine: 0, indriver: 0, private: 0 }
    );

    const platformChartData = [
      {
        name: "Uber",
        today: todayPlatformTotals.uber,
        week: weeklyPlatformTotals.uber,
      },
      {
        name: "99",
        today: todayPlatformTotals.ninedine,
        week: weeklyPlatformTotals.ninedine,
      },
      {
        name: "InDrive",
        today: todayPlatformTotals.indriver,
        week: weeklyPlatformTotals.indriver,
      },
      {
        name: "Particular",
        today: todayPlatformTotals.private,
        week: weeklyPlatformTotals.private,
      },
    ];

    return {
      todayTotalRevenue,
      todayTotalKm,
      todayAverageTicket,
      weekTotalRevenue,
      weekTotalKm,
      platformChartData,
    };
  }, [shifts]);

  const filteredShifts = useMemo(() => {
    const start = new Date(shiftFilter.startDate);
    const end = new Date(shiftFilter.endDate);
    end.setHours(23, 59, 59, 999);

    return shifts.filter((shift) => {
      const shiftDate = new Date(shift.date);
      shiftDate.setHours(0, 0, 0, 0);
      return shiftDate >= start && shiftDate <= end;
    });
  }, [shifts, shiftFilter]);

  const billsSummary = useMemo(() => {
    const now = new Date();
    const currentMonthStr = `${now.getFullYear()}-${String(
      now.getMonth() + 1
    ).padStart(2, "0")}`;

    const monthlyBills = bills.filter((b) =>
      b.dueDate.startsWith(currentMonthStr)
    );

    const totalBillsAmount = monthlyBills.reduce(
      (acc, b) => acc + b.amount,
      0
    );
    const paidBillsAmount = monthlyBills
      .filter((b) => b.isPaid)
      .reduce((acc, b) => acc + b.amount, 0);
    const pendingBillsAmount = totalBillsAmount - paidBillsAmount;

    const daysLeftInMonth = (() => {
      const lastDay = new Date(
        now.getFullYear(),
        now.getMonth() + 1,
        0
      );
      const diffTime = lastDay.getTime() - now.getTime();
      return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    })();

    return {
      totalBillsAmount,
      paidBillsAmount,
      pendingBillsAmount,
      daysLeftInMonth,
    };
  }, [bills]);

  const handleSaveTransaction = (transaction: Transaction) => {
    setTransactions((prev) => [...prev, transaction]);
  };

  const handleStartShift = (newShift: Shift) => {
    setActiveShift(newShift);
    setShifts((prev) => [...prev, newShift]);
  };

  const handleEndShift = (shiftId: string) => {
    setShifts((prev) =>
      prev.map((shift) =>
        shift.id === shiftId
          ? {
              ...shift,
              endTime: new Date().toTimeString().substring(0, 5),
            }
          : shift
      )
    );
    setActiveShift(null);
  };

  const handleAddShiftEntry = (entry: ShiftEntry) => {
    if (!activeShift) return;

    const updatedShift: Shift = {
      ...activeShift,
      entries: [...activeShift.entries, entry],
      totalAmount:
        activeShift.totalAmount +
        (entry.rideType === "km" ? 0 : entry.amount),
      totalKm:
        activeShift.totalKm + (entry.km ? entry.km : 0),
      platformTotals: {
        ...activeShift.platformTotals,
        ...(entry.rideType !== "km"
          ? {
              [entry.rideType]:
                activeShift.platformTotals[entry.rideType] +
                entry.amount,
            }
          : {}),
      },
    };

    setActiveShift(updatedShift);
    setShifts((prev) =>
      prev.map((shift) =>
        shift.id === updatedShift.id ? updatedShift : shift
      )
    );
  };

  const handleSaveBill = (bill: Bill) => {
    setBills((prev) => {
      const exists = prev.find((b) => b.id === bill.id);
      if (exists) {
        return prev.map((b) => (b.id === bill.id ? bill : b));
      }
      return [...prev, bill];
    });
  };

  const handleDeleteBill = (billId: string) => {
    setBills((prev) => prev.filter((b) => b.id !== billId));
  };

  const handleToggleBillPaid = (billId: string) => {
    setBills((prev) =>
      prev.map((b) =>
        b.id === billId ? { ...b, isPaid: !b.isPaid } : b
      )
    );
  };

  const handleSaveWorkDays = (days: number[]) => {
    setWorkDays(days);
  };

  const handleAddCategory = (name: string) => {
    if (!name.trim()) return;
    setCategories((prev) => [...prev, name.trim()]);
  };

  const handleEditCategory = (oldName: string, newName: string) => {
    setCategories((prev) =>
      prev.map((cat) => (cat === oldName ? newName : cat))
    );
  };

  const handleDeleteCategory = (name: string) => {
    setCategories((prev) => prev.filter((cat) => cat !== name));
  };

  const handleSaveGoals = (salary: number, days: number) => {
    setMonthlySalaryGoal(salary);
    setMonthlyWorkingDays(days);
  };

  const handleLogin = () => {
    if (!loginName.trim()) {
      setLoginError("Por favor, digite seu nome.");
      return;
    }

    const generatedUser: User = {
      id: "1",
      name: loginName,
      plan: "free",
    };

    setUser(generatedUser);
    setIsLoggedIn(true);
    setLoginError(null);
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setUser(null);
    localStorage.removeItem("user");
  };

  const renderActiveTab = () => {
    switch (activeTab) {
      case "dashboard":
        return (
          <div className="dashboard" ref={dashboardRef}>
            <div className="dashboard-header">
              <h2>Painel de Controle</h2>
              <div className="dashboard-mode-toggle">
                <button
                  className={
                    dashboardMode === "diario"
                      ? "active"
                      : ""
                  }
                  onClick={() => setDashboardMode("diario")}
                >
                  Diário
                </button>
                <button
                  className={
                    dashboardMode === "semanal"
                      ? "active"
                      : ""
                  }
                  onClick={() => setDashboardMode("semanal")}
                >
                  Semanal
                </button>
                <button
                  className={
                    dashboardMode === "mensal"
                      ? "active"
                      : ""
                  }
                  onClick={() => setDashboardMode("mensal")}
                >
                  Mensal
                </button>
              </div>
            </div>

            <div className="dashboard-grid">
              <div className="card">
                <h3>Resumo Financeiro</h3>
                <div className="card-content grid-two-columns">
                  <div>
                    <p>
                      <strong>Entradas:</strong>{" "}
                      {formatCurrency(dashboardData.totalIncome)}
                    </p>
                    <p>
                      <strong>Saídas:</strong>{" "}
                      {formatCurrency(dashboardData.totalExpense)}
                    </p>
                    <p>
                      <strong>Saldo:</strong>{" "}
                      {formatCurrency(dashboardData.balance)}
                    </p>
                  </div>
                  <div>
                    <p>
                      <strong>Custos Diários:</strong>{" "}
                      {formatCurrency(dashboardData.dailyCosts)}
                    </p>
                    <p>
                      <strong>Lucro Líquido:</strong>{" "}
                      {formatCurrency(dashboardData.netProfit)}
                    </p>
                    <p>
                      <strong>Média Diária:</strong>{" "}
                      {formatCurrency(
                        dashboardData.averageDailyProfit
                      )}
                    </p>
                  </div>
                </div>
              </div>

              <div className="card">
                <h3>Meta Diária</h3>
                <div className="card-content">
                  <p>
                    <strong>Meta para contas (média/dia):</strong>{" "}
                    {formatCurrency(goals.dailyBillsGoal)}
                  </p>
                  <p>
                    <strong>Meta de faturamento (média/dia):</strong>{" "}
                    {formatCurrency(goals.dailySalaryGoal)}
                  </p>
                  <div className="goal-progress-bar">
                    <div
                      className="goal-progress-fill"
                      style={{
                        width: `${dashboardData.goalProgress}%`,
                        backgroundColor:
                          dashboardData.goalStatusColor,
                      }}
                    />
                  </div>
                  <p className="goal-status-message">
                    {dashboardData.goalStatusMessage}
                  </p>
                </div>
              </div>

              <div className="card">
                <h3>Gráfico de Entradas x Saídas (Hoje)</h3>
                <div className="card-content chart-container">
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={dailyIncomeExpenseData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis tickFormatter={currencyFormatter} />
                      <Tooltip formatter={currencyFormatter} />
                      <Legend />
                      <Bar dataKey="value" name="Valor">
                        {dailyIncomeExpenseData.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={
                              entry.name === "Entradas"
                                ? "#4caf50"
                                : "#f44336"
                            }
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="card">
                <h3>Distribuição de Despesas (Hoje)</h3>
                <div className="card-content chart-container">
                  {dailyExpensesBreakdownData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={200}>
                      <PieChart>
                        <Pie
                          data={dailyExpensesBreakdownData}
                          dataKey="value"
                          nameKey="name"
                          outerRadius={80}
                          label
                        >
                          {dailyExpensesBreakdownData.map(
                            (_entry, index) => (
                              <Cell
                                key={`cell-${index}`}
                                fill={`hsl(${
                                  (index * 60) % 360
                                }, 70%, 50%)`}
                              />
                            )
                          )}
                        </Pie>
                        <Tooltip formatter={currencyFormatter} />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <p>Sem despesas registradas hoje.</p>
                  )}
                </div>
              </div>

              <div className="card">
                <h3>Resumo de Turnos</h3>
                <div className="card-content grid-two-columns">
                  <div>
                    <p>
                      <strong>Faturamento Hoje:</strong>{" "}
                      {formatCurrency(
                        shiftsSummary.todayTotalRevenue
                      )}
                    </p>
                    <p>
                      <strong>KM Rodados Hoje:</strong>{" "}
                      {shiftsSummary.todayTotalKm.toFixed(1)} km
                    </p>
                    <p>
                      <strong>Ticket Médio Hoje:</strong>{" "}
                      {formatCurrency(
                        shiftsSummary.todayAverageTicket
                      )}
                    </p>
                  </div>
                  <div>
                    <p>
                      <strong>Faturamento na Semana:</strong>{" "}
                      {formatCurrency(
                        shiftsSummary.weekTotalRevenue
                      )}
                    </p>
                    <p>
                      <strong>KM na Semana:</strong>{" "}
                      {shiftsSummary.weekTotalKm.toFixed(1)} km
                    </p>
                  </div>
                </div>
              </div>

              <div className="card">
                <h3>Faturamento por Plataforma (Hoje x Semana)</h3>
                <div className="card-content chart-container">
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={shiftsSummary.platformChartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis tickFormatter={currencyFormatter} />
                      <Tooltip formatter={currencyFormatter} />
                      <Legend />
                      <Bar dataKey="today" name="Hoje" fill="#2196f3" />
                      <Bar dataKey="week" name="Semana" fill="#9c27b0" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="card">
                <h3>Resumo de Contas do Mês</h3>
                <div className="card-content grid-two-columns">
                  <div>
                    <p>
                      <strong>Total de Contas:</strong>{" "}
                      {formatCurrency(billsSummary.totalBillsAmount)}
                    </p>
                    <p>
                      <strong>Já Pagas:</strong>{" "}
                      {formatCurrency(billsSummary.paidBillsAmount)}
                    </p>
                    <p>
                      <strong>Em Aberto:</strong>{" "}
                      {formatCurrency(
                        billsSummary.pendingBillsAmount
                      )}
                    </p>
                  </div>
                  <div>
                    <p>
                      <strong>Dias Restantes no Mês:</strong>{" "}
                      {billsSummary.daysLeftInMonth}
                    </p>
                    <p>
                      <strong>
                        Média diária necessária para quitar:
                      </strong>{" "}
                      {formatCurrency(
                        billsSummary.pendingBillsAmount /
                          (billsSummary.daysLeftInMonth || 1)
                      )}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      case "shift":
        return (
          <div className="shift-container">
            <div className="card">
              <h2>Turno Atual</h2>
              <div className="card-content">
                {activeShift ? (
                  <>
                    <p>
                      <strong>Iniciado em:</strong>{" "}
                      {activeShift.date} às {activeShift.startTime}
                    </p>
                    <p>
                      <strong>Total faturado:</strong>{" "}
                      {formatCurrency(activeShift.totalAmount)}
                    </p>
                    <p>
                      <strong>Total KM:</strong>{" "}
                      {activeShift.totalKm.toFixed(1)} km
                    </p>
                    <div className="platform-totals">
                      <p>
                        <strong>Uber:</strong>{" "}
                        {formatCurrency(
                          activeShift.platformTotals.uber
                        )}
                      </p>
                      <p>
                        <strong>99:</strong>{" "}
                        {formatCurrency(
                          activeShift.platformTotals.ninedine
                        )}
                      </p>
                      <p>
                        <strong>InDrive:</strong>{" "}
                        {formatCurrency(
                          activeShift.platformTotals.indriver
                        )}
                      </p>
                      <p>
                        <strong>Particular:</strong>{" "}
                        {formatCurrency(
                          activeShift.platformTotals.private
                        )}
                      </p>
                    </div>
                    <div className="shift-actions">
                      <button
                        className="btn-secondary"
                        onClick={() =>
                          setEntryModalOpen(true)
                        }
                      >
                        Lançar Corrida / KM
                      </button>
                      <button
                        className="btn-danger"
                        onClick={() =>
                          setShiftModalOpen(true)
                        }
                      >
                        Encerrar Turno
                      </button>
                    </div>
                    <div className="shift-entries">
                      <h3>Lançamentos do Turno</h3>
                      {activeShift.entries.length === 0 ? (
                        <p>Nenhum lançamento ainda.</p>
                      ) : (
                        <ul>
                          {activeShift.entries.map(
                            (entry, index) => (
                              <li key={index}>
                                <span>
                                  {entry.rideType.toUpperCase()} -{" "}
                                  {entry.km
                                    ? `${entry.km.toFixed(
                                        1
                                      )} km`
                                    : ""}
                                </span>
                                {entry.rideType !== "km" && (
                                  <span>
                                    {" - "}
                                    {formatCurrency(
                                      entry.amount
                                    )}
                                  </span>
                                )}
                                {entry.description && (
                                  <span>
                                    {" - "}
                                    {entry.description}
                                  </span>
                                )}
                              </li>
                            )
                          )}
                        </ul>
                      )}
                    </div>
                  </>
                ) : (
                  <>
                    <p>Nenhum turno ativo no momento.</p>
                    <button
                      className="btn-primary"
                      onClick={() => setShiftModalOpen(true)}
                    >
                      Iniciar Novo Turno
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        );
      case "reports":
        return (
          <div className="reports-container">
            <div className="card">
              <h2>Relatórios de Turnos</h2>
              <div className="card-content">
                <div className="filter-row">
                  <label>
                    Data Inicial:
                    <input
                      type="date"
                      value={shiftFilter.startDate}
                      onChange={(e) =>
                        setShiftFilter((prev) => ({
                          ...prev,
                          startDate: e.target.value,
                        }))
                      }
                    />
                  </label>
                  <label>
                    Data Final:
                    <input
                      type="date"
                      value={shiftFilter.endDate}
                      onChange={(e) =>
                        setShiftFilter((prev) => ({
                          ...prev,
                          endDate: e.target.value,
                        }))
                      }
                    />
                  </label>
                </div>
                {filteredShifts.length === 0 ? (
                  <p>Nenhum turno encontrado no período.</p>
                ) : (
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Data</th>
                        <th>Início</th>
                        <th>Fim</th>
                        <th>Faturamento</th>
                        <th>KM</th>
                        <th>Uber</th>
                        <th>99</th>
                        <th>InDrive</th>
                        <th>Particular</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredShifts.map((shift) => (
                        <tr key={shift.id}>
                          <td>{shift.date}</td>
                          <td>{shift.startTime}</td>
                          <td>{shift.endTime || "-"}</td>
                          <td>
                            {formatCurrency(shift.totalAmount)}
                          </td>
                          <td>{shift.totalKm.toFixed(1)}</td>
                          <td>
                            {formatCurrency(
                              shift.platformTotals.uber
                            )}
                          </td>
                          <td>
                            {formatCurrency(
                              shift.platformTotals.ninedine
                            )}
                          </td>
                          <td>
                            {formatCurrency(
                              shift.platformTotals.indriver
                            )}
                          </td>
                          <td>
                            {formatCurrency(
                              shift.platformTotals.private
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>
        );
      case "bills":
        return (
          <div className="bills-container">
            <div className="card">
              <h2>Contas Mensais</h2>
              <div className="card-content">
                <div className="bills-summary">
                  <p>
                    <strong>Total:</strong>{" "}
                    {formatCurrency(billsSummary.totalBillsAmount)}
                  </p>
                  <p>
                    <strong>Pagas:</strong>{" "}
                    {formatCurrency(billsSummary.paidBillsAmount)}
                  </p>
                  <p>
                    <strong>Em Aberto:</strong>{" "}
                    {formatCurrency(
                      billsSummary.pendingBillsAmount
                    )}
                  </p>
                  <p>
                    <strong>Meta diária p/ contas:</strong>{" "}
                    {formatCurrency(goals.dailyBillsGoal)}
                  </p>
                </div>
                <button
                  className="btn-primary"
                  onClick={() => {
                    setBillBeingEdited(null);
                    setBillModalOpen(true);
                  }}
                >
                  Nova Conta
                </button>
                {bills.length === 0 ? (
                  <p>Nenhuma conta cadastrada.</p>
                ) : (
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Descrição</th>
                        <th>Valor</th>
                        <th>Categoria</th>
                        <th>Vencimento</th>
                        <th>Status</th>
                        <th>Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bills.map((bill) => (
                        <tr key={bill.id}>
                          <td>{bill.description}</td>
                          <td>{formatCurrency(bill.amount)}</td>
                          <td>{bill.category}</td>
                          <td>{bill.dueDate}</td>
                          <td>
                            {bill.isPaid ? "Paga" : "Em aberto"}
                          </td>
                          <td>
                            <button
                              className="btn-secondary btn-small"
                              onClick={() => {
                                setBillBeingEdited(bill);
                                setBillModalOpen(true);
                              }}
                            >
                              Editar
                            </button>
                            <button
                              className="btn-secondary btn-small"
                              onClick={() =>
                                handleToggleBillPaid(bill.id)
                              }
                            >
                              {bill.isPaid
                                ? "Marcar como em aberto"
                                : "Marcar como paga"}
                            </button>
                            <button
                              className="btn-danger btn-small"
                              onClick={() =>
                                handleDeleteBill(bill.id)
                              }
                            >
                              Excluir
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>
        );
      case "history":
        return (
          <div className="history-container">
            <div className="card">
              <h2>Histórico de Lançamentos</h2>
              <div className="card-content">
                {transactions.length === 0 ? (
                  <p>Nenhum lançamento registrado.</p>
                ) : (
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Data</th>
                        <th>Tipo</th>
                        <th>Descrição</th>
                        <th>Valor</th>
                      </tr>
                    </thead>
                    <tbody>
                      {transactions.map((t) => (
                        <tr key={t.id}>
                          <td>{t.date}</td>
                          <td>
                            {t.type === TransactionType.INCOME
                              ? "Entrada"
                              : "Saída"}
                          </td>
                          <td>{t.description}</td>
                          <td>{formatCurrency(t.amount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>
        );
      case "settings":
        return (
          <div className="settings-container">
            <div className="card">
              <h2>Configurações</h2>
              <div className="card-content">
                <button
                  className="btn-primary"
                  onClick={() => setSettingsModalOpen(true)}
                >
                  Abrir Configurações de Trabalho e Metas
                </button>
                <div className="settings-info">
                  <p>
                    <strong>Dias de Trabalho:</strong>{" "}
                    {workDays.length} dias/semana
                  </p>
                  <p>
                    <strong>Meta mensal:</strong>{" "}
                    {formatCurrency(monthlySalaryGoal)}
                  </p>
                  <p>
                    <strong>Dias trabalhados no mês:</strong>{" "}
                    {monthlyWorkingDays}
                  </p>
                </div>
              </div>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  if (!isLoggedIn) {
    return (
      <div className="login-container">
        <div className="login-card">
          <h1>Finan-Drive Pro</h1>
          <p>Informe seu nome para começar</p>
          <input
            type="text"
            placeholder="Seu nome"
            value={loginName}
            onChange={(e) => setLoginName(e.target.value)}
          />
          {loginError && (
            <p className="error-message">{loginError}</p>
          )}
          <button className="btn-primary" onClick={handleLogin}>
            Entrar
          </button>
        </div>
      </div>
    );
  }

  const COLORS = ["#4caf50", "#f44336"];

  const renderCustomizedLabel = ({
    cx,
    cy,
    midAngle,
    innerRadius,
    outerRadius,
    percent,
  }: any) => {
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos((-midAngle * Math.PI) / 180);
    const y = cy + radius * Math.sin((-midAngle * Math.PI) / 180);

    return (
      <text
        x={x}
        y={y}
        fill="white"
        textAnchor={x > cx ? "start" : "end"}
        dominantBaseline="central"
      >
        {(percent * 100).toFixed(0)}%
      </text>
    );
  };

  return (
    <div className="app-container">
      <header className="app-header">
        <div>
          <h1>Finan-Drive Pro</h1>
          <p>Bem-vindo, {user?.name}</p>
        </div>
        <div className="header-right">
          <button
            className="btn-secondary"
            onClick={() => setSubscriptionModalOpen(true)}
          >
            Plano: {user?.plan === "free" ? "Gratuito" : "Premium"}
          </button>
          <button className="btn-secondary" onClick={handleLogout}>
            Sair
          </button>
        </div>
      </header>

      <nav className="app-nav">
        <button
          className={activeTab === "dashboard" ? "active" : ""}
          onClick={() => setActiveTab("dashboard")}
        >
          Dashboard
        </button>
        <button
          className={activeTab === "shift" ? "active" : ""}
          onClick={() => setActiveTab("shift")}
        >
          Turno
        </button>
        <button
          className={activeTab === "reports" ? "active" : ""}
          onClick={() => setActiveTab("reports")}
        >
          Relatórios
        </button>
        <button
          className={activeTab === "bills" ? "active" : ""}
          onClick={() => setActiveTab("bills")}
        >
          Contas
        </button>
        <button
          className={activeTab === "history" ? "active" : ""}
          onClick={() => setActiveTab("history")}
        >
          Histórico
        </button>
        <button
          className={activeTab === "settings" ? "active" : ""}
          onClick={() => setActiveTab("settings")}
        >
          Configurações
        </button>
      </nav>

      <main className="app-main">
        {renderActiveTab()}
        <button
          className="floating-action-button"
          onClick={() => setTransactionModalOpen(true)}
        >
          +
        </button>
      </main>

      <TransactionModal
        isOpen={transactionModalOpen}
        onClose={() => setTransactionModalOpen(false)}
        onSave={handleSaveTransaction}
      />

      <ShiftModal
        isOpen={shiftModalOpen}
        onClose={() => setShiftModalOpen(false)}
        onStart={handleStartShift}
        onEnd={handleEndShift}
        activeShift={activeShift}
      />

      <ShiftEntryModal
        isOpen={entryModalOpen}
        onClose={() => setEntryModalOpen(false)}
        onSave={handleAddShiftEntry}
      />

      <BillModal
        isOpen={billModalOpen}
        onClose={() => setBillModalOpen(false)}
        onSave={handleSaveBill}
        initialBill={billBeingEdited}
        categories={categories}
      />

      <SettingsModal
        isOpen={settingsModalOpen}
        onClose={() => setSettingsModalOpen(false)}
        workDays={workDays}
        onSaveWorkDays={handleSaveWorkDays}
        categories={categories}
        onAddCategory={handleAddCategory}
        onEditCategory={handleEditCategory}
        onDeleteCategory={handleDeleteCategory}
        monthlySalaryGoal={monthlySalaryGoal}
        monthlyWorkingDays={monthlyWorkingDays}
        onSaveGoals={handleSaveGoals}
      />

      {subscriptionModalOpen && (
        <div className="modal-backdrop">
          <div className="modal">
            <h2>Plano de Assinatura</h2>
            <div className="modal-content">
              <p>
                Seu plano atual:{" "}
                <strong>
                  {user?.plan === "free" ? "Gratuito" : "Premium"}
                </strong>
              </p>
              <p>
                Em breve você poderá fazer upgrade para o plano
                Premium com mais recursos.
              </p>

              <div className="subscription-plans">
                <div className="subscription-card">
                  <h3>Gratuito</h3>
                  <p>Ideal para começar a controlar seus ganhos.</p>
                  <ul>
                    <li>Lançamentos de entradas e saídas</li>
                    <li>Controle básico de turnos</li>
                    <li>Dashboard com visão diária</li>
                  </ul>
                </div>
                <div className="subscription-card">
                  <h3>Premium (em breve)</h3>
                  <p>
                    Recursos avançados para máxima eficiência.
                  </p>
                  <ul>
                    <li>Relatórios completos</li>
                    <li>Metas avançadas e alertas</li>
                    <li>Exportação de dados</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="modal-actions">
              <button
                className="btn-secondary"
                onClick={() => setSubscriptionModalOpen(false)}
              >
                Fechar
              </button>
              <button
                className="btn-primary"
                onClick={() => setSubscriptionModalOpen(false)}
              >
                Ok
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
