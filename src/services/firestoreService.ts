
import { db, auth } from "../firebaseConfig";
import { Category } from "../types";

export const logoutUser = async () => {
  if (auth) {
    try {
      // Mock logout
      console.log("Logging out...");
    } catch (error) {
      console.error("Error signing out", error);
    }
  }
  window.location.reload();
};

export const loadAppData = async (userId: string) => {
  // Mock Firestore implementation - Fallback to localStorage
  const saved = localStorage.getItem(`finandrive_data_${userId}`);
  return saved ? JSON.parse(saved) : null;
};

export const saveAppData = async (data: any, userId: string) => {
  // Mock Firestore implementation - Always save to localStorage
  localStorage.setItem(`finandrive_data_${userId}`, JSON.stringify(data));
};

// --- Category CRUD Operations ---

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

export { auth, db };
