// src/firebaseConfig.ts
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

// ⚠️ IMPORTANTE:
// Aqui você precisa colar o MESMO firebaseConfig
// que já usava quando tudo estava funcionando.
// Pegue em: Configurações do projeto → Seus apps → Web.
export const firebaseConfig = {
  apiKey: "AIzaSyCs9k3dtWeUnpwj_mwTviGTr_K-GhtJA_A",
  authDomain: "finandriveapp.firebaseapp.com", 
  projectId: "finandriveapp",
  storageBucket: "finandriveapp.firebasestorage.app",
  messagingSenderId: "877667982188",
  appId: "1:877667982188:web:e42cb3d73ae04e53393149"
};

export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
