"use client";

import { create } from "zustand";

/**
 * Coordinates "New chat" between the Sidebar (trigger) and the Agent page (owner
 * of the in-memory conversation). The agent page reports its active message
 * count so the Sidebar knows whether to confirm before clearing.
 */
interface ChatResetState {
  nonce: number;        // bumped to signal the agent page to clear
  activeCount: number;  // number of messages in the current agent chat
  setActiveCount: (n: number) => void;
  requestReset: () => void;
}

export const useChatReset = create<ChatResetState>((set) => ({
  nonce: 0,
  activeCount: 0,
  setActiveCount: (n) => set({ activeCount: n }),
  requestReset: () => set((s) => ({ nonce: s.nonce + 1, activeCount: 0 })),
}));
