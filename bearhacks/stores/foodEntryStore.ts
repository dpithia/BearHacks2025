import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";

export type FoodEntry = {
  id: string;
  name: string;
  timestamp: Date;
  imageUrl?: string;
  confidence: number;
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  isHealthy: boolean;
  labels: string[];
};

interface FoodEntryStore {
  entries: FoodEntry[];
  addEntry: (entry: Omit<FoodEntry, "id">) => void;
  clearEntries: () => void;
}

export const useFoodEntryStore = create<FoodEntryStore>()(
  persist(
    (set) => ({
      entries: [],
      addEntry: (entry) =>
        set((state) => ({
          entries: [
            { ...entry, id: Math.random().toString(36).substring(7) },
            ...state.entries,
          ],
        })),
      clearEntries: () => set({ entries: [] }),
    }),
    {
      name: "food-entries",
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
