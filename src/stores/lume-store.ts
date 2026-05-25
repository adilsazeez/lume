"use client";

import { create } from "zustand";

type TodayFocusSlice = {
  todayFocusActive: boolean;
  setTodayFocusActive: (v: boolean) => void;
};

export const useTodayFocusStore = create<TodayFocusSlice>((set) => ({
  todayFocusActive: true,
  setTodayFocusActive: (v) => set({ todayFocusActive: v }),
}));
