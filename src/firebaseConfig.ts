
// import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
// import { getAuth, Auth } from "firebase/auth";
// import { getFirestore, Firestore } from "firebase/firestore";

// Configuração usando variáveis de ambiente do Vite
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

let app: any = null;
let auth: any = null;
let db: any = null;

try {
  // Inicializa o Firebase apenas se a configuração mínima estiver presente
  // Isso previne erros fatais em ambientes de desenvolvimento sem .env configurado
  if (firebaseConfig.apiKey) {
    // app = getApps().length ? getApp() : initializeApp(firebaseConfig);
    // auth = getAuth(app);
    // db = getFirestore(app);
    console.log("Firebase config detected but modules commented out due to missing dependencies in environment.");
  }
} catch (e) {
  console.error("Erro na inicialização do Firebase", e);
}

export { app, auth, db };
