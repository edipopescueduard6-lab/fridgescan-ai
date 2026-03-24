import { create } from "zustand";
import { api, setAuthToken } from "@/services/api";

export interface User {
  id: string;
  email: string;
  name: string;
}

interface AuthState {
  token: string | null;
  user: User | null;
  isLoading: boolean;
  error: string | null;
  isAuthenticated: boolean;

  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  setToken: (token: string) => void;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  user: null,
  isLoading: false,
  error: null,
  isAuthenticated: false,

  login: async (email: string, password: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.post<{ token: string; user: User }>("/auth/login", {
        email,
        password,
      });
      setAuthToken(response.token);
      set({
        token: response.token,
        user: response.user,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (err: any) {
      set({
        error: err.message || "Eroare la autentificare",
        isLoading: false,
      });
      throw err;
    }
  },

  register: async (name: string, email: string, password: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.post<{ token: string; user: User }>("/auth/register", {
        name,
        email,
        password,
      });
      setAuthToken(response.token);
      set({
        token: response.token,
        user: response.user,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (err: any) {
      set({
        error: err.message || "Eroare la înregistrare",
        isLoading: false,
      });
      throw err;
    }
  },

  logout: () => {
    setAuthToken(null);
    set({
      token: null,
      user: null,
      isAuthenticated: false,
      error: null,
    });
  },

  setToken: (token: string) => {
    setAuthToken(token);
    set({ token, isAuthenticated: true });
  },

  clearError: () => set({ error: null }),
}));
