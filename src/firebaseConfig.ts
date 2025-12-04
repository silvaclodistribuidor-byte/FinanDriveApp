
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

// Inicializa mocks para evitar erros de compilação
const app = null;
const db = null;
const auth = null;

console.warn("[FinanDrive] Firebase running in MOCK mode due to missing/incompatible modules.");

export { app, db, auth, firebaseConfig };
