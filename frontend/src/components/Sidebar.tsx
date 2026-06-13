"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuthStore } from "@/lib/auth";
import {
  Briefcase,
  Wrench,
  User,
  Settings,
  HelpCircle,
  PanelLeft,
  MessageSquare,
  ChevronDown,
} from "lucide-react";

export default function Sidebar() {
  const [isExpanded, setIsExpanded] = useState(false);
  const pathname = usePathname();
  const { isLoggedIn, currentUser } = useAuthStore();

  const navItems = [
    { href: "/agent", label: "Talk to NELB", icon: MessageSquare },
    { href: "/employer", label: "Find Workers", icon: Briefcase },
    { href: "/worker", label: "Work Assistant", icon: Wrench },
  ];

  return (
    <>
      {/* Sidebar */}
      <aside
        className={`fixed left-0 top-0 h-screen bg-white z-40 flex flex-col transition-all duration-300 overflow-hidden ${
          isExpanded ? "w-56" : "w-14"
        }`}
      >
        {/* Toggle / Logo area */}
        <div className={`flex items-center h-14 px-2 ${isExpanded ? "justify-between" : "justify-center"}`}>
          {isExpanded ? (
            <>
              <Link href="/" className="flex items-center gap-2 px-3">
                <img src="/logo.svg" alt="NELB" className="w-6 h-6" />
                <span className="font-bold text-nelb-primary">NELB</span>
              </Link>
              <button
                onClick={() => setIsExpanded(false)}
                className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors text-gray-500"
                aria-label="Collapse sidebar"
              >
                <PanelLeft className="w-5 h-5" />
              </button>
            </>
          ) : (
            <button
              onClick={() => setIsExpanded(true)}
              className="group relative p-2 rounded-lg transition-colors hover:bg-gray-100"
              aria-label="Expand sidebar"
            >
              <img src="/logo.svg" alt="NELB" className="w-6 h-6 transition-opacity group-hover:opacity-0" />
              <PanelLeft className="w-5 h-5 text-gray-500 absolute inset-0 m-auto opacity-0 transition-opacity group-hover:opacity-100" />
            </button>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-2 py-2 space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                  isActive
                    ? "bg-gray-100 text-nelb-primary"
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                }`}
                title={!isExpanded ? item.label : undefined}
              >
                <Icon className="w-5 h-5 shrink-0" />
                <span className="overflow-hidden">{item.label}</span>
              </Link>
            );
          })}

          {/* Profile link when logged in */}
          {isLoggedIn && (
            <>
              {isExpanded && (
                <div className="pt-3 mt-3 border-t border-gray-100">
                  <p className="px-3 py-1 text-xs text-gray-400 font-medium whitespace-nowrap overflow-hidden">
                    {currentUser?.name?.split(" ")[0]}
                  </p>
                </div>
              )}
              <Link
                href="/profile"
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                  pathname === "/profile"
                    ? "bg-gray-100 text-nelb-primary"
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                }`}
                title={!isExpanded ? "Profile" : undefined}
              >
                <User className="w-5 h-5 shrink-0" />
                <span className="overflow-hidden">Profile</span>
              </Link>
            </>
          )}
        </nav>

        {/* Bottom */}
        <div className="px-2 py-3 space-y-1">
          <button
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-500 hover:bg-gray-50 hover:text-gray-700 transition-colors w-full whitespace-nowrap"
            title={!isExpanded ? "Settings" : undefined}
          >
            <Settings className="w-5 h-5 shrink-0" />
            <span className="overflow-hidden">Settings</span>
          </button>
          <button
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-500 hover:bg-gray-50 hover:text-gray-700 transition-colors w-full whitespace-nowrap"
            title={!isExpanded ? "Help" : undefined}
          >
            <HelpCircle className="w-5 h-5 shrink-0" />
            <span className="overflow-hidden">Help</span>
          </button>
        </div>
      </aside>

      {/* Spacer — pushes main content to the right */}
      <div className={`shrink-0 transition-all duration-300 ${isExpanded ? "w-56" : "w-14"}`} />
    </>
  );
}
