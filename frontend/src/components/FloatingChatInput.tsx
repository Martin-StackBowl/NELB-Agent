"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
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
  isCentered?: boolean; // true = centered (empty chat), false = bottom
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
      {/* Map panel - slides up when open */}
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
      <div className="bg-white rounded-2xl border border-gray-200 shadow-lg overflow-hidden">
        <div className="flex items-end gap-2 p-3">
          {/* Location toggle icon */}
          {showLocationToggle && (
            <button
              onClick={() => setShowMap(!showMap)}
              className={`p-2.5 rounded-xl transition-all ${
                showMap
                  ? "bg-nelb-primary text-white"
                  : "hover:bg-gray-100 text-gray-400 hover:text-gray-600"
              }`}
              title={showMap ? "Hide map" : "Set location"}
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
            </button>
          )}

          {/* Text input */}
          <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={isLoading}
            className="flex-1 px-4 py-3 bg-transparent border-none focus:outline-none text-gray-900 placeholder-gray-400"
          />

          {/* Send button */}
          <button
            onClick={onSend}
            disabled={isLoading || !value.trim()}
            className="px-5 py-2.5 bg-nelb-primary text-white rounded-xl font-medium hover:bg-blue-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <div className="flex gap-1">
                {[0, 1, 2].map((i) => (
                  <motion.span
                    key={i}
                    className="w-1.5 h-1.5 bg-white rounded-full"
                    animate={{ y: [0, -4, 0] }}
                    transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15 }}
                  />
                ))}
              </div>
            ) : (
              "Send"
            )}
          </button>
        </div>
      </div>
    </div>
  );

  // If centered, wrap in centered container
  if (isCentered) {
    return (
      <div className="flex items-center justify-center w-full px-6">
        {inputComponent}
      </div>
    );
  }

  // If at bottom, return as is
  return inputComponent;
}
