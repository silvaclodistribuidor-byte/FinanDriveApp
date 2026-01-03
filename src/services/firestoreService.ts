// src/services/firestoreService.ts
import { signOut } from 'firebase/auth';
import { FieldValue, doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../firebaseConfig';
import { Category } from '../types';

// Firestore não aceita campos "undefined" nos documentos.
// Esta função remove campos indefinidos e normaliza aninhamentos
// para evitar erros de permissão/escrita.
const sanitizeForFirestore = (value: any): any => {
  if (value instanceof FieldValue) {
    return value;
  }
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

export const DRIVERS_COLLECTION = 'driversData'; // 1 documento por motorista (uid)

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
export const loadAppData = async (
  userId: string
): Promise<{ data: any | null; exists: boolean }> => {
  if (!userId || !db) return { data: null, exists: false };

  try {
    const ref = doc(db, DRIVERS_COLLECTION, userId);
    const snap = await getDoc(ref);

    if (!snap.exists()) {
      console.log('[firestoreService] loadAppData: doc NOT found', { userId });
      return { data: null, exists: false };
    }

    const data = snap.data();
    const summary = {
      transactions: Array.isArray((data as any)?.transactions)
        ? (data as any).transactions.length
        : 0,
      bills: Array.isArray((data as any)?.bills) ? (data as any).bills.length : 0,
      categories: Array.isArray((data as any)?.categories)
        ? (data as any).categories.length
        : 0,
      hasShiftState: Boolean((data as any)?.shiftState),
    };
    console.log('[firestoreService] loadAppData: doc found', { userId, summary });

    return { data, exists: true };
  } catch (error) {
    console.error('Erro ao carregar dados do Firestore:', error);
    return { data: null, exists: false };
  }
};

// Salva os dados do motorista logado no Firestore
export const saveAppData = async (data: any, userId: string) => {
  if (!userId || !db) return;

  try {
    const ref = doc(db, DRIVERS_COLLECTION, userId);

    // Garante que cada categoria tenha owner e sem campos undefined
    const normalizedCategories = (data.categories || []).map((cat: Category) => ({
      ...cat,
      driverId: cat.driverId || userId,
    }));

    const sanitizedPayload = sanitizeForFirestore({
      ...data,
      categories: normalizedCategories,
    });

    console.log('[firestoreService] saveAppData', {
      userId,
      summary: {
        transactions: Array.isArray(data?.transactions) ? data.transactions.length : 0,
        bills: Array.isArray(data?.bills) ? data.bills.length : 0,
        categories: Array.isArray(data?.categories) ? data.categories.length : 0,
        hasShiftState: Boolean(data?.shiftState),
      },
    });

    await setDoc(ref, sanitizedPayload, { merge: true });
  } catch (error) {
    console.error('Erro ao salvar dados no Firestore:', error);
    throw error;
  }
};

export const updateDriverDoc = async (userId: string, payload: Record<string, any>) => {
  if (!userId || !db) return;
  const ref = doc(db, DRIVERS_COLLECTION, userId);
  const sanitizedPayload = sanitizeForFirestore(payload);
  await setDoc(ref, sanitizedPayload, { merge: true });
};

// Cria o documento do motorista apenas se ainda não existir
export const createDriverDocIfMissing = async (data: any, userId: string) => {
  if (!userId || !db) return false;

  const ref = doc(db, DRIVERS_COLLECTION, userId);
  const snap = await getDoc(ref);

  if (snap.exists()) {
    console.log('[firestoreService] createDriverDocIfMissing: already exists, skipping', {
      userId,
    });
    return false;
  }

  const normalizedCategories = (data.categories || []).map((cat: Category) => ({
    ...cat,
    driverId: cat.driverId || userId,
  }));

  const sanitizedPayload = sanitizeForFirestore({
    ...data,
    categories: normalizedCategories,
  });

  console.log('[firestoreService] createDriverDocIfMissing: creating doc', {
    userId,
    summary: {
      transactions: Array.isArray(data?.transactions) ? data.transactions.length : 0,
      bills: Array.isArray(data?.bills) ? data.bills.length : 0,
      categories: Array.isArray(data?.categories) ? data.categories.length : 0,
      hasShiftState: Boolean(data?.shiftState),
    },
  });

  await setDoc(ref, sanitizedPayload, { merge: true });
  return true;
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
