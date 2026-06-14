"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import { useAuthStore, DEMO_WORKERS } from "@/lib/auth";
import { useWorkerStore, useJobStore } from "@/lib/store";
import { useAgentChat } from "@/lib/agentChat";
import { useTheme } from "@/lib/theme";
import { LogIn, LogOut, User, Moon, Sun, ChevronDown } from "lucide-react";

export default function Header() {
  const { currentUser, isLoggedIn, login, logout } = useAuthStore();
  const { isDark, toggle } = useTheme();
  const [showDropdown, setShowDropdown] = useState(false);
  const router = useRouter();

  const handleLogin = (worker: (typeof DEMO_WORKERS)[0]) => {
    login(worker);
    setShowDropdown(false);
  };

  const handleLogout = () => {
    logout();
    useWorkerStore.getState().reset();
    useJobStore.getState().reset();
    useAgentChat.getState().clear();
    router.push("/");
  };

  return (
    <header className="sticky top-0 z-20 h-16 flex items-center justify-end gap-2 px-5 glass border-b border-border">
      {/* Theme toggle */}
      <button
        onClick={toggle}
        aria-label="Toggle theme"
        className="relative w-10 h-10 grid place-items-center rounded-xl text-muted hover:text-foreground hover:bg-foreground/5 transition-colors"
      >
        <AnimatePresence mode="wait" initial={false}>
          <motion.span
            key={isDark ? "moon" : "sun"}
            initial={{ rotate: -90, opacity: 0, scale: 0.6 }}
            animate={{ rotate: 0, opacity: 1, scale: 1 }}
            exit={{ rotate: 90, opacity: 0, scale: 0.6 }}
            transition={{ duration: 0.2 }}
          >
            {isDark ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
          </motion.span>
        </AnimatePresence>
      </button>

      {/* Auth widget */}
      <div className="relative">
        {!isLoggedIn ? (
          <>
            <button
              onClick={() => setShowDropdown((v) => !v)}
              className="flex items-center gap-2 px-4 py-2 bg-foreground text-background rounded-full text-sm font-medium hover:opacity-90 transition-opacity"
            >
              <LogIn className="w-4 h-4" />
              Log in
              <ChevronDown className="w-3.5 h-3.5 opacity-70" />
            </button>

            <AnimatePresence>
              {showDropdown && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowDropdown(false)} />
                  <motion.div
                    initial={{ opacity: 0, y: -8, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -8, scale: 0.97 }}
                    transition={{ duration: 0.18 }}
                    className="absolute right-0 mt-2 w-72 bg-elevated border border-border rounded-2xl shadow-2xl overflow-hidden z-50"
                  >
                    <div className="px-4 py-2.5 text-xs text-faint font-semibold uppercase tracking-wide border-b border-border">
                      Demo accounts
                    </div>
                    {DEMO_WORKERS.map((worker) => (
                      <button
                        key={worker.worker_id}
                        onClick={() => handleLogin(worker)}
                        className="w-full px-4 py-3 text-left hover:bg-foreground/5 transition-colors border-b border-border last:border-b-0 flex items-center gap-3"
                      >
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-nelb-primary to-nelb-violet flex items-center justify-center text-white text-sm font-bold shrink-0">
                          {worker.name.charAt(0)}
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-foreground text-sm truncate">{worker.name}</p>
                          <p className="text-xs text-muted truncate">
                            {worker.skills.map((s) => s.charAt(0).toUpperCase() + s.slice(1)).join(", ")}
                          </p>
                        </div>
                      </button>
                    ))}
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </>
        ) : (
          <div className="flex items-center gap-1.5">
            <Link
              href="/profile"
              className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-foreground hover:bg-foreground/5 rounded-full transition-colors"
            >
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-nelb-primary to-nelb-violet flex items-center justify-center text-white text-xs font-bold">
                {currentUser?.name?.charAt(0)}
              </div>
              <span className="hidden sm:inline">{currentUser?.name}</span>
            </Link>
            <button
              onClick={handleLogout}
              aria-label="Log out"
              className="w-10 h-10 grid place-items-center text-muted hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
