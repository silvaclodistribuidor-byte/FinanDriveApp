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

// Lê variáveis de ambiente (process.env ou import.meta.env)
const getEnv = (key: string) => {
  try {
    if (typeof process !== "undefined" && (process as any).env && (process as any).env[key]) {
      return (process as any).env[key];
    }
    // @ts-ignore
    if (typeof import.meta !== "undefined" && (import.meta as any).env && (import.meta as any).env[key]) {
      // @ts-ignore
      return (import.meta as any).env[key];
    }
  } catch (e) {
    return undefined;
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
    console.log("Firebase initialized");
  } catch (error) {
    console.error("Firebase initialization failed:", error);
  }
}

// Exporta auth para o Login
export { auth };

export const logoutUser = async () => {
  if (auth) await signOut(auth);
};

// Remove campos undefined antes de salvar no Firestore
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

// -------- Assinatura (igual antes) --------

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
      // Novo usuário com 7 dias de trial
      const now = new Date();
      const trialEndsDate = new Date();
      trialEndsDate.setDate(now.getDate() + 7);

      const newSub: UserSubscription = {
        status: "trial",
        createdAt: Timestamp.fromDate(now),
        trialEndsAt: Timestamp.fromDate(trialEndsDate),
      };

      await setDoc(userRef, newSub);
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

    if (now > endDate) {
      return "expired";
    }
    return "active";
  }

  return "expired";
};

// -------- Dados do app (onde estava o problema) --------

const getDefaultAppData = (): AppData => ({
  transactions: [],
  bills: [],
  categories: ["Combustível", "Alimentação", "Manutenção", "Outros"],
  // shiftState fica opcional; se quisermos persistir depois é só usar
});

// Carrega dados do usuário (PC, celular, etc.)
export const loadAppData = async (userId?: string): Promise<AppData> => {
  const defaults = getDefaultAppData();

  // Se não temos usuário logado ou Firestore, tenta só o backup local
  if (!userId || !db) {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        return JSON.parse(raw) as AppData;
      }
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

      // Atualiza backup local com o que veio da nuvem
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
      } catch (e) {
        console.warn("LocalStorage save backup error:", e);
      }

      return merged;
    } else {
      // Usuário novo: cria documento vazio com defaults
      await setDoc(ref, cleanPayload(defaults), { merge: true });
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(defaults));
      } catch (e) {
        console.warn("LocalStorage save backup error:", e);
      }
      return defaults;
    }
  } catch (e) {
    console.error("Firestore load error:", e);

    // Se der erro no Firestore, tenta último backup local
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        return JSON.parse(raw) as AppData;
      }
    } catch {
      // ignora
    }

    return defaults;
  }
};

// Salva dados no Firestore + backup local
export const saveAppData = async (
  data: AppData,
  userId?: string
): Promise<void> => {
  // Sempre salva local como backup
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.error("LocalStorage save error", e);
  }

  // Salva na nuvem se tiver user + db
  if (db && userId) {
    try {
      await setDoc(doc(db, "userData", userId), cleanPayload(data), {
        merge: true,
      });
    } catch (e) {
      console.error("Firestore save error", e);
    }
  }
};
