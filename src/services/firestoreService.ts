import { Transaction, Bill, ShiftState, UserSubscription } from '../types';
import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';
import 'firebase/compat/firestore';

const STORAGE_KEY = 'finandrive_data_v1';

// Definição da estrutura de dados principal do App
export interface AppData {
  transactions: Transaction[];
  bills: Bill[];
  categories: string[];
  shiftState?: ShiftState;
  monthlySalaryGoal?: number;
  monthlyWorkingDays?: number;
}

// Helper para pegar variáveis de ambiente de forma segura
const getEnv = (key: string) => {
  try {
    if (typeof process !== 'undefined' && process.env && process.env[key]) {
      return process.env[key];
    }
    // @ts-ignore
    if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env[key]) {
      // @ts-ignore
      return import.meta.env[key];
    }
  } catch (e) {
    return undefined;
  }
  return undefined;
};

const firebaseConfig = {
  apiKey: getEnv('FIREBASE_API_KEY') || getEnv('REACT_APP_FIREBASE_API_KEY') || getEnv('VITE_FIREBASE_API_KEY'),
  authDomain: getEnv('FIREBASE_AUTH_DOMAIN') || getEnv('REACT_APP_FIREBASE_AUTH_DOMAIN') || getEnv('VITE_FIREBASE_AUTH_DOMAIN'),
  projectId: getEnv('FIREBASE_PROJECT_ID') || getEnv('REACT_APP_FIREBASE_PROJECT_ID') || getEnv('VITE_FIREBASE_PROJECT_ID'),
  storageBucket: getEnv('FIREBASE_STORAGE_BUCKET') || getEnv('VITE_FIREBASE_STORAGE_BUCKET'),
  messagingSenderId: getEnv('FIREBASE_MESSAGING_SENDER_ID') || getEnv('VITE_FIREBASE_MESSAGING_SENDER_ID'),
  appId: getEnv('FIREBASE_APP_ID') || getEnv('VITE_FIREBASE_APP_ID')
};

let db: firebase.firestore.Firestore | null = null;
let auth: firebase.auth.Auth | null = null;

if (firebaseConfig.apiKey && firebaseConfig.projectId) {
  try {
    const app = !firebase.apps.length ? firebase.initializeApp(firebaseConfig) : firebase.app();
    db = firebase.firestore(app);
    auth = firebase.auth(app);
    console.log("Firebase initialized");
  } catch (error) {
    console.error("Firebase initialization failed:", error);
  }
}

export { auth, db };

export const logoutUser = async () => {
  if (auth) await auth.signOut();
};

// Função para limpar campos undefined (Firebase não aceita undefined)
const cleanPayload = (obj: any): any => {
  if (Array.isArray(obj)) {
    return obj.map(v => cleanPayload(v));
  } else if (obj !== null && typeof obj === 'object') {
    return Object.entries(obj).reduce((acc, [k, v]) => {
      if (v !== undefined) {
        acc[k] = cleanPayload(v);
      }
      return acc;
    }, {} as any);
  }
  return obj;
};

// --- Lógica de Assinatura ---

export const getOrCreateUserSubscription = async (uid: string): Promise<UserSubscription | null> => {
  if (!db) return null;

  try {
    const userRef = db.collection('users').doc(uid);
    const userSnap = await userRef.get();

    if (userSnap.exists) {
      return userSnap.data() as UserSubscription;
    } else {
      // Cria novo usuário com 7 dias de trial
      const now = new Date();
      const trialEndsDate = new Date();
      trialEndsDate.setDate(now.getDate() + 7);

      const newSub: UserSubscription = {
        status: 'trial',
        createdAt: firebase.firestore.Timestamp.fromDate(now),
        trialEndsAt: firebase.firestore.Timestamp.fromDate(trialEndsDate)
      };

      await userRef.set(newSub);
      return newSub;
    }
  } catch (error) {
    console.error("Erro ao gerenciar assinatura:", error);
    return null;
  }
};

export const checkSubscriptionStatus = (sub: UserSubscription): 'active' | 'expired' | 'loading' => {
  if (!sub) return 'expired';
  if (sub.status === 'paid') return 'active';
  
  if (sub.status === 'trial') {
    const now = new Date();
    const endDate = (sub.trialEndsAt as any)?.toDate ? (sub.trialEndsAt as any).toDate() : new Date(sub.trialEndsAt);
    
    if (now > endDate) {
      return 'expired';
    }
    return 'active';
  }

  return 'expired';
};

// --- Lógica de Dados do App ---

export const loadAppData = async (userId?: string): Promise<AppData | null> => {
  // 1. Se temos userId e banco conectado, busca na nuvem
  if (db && userId) {
    try {
      const docRef = db.collection("userData").doc(userId);
      const docSnap = await docRef.get();

      if (docSnap.exists) {
        const data = docSnap.data() as AppData;
        localStorage.setItem(`${STORAGE_KEY}_${userId}`, JSON.stringify(data));
        return data;
      }
      return null;
    } catch (e) {
      console.warn("Firestore load error (using fallback):", e);
    }
  }

  // 2. Fallback: LocalStorage
  return new Promise((resolve) => {
    try {
      const key = userId ? `${STORAGE_KEY}_${userId}` : STORAGE_KEY;
      const raw = localStorage.getItem(key);
      if (raw) {
        resolve(JSON.parse(raw));
      } else {
        resolve(null);
      }
    } catch (e) {
      resolve(null);
    }
  });
};

export const saveAppData = async (data: AppData, userId?: string): Promise<void> => {
  // Sempre salva local como backup
  try {
    const key = userId ? `${STORAGE_KEY}_${userId}` : STORAGE_KEY;
    localStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    console.error("LocalStorage save error", e);
  }

  // Salva na nuvem
  if (db && userId) {
    try {
      const cleanData = cleanPayload(data);
      await db.collection("userData").doc(userId).set(cleanData, { merge: true });
    } catch (e) {
      console.error("Firestore save error", e);
    }
  }
};
