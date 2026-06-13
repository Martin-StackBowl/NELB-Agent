"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuthStore, DEMO_WORKERS } from "@/lib/auth";
import { useWorkerStore, useJobStore } from "@/lib/store";
import { LogIn, LogOut, User, ChevronDown } from "lucide-react";

export default function Header() {
  const { currentUser, isLoggedIn, login, logout } = useAuthStore();
  const [showDropdown, setShowDropdown] = useState(false);
  const router = useRouter();

  const handleLogin = (worker: typeof DEMO_WORKERS[0]) => {
    login(worker);
    setShowDropdown(false);
  };

  const handleLogout = () => {
    logout();
    useWorkerStore.getState().reset();
    useJobStore.getState().reset();
    router.push("/");
  };

  return (
    <header className="sticky top-0 z-30 bg-nelb-light">
      <div className="px-6 py-3 flex items-center justify-end">
        {/* Auth Widget */}
        <div className="relative">
          {!isLoggedIn ? (
            <>
              <button
                onClick={() => setShowDropdown(!showDropdown)}
                className="flex items-center gap-2 px-4 py-2 bg-nelb-dark text-white rounded-full text-sm font-medium hover:bg-gray-800 transition-colors"
              >
                <LogIn className="w-4 h-4" />
                Log in
              </button>

              {showDropdown && (
                <>
                  <div
                    className="fixed inset-0"
                    onClick={() => setShowDropdown(false)}
                  />
                  <div className="absolute right-0 mt-2 w-72 bg-white border rounded-xl shadow-lg overflow-hidden z-50">
                    <div className="px-4 py-2.5 bg-gray-50 border-b text-xs text-gray-500 font-medium uppercase tracking-wide">
                      Demo Accounts
                    </div>
                    {DEMO_WORKERS.map((worker) => (
                      <button
                        key={worker.worker_id}
                        onClick={() => handleLogin(worker)}
                        className="w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors border-b last:border-b-0"
                      >
                        <p className="font-medium text-gray-900 text-sm">
                          {worker.name}
                        </p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {worker.skills.map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(", ")}
                        </p>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </>
          ) : (
            <div className="flex items-center gap-3">
              <Link
                href="/profile"
                className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100 rounded-full transition-colors"
              >
                <User className="w-4 h-4" />
                {currentUser?.name}
              </Link>
              <button
                onClick={handleLogout}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
