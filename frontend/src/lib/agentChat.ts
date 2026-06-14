"use client";

import { create } from "zustand";
import type { AllocationResponse } from "./api";

export interface AgentChatMessage {
  role: "user" | "agent";
  content: string;
  toolUsed?: string;
  rawResult?: AllocationResponse | null;
  citations?: { index: number; filename: string; content: string }[];
  timestamp: number;
}

interface AgentChatState {
  messages: AgentChatMessage[];
  addMessage: (msg: AgentChatMessage) => void;
  clear: () => void;
}

/**
 * In-memory store for the Talk to NELB conversation. Persists across navigation
 * (like the Work Assistant chat) but is cleared on refresh or via "New chat".
 */
export const useAgentChat = create<AgentChatState>((set) => ({
  messages: [],
  addMessage: (msg) => set((s) => ({ messages: [...s.messages, msg] })),
  clear: () => set({ messages: [] }),
}));
