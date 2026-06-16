"use client";

import React, { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "motion/react";

type Citation = { index: number; filename: string; content?: string };

/** Parse and render markdown-like content with headings, lists, bold, and citations. */
function renderMarkdown(text: string, keyPrefix: string, citations?: Citation[]) {
  const lines = text.split('\n');
  const elements: React.ReactNode[] = [];
  let currentList: string[] = [];
  // Track the source line index where the current list started so its key is
  // stable as more items stream in (prevents React from remounting the <ul>).
  let listStartIndex = -1;

  const flushList = () => {
    if (currentList.length > 0) {
      const items = currentList;
      const startIndex = listStartIndex;
      elements.push(
        <ul key={`${keyPrefix}-list-${startIndex}`} className="list-disc list-inside space-y-1 my-2">
          {items.map((item, i) => (
            <li key={`${keyPrefix}-li-${startIndex}-${i}`} className="text-sm leading-relaxed">
              {renderInline(item, `${keyPrefix}-li-${startIndex}-${i}`, citations)}
            </li>
          ))}
        </ul>
      );
      currentList = [];
      listStartIndex = -1;
    }
  };

  lines.forEach((line, lineIndex) => {
    // Heading level 2 (##)
    if (line.startsWith('## ')) {
      flushList();
      elements.push(
        <h2 key={`${keyPrefix}-h2-${lineIndex}`} className="text-base font-semibold text-foreground mt-4 mb-2">
          {renderInline(line.slice(3), `${keyPrefix}-h2-${lineIndex}`, citations)}
        </h2>
      );
    }
    // Heading level 3 (###)
    else if (line.startsWith('### ')) {
      flushList();
      elements.push(
        <h3 key={`${keyPrefix}-h3-${lineIndex}`} className="text-sm font-semibold text-foreground mt-3 mb-1">
          {renderInline(line.slice(4), `${keyPrefix}-h3-${lineIndex}`, citations)}
        </h3>
      );
    }
    // List item (- or *)
    else if (line.match(/^[\-\*]\s/)) {
      if (listStartIndex === -1) listStartIndex = lineIndex;
      currentList.push(line.slice(2).trim());
    }
    // Empty line
    else if (line.trim() === '') {
      flushList();
      // Don't add extra spacing for empty lines
    }
    // Regular paragraph
    else {
      flushList();
      elements.push(
        <span key={`${keyPrefix}-p-${lineIndex}`} className="block leading-relaxed">
          {renderInline(line, `${keyPrefix}-p-${lineIndex}`, citations)}
        </span>
      );
    }
  });

  flushList(); // Flush any remaining list items
  return elements;
}

/** Render inline content: bold, citations, and plain text. */
function renderInline(text: string, keyPrefix: string, citations?: Citation[]) {
  // First split by citations
  const parts = text.split(/(\[doc\d+\])/g);
  
  return parts.map((part, i) => {
    // Handle citation
    const citationMatch = part.match(/^\[doc(\d+)\]$/);
    if (citationMatch) {
      const n = Number(citationMatch[1]);
      const src = citations?.find((c) => c.index === n);
      return (
        <CitationBadge key={`${keyPrefix}-cite-${i}`} n={n} citation={src} />
      );
    }
    
    // Handle bold within the part
    return renderBold(part, `${keyPrefix}-${i}`);
  });
}

/** Renders inline **bold** markdown within a plain text fragment. */
function renderBold(text: string, keyPrefix: string) {
  return text.split(/(\*\*[^*]+\*\*)/g).map((seg, i) => {
    const m = seg.match(/^\*\*([^*]+)\*\*$/);
    if (m) {
      return (
        <strong key={`${keyPrefix}-b-${i}`} className="font-semibold text-foreground">
          {m[1]}
        </strong>
      );
    }
    return <React.Fragment key={`${keyPrefix}-t-${i}`}>{seg}</React.Fragment>;
  });
}

/** A numbered citation badge with a portaled click-to-open preview card. */
function CitationBadge({ n, citation }: { n: number; citation?: Citation }) {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState<{ x: number; y: number; above: boolean } | null>(null);
  const anchorRef = useRef<HTMLSpanElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const CARD_WIDTH = 300;

  const place = () => {
    const el = anchorRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    // Flip above when there isn't much room below.
    const above = window.innerHeight - r.bottom < 180;
    // Centre horizontally on the badge, clamped to the viewport.
    const half = CARD_WIDTH / 2;
    const x = Math.min(
      Math.max(r.left + r.width / 2, half + 8),
      window.innerWidth - half - 8
    );
    const y = above ? r.top - 8 : r.bottom + 8;
    setCoords({ x, y, above });
  };

  const toggle = () => {
    if (!open) place();
    setOpen((v) => !v);
  };

  // Close on outside click, Escape, or scroll/resize.
  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => {
      const t = e.target as Node;
      if (anchorRef.current?.contains(t) || cardRef.current?.contains(t)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    const onReflow = () => setOpen(false);
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    window.addEventListener("scroll", onReflow, true);
    window.addEventListener("resize", onReflow);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", onReflow, true);
      window.removeEventListener("resize", onReflow);
    };
  }, [open]);

  const filename = citation?.filename ?? `Source ${n}`;
  const content = citation?.content?.trim();

  return (
    <sup className="mx-[3px]">
      <span
        ref={anchorRef}
        tabIndex={0}
        role="button"
        aria-label={`Citation ${n}: ${filename}`}
        aria-expanded={open}
        onClick={toggle}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            toggle();
          }
        }}
        className={`inline-flex items-center justify-center min-w-[16px] h-[16px] px-1 text-[10px] font-semibold align-middle rounded text-nelb-primary ring-1 ring-nelb-primary/20 hover:bg-nelb-primary/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-nelb-primary/50 transition-colors cursor-pointer ${
          open ? "bg-nelb-primary/25" : "bg-nelb-primary/12"
        }`}
      >
        {n}
      </span>
      {mounted &&
        coords &&
        createPortal(
          <AnimatePresence>
            {open && (
              <motion.div
                ref={cardRef}
                role="dialog"
                initial={{ opacity: 0, y: coords.above ? 4 : -4, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: coords.above ? 4 : -4, scale: 0.97 }}
                transition={{ duration: 0.13 }}
                style={{
                  position: "fixed",
                  left: coords.x,
                  top: coords.y,
                  width: CARD_WIDTH,
                  transform: `translate(-50%, ${coords.above ? "-100%" : "0"})`,
                  zIndex: 120,
                }}
                className="rounded-xl p-3 shadow-2xl ring-1 ring-border text-left bg-background/95 backdrop-blur-xl"
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-semibold rounded bg-nelb-primary/15 text-nelb-primary ring-1 ring-nelb-primary/20">
                    {n}
                  </span>
                  <span className="text-xs font-semibold text-foreground truncate">
                    {filename}
                  </span>
                </div>
                {content ? (
                  <p className="text-[11px] leading-relaxed text-muted line-clamp-5">
                    {content}
                  </p>
                ) : (
                  <p className="text-[11px] italic text-faint">
                    Source from the NELB knowledge base.
                  </p>
                )}
              </motion.div>
            )}
          </AnimatePresence>,
          document.body
        )}
    </sup>
  );
}

/** Renders text with markdown formatting: headings (## ###), lists (- *), bold (**text**), and citations [doc1]. */
export default function CitedContent({
  content,
  citations,
}: {
  content: string;
  citations?: Citation[];
}) {
  return (
    <div className="space-y-1">
      {renderMarkdown(content, 'content', citations)}
    </div>
  );
}
