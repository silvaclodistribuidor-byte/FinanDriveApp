export enum TransactionType {
  INCOME = 'INCOME',
  EXPENSE = 'EXPENSE'
}

export type ExpenseCategory = 'Combustível' | 'Alimentação' | 'Manutenção' | 'Outros';

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  description: string;
  date: string; // YYYY-MM-DD
  category?: string;
  mileage?: number;
  durationHours?: number;
}

export interface Bill {
  id: string;
  description: string;
  amount: number;
  dueDate: string; // YYYY-MM-DD
  isPaid: boolean;
  category?: string;
}

export interface ShiftState {
  isActive: boolean;
  isPaused: boolean;
  startTime: number | null;
  elapsedSeconds: number;
  earnings: {
    uber: number;
    n99: number;
    indrive: number;
    private: number;
  };
  expenses: number;
  expenseList: Array<{
    amount: number;
    description: string;
    category: ExpenseCategory;
    timestamp: number;
  }>;
  km: number;
}

export const DEFAULT_CATEGORIES = [
  'Combustível',
  'Alimentação',
  'Manutenção',
  'Seguro/Impostos',
  'Limpeza',
  'Internet/Celular',
  'Outros'
];