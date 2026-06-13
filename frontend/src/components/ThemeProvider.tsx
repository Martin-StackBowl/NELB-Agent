"use client";

import { useEffect } from "react";
import { useTheme } from "@/lib/theme";

/**
 * Applies the `.dark` class to <html> based on the persisted theme store.
 * A blocking script in layout.tsx sets the initial class to avoid a flash,
 * this keeps it in sync with the Zustand store afterwards.
 */
export default function ThemeProvider({ children }: { children: React.ReactNode }) {
  const isDark = useTheme((s) => s.isDark);

  useEffect(() => {
    const root = document.documentElement;
    if (isDark) {
      root.classList.add("dark");
      root.style.colorScheme = "dark";
    } else {
      root.classList.remove("dark");
      root.style.colorScheme = "light";
    }
  }, [isDark]);

  return <>{children}</>;
}
