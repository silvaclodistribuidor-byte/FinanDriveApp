import { User as FirebaseUser } from 'firebase/auth';

export enum TransactionType {
  INCOME = 'INCOME',
  EXPENSE = 'EXPENSE'
}

export type ExpenseCategory = 'combustivel' | 'alimentacao' | 'manutencao' | 'outros';

export interface Category {
  id: string;
  name: string;
  type: 'income' | 'expense' | 'both';
  driverId?: string;
  isDefault?: boolean;
}

export interface Transaction {
  id: string;
  type: TransactionType;
  category?: string; // Stores category name for backward compatibility/display
  categoryId?: string; // Reference to Category ID
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
  categoryId?: string;
}

export interface ShiftExpense {
  amount: number;
  description: string;
  category: ExpenseCategory; // Kept for shift specific logic, can be mapped to general categories
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

export const DEFAULT_CATEGORIES: Category[] = [
  { id: 'cat_fuel', name: 'Combustível', type: 'expense', isDefault: true },
  { id: 'cat_food', name: 'Alimentação', type: 'expense', isDefault: true },
  { id: 'cat_maint', name: 'Manutenção', type: 'expense', isDefault: true },
  { id: 'cat_uber', name: 'Uber', type: 'income', isDefault: true },
  { id: 'cat_99', name: '99', type: 'income', isDefault: true },
  { id: 'cat_indrive', name: 'InDrive', type: 'income', isDefault: true },
  { id: 'cat_private', name: 'Particular', type: 'income', isDefault: true },
  { id: 'cat_other', name: 'Outros', type: 'both', isDefault: true }
];
