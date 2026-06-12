/**
 * Demo Authentication Store
 * 
 * Provides context-aware authentication for NELB demo.
 * Uses hardcoded worker accounts - no real auth backend needed.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Worker {
  worker_id: string;
  name: string;
  email: string;
  skills: string[];
  latitude: number;
  longitude: number;
  address: string;
  reliability_score: number;
  is_available: boolean;
}

interface AuthState {
  currentUser: Worker | null;
  isLoggedIn: boolean;
  login: (worker: Worker) => void;
  logout: () => void;
}

// Demo workers matching seed data
export const DEMO_WORKERS: Worker[] = [
  {
    worker_id: "e71d43bb-77ba-42cf-a914-555d0ee70753",
    name: "Thabo Mabena",
    email: "thabo@nelb.demo",
    skills: ["tiling", "painting", "general repair"],
    latitude: -25.7545,
    longitude: 28.1878,
    address: "Centurion, Pretoria",
    reliability_score: 85,
    is_available: true,
  },
  {
    worker_id: "c4e89f23-9b1a-4d5e-8f6c-3a7b9d2e1f4a",
    name: "Sarah Nkosi",
    email: "sarah@nelb.demo",
    skills: ["cleaning", "gardening"],
    latitude: -25.7461,
    longitude: 28.1881,
    address: "Hatfield, Pretoria",
    reliability_score: 92,
    is_available: true,
  },
  {
    worker_id: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    name: "James Molefe",
    email: "james@nelb.demo",
    skills: ["painting", "carpentry"],
    latitude: -25.7709,
    longitude: 28.2293,
    address: "Brooklyn, Pretoria",
    reliability_score: 78,
    is_available: true,
  },
];

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      currentUser: null,
      isLoggedIn: false,
      login: (worker) =>
        set({
          currentUser: worker,
          isLoggedIn: true,
        }),
      logout: () =>
        set({
          currentUser: null,
          isLoggedIn: false,
        }),
    }),
    {
      name: 'nelb-auth-storage',
    }
  )
);
