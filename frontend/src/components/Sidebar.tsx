"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "motion/react";
import { useAuthStore } from "@/lib/auth";
import { useChatReset } from "@/lib/chatReset";
import { useWorkerStore } from "@/lib/store";
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
  const [confirmNewChat, setConfirmNewChat] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [hovering, setHovering] = useState(false);
  const [animating, setAnimating] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { isLoggedIn } = useAuthStore();
  const { activeCount: agentCount, requestReset } = useChatReset();

  const workerMode = useWorkerStore((s) => s.activeMode);
  const memCount = useWorkerStore((s) => s.historyChatHistory.length);
  const assistCount = useWorkerStore((s) => s.assistChatHistory.length);
  const clearWorkerChat = useWorkerStore((s) => s.clearChat);

  useEffect(() => setMounted(true), []);

  // Collapse/expand with a brief "animating" window so the brand icon doesn't
  // flicker between logo and toggle while the bar resizes under the cursor.
  const toggleExpanded = () => {
    setAnimating(true);
    setExpanded((v) => !v);
    window.setTimeout(() => setAnimating(false), 380);
  };

  // Show the toggle in place of the logo only when collapsed, hovering, and not
  // mid-animation.
  const showBrandToggle = !expanded && hovering && !animating;

  // Contextual "New chat" — targets the chat you're currently viewing.
  const isAgent = pathname === "/agent";
  const isWorker = pathname === "/worker";
  const workerCount = workerMode === "history" ? memCount : assistCount;

  // Button + dialog gradient matches the active chat's message colour.
  const gradient = isWorker
    ? workerMode === "history"
      ? "from-nelb-secondary to-nelb-cyan"
      : "from-nelb-accent to-nelb-pink"
    : "from-nelb-primary to-nelb-violet";

  const dialogText = isWorker
    ? workerMode === "history"
      ? "Starting a new chat will clear only the Work History conversation. Your Assist conversation remains unchanged."
      : "Starting a new chat will clear only the Assist conversation. Your Work History conversation remains unchanged."
    : "Starting a new chat will clear your current conversation. This can't be undone.";

  const handleNewChat = () => {
    if (isAgent) {
      if (agentCount > 0) setConfirmNewChat(true);
      // already on an empty agent chat — nothing to do
    } else if (isWorker) {
      if (workerCount > 0) setConfirmNewChat(true);
    } else {
      // Not in a chat — go to Talk to NELB without clearing anything
      router.push("/agent");
    }
  };

  const confirmReset = () => {
    if (isWorker) {
      clearWorkerChat(workerMode);
    } else {
      requestReset();
    }
    setConfirmNewChat(false);
  };

  return (
    <>
    <motion.aside
      animate={{ width: expanded ? 248 : 68 }}
      transition={{ type: "spring", stiffness: 260, damping: 30 }}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
      className="relative h-screen shrink-0 glass border-r border-border flex flex-col z-30 overflow-hidden"
    >
      {/* Brand / toggle — logo starts at the same inset as the nav icons
          (row px-3 + inner px-3), so it lines up with the icon column. */}
      <div className="flex items-center h-16 px-3 shrink-0">
        {expanded ? (
          <>
            <Link href="/" className="flex items-center gap-3 pl-3 whitespace-nowrap overflow-hidden">
              <img src="/logo.svg" alt="NELB" className="w-7 h-7 shrink-0" />
              <span className="font-bold text-lg tracking-tight text-gradient">NELB</span>
            </Link>
            <button
              onClick={toggleExpanded}
              aria-label="Collapse sidebar"
              className="ml-auto p-2 rounded-xl text-muted hover:text-foreground hover:bg-foreground/5 transition-colors shrink-0"
            >
              <PanelLeft className="w-5 h-5" />
            </button>
          </>
        ) : (
          <button
            onClick={toggleExpanded}
            aria-label="Expand sidebar"
            className="flex items-center pl-2 shrink-0"
          >
            <span
              className={`relative w-9 h-9 grid place-items-center rounded-xl transition-colors ${
                showBrandToggle ? "hover:bg-foreground/[0.06]" : ""
              }`}
            >
              <img
                src="/logo.svg"
                alt="NELB"
                className="w-7 h-7 transition-opacity duration-150"
                style={{ opacity: showBrandToggle ? 0 : 1 }}
              />
              <PanelLeft
                className="w-5 h-5 text-muted absolute inset-0 m-auto transition-opacity duration-150"
                style={{ opacity: showBrandToggle ? 1 : 0 }}
              />
            </span>
          </button>
        )}
      </div>

      {/* New chat */}
      <div className="px-3 shrink-0">
        <button
          onClick={handleNewChat}
          className={`w-full flex items-center gap-3 rounded-xl px-3 py-2.5 bg-gradient-to-r ${gradient} text-white font-medium shadow-lg shadow-nelb-primary/25 hover:shadow-nelb-primary/40 transition-all hover:scale-[1.01]`}
          title={!expanded ? "New chat" : undefined}
        >
          <Plus className="w-5 h-5 shrink-0" />
          <span className="text-sm whitespace-nowrap overflow-hidden transition-opacity duration-200" style={{ opacity: expanded ? 1 : 0 }}>
            New chat
          </span>
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden scroll-area px-3 py-4 space-y-1">
        <p
          className="px-2.5 pb-1 text-[11px] font-semibold uppercase tracking-wider text-faint whitespace-nowrap overflow-hidden transition-opacity duration-200"
          style={{ opacity: expanded ? 1 : 0 }}
        >
          Brains
        </p>
        {NAV.map((item) => {
          const active = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              title={!expanded ? item.label : undefined}
              className={`relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors whitespace-nowrap ${
                active
                  ? "bg-foreground/[0.06] text-foreground"
                  : "text-muted hover:text-foreground hover:bg-foreground/[0.04]"
              }`}
            >
              {active && !expanded && (
                <motion.span
                  layoutId="nav-active"
                  className={`absolute left-0 top-1/2 -translate-y-1/2 h-6 w-1 rounded-r-full bg-gradient-to-b ${gradient}`}
                />
              )}
              <Icon className="w-5 h-5 shrink-0" />
              <span className="overflow-hidden transition-opacity duration-200" style={{ opacity: expanded ? 1 : 0 }}>
                {item.label}
              </span>
            </Link>
          );
        })}

        {isLoggedIn && (
          <>
            <div className="pt-3 mt-2 border-t border-border" />
            <p
              className="px-2.5 pb-1 text-[11px] font-semibold uppercase tracking-wider text-faint whitespace-nowrap overflow-hidden transition-opacity duration-200"
              style={{ opacity: expanded ? 1 : 0 }}
            >
              Account
            </p>
            <Link
              href="/profile"
              title={!expanded ? "Profile" : undefined}
              className={`relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors whitespace-nowrap ${
                pathname === "/profile"
                  ? "bg-foreground/[0.06] text-foreground"
                  : "text-muted hover:text-foreground hover:bg-foreground/[0.04]"
              }`}
            >
              {pathname === "/profile" && !expanded && (
                <motion.span
                  initial={{ opacity: 0, scaleY: 0.4 }}
                  animate={{ opacity: 1, scaleY: 1 }}
                  exit={{ opacity: 0, scaleY: 0.4 }}
                  transition={{ duration: 0.15 }}
                  className={`absolute left-0 top-1/2 -translate-y-1/2 h-6 w-1 rounded-r-full bg-gradient-to-b ${gradient}`}
                />
              )}
              <User className="w-5 h-5 shrink-0" />
              <span className="overflow-hidden transition-opacity duration-200" style={{ opacity: expanded ? 1 : 0 }}>
                Profile
              </span>
            </Link>
          </>
        )}
      </nav>

      {/* Footer */}
      <div className="px-3 py-3 border-t border-border shrink-0">
        <Link
          href="/help"
          title={!expanded ? "Help" : undefined}
          className={`relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors w-full whitespace-nowrap ${
            pathname === "/help"
              ? "bg-foreground/[0.06] text-foreground"
              : "text-muted hover:text-foreground hover:bg-foreground/[0.04]"
          }`}
        >
          {pathname === "/help" && !expanded && (
            <motion.span
              initial={{ opacity: 0, scaleY: 0.4 }}
              animate={{ opacity: 1, scaleY: 1 }}
              exit={{ opacity: 0, scaleY: 0.4 }}
              transition={{ duration: 0.15 }}
              className={`absolute left-0 top-1/2 -translate-y-1/2 h-6 w-1 rounded-r-full bg-gradient-to-b ${gradient}`}
            />
          )}
          <HelpCircle className="w-5 h-5 shrink-0" />
          <span className="overflow-hidden transition-opacity duration-200" style={{ opacity: expanded ? 1 : 0 }}>
            Help
          </span>
        </Link>
      </div>
    </motion.aside>

      {/* New chat confirmation dialog — portaled to body so it's a true app-level
          modal, independent of the collapsible sidebar */}
      {mounted &&
        createPortal(
          <AnimatePresence>
            {confirmNewChat && (
              <div className="fixed inset-0 z-[100] grid place-items-center p-4">
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setConfirmNewChat(false)}
                  className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                />
                <motion.div
                  role="dialog"
                  aria-modal="true"
                  initial={{ opacity: 0, scale: 0.95, y: 8 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 8 }}
                  transition={{ duration: 0.18 }}
                  className="relative w-full max-w-sm glass-strong rounded-2xl p-6 shadow-2xl"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${gradient} grid place-items-center shrink-0`}>
                      <Plus className="w-5 h-5 text-white" />
                    </div>
                    <h3 className="font-semibold text-lg">Start a new chat?</h3>
                  </div>
                  <p className="text-sm text-muted mb-6">
                    {dialogText}
                  </p>
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => setConfirmNewChat(false)}
                      className="px-4 py-2 rounded-xl text-sm font-medium text-muted hover:text-foreground hover:bg-foreground/5 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={confirmReset}
                      className={`px-4 py-2 rounded-xl text-sm font-medium bg-gradient-to-r ${gradient} text-white shadow-lg shadow-nelb-primary/25 hover:scale-[1.02] transition-transform`}
                    >
                      New chat
                    </button>
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>,
          document.body
        )}
    </>
  );
}
