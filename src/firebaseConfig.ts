// import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
// import { getFirestore, Firestore } from "firebase/firestore";
// import { getAuth, Auth } from "firebase/auth";

// Função utilitária para buscar variáveis de ambiente em diferentes contextos (Vite, Node/Vercel)
const getEnv = (key: string): string | undefined => {
  try {
    // Verifica process.env (Node.js / Vercel padrão)
    if (typeof process !== "undefined" && (process as any).env && (process as any).env[key]) {
      return (process as any).env[key] as string;
    }

    // Verifica import.meta.env (Vite)
    // @ts-ignore
    if (typeof import.meta !== "undefined" && (import.meta as any).env && (import.meta as any).env[key]) {
      // @ts-ignore
      return (import.meta as any).env[key] as string;
    }
  } catch {
    // Ignora erros de acesso caso o ambiente seja restrito
  }
  return undefined;
};

// Monta a configuração buscando por prefixos comuns (FIREBASE_, REACT_APP_, VITE_)
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
    getEnv("FIREBASE_STORAGE_BUCKET") ||
    getEnv("REACT_APP_FIREBASE_STORAGE_BUCKET") ||
    getEnv("VITE_FIREBASE_STORAGE_BUCKET"),
  messagingSenderId:
    getEnv("FIREBASE_MESSAGING_SENDER_ID") ||
    getEnv("REACT_APP_FIREBASE_MESSAGING_SENDER_ID") ||
    getEnv("VITE_FIREBASE_MESSAGING_SENDER_ID"),
  appId:
    getEnv("FIREBASE_APP_ID") ||
    getEnv("REACT_APP_FIREBASE_APP_ID") ||
    getEnv("VITE_FIREBASE_APP_ID"),
};

// Mock types since we cannot import them
type FirebaseApp = any;
type Firestore = any;
type Auth = any;

let app: FirebaseApp | null = null;
let db: Firestore | null = null;
let auth: Auth | null = null;

// Inicializa apenas se as configurações críticas existirem
if (firebaseConfig.apiKey && firebaseConfig.projectId) {
  try {
    // Commented out to prevent errors when modules are missing
    // app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
    // db = getFirestore(app);
    // auth = getAuth(app);
    console.warn("[FinanDrive] Firebase imports disabled. Running in mock mode.");
  } catch (error) {
    console.error("[FinanDrive] Falha ao inicializar Firebase:", error);
  }
} else {
  console.warn("[FinanDrive] Config Firebase incompleta. Verifique variáveis de ambiente.");
}

export { app, db, auth, firebaseConfig };
