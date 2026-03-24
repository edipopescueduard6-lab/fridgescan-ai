import { create } from "zustand";

export interface ScanResult {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  category: string;
  confidence: number;
  selected: boolean;
  estimatedExpiry: string;
}

interface ScanState {
  scanResults: ScanResult[];
  isScanning: boolean;
  capturedImageUri: string | null;
  error: string | null;

  setScanResults: (results: ScanResult[]) => void;
  toggleResultSelection: (id: string) => void;
  updateResultQuantity: (id: string, quantity: number) => void;
  clearResults: () => void;
  setScanning: (isScanning: boolean) => void;
  setCapturedImage: (uri: string | null) => void;
  getSelectedResults: () => ScanResult[];
  setError: (error: string | null) => void;
}

export const useScanStore = create<ScanState>((set, get) => ({
  scanResults: [],
  isScanning: false,
  capturedImageUri: null,
  error: null,

  setScanResults: (results) => set({ scanResults: results, isScanning: false }),

  toggleResultSelection: (id) => {
    set((state) => ({
      scanResults: state.scanResults.map((r) =>
        r.id === id ? { ...r, selected: !r.selected } : r
      ),
    }));
  },

  updateResultQuantity: (id, quantity) => {
    set((state) => ({
      scanResults: state.scanResults.map((r) =>
        r.id === id ? { ...r, quantity } : r
      ),
    }));
  },

  clearResults: () =>
    set({
      scanResults: [],
      capturedImageUri: null,
      isScanning: false,
      error: null,
    }),

  setScanning: (isScanning) => set({ isScanning }),

  setCapturedImage: (uri) => set({ capturedImageUri: uri }),

  getSelectedResults: () => get().scanResults.filter((r) => r.selected),

  setError: (error) => set({ error }),
}));
