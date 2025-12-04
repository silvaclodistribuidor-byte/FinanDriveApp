// src/firebaseConfig.ts
import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getFirestore, type Firestore } from "firebase/firestore";
import { getAuth, type Auth } from "firebase/auth";

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

let app: FirebaseApp | null = null;
let db: Firestore | null = null;
let auth: Auth | null = null;

// Inicializa apenas se as configurações críticas existirem
if (firebaseConfig.apiKey && firebaseConfig.projectId) {
  try {
    app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
    db = getFirestore(app);
    auth = getAuth(app);
    console.log("[FinanDrive] Firebase inicializado com sucesso.");
  } catch (error) {
    console.error("[FinanDrive] Falha ao inicializar Firebase:", error);
  }
} else {
  console.warn(
    "[FinanDrive] Config Firebase incompleta. Usando apenas armazenamento local."
  );
}

export { app, db, auth, firebaseConfig };
