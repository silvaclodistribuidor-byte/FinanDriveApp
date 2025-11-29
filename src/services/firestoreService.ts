import { Transaction, Bill, ShiftState, UserSubscription } from '../types';
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getFirestore, doc, getDoc, setDoc, Timestamp } from 'firebase/firestore';
import { getAuth, signOut } from 'firebase/auth';

const STORAGE_KEY = 'finandrive_data_v1';

interface AppData {
  transactions: Transaction[];
  bills: Bill[];
  categories: string[];
  shiftState?: ShiftState;
}

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

let db: any = null;
let auth: any = null;

if (firebaseConfig.apiKey && firebaseConfig.projectId) {
  try {
    const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
    db = getFirestore(app);
    auth = getAuth(app);
    console.log("Firebase initialized");
  } catch (error) {
    console.error("Firebase initialization failed:", error);
  }
}

// Export auth para usar no Login
export { auth };

export const logoutUser = async () => {
  if (auth) await signOut(auth);
};

// Função para limpar campos undefined
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
    const userRef = doc(db, 'users', uid);
    const userSnap = await getDoc(userRef);

    if (userSnap.exists()) {
      return userSnap.data() as UserSubscription;
    } else {
      // Cria novo usuário com 7 dias de trial
      const now = new Date();
      const trialEndsDate = new Date();
      trialEndsDate.setDate(now.getDate() + 7);

      const newSub: UserSubscription = {
        status: 'trial',
        createdAt: Timestamp.fromDate(now),
        trialEndsAt: Timestamp.fromDate(trialEndsDate)
      };

      await setDoc(userRef, newSub);
      return newSub;
    }
  } catch (error) {
    console.error("Erro ao gerenciar assinatura:", error);
    return null;
  }
};

export const checkSubscriptionStatus = (sub: UserSubscription): 'active' | 'expired' => {
  if (sub.status === 'paid') return 'active';
  
  if (sub.status === 'trial') {
    const now = new Date();
    // Handle Timestamp conversion if necessary
    const endDate = (sub.trialEndsAt as any).toDate ? (sub.trialEndsAt as any).toDate() : new Date(sub.trialEndsAt);
    
    if (now > endDate) {
      return 'expired';
    }
    return 'active';
  }

  return 'expired';
};

// --- Lógica de Dados do App ---

// Carrega dados específicos do usuário logado (userId)
export const loadAppData = async (userId?: string): Promise<AppData | null> => {
  // 1. Se temos userId e banco conectado, busca na nuvem
  if (db && userId) {
    try {
      const docRef = doc(db, "userData", userId);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const data = docSnap.data() as AppData;
        return data;
      }
      return null; // Usuário novo, sem dados
    } catch (e) {
      console.warn("Firestore load error:", e);
    }
  }

  // 2. Fallback: LocalStorage (Apenas se não tiver userId ou erro)
  return new Promise((resolve) => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
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

// Salva dados no documento do usuário (userId)
export const saveAppData = async (data: AppData, userId?: string): Promise<void> => {
  // Sempre salva local como backup
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.error("LocalStorage save error", e);
  }

  // Salva na nuvem na pasta do usuário
  if (db && userId) {
    try {
      await setDoc(doc(db, "userData", userId), cleanPayload(data), { merge: true });
    } catch (e) {
      console.error("Firestore save error", e);
    }
  }
};
