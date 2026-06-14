"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ArrowUp, History, Wrench, MapPin, Lock } from "lucide-react";
import dynamic from "next/dynamic";

const MapPicker = dynamic(() => import("@/components/MapPicker"), { ssr: false });

/** Free-text coordinate field — commits on blur or Enter, never mid-type. */
function CoordInput({
  value,
  onChange,
  placeholder,
}: {
  value: number;
  onChange: (v: number) => void;
  placeholder: string;
}) {
  const [draft, setDraft] = useState(String(value));

  // Sync when parent changes (e.g. map click) while field is not focused
  useEffect(() => {
    setDraft(String(value));
  }, [value]);

  const commit = useCallback(
    (raw: string) => {
      const parsed = parseFloat(raw.trim());
      if (!isNaN(parsed)) {
        onChange(parsed);
        setDraft(String(parsed));
      } else {
        setDraft(String(value));
      }
    },
    [onChange, value]
  );

  return (
    <input
      type="text"
      value={draft}
      placeholder={placeholder}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={(e) => commit(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === "Enter") e.currentTarget.blur();
      }}
      spellCheck={false}
      className="w-28 text-xs tabular-nums bg-foreground/[0.04] border border-border rounded-lg px-2 py-1 text-foreground focus:outline-none focus:ring-1 focus:ring-nelb-primary/40"
    />
  );
}

interface FloatingChatInputProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  isLoading?: boolean;
  placeholder?: string;
  showLocationToggle?: boolean;
  latitude?: number;
  longitude?: number;
  radiusKm?: number;
  onLocationChange?: (lat: number, lng: number) => void;
  onRadiusChange?: (radius: number) => void;
  isCentered?: boolean;
  showModeToggle?: boolean;
  activeMode?: "memory" | "assist";
  onModeChange?: (mode: "memory" | "assist") => void;
  memoryRequiresLogin?: boolean;
}

export default function FloatingChatInput({
  value,
  onChange,
  onSend,
  isLoading = false,
  placeholder = "Ask NELB…",
  showLocationToggle = false,
  latitude = -25.7463,
  longitude = 28.1885,
  radiusKm = 5,
  onLocationChange,
  onRadiusChange,
  showModeToggle = false,
  activeMode = "assist",
  onModeChange,
  memoryRequiresLogin = false,
}: FloatingChatInputProps) {
  const [showMap, setShowMap] = useState(false);
  const taRef = useRef<HTMLTextAreaElement>(null);

  // Auto-grow textarea
  useEffect(() => {
    const ta = taRef.current;
    if (!ta) return;
    ta.style.height = "0px";
    ta.style.height = Math.min(ta.scrollHeight, 200) + "px";
  }, [value]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  };

  return (
    <div className="w-full max-w-3xl mx-auto">
      {/* Map panel (opens above the dock) */}
      <AnimatePresence>
        {showMap && showLocationToggle && (
          <motion.div
            initial={{ height: 0, opacity: 0, y: 8 }}
            animate={{ height: "auto", opacity: 1, y: 0 }}
            exit={{ height: 0, opacity: 0, y: 8 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="mb-3 overflow-hidden"
          >
            <div className="glass-strong rounded-3xl overflow-hidden shadow-xl">
              <div className="h-[280px]">
                <MapPicker
                  latitude={latitude}
                  longitude={longitude}
                  radiusKm={radiusKm}
                  onLocationSelect={(lat, lng) => onLocationChange?.(lat, lng)}
                />
              </div>
              <div className="p-4 border-t border-border">
                <div className="flex items-center gap-3">
                  <span className="text-xs text-muted font-medium">Radius</span>
                  <input
                    type="range"
                    min={1}
                    max={20}
                    value={radiusKm}
                    onChange={(e) => onRadiusChange?.(Number(e.target.value))}
                    className="flex-1 accent-nelb-primary"
                  />
                  <span className="text-xs text-foreground font-semibold w-10">{radiusKm}km</span>
                </div>
                <div className="mt-3 flex items-center gap-1.5">
                  <span className="text-xs text-muted font-medium shrink-0">Pin</span>
                  <CoordInput
                    value={latitude}
                    onChange={(v) => onLocationChange?.(v, longitude)}
                    placeholder="Latitude"
                  />
                  <span className="text-faint text-xs">,</span>
                  <CoordInput
                    value={longitude}
                    onChange={(v) => onLocationChange?.(latitude, v)}
                    placeholder="Longitude"
                  />
                  <button
                    onClick={() => onLocationChange?.(-25.7463, 28.1885)}
                    title="Reset to Pretoria CBD"
                    className="ml-1 text-xs font-medium bg-foreground/[0.04] border border-border rounded-lg px-2 py-1 text-nelb-primary hover:bg-nelb-primary/10 hover:border-nelb-primary/40 transition-colors shrink-0"
                  >
                    Reset
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input dock */}
      <div className="glass-strong glow-ring rounded-[28px] px-2.5 py-2.5">
        <div className="flex items-end gap-2">
          <textarea
            ref={taRef}
            rows={1}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={isLoading}
            className="flex-1 resize-none bg-transparent border-none focus:outline-none text-foreground placeholder-faint text-[15px] leading-6 px-3 py-2 max-h-[200px] scroll-area"
          />
          <button
            onClick={onSend}
            disabled={isLoading || !value.trim()}
            aria-label="Send"
            className="shrink-0 w-10 h-10 grid place-items-center rounded-full bg-gradient-to-br from-nelb-primary to-nelb-violet text-white shadow-lg shadow-nelb-primary/30 transition-all hover:scale-105 disabled:opacity-40 disabled:scale-100 disabled:shadow-none"
          >
            {isLoading ? (
              <span className="flex gap-1 items-center">
                {[0, 1, 2].map((i) => (
                  <motion.span
                    key={i}
                    className="w-1.5 h-1.5 bg-white rounded-full"
                    animate={{ y: [0, -4, 0] }}
                    transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15 }}
                  />
                ))}
              </span>
            ) : (
              <ArrowUp className="w-5 h-5" />
            )}
          </button>
        </div>

        {/* Toggles row */}
        {(showLocationToggle || showModeToggle) && (
          <div className="flex items-center gap-2 px-2 pt-1.5">
            {showLocationToggle && (
              <button
                onClick={() => setShowMap((v) => !v)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                  showMap
                    ? "bg-nelb-primary/15 text-nelb-primary ring-1 ring-nelb-primary/30"
                    : "text-muted hover:bg-foreground/5"
                }`}
              >
                <MapPin className="w-3.5 h-3.5" />
                Location
              </button>
            )}

            {showModeToggle && (
              <div className="inline-flex items-center bg-foreground/[0.06] rounded-full p-0.5">
                <button
                  onClick={() => onModeChange?.("memory")}
                  title={memoryRequiresLogin ? "Log in to use Memory" : undefined}
                  className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                    activeMode === "memory"
                      ? "bg-elevated text-nelb-primary shadow-sm"
                      : memoryRequiresLogin
                      ? "text-faint cursor-default"
                      : "text-muted hover:text-foreground"
                  }`}
                >
                  {memoryRequiresLogin
                    ? <Lock className="w-3 h-3" />
                    : <History className="w-3 h-3" />}
                  Memory
                </button>
                <button
                  onClick={() => onModeChange?.("assist")}
                  className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                    activeMode === "assist"
                      ? "bg-elevated text-nelb-secondary shadow-sm"
                      : "text-muted hover:text-foreground"
                  }`}
                >
                  <Wrench className="w-3 h-3" />
                  Assist
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
