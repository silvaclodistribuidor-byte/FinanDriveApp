
import { auth as authMock } from "../firebaseConfig";
import { Category } from "../types";

// Re-export mock auth
export const auth = authMock;
export const db = null;

export const logoutUser = async () => {
  localStorage.removeItem("finandrive_demo_user");
  window.location.reload();
};

export const loadAppData = async (userId: string) => {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 500));
  
  const saved = localStorage.getItem(`finandrive_data_${userId}`);
  return saved ? JSON.parse(saved) : null;
};

export const saveAppData = async (data: any, userId: string) => {
  localStorage.setItem(`finandrive_data_${userId}`, JSON.stringify(data));
};

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
  // Mock update
  console.log("Mock category update", categoryId, data);
};

export const deleteCategory = async (categoryId: string): Promise<void> => {
  // Mock delete
  console.log("Mock category delete", categoryId);
};
