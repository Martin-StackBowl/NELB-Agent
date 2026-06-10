/**
 * Zustand stores for NELB application state.
 */

import { create } from "zustand";
import type {
  AllocationResponse,
  WorkerScore,
  RecallResponse,
  AssistResponse,
} from "./api";

// --- Job Store (Employer flow) ---

interface JobState {
  // Job posting
  category: string;
  description: string;
  budget: number;
  latitude: number;
  longitude: number;
  address: string;
  radiusKm: number;

  // Results
  allocation: AllocationResponse | null;
  selectedWorker: WorkerScore | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  setJobDetails: (details: Partial<JobState>) => void;
  setAllocation: (result: AllocationResponse) => void;
  setSelectedWorker: (worker: WorkerScore | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

export const useJobStore = create<JobState>((set) => ({
  category: "",
  description: "",
  budget: 0,
  latitude: -25.7479, // Default: Pretoria
  longitude: 28.2293,
  address: "",
  radiusKm: 5,
  allocation: null,
  selectedWorker: null,
  isLoading: false,
  error: null,

  setJobDetails: (details) => set((state) => ({ ...state, ...details })),
  setAllocation: (result) => set({ allocation: result, isLoading: false }),
  setSelectedWorker: (worker) => set({ selectedWorker: worker }),
  setLoading: (loading) => set({ isLoading: loading, error: null }),
  setError: (error) => set({ error, isLoading: false }),
  reset: () =>
    set({
      category: "",
      description: "",
      budget: 0,
      address: "",
      allocation: null,
      selectedWorker: null,
      isLoading: false,
      error: null,
    }),
}));

// --- Worker Store (Worker flow) ---

interface WorkerState {
  workerId: string;
  workerName: string;

  // Memory (Brain 2)
  recallResult: RecallResponse | null;

  // Assistant (Brain 3)
  assistResult: AssistResponse | null;

  // Chat history
  chatHistory: Array<{ role: "user" | "nelb"; content: string; timestamp: number }>;

  isLoading: boolean;
  error: string | null;

  // Actions
  setWorker: (id: string, name: string) => void;
  setRecallResult: (result: RecallResponse) => void;
  setAssistResult: (result: AssistResponse) => void;
  addChatMessage: (role: "user" | "nelb", content: string) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

export const useWorkerStore = create<WorkerState>((set) => ({
  workerId: "",
  workerName: "",
  recallResult: null,
  assistResult: null,
  chatHistory: [],
  isLoading: false,
  error: null,

  setWorker: (id, name) => set({ workerId: id, workerName: name }),
  setRecallResult: (result) => set({ recallResult: result, isLoading: false }),
  setAssistResult: (result) => set({ assistResult: result, isLoading: false }),
  addChatMessage: (role, content) =>
    set((state) => ({
      chatHistory: [
        ...state.chatHistory,
        { role, content, timestamp: Date.now() },
      ],
    })),
  setLoading: (loading) => set({ isLoading: loading, error: null }),
  setError: (error) => set({ error, isLoading: false }),
}));
