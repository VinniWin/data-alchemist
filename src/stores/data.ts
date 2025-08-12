import { ValidationResult } from "@/lib/validation/rules";
import { create } from "zustand";

export interface Data {
  clients: any[];
  workers: any[];
  tasks: any[];
}

export interface Priority {
  priorityLevel: number;
  taskFulfillment: number;
  fairnessConstraints: number;
  workloadBalance: number;
  skillMatching: number;
  phasePreference: number;
}

interface StoreState {
  data: Data;
  validation: ValidationResult;
  rules: any[];
  priority: Priority;

  // Setters
  setData: (data: Partial<Data>) => void;
  setValidation: (validation: Partial<ValidationResult>) => void;
  setRules: (rules: any[]) => void;
  setPriority: (priority: Partial<Priority>) => void;
  hasData: () => boolean;
}

export const useAppStore = create<StoreState>((set, get, s) => ({
  data: {
    clients: [],
    workers: [],
    tasks: [],
  },
  validation: {
    errors: [],
    isValid: true,
    warnings: [],
  },
  rules: [],
  priority: {
    priorityLevel: 20,
    taskFulfillment: 20,
    fairnessConstraints: 20,
    workloadBalance: 20,
    skillMatching: 20,
    phasePreference: 0,
  },

  // Setters
  setData: (data) =>
    set((state) => ({
      data: { ...state.data, ...data },
    })),
  setValidation: (validation) =>
    set((state) => ({
      validation: { ...state.validation, ...validation },
    })),
  setRules: (rules) => set({ rules }),
  setPriority: (priority) =>
    set((state) => ({
      priority: { ...state.priority, ...priority },
    })),
  hasData: () => {
    const state = get();
    const totalRecords =
      state.data.clients.length +
      state.data.workers.length +
      state.data.tasks.length;
    return totalRecords > 0;
  },
}));
