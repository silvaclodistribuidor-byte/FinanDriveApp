import { Transaction, Bill } from '../types';
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc, setDoc } from 'firebase/firestore';

const STORAGE_KEY = 'finandrive_data_v1';
const USER_ID_KEY = 'finandrive_user_id';

interface AppData {
  transactions: Transaction[];
  bills: Bill[];
  categories: string[];
}

// Helper to safely get env vars (works in Vite/CRA/Next contexts often polyfilled)
const getEnv = (key: string) => {
  try {
    // Check standard process.env (Create React App / Vercel default)
    if (typeof process !== 'undefined' && process.env && process.env[key]) {
      return process.env[key];
    }
    // Check Vite specific (if using Vite)
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

// Configuração do Firebase via Variáveis de Ambiente
// Na Vercel, configure estas chaves em Settings > Environment Variables
const firebaseConfig = {
  apiKey: getEnv('FIREBASE_API_KEY') || getEnv('REACT_APP_FIREBASE_API_KEY') || getEnv('VITE_FIREBASE_API_KEY'),
  authDomain: getEnv('FIREBASE_AUTH_DOMAIN') || getEnv('REACT_APP_FIREBASE_AUTH_DOMAIN') || getEnv('VITE_FIREBASE_AUTH_DOMAIN'),
  projectId: getEnv('FIREBASE_PROJECT_ID') || getEnv('REACT_APP_FIREBASE_PROJECT_ID') || getEnv('VITE_FIREBASE_PROJECT_ID'),
  storageBucket: getEnv('FIREBASE_STORAGE_BUCKET'),
  messagingSenderId: getEnv('FIREBASE_MESSAGING_SENDER_ID'),
  appId: getEnv('FIREBASE_APP_ID')
};

let db: any = null;

// Initialize Firebase only if config is present
if (firebaseConfig.apiKey && firebaseConfig.projectId) {
  try {
    const app = initializeApp(firebaseConfig);
    db = getFirestore(app);
    console.log("Firebase initialized successfully connected to", firebaseConfig.projectId);
  } catch (error) {
    console.error("Firebase initialization failed:", error);
  }
} else {
  console.log("Firebase config missing. Using LocalStorage only.");
}

// Helper: Get or create a persistent ID for this browser
// Em um app real, isso seria substituído pelo Firebase Auth (uid)
const getUserId = () => {
  let id = localStorage.getItem(USER_ID_KEY);
  if (!id) {
    id = 'user_' + Math.random().toString(36).substr(2, 9);
    localStorage.setItem(USER_ID_KEY, id);
  }
  return id;
};

export const loadAppData = async (): Promise<AppData | null> => {
  // 1. Tentar carregar do Firestore se estiver configurado
  if (db) {
    try {
      const userId = getUserId();
      const docRef = doc(db, "userData", userId);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const data = docSnap.data() as AppData;
        // Sincronizar com local para garantir consistência
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        return data;
      } else {
        // Se não tem no cloud, verifica se tem local para migrar
        const local = localStorage.getItem(STORAGE_KEY);
        if (local) {
          const data = JSON.parse(local);
          // Migrar dados locais para a nuvem
          await setDoc(docRef, data);
          return data;
        }
        return null;
      }
    } catch (e) {
      console.warn("Firestore load error (using fallback):", e);
    }
  }

  // 2. Fallback: LocalStorage
  return new Promise((resolve) => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        resolve(JSON.parse(raw));
      } else {
        resolve(null);
      }
    } catch (e) {
      console.error("Error loading local data", e);
      resolve(null);
    }
  });
};

export const saveAppData = async (data: AppData): Promise<void> => {
  // 1. Sempre salvar localmente para performance/offline
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.error("LocalStorage save error", e);
  }

  // 2. Salvar na nuvem se disponível
  if (db) {
    try {
      const userId = getUserId();
      // setDoc com merge:true atualiza campos sem sobrescrever documento inteiro se não precisar
      await setDoc(doc(db, "userData", userId), data, { merge: true });
    } catch (e) {
      console.error("Firestore save error", e);
    }
  }
};