"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuthStore, DEMO_WORKERS } from "@/lib/auth";
import { useWorkerStore, useJobStore } from "@/lib/store";

export default function Header() {
  const { currentUser, isLoggedIn, login, logout } = useAuthStore();
  const [showDropdown, setShowDropdown] = useState(false);
  const router = useRouter();

  const handleLogin = (worker: typeof DEMO_WORKERS[0]) => {
    login(worker);
    setShowDropdown(false);
  };

  const handleLogout = () => {
    // Clear all application state
    logout();
    useWorkerStore.getState().reset();
    useJobStore.getState().reset();
    // Redirect to home
    router.push("/");
  };

  return (
    <header className="border-b bg-white sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="text-2xl font-bold text-nelb-primary">
          NELB
        </Link>

        {/* Auth Widget */}
        <div className="relative">
          {!isLoggedIn ? (
            <>
              <button
                onClick={() => setShowDropdown(!showDropdown)}
                className="flex items-center gap-2 px-4 py-2 bg-nelb-primary text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                🔐 Login
                <span className="text-xs">▼</span>
              </button>

              {showDropdown && (
                <>
                  {/* Backdrop */}
                  <div
                    className="fixed inset-0"
                    onClick={() => setShowDropdown(false)}
                  />
                  {/* Dropdown */}
                  <div className="absolute right-0 mt-2 w-72 bg-white border rounded-lg shadow-lg overflow-hidden z-50">
                    <div className="px-4 py-2 bg-gray-50 border-b text-xs text-gray-600 font-medium">
                      Select Demo Account
                    </div>
                    {DEMO_WORKERS.map((worker) => (
                      <button
                        key={worker.worker_id}
                        onClick={() => handleLogin(worker)}
                        className="w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors border-b last:border-b-0"
                      >
                        <div className="flex items-start gap-3">
                          <span className="text-2xl">
                            {worker.skills.includes("tiling") ? "👷" : 
                             worker.skills.includes("cleaning") ? "🧹" : "🎨"}
                          </span>
                          <div className="flex-1">
                            <p className="font-medium text-gray-900">
                              {worker.name}
                            </p>
                            <p className="text-sm text-gray-500">
                              {worker.skills[0].charAt(0).toUpperCase() + worker.skills[0].slice(1)}
                            </p>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </>
          ) : (
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600">
                Logged in as:{" "}
                <span className="font-medium text-gray-900">
                  {currentUser?.name}
                </span>
              </span>
              <Link
                href="/profile"
                className="px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
              >
                Profile
              </Link>
              <button
                onClick={handleLogout}
                className="px-3 py-1.5 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors"
              >
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
