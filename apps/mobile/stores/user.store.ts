import { create } from "zustand";
import { api } from "@/services/api";

export interface UserProfile {
  name: string;
  age: number | null;
  sex: "masculin" | "feminin" | null;
  weight: number | null;
  height: number | null;
  activityLevel: string;
  allergies: string[];
  medicalConditions: string[];
  dietPreferences: string[];
  medications: string[];
  isPregnant: boolean;
  onboardingCompleted: boolean;
}

interface UserState {
  profile: UserProfile;
  isLoading: boolean;
  error: string | null;

  updateProfile: (updates: Partial<UserProfile>) => Promise<void>;
  fetchProfile: () => Promise<void>;
  toggleAllergy: (allergyId: string) => void;
  toggleCondition: (conditionId: string) => void;
  toggleDiet: (dietId: string) => void;
  addMedication: (medication: string) => void;
  removeMedication: (medication: string) => void;
  calculateBMR: () => number | null;
  calculateTDEE: () => number | null;
  clearError: () => void;
}

const defaultProfile: UserProfile = {
  name: "",
  age: null,
  sex: null,
  weight: null,
  height: null,
  activityLevel: "sedentar",
  allergies: [],
  medicalConditions: [],
  dietPreferences: [],
  medications: [],
  isPregnant: false,
  onboardingCompleted: false,
};

const ACTIVITY_MULTIPLIERS: Record<string, number> = {
  sedentar: 1.2,
  usor_activ: 1.375,
  moderat_activ: 1.55,
  activ: 1.725,
  foarte_activ: 1.9,
};

export const useUserStore = create<UserState>((set, get) => ({
  profile: { ...defaultProfile },
  isLoading: false,
  error: null,

  updateProfile: async (updates) => {
    set((state) => ({
      profile: { ...state.profile, ...updates },
    }));
    try {
      await api.put("/user/profile", updates);
    } catch {
      // Keep local state even if API fails
    }
  },

  fetchProfile: async () => {
    set({ isLoading: true, error: null });
    try {
      const profile = await api.get<UserProfile>("/user/profile");
      set({ profile, isLoading: false });
    } catch (err: any) {
      set({
        error: err.message || "Eroare la încărcarea profilului",
        isLoading: false,
      });
    }
  },

  toggleAllergy: (allergyId) => {
    set((state) => {
      const allergies = state.profile.allergies.includes(allergyId)
        ? state.profile.allergies.filter((a) => a !== allergyId)
        : [...state.profile.allergies, allergyId];
      return { profile: { ...state.profile, allergies } };
    });
  },

  toggleCondition: (conditionId) => {
    set((state) => {
      const medicalConditions = state.profile.medicalConditions.includes(conditionId)
        ? state.profile.medicalConditions.filter((c) => c !== conditionId)
        : [...state.profile.medicalConditions, conditionId];
      return { profile: { ...state.profile, medicalConditions } };
    });
  },

  toggleDiet: (dietId) => {
    set((state) => {
      const dietPreferences = state.profile.dietPreferences.includes(dietId)
        ? state.profile.dietPreferences.filter((d) => d !== dietId)
        : [...state.profile.dietPreferences, dietId];
      return { profile: { ...state.profile, dietPreferences } };
    });
  },

  addMedication: (medication) => {
    set((state) => ({
      profile: {
        ...state.profile,
        medications: [...state.profile.medications, medication],
      },
    }));
  },

  removeMedication: (medication) => {
    set((state) => ({
      profile: {
        ...state.profile,
        medications: state.profile.medications.filter((m) => m !== medication),
      },
    }));
  },

  calculateBMR: () => {
    const { weight, height, age, sex } = get().profile;
    if (!weight || !height || !age || !sex) return null;

    // Mifflin-St Jeor Equation
    if (sex === "masculin") {
      return Math.round(10 * weight + 6.25 * height - 5 * age + 5);
    }
    return Math.round(10 * weight + 6.25 * height - 5 * age - 161);
  },

  calculateTDEE: () => {
    const bmr = get().calculateBMR();
    if (!bmr) return null;
    const multiplier = ACTIVITY_MULTIPLIERS[get().profile.activityLevel] || 1.2;
    return Math.round(bmr * multiplier);
  },

  clearError: () => set({ error: null }),
}));
