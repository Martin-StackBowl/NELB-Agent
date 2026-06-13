"use client";

import { useEffect, useRef, useState } from "react";

interface StreamingTextProps {
  text: string;
  /** Called on every reveal tick — use to keep the chat scrolled to the bottom. */
  onUpdate?: () => void;
  /** Called once when the full text has been revealed. */
  onDone?: () => void;
  /** Render the currently-revealed slice (e.g. wrap in a citation renderer). */
  render: (shown: string, streaming: boolean) => React.ReactNode;
}

/**
 * Reveals `text` progressively to simulate token streaming.
 * Total reveal time is capped (~1.4s) regardless of length so long
 * allocation summaries don't feel sluggish.
 */
export default function StreamingText({ text, onUpdate, onDone, render }: StreamingTextProps) {
  const [n, setN] = useState(0);
  const onUpdateRef = useRef(onUpdate);
  const onDoneRef = useRef(onDone);
  onUpdateRef.current = onUpdate;
  onDoneRef.current = onDone;

  useEffect(() => {
    setN(0);
    if (!text) {
      onDoneRef.current?.();
      return;
    }
    const step = Math.max(1, Math.ceil(text.length / 90));
    let cur = 0;
    const id = setInterval(() => {
      cur = Math.min(text.length, cur + step);
      setN(cur);
      onUpdateRef.current?.();
      if (cur >= text.length) {
        clearInterval(id);
        onDoneRef.current?.();
      }
    }, 16);
    return () => clearInterval(id);
  }, [text]);

  const streaming = n < text.length;
  return <>{render(text.slice(0, n), streaming)}</>;
}
