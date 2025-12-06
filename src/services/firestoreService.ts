// src/services/firestoreService.ts
import { signOut } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../firebaseConfig';
import { Category } from '../types';

// Firestore não aceita campos "undefined" nos documentos.
// Esta função remove campos indefinidos e normaliza aninhamentos
// para evitar erros de permissão/escrita.
const sanitizeForFirestore = (value: any): any => {
  if (Array.isArray(value)) {
    return value.map(sanitizeForFirestore);
  }

  if (value && typeof value === 'object') {
    return Object.entries(value).reduce((acc: Record<string, unknown>, [key, val]) => {
      if (val === undefined) return acc;
      acc[key] = sanitizeForFirestore(val);
      return acc;
    }, {});
  }

  return value;
};

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

/**
 * Carrega os dados do motorista logado a partir do Firestore.
 * NÃO cria nem sobrescreve nada, apenas lê.
 *
 * - Se não houver doc: retorna { data: null, exists: false }
 * - Se houver doc:     retorna { data: <payload>, exists: true }
 */
export const loadAppData = async (
  userId: string
): Promise<{ data: any | null; exists: boolean }> => {
  if (!userId || !db) return { data: null, exists: false };

  try {
    const ref = doc(db, COLLECTION_NAME, userId);
    const snap = await getDoc(ref);

    if (!snap.exists()) {
      return { data: null, exists: false };
    }

    return { data: snap.data(), exists: true };
  } catch (error) {
    console.error('Erro ao carregar dados do Firestore:', error);
    return { data: null, exists: false };
  }
};

/**
 * Salva os dados do motorista logado no Firestore.
 * Usa merge: true para NUNCA apagar campos que não estejam no payload atual.
 */
export const saveAppData = async (data: any, userId: string) => {
  if (!userId || !db || !data) return;

  try {
    const ref = doc(db, COLLECTION_NAME, userId);

    // Garante que cada categoria tenha driverId e sem campos undefined
    const normalizedCategories = Array.isArray(data.categories)
      ? (data.categories as Category[]).map((cat) => ({
          ...cat,
          driverId: cat.driverId || userId,
        }))
      : [];

    const sanitizedPayload = sanitizeForFirestore({
      ...data,
      categories: normalizedCategories,
    });

    await setDoc(ref, sanitizedPayload, { merge: true });
  } catch (error) {
    console.error('Erro ao salvar dados no Firestore:', error);
    throw error;
  }
};

/**
 * Cria o documento do motorista apenas se ainda não existir.
 * NÃO sobrescreve docs já existentes.
 */
export const createDriverDocIfMissing = async (data: any, userId: string) => {
  if (!userId || !db) return false;

  const ref = doc(db, COLLECTION_NAME, userId);
  const snap = await getDoc(ref);

  if (snap.exists()) return false;

  const normalizedCategories = Array.isArray(data.categories)
    ? (data.categories as Category[]).map((cat) => ({
        ...cat,
        driverId: cat.driverId || userId,
      }))
    : [];

  const sanitizedPayload = sanitizeForFirestore({
    ...data,
    categories: normalizedCategories,
  });

  await setDoc(ref, sanitizedPayload, { merge: true });
  return true;
};

/**
 * Helpers para categorias
 * (o App já salva tudo junto via saveAppData)
 */
export const getCategories = async (driverId: string): Promise<Category[]> => {
  const { data } = await loadAppData(driverId);
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
