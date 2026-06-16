"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Chat scroll manager.
 *
 * Keeps the conversation pinned to the bottom as new content arrives, but
 * respects the user scrolling up to read history (auto-pin pauses until they
 * return to the bottom). The input dock lives OUTSIDE this scroll container,
 * so it never moves with the content.
 */
export function useChatScroll(dep: unknown) {
  const ref = useRef<HTMLDivElement>(null);
  const [atBottom, setAtBottom] = useState(true);
  // Mirror atBottom in a ref so stick() always reads the latest value without
  // being re-created (and without re-subscribing the streaming callback).
  const atBottomRef = useRef(true);
  // Pending animation-frame id used to coalesce per-tick scrolls into one/frame.
  const frameRef = useRef<number | null>(null);

  const scrollToBottom = useCallback((behavior: ScrollBehavior = "smooth") => {
    const el = ref.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior });
  }, []);

  const onScroll = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const distance = el.scrollHeight - el.scrollTop - el.clientHeight;
    const next = distance < 96;
    atBottomRef.current = next;
    setAtBottom(next);
  }, []);

  // Auto-pin when dependency changes (new message / loading state)
  useEffect(() => {
    if (atBottomRef.current) scrollToBottom("smooth");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dep]);

  /**
   * Pin while streaming, only if the user hasn't scrolled away. Called on every
   * reveal tick (~60x/sec); we coalesce into a single scroll per animation frame
   * so the view tracks the growing bubble smoothly instead of thrashing.
   */
  const stick = useCallback(() => {
    if (!atBottomRef.current) return;
    if (frameRef.current != null) return;
    frameRef.current = requestAnimationFrame(() => {
      frameRef.current = null;
      const el = ref.current;
      if (el) el.scrollTo({ top: el.scrollHeight, behavior: "auto" });
    });
  }, []);

  // Cancel any pending frame on unmount.
  useEffect(() => {
    return () => {
      if (frameRef.current != null) cancelAnimationFrame(frameRef.current);
    };
  }, []);

  return { ref, atBottom, onScroll, scrollToBottom, stick };
}
