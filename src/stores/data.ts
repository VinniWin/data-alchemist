import { ValidationResult } from "@/lib/validation/rules";
import { create } from "zustand";

export interface Data {
  clients: any[];
  workers: any[];
  tasks: any[];
}

export interface Priority {
  priorityLevel: number;
  loadBalance: number;
  deadline: number;
  resourceAvailability: number;
  taskComplexity: number;
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
}

export const useAppStore = create<StoreState>((set) => ({
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
    priorityLevel: 70,
    loadBalance: 30,
    deadline: 50,
    resourceAvailability: 40,
    taskComplexity: 35,
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
}));
