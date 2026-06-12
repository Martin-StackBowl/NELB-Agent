"use client";

import { useAuthStore } from "@/lib/auth";

export default function Home() {
  const { isLoggedIn, currentUser } = useAuthStore();

  return (
    <main className="flex flex-col items-center justify-center min-h-screen p-8">
      <div className="max-w-2xl text-center space-y-6">
        <h1 className="text-4xl font-bold text-nelb-primary">
          NELB
        </h1>
        <p className="text-xl text-nelb-secondary font-medium">
          No Employee Left Behind
        </p>
        <p className="text-gray-600 text-lg leading-relaxed">
          An intelligent reasoning agent for fair job distribution in
          community-level gig economies. Three brains. One mission.
        </p>

        {isLoggedIn ? (
          /* Logged-in navigation */
          <div className="space-y-3 pt-4">
            <p className="text-sm text-gray-500">
              Welcome back, <span className="font-medium text-gray-700">{currentUser?.name}</span>
            </p>
            <div className="flex gap-4 justify-center">
              <a
                href="/agent"
                className="px-6 py-3 bg-nelb-dark text-white rounded-lg font-medium hover:bg-gray-800 transition-colors"
              >
                Talk to NELB
              </a>
              <a
                href="/employer"
                className="px-6 py-3 bg-nelb-primary text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
              >
                Find Workers
              </a>
              <a
                href="/worker"
                className="px-6 py-3 bg-nelb-secondary text-white rounded-lg font-medium hover:bg-green-700 transition-colors"
              >
                My Memory
              </a>
            </div>
          </div>
        ) : (
          /* Logged-out navigation */
          <div className="flex gap-4 justify-center pt-4">
            <a
              href="/agent"
              className="px-6 py-3 bg-nelb-dark text-white rounded-lg font-medium hover:bg-gray-800 transition-colors"
            >
              Talk to NELB
            </a>
            <a
              href="/employer"
              className="px-6 py-3 bg-nelb-primary text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              I need work done
            </a>
            <a
              href="/worker"
              className="px-6 py-3 bg-nelb-secondary text-white rounded-lg font-medium hover:bg-green-700 transition-colors"
            >
              I&apos;m looking for work
            </a>
          </div>
        )}

        <div className="pt-8 grid grid-cols-3 gap-4 text-sm">
          <div className="p-4 bg-white rounded-lg shadow-sm border">
            <p className="font-semibold text-nelb-primary">Allocation Brain</p>
            <p className="text-gray-500 mt-1">5-step fair reasoning</p>
          </div>
          <div className="p-4 bg-white rounded-lg shadow-sm border">
            <p className="font-semibold text-nelb-primary">Memory Brain</p>
            <p className="text-gray-500 mt-1">Work history recall</p>
          </div>
          <div className="p-4 bg-white rounded-lg shadow-sm border">
            <p className="font-semibold text-nelb-primary">Assistant Brain</p>
            <p className="text-gray-500 mt-1">Job site buddy</p>
          </div>
        </div>
      </div>
    </main>
  );
}
