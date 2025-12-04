import { db, auth } from "../firebaseConfig";
import { Category } from "../types";

// Mantemos a lógica existente de persistência local conforme solicitado,
// mas agora exportamos o 'auth' real importado do firebaseConfig.ts
// para que o Login funcione.

export const logoutUser = async () => {
  // Se houver uma instância de auth real, poderíamos chamar signOut(auth),
  // mas mantendo a lógica existente de apenas recarregar:
  console.log("User logout triggered");
  window.location.reload();
};

export const loadAppData = async (userId: string) => {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 800));
  
  const saved = localStorage.getItem(`finandrive_data_${userId}`);
  return saved ? JSON.parse(saved) : null;
};

export const saveAppData = async (data: any, userId: string) => {
  localStorage.setItem(`finandrive_data_${userId}`, JSON.stringify(data));
};

// --- Category CRUD Operations (Implementation over existing LocalStorage structure) ---

export const getCategories = async (driverId: string): Promise<Category[]> => {
  const data = await loadAppData(driverId);
  return data?.categories || [];
};

export const addCategory = async (driverId: string, data: { name: string; type?: "income" | "expense" | "both" }): Promise<Category> => {
  const newCat: Category = {
    id: `cat_${Date.now()}`,
    name: data.name,
    type: data.type || 'both',
    driverId
  };
  return newCat;
};

export const updateCategory = async (categoryId: string, data: Partial<Category>): Promise<void> => {
  console.log(`Updating category ${categoryId}`, data);
};

export const deleteCategory = async (categoryId: string): Promise<void> => {
  console.log(`Deleting category ${categoryId}`);
};

// Exportamos auth para uso no Login.tsx e db para uso futuro
export { auth, db };
