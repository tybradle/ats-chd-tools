import { create } from 'zustand';

interface AppStore {
  isProjectManagerOpen: boolean;
  setProjectManagerOpen: (open: boolean) => void;
}

export const useAppStore = create<AppStore>((set) => ({
  isProjectManagerOpen: false,
  setProjectManagerOpen: (open) => set({ isProjectManagerOpen: open }),
}));
