// src/services/firestoreService.ts
import { db, auth } from "../firebaseConfig";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { signOut } from "firebase/auth";
import { Category } from "../types";

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

export const loadAppData = async (userId: string) => {
  // Tenta carregar do Firestore primeiro se estiver configurado
  if (db) {
    try {
      const docRef = doc(db, "drivers", userId);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        // Atualiza o cache local
        localStorage.setItem(
          `finandrive_data_${userId}`,
          JSON.stringify(data)
        );
        return data;
      }
    } catch (error) {
      console.error("Erro ao carregar do Firestore:", error);
    }
  }

  // Fallback para localStorage
  const saved = localStorage.getItem(`finandrive_data_${userId}`);
  return saved ? JSON.parse(saved) : null;
};

export const saveAppData = async (data: any, userId: string) => {
  // Salva no Firestore se estiver configurado
  if (db) {
    try {
      const docRef = doc(db, "drivers", userId);
      await setDoc(docRef, data, { merge: true });
    } catch (error) {
      console.error("Erro ao salvar no Firestore:", error);
    }
  }

  // Sempre salva no localStorage como backup/cache
  localStorage.setItem(`finandrive_data_${userId}`, JSON.stringify(data));
};

// --- Category CRUD Operations ---
// As categorias hoje estão salvas dentro do objeto principal em saveAppData/App.tsx.
// Estas funções usam esse mesmo modelo de dados, sem criar coleções separadas.

export const getCategories = async (driverId: string): Promise<Category[]> => {
  const data = await loadAppData(driverId);
  return data?.categories || [];
};

export const addCategory = async (
  driverId: string,
  data: { name: string; type?: "income" | "expense" | "both" }
): Promise<Category> => {
  const existing = (await getCategories(driverId)) || [];
  const newCat: Category = {
    id: `cat_${Date.now()}`,
    name: data.name,
    type: data.type || "both",
    driverId,
  };
  const updatedCategories = [...existing, newCat];

  const appData = (await loadAppData(driverId)) || {};
  const newData = { ...appData, categories: updatedCategories };
  await saveAppData(newData, driverId);

  return newCat;
};

export const updateCategory = async (
  driverId: string,
  categoryId: string,
  data: Partial<Category>
): Promise<void> => {
  const existing = (await getCategories(driverId)) || [];
  const updated = existing.map((cat) =>
    cat.id === categoryId ? { ...cat, ...data } : cat
  );

  const appData = (await loadAppData(driverId)) || {};
  const newData = { ...appData, categories: updated };
  await saveAppData(newData, driverId);
};

export const deleteCategory = async (
  driverId: string,
  categoryId: string
): Promise<void> => {
  const existing = (await getCategories(driverId)) || [];
  const filtered = existing.filter((cat) => cat.id !== categoryId);

  const appData = (await loadAppData(driverId)) || {};
  const newData = { ...appData, categories: filtered };
  await saveAppData(newData, driverId);
};

export { auth, db };
