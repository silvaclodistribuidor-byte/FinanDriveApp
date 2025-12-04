
// Mocks for environment without Firebase installed or configured
// This bypasses module not found errors for firebase/app, firebase/auth, etc.

export const app = null;
export const db = null;
export const auth = null;
export const firebaseConfig = {}; 
