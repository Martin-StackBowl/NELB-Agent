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

  const scrollToBottom = useCallback((behavior: ScrollBehavior = "smooth") => {
    const el = ref.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior });
  }, []);

  const onScroll = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const distance = el.scrollHeight - el.scrollTop - el.clientHeight;
    setAtBottom(distance < 96);
  }, []);

  // Auto-pin when dependency changes (new message / loading state)
  useEffect(() => {
    if (atBottom) scrollToBottom("smooth");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dep]);

  /** Pin while streaming, only if the user hasn't scrolled away. */
  const stick = useCallback(() => {
    if (atBottom) scrollToBottom("auto");
  }, [atBottom, scrollToBottom]);

  return { ref, atBottom, onScroll, scrollToBottom, stick };
}
