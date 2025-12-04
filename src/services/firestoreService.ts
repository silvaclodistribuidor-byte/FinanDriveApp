// src/services/firestoreService.ts
import { db, auth } from "../firebaseConfig";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { signOut } from "firebase/auth";
import type { Category } from "../types";

const LOCAL_KEY_PREFIX = "finandrive_data_";

/**
 * Helpers para LocalStorage
 */
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

/**
 * Logout com Firebase Auth (se disponível)
 */
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

/**
 * --- Category helpers (compatíveis com a estrutura atual) ---
 * Hoje as categorias estão dentro do objeto principal salvo pelo App.tsx,
 * então aqui só expomos funções auxiliares, todas em cima de load/saveAppData.
 */

export const getCategories = async (driverId: string): Promise<Category[]> => {
  const data = await loadAppData(driverId);
  return data?.categories || [];
};

export const addCategory = async (
  driverId: string,
  data: { name: string; type?: "income" | "expense" | "both" }
): Promise<Category> => {
  const currentData = (await loadAppData(driverId)) || {};
  const existing: Category[] = currentData.categories || [];

  const newCat: Category = {
    id: `cat_${Date.now()}`,
    name: data.name,
    type: data.type || "both",
    driverId,
  };

  const updatedCategories = [...existing, newCat];
  const newData = { ...currentData, categories: updatedCategories };
  await saveAppData(newData, driverId);

  return newCat;
};

export const updateCategory = async (
  driverId: string,
  categoryId: string,
  data: Partial<Category>
): Promise<void> => {
  const currentData = (await loadAppData(driverId)) || {};
  const existing: Category[] = currentData.categories || [];

  const updated = existing.map((cat) =>
    cat.id === categoryId ? { ...cat, ...data } : cat
  );

  const newData = { ...currentData, categories: updated };
  await saveAppData(newData, driverId);
};

export const deleteCategory = async (
  driverId: string,
  categoryId: string
): Promise<void> => {
  const currentData = (await loadAppData(driverId)) || {};
  const existing: Category[] = currentData.categories || [];

  const filtered = existing.filter((cat) => cat.id !== categoryId);
  const newData = { ...currentData, categories: filtered };
  await saveAppData(newData, driverId);
};

export { auth, db };
