"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import { useAuthStore } from "@/lib/auth";
import {
  Briefcase,
  Wrench,
  User,
  HelpCircle,
  PanelLeft,
  MessageSquare,
  Plus,
} from "lucide-react";

const NAV = [
  { href: "/agent", label: "Talk to NELB", icon: MessageSquare },
  { href: "/employer", label: "Find Workers", icon: Briefcase },
  { href: "/worker", label: "Work Assistant", icon: Wrench },
];

export default function Sidebar() {
  const [expanded, setExpanded] = useState(true);
  const pathname = usePathname();
  const { isLoggedIn } = useAuthStore();

  return (
    <motion.aside
      animate={{ width: expanded ? 248 : 68 }}
      transition={{ type: "spring", stiffness: 260, damping: 30 }}
      className="relative h-screen shrink-0 glass border-r border-border flex flex-col z-30"
    >
      {/* Brand / toggle */}
      <div className={`flex items-center h-16 ${expanded ? "px-4 justify-between" : "px-0 justify-center"}`}>
        <AnimatePresence mode="wait">
          {expanded && (
            <motion.div
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -8 }}
              transition={{ duration: 0.15 }}
            >
              <Link href="/" className="flex items-center gap-2.5">
                <img src="/logo.svg" alt="NELB" className="w-7 h-7" />
                <span className="font-bold text-lg tracking-tight text-gradient">NELB</span>
              </Link>
            </motion.div>
          )}
        </AnimatePresence>
        <button
          onClick={() => setExpanded((v) => !v)}
          className="p-2 rounded-xl text-muted hover:text-foreground hover:bg-foreground/5 transition-colors"
          aria-label={expanded ? "Collapse sidebar" : "Expand sidebar"}
        >
          <PanelLeft className="w-5 h-5" />
        </button>
      </div>

      {/* New chat */}
      <div className="px-3">
        <Link
          href="/agent"
          className={`flex items-center gap-2.5 rounded-xl bg-gradient-to-r from-nelb-primary to-nelb-violet text-white font-medium shadow-lg shadow-nelb-primary/25 hover:shadow-nelb-primary/40 transition-all hover:scale-[1.01] ${
            expanded ? "px-3.5 py-2.5 justify-start" : "p-2.5 justify-center"
          }`}
          title={!expanded ? "New chat" : undefined}
        >
          <Plus className="w-5 h-5 shrink-0" />
          {expanded && <span className="text-sm">New chat</span>}
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto scroll-area px-3 py-4 space-y-1">
        {expanded && (
          <p className="px-2.5 pb-1 text-[11px] font-semibold uppercase tracking-wider text-faint">
            Brains
          </p>
        )}
        {NAV.map((item) => {
          const active = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              title={!expanded ? item.label : undefined}
              className={`relative flex items-center gap-3 rounded-xl text-sm font-medium transition-colors whitespace-nowrap ${
                expanded ? "px-3 py-2.5" : "p-2.5 justify-center"
              } ${
                active
                  ? "bg-foreground/[0.06] text-foreground"
                  : "text-muted hover:text-foreground hover:bg-foreground/[0.04]"
              }`}
            >
              {active && (
                <motion.span
                  layoutId="nav-active"
                  className="absolute left-0 top-1/2 -translate-y-1/2 h-6 w-1 rounded-r-full bg-gradient-to-b from-nelb-primary to-nelb-violet"
                />
              )}
              <Icon className="w-5 h-5 shrink-0" />
              {expanded && <span className="overflow-hidden">{item.label}</span>}
            </Link>
          );
        })}

        {isLoggedIn && (
          <>
            <div className={`pt-3 mt-2 ${expanded ? "border-t border-border" : ""}`} />
            {expanded && (
              <p className="px-2.5 pb-1 text-[11px] font-semibold uppercase tracking-wider text-faint">
                Account
              </p>
            )}
            <Link
              href="/profile"
              title={!expanded ? "Profile" : undefined}
              className={`flex items-center gap-3 rounded-xl text-sm font-medium transition-colors whitespace-nowrap ${
                expanded ? "px-3 py-2.5" : "p-2.5 justify-center"
              } ${
                pathname === "/profile"
                  ? "bg-foreground/[0.06] text-foreground"
                  : "text-muted hover:text-foreground hover:bg-foreground/[0.04]"
              }`}
            >
              <User className="w-5 h-5 shrink-0" />
              {expanded && <span className="overflow-hidden">Profile</span>}
            </Link>
          </>
        )}
      </nav>

      {/* Footer */}
      <div className="px-3 py-3 space-y-1 border-t border-border">
        <button
          title={!expanded ? "Help" : undefined}
          className={`flex items-center gap-3 rounded-xl text-sm font-medium text-muted hover:text-foreground hover:bg-foreground/[0.04] transition-colors w-full whitespace-nowrap ${
            expanded ? "px-3 py-2.5" : "p-2.5 justify-center"
          }`}
        >
          <HelpCircle className="w-5 h-5 shrink-0" />
          {expanded && <span className="overflow-hidden">Help</span>}
        </button>
      </div>
    </motion.aside>
  );
}
