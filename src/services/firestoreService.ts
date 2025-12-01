import { Transaction, Bill, ShiftState, UserSubscription } from "../types";
import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import { getFirestore, doc, getDoc, setDoc, Timestamp } from "firebase/firestore";
import { getAuth, signOut } from "firebase/auth";

const STORAGE_KEY = "finandrive_data_v1";

export interface AppData {
  transactions: Transaction[];
  bills: Bill[];
  categories: string[];
  shiftState?: ShiftState;
}

// Pega variável de ambiente tanto em Vite (import.meta.env) quanto em process.env
const getEnv = (key: string) => {
  try {
    // Node / Vercel
    if (typeof process !== "undefined" && (process as any).env && (process as any).env[key]) {
      return (process as any).env[key];
    }
    // Vite
    // @ts-ignore
    if (typeof import.meta !== "undefined" && (import.meta as any).env && (import.meta as any).env[key]) {
      // @ts-ignore
      return (import.meta as any).env[key];
    }
  } catch {
    // ignora
  }
  return undefined;
};

const firebaseConfig = {
  apiKey:
    getEnv("FIREBASE_API_KEY") ||
    getEnv("REACT_APP_FIREBASE_API_KEY") ||
    getEnv("VITE_FIREBASE_API_KEY"),
  authDomain:
    getEnv("FIREBASE_AUTH_DOMAIN") ||
    getEnv("REACT_APP_FIREBASE_AUTH_DOMAIN") ||
    getEnv("VITE_FIREBASE_AUTH_DOMAIN"),
  projectId:
    getEnv("FIREBASE_PROJECT_ID") ||
    getEnv("REACT_APP_FIREBASE_PROJECT_ID") ||
    getEnv("VITE_FIREBASE_PROJECT_ID"),
  storageBucket:
    getEnv("FIREBASE_STORAGE_BUCKET") || getEnv("VITE_FIREBASE_STORAGE_BUCKET"),
  messagingSenderId:
    getEnv("FIREBASE_MESSAGING_SENDER_ID") ||
    getEnv("VITE_FIREBASE_MESSAGING_SENDER_ID"),
  appId: getEnv("FIREBASE_APP_ID") || getEnv("VITE_FIREBASE_APP_ID"),
};

let app: FirebaseApp | null = null;
let db: ReturnType<typeof getFirestore> | null = null;
let auth: ReturnType<typeof getAuth> | null = null;

if (firebaseConfig.apiKey && firebaseConfig.projectId) {
  try {
    app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
    db = getFirestore(app);
    auth = getAuth(app);
    console.log("[FinanDrive] Firebase inicializado");
  } catch (error) {
    console.error("[FinanDrive] Falha ao inicializar Firebase:", error);
  }
} else {
  console.warn("[FinanDrive] Config Firebase incompleta. Usando apenas armazenamento local.");
}

export { auth };

export const logoutUser = async () => {
  if (auth) await signOut(auth);
};

// Remove campos undefined antes de salvar
const cleanPayload = (obj: any): any => {
  if (Array.isArray(obj)) {
    return obj.map((v) => cleanPayload(v));
  } else if (obj !== null && typeof obj === "object") {
    return Object.entries(obj).reduce((acc, [k, v]) => {
      if (v !== undefined) {
        acc[k] = cleanPayload(v);
      }
      return acc;
    }, {} as any);
  }
  return obj;
};

// ---------- Assinatura (coleção USERS) ----------

export const getOrCreateUserSubscription = async (
  uid: string
): Promise<UserSubscription | null> => {
  if (!db) return null;

  try {
    const userRef = doc(db, "users", uid);
    const userSnap = await getDoc(userRef);

    if (userSnap.exists()) {
      return userSnap.data() as UserSubscription;
    } else {
      const now = new Date();
      const trialEndsDate = new Date();
      trialEndsDate.setDate(now.getDate() + 7);

      const newSub: UserSubscription = {
        status: "trial",
        createdAt: Timestamp.fromDate(now),
        trialEndsAt: Timestamp.fromDate(trialEndsDate),
      };

      await setDoc(userRef, newSub, { merge: true });
      return newSub;
    }
  } catch (error) {
    console.error("Erro ao gerenciar assinatura:", error);
    return null;
  }
};

export const checkSubscriptionStatus = (
  sub: UserSubscription
): "active" | "expired" => {
  if (sub.status === "paid") return "active";

  if (sub.status === "trial") {
    const now = new Date();
    const endDate = (sub.trialEndsAt as any).toDate
      ? (sub.trialEndsAt as any).toDate()
      : new Date(sub.trialEndsAt);
    return now > endDate ? "expired" : "active";
  }

  return "expired";
};

// ---------- Dados do APP (coleção USERDATA) ----------

const getDefaultAppData = (): AppData => ({
  transactions: [],
  bills: [],
  categories: [
    "Combustível",
    "Alimentação",
    "Manutenção",
    "Seguro/Impostos",
    "Limpeza",
    "Internet/Celular",
    "Outros",
  ],
});

// Carrega dados do usuário (prioriza Firestore, senão localStorage, senão defaults)
export const loadAppData = async (userId?: string): Promise<AppData> => {
  const defaults = getDefaultAppData();

  // Sem usuário logado ou sem db → só localStorage
  if (!userId || !db) {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return JSON.parse(raw) as AppData;
    } catch (e) {
      console.warn("LocalStorage load error:", e);
    }
    return defaults;
  }

  try {
    const ref = doc(db, "userData", userId);
    const snap = await getDoc(ref);

    if (snap.exists()) {
      const raw = snap.data() as Partial<AppData>;
      const merged: AppData = {
        transactions: raw.transactions ?? [],
        bills: raw.bills ?? [],
        categories:
          raw.categories && raw.categories.length
            ? raw.categories
            : defaults.categories,
        shiftState: raw.shiftState,
      };

      // Atualiza backup local
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
      } catch (e) {
        console.warn("LocalStorage backup save error:", e);
      }

      return merged;
    }

    // Doc ainda não existe no Firestore → tenta local
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return JSON.parse(raw) as AppData;
    } catch (e) {
      console.warn("LocalStorage load error:", e);
    }

    return defaults;
  } catch (e) {
    console.error("Firestore load error:", e);

    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return JSON.parse(raw) as AppData;
    } catch {
      // ignora
    }

    return defaults;
  }
};

// Salva dados do app (sempre local; nuvem só se tiver coisa pra salvar)
export const saveAppData = async (
  data: AppData,
  userId?: string
): Promise<void> => {
  // Sempre salva backup local
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.error("LocalStorage save error", e);
  }

  if (!db || !userId) return;

  const isEmptySnapshot =
    (!data.transactions || data.transactions.length === 0) &&
    (!data.bills || data.bills.length === 0);

  // ⚠️ Proteção: não sobrescrever Firestore com tudo vazio
  if (isEmptySnapshot) {
    console.log(
      "[FinanDrive] Snapshot vazio detectado. Não sobrescrevendo dados no Firestore."
    );
    return;
  }

  try {
    await setDoc(
      doc(db, "userData", userId),
      cleanPayload(data),
      { merge: true }
    );
  } catch (e) {
    console.error("Firestore save error", e);
  }
};

