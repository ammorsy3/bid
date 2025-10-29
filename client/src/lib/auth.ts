import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { apiRequest } from './queryClient';

interface User {
  id: string;
  username: string;
  email: string;
  name: string;
  role: 'requester' | 'vendor';
  company?: string;
  expertise?: string;
  rating?: string;
  verificationStatus?: string;
  onboardingState?: 'draft' | 'completed';
}

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (userData: any) => Promise<void>;
  logout: () => void;
  checkAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isLoading: false,

      login: async (email: string, password: string) => {
        set({ isLoading: true });
        try {
          const response = await apiRequest('POST', '/api/auth/login', { email, password });
          const data = await response.json();
          
          set({ 
            user: data.user, 
            token: data.token, 
            isLoading: false 
          });

          // Set authorization header for future requests
          localStorage.setItem('token', data.token);
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      register: async (userData: any) => {
        set({ isLoading: true });
        try {
          const response = await apiRequest('POST', '/api/auth/register', userData);
          const data = await response.json();
          
          set({ 
            user: data.user, 
            token: data.token, 
            isLoading: false 
          });

          localStorage.setItem('token', data.token);
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      logout: () => {
        localStorage.removeItem('token');
        set({ user: null, token: null });
      },

      checkAuth: async () => {
        const token = localStorage.getItem('token');
        if (!token) return;

        try {
          const response = await fetch('/api/auth/me', {
            headers: { Authorization: `Bearer ${token}` }
          });
          
          if (response.ok) {
            const user = await response.json();
            set({ user, token });
          } else {
            localStorage.removeItem('token');
            set({ user: null, token: null });
          }
        } catch (error) {
          localStorage.removeItem('token');
          set({ user: null, token: null });
        }
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ token: state.token, user: state.user }),
    }
  )
);
