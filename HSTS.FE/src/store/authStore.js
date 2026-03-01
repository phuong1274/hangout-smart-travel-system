import { create } from 'zustand';
import { TOKEN_KEY } from '@/config/constants';

export const useAuthStore = create((set) => ({
  user: null,
  token: localStorage.getItem(TOKEN_KEY) || null,
  role: null,
  isAuthenticated: !!localStorage.getItem(TOKEN_KEY),
  
  setAuth: (user, token) => {
    localStorage.setItem(TOKEN_KEY, token);
    set({ 
      user, 
      token, 
      role: user?.role || null,
      isAuthenticated: true 
    });
  },
  
  logout: () => {
    localStorage.removeItem(TOKEN_KEY);
    set({ 
      user: null, 
      token: null, 
      role: null,
      isAuthenticated: false 
    });
  },

  updateUser: (user) => {
    set((state) => ({
      ...state,
      user,
      role: user?.role || state.role
    }));
  }
}));
