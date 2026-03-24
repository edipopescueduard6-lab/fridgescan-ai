import { create } from "zustand";
import { api } from "@/services/api";
import type { FoodCategory } from "@/constants/medical";

export interface PantryItem {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  category: FoodCategory;
  expiryDate: string;
  addedDate: string;
  confidence?: number;
  imageUri?: string;
}

interface PantryState {
  items: PantryItem[];
  isLoading: boolean;
  error: string | null;
  selectedCategory: FoodCategory;

  fetchItems: () => Promise<void>;
  addItem: (item: Omit<PantryItem, "id" | "addedDate">) => Promise<void>;
  addItems: (items: Omit<PantryItem, "id" | "addedDate">[]) => void;
  removeItem: (id: string) => Promise<void>;
  updateItem: (id: string, updates: Partial<PantryItem>) => Promise<void>;
  setCategory: (category: FoodCategory) => void;
  clearError: () => void;
  getExpiringItems: () => PantryItem[];
  getExpiredItems: () => PantryItem[];
}

const generateId = () => Math.random().toString(36).substring(2) + Date.now().toString(36);

export const usePantryStore = create<PantryState>((set, get) => ({
  items: [],
  isLoading: false,
  error: null,
  selectedCategory: "toate",

  fetchItems: async () => {
    set({ isLoading: true, error: null });
    try {
      const items = await api.get<PantryItem[]>("/pantry");
      set({ items, isLoading: false });
    } catch (err: any) {
      set({
        error: err.message || "Eroare la încărcarea inventarului",
        isLoading: false,
      });
    }
  },

  addItem: async (item) => {
    set({ isLoading: true, error: null });
    try {
      const newItem: PantryItem = {
        ...item,
        id: generateId(),
        addedDate: new Date().toISOString(),
      };
      set((state) => ({
        items: [...state.items, newItem],
        isLoading: false,
      }));
      // Optimistic update - also sync with API
      try {
        await api.post("/pantry", newItem);
      } catch {
        // Keep local state even if API fails
      }
    } catch (err: any) {
      set({
        error: err.message || "Eroare la adăugarea produsului",
        isLoading: false,
      });
    }
  },

  addItems: (items) => {
    const newItems: PantryItem[] = items.map((item) => ({
      ...item,
      id: generateId(),
      addedDate: new Date().toISOString(),
    }));
    set((state) => ({
      items: [...state.items, ...newItems],
    }));
  },

  removeItem: async (id) => {
    set((state) => ({
      items: state.items.filter((item) => item.id !== id),
    }));
    try {
      await api.delete(`/pantry/${id}`);
    } catch {
      // Keep local state even if API fails
    }
  },

  updateItem: async (id, updates) => {
    set((state) => ({
      items: state.items.map((item) =>
        item.id === id ? { ...item, ...updates } : item
      ),
    }));
    try {
      await api.put(`/pantry/${id}`, updates);
    } catch {
      // Keep local state even if API fails
    }
  },

  setCategory: (category) => set({ selectedCategory: category }),

  clearError: () => set({ error: null }),

  getExpiringItems: () => {
    const now = new Date();
    const twoDaysFromNow = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000);
    return get().items.filter((item) => {
      const expiry = new Date(item.expiryDate);
      return expiry > now && expiry <= twoDaysFromNow;
    });
  },

  getExpiredItems: () => {
    const now = new Date();
    return get().items.filter((item) => new Date(item.expiryDate) <= now);
  },
}));
