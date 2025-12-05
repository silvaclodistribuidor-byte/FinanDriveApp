// src/services/firestoreService.ts
import { signOut } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../firebaseConfig';
import { Category } from '../types';

// Re-export para ser usado no App.tsx
export { auth, db };

const COLLECTION_NAME = 'driversData'; // 1 documento por motorista (uid)

// Logout real usando Firebase Auth
export const logoutUser = async () => {
  try {
    await signOut(auth);
    window.location.reload();
  } catch (error) {
    console.error('Erro ao fazer logout:', error);
  }
};

// Carrega os dados do motorista logado a partir do Firestore
export const loadAppData = async (userId: string) => {
  if (!userId || !db) return null;

  try {
    const ref = doc(db, COLLECTION_NAME, userId);
    const snap = await getDoc(ref);

    if (!snap.exists()) {
      return null;
    }

    return snap.data();
  } catch (error) {
    console.error('Erro ao carregar dados do Firestore:', error);
    return null;
  }
};

// Salva os dados do motorista logado no Firestore
export const saveAppData = async (data: any, userId: string) => {
  if (!userId || !db) return;

  try {
    const ref = doc(db, COLLECTION_NAME, userId);
    await setDoc(ref, data, { merge: true });
  } catch (error) {
    console.error('Erro ao salvar dados no Firestore:', error);
    throw error;
  }
};

// Helpers para categorias (o App já salva tudo junto via saveAppData)
export const getCategories = async (driverId: string): Promise<Category[]> => {
  const data = await loadAppData(driverId);
  return (data && (data as any).categories) || [];
};

export const addCategory = async (
  driverId: string,
  data: { name: string; type?: 'income' | 'expense' | 'both' }
): Promise<Category> => {
  const newCat: Category = {
    id: `cat_${Date.now()}`,
    name: data.name,
    type: data.type || 'both',
    driverId,
  };
  return newCat;
};

export const updateCategory = async (
  _categoryId: string,
  _data: Partial<Category>
): Promise<void> => {
  // As categorias são persistidas junto com o objeto principal via saveAppData
  return;
};

export const deleteCategory = async (_categoryId: string): Promise<void> => {
  // Idem: o App controla o array e chama saveAppData depois
  return;
};
