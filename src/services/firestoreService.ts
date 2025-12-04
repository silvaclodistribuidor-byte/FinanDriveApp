// src/services/firestoreService.ts
import { db, auth } from "../firebaseConfig";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { signOut } from "firebase/auth";

const LOCAL_KEY_PREFIX = "finandrive_data_";

const loadLocalData = (userId: string) => {
  try {
    const raw = localStorage.getItem(`${LOCAL_KEY_PREFIX}${userId}`);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (error) {
    console.error("[FinanDrive] Erro ao ler localStorage:", error);
    return null;
  }
};

const saveLocalData = (userId: string, data: any) => {
  try {
    localStorage.setItem(`${LOCAL_KEY_PREFIX}${userId}`, JSON.stringify(data));
  } catch (error) {
    console.error("[FinanDrive] Erro ao salvar no localStorage:", error);
  }
};

export const logoutUser = async () => {
  if (auth) {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Error signing out", error);
    }
  }
  window.location.reload();
};

/**
 * Carrega os dados do app:
 * 1) Se Firestore estiver ok e o doc existir -> usa Firestore e sincroniza com localStorage.
 * 2) Se Firestore der erro ou não existir doc -> usa localStorage.
 */
export const loadAppData = async (userId: string) => {
  const localData = loadLocalData(userId);

  // Se Firestore estiver configurado, tenta buscar de lá
  if (db) {
    try {
      const ref = doc(db, "drivers", userId);
      const snap = await getDoc(ref);

      if (snap.exists()) {
        const cloudData = snap.data();
        // Sincroniza em cache local para próximos loads serem mais rápidos
        saveLocalData(userId, cloudData);
        return cloudData;
      }
    } catch (error) {
      console.error("[FinanDrive] Erro ao carregar do Firestore:", error);
      // Cai pro localData
    }
  }

  // Se chegou aqui, usa o que tiver local
  return localData;
};

/**
 * Salva os dados do app:
 * - SEMPRE salva no localStorage primeiro (pra não perder nada).
 * - Se Firestore estiver disponível, também grava no doc do usuário.
 */
export const saveAppData = async (data: any, userId: string) => {
  // Sempre salva local (backup)
  saveLocalData(userId, data);

  // Se Firestore estiver configurado, tenta salvar lá também
  if (db) {
    try {
      const ref = doc(db, "drivers", userId);
      await setDoc(ref, data, { merge: true });
    } catch (error) {
      console.error("[FinanDrive] Erro ao salvar no Firestore:", error);
    }
  }
};

export { auth, db };
