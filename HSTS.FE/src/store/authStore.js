import { create } from 'zustand';
import { setToken, getToken, removeToken } from '@/utils/storage';

export const useAuthStore = create((set) => ({
  user: null,
  token: getToken(),
  role: null,
  isAuthenticated: !!getToken(),
  
  setAuth: (user, token) => {
    setToken(token);
    set({ 
      user, 
      token, 
      role: user?.role || null,
      isAuthenticated: true 
    });
  },
  
  logout: () => {
    removeToken();
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
