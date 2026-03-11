"use client";

import type { ServiceLine } from "@alana/domain";
import { create } from "zustand";

type CompareState = {
  selectedServiceLine: ServiceLine | null;
  selectedOptionIds: string[];
  setSelectedServiceLine: (serviceLine: ServiceLine | null) => void;
  toggleOption: (optionId: string, serviceLine: ServiceLine) => void;
  clear: () => void;
};

export const useCompareStore = create<CompareState>((set) => ({
  selectedServiceLine: null,
  selectedOptionIds: [],
  setSelectedServiceLine: (selectedServiceLine) =>
    set(() => ({
      selectedOptionIds: [],
      selectedServiceLine,
    })),
  toggleOption: (optionId, serviceLine) =>
    set((state) => {
      if (
        state.selectedServiceLine &&
        state.selectedServiceLine !== serviceLine
      ) {
        return {
          selectedOptionIds: [optionId],
          selectedServiceLine: serviceLine,
        };
      }

      const selectedOptionIds = state.selectedOptionIds.includes(optionId)
        ? state.selectedOptionIds.filter((id) => id !== optionId)
        : [...state.selectedOptionIds, optionId].slice(-5);

      return {
        selectedOptionIds,
        selectedServiceLine: selectedOptionIds.length > 0 ? serviceLine : null,
      };
    }),
  clear: () => set({ selectedOptionIds: [], selectedServiceLine: null }),
}));
