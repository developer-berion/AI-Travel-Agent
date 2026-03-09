"use client";

import { create } from "zustand";

type CompareState = {
  selectedOptionIds: string[];
  toggleOption: (optionId: string) => void;
  clear: () => void;
};

export const useCompareStore = create<CompareState>((set) => ({
  selectedOptionIds: [],
  toggleOption: (optionId) =>
    set((state) => ({
      selectedOptionIds: state.selectedOptionIds.includes(optionId)
        ? state.selectedOptionIds.filter((id) => id !== optionId)
        : [...state.selectedOptionIds, optionId].slice(-3),
    })),
  clear: () => set({ selectedOptionIds: [] }),
}));
