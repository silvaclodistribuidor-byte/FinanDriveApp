import { User as FirebaseUser } from 'firebase/auth';

export enum TransactionType {
  INCOME = 'INCOME',
  EXPENSE = 'EXPENSE'
}

export type ExpenseCategory = 'combustivel' | 'alimentacao' | 'manutencao' | 'outros';

export interface Transaction {
  id: string;
  type: TransactionType;
  category?: string;
  amount: number;
  description: string;
  date: string;
  mileage?: number;
  durationHours?: number;
}

export interface Bill {
  id: string;
  description: string;
  amount: number;
  dueDate: string;
  isPaid: boolean;
  category?: string;
}

export interface ShiftExpense {
  amount: number;
  description: string;
  category: ExpenseCategory;
  timestamp: number;
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
  expenseList: ShiftExpense[];
  km: number;
}

export const DEFAULT_CATEGORIES = ['Combustível', 'Alimentação', 'Manutenção', 'Outros', 'Uber', '99', 'InDrive', 'Particular'];
