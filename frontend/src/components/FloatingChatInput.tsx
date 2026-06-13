"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ArrowUpCircle, History, Wrench, MapPin } from "lucide-react";
import dynamic from "next/dynamic";

const MapPicker = dynamic(() => import("@/components/MapPicker"), { ssr: false });

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
}

export default function FloatingChatInput({
  value,
  onChange,
  onSend,
  isLoading = false,
  placeholder = "Ask NELB...",
  showLocationToggle = false,
  latitude = -25.7479,
  longitude = 28.2293,
  radiusKm = 5,
  onLocationChange,
  onRadiusChange,
  isCentered = true,
  showModeToggle = false,
  activeMode = "memory",
  onModeChange,
}: FloatingChatInputProps) {
  const [showMap, setShowMap] = useState(false);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  };

  const inputComponent = (
    <div className={`w-full ${isCentered ? "max-w-3xl" : ""}`}>
      {/* Map panel */}
      <AnimatePresence>
        {showMap && showLocationToggle && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="mb-3 overflow-hidden"
          >
            <div className="bg-white rounded-2xl border border-gray-200 shadow-lg overflow-hidden">
              <div className="h-[300px]">
                <MapPicker
                  latitude={latitude}
                  longitude={longitude}
                  radiusKm={radiusKm}
                  onLocationSelect={(lat, lng) => onLocationChange?.(lat, lng)}
                />
              </div>
              <div className="p-4 border-t border-gray-200 bg-gray-50">
                <div className="flex items-center gap-3">
                  <label className="text-xs text-gray-600 font-medium">Radius:</label>
                  <input
                    type="range"
                    min={1}
                    max={20}
                    value={radiusKm}
                    onChange={(e) => onRadiusChange?.(Number(e.target.value))}
                    className="flex-1"
                  />
                  <span className="text-xs text-gray-700 font-medium w-12">{radiusKm}km</span>
                </div>
                <div className="mt-2 text-xs text-gray-500">
                  Selected: {latitude.toFixed(4)}, {longitude.toFixed(4)}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input bar */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-lg">
        {/* Text input row */}
        <div className="flex items-center gap-2 px-4 pt-3 pb-2">
          <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={isLoading}
            className="flex-1 bg-transparent border-none focus:outline-none text-gray-900 placeholder-gray-400 text-sm"
          />
        </div>

        {/* Bottom row: toggles on left, send on right */}
        <div className="flex items-center justify-between px-3 pb-3">
          <div className="flex items-center gap-2">
            {/* Location toggle */}
            {showLocationToggle && (
              <button
                onClick={() => setShowMap(!showMap)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                  showMap
                    ? "bg-nelb-primary/10 text-nelb-primary border border-nelb-primary/30"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                <MapPin className="w-3.5 h-3.5" />
                Location
              </button>
            )}

            {/* Mode toggle */}
            {showModeToggle && (
              <div className="inline-flex items-center bg-gray-100 rounded-full p-0.5">
                <button
                  onClick={() => onModeChange?.("memory")}
                  className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 ${
                    activeMode === "memory"
                      ? "bg-white text-nelb-primary shadow-sm"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  <History className="w-3 h-3" />
                  Memory
                </button>
                <button
                  onClick={() => onModeChange?.("assist")}
                  className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 ${
                    activeMode === "assist"
                      ? "bg-white text-nelb-secondary shadow-sm"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  <Wrench className="w-3 h-3" />
                  Assist
                </button>
              </div>
            )}
          </div>

          {/* Send button */}
          <button
            onClick={onSend}
            disabled={isLoading || !value.trim()}
            className="p-1.5 text-nelb-primary hover:text-blue-700 transition-colors disabled:text-gray-300 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <motion.div className="flex gap-1 items-center w-7 h-7 justify-center">
                {[0, 1, 2].map((i) => (
                  <motion.span
                    key={i}
                    className="w-1.5 h-1.5 bg-gray-400 rounded-full"
                    animate={{ y: [0, -4, 0] }}
                    transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15 }}
                  />
                ))}
              </motion.div>
            ) : (
              <ArrowUpCircle className="w-7 h-7" />
            )}
          </button>
        </div>
      </div>
    </div>
  );

  if (isCentered) {
    return (
      <div className="flex items-center justify-center w-full px-6">
        {inputComponent}
      </div>
    );
  }

  return inputComponent;
}
