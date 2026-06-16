"use client";

import React from "react";

type Citation = { index: number; filename: string; content?: string };

/** Parse and render markdown-like content with headings, lists, bold, and citations. */
function renderMarkdown(text: string, keyPrefix: string, citations?: Citation[]) {
  const lines = text.split('\n');
  const elements: React.ReactNode[] = [];
  let currentList: string[] = [];
  
  const flushList = () => {
    if (currentList.length > 0) {
      elements.push(
        <ul key={`${keyPrefix}-list-${elements.length}`} className="list-disc list-inside space-y-1 my-2">
          {currentList.map((item, i) => (
            <li key={i} className="text-sm leading-relaxed">
              {renderInline(item, `${keyPrefix}-li-${i}`, citations)}
            </li>
          ))}
        </ul>
      );
      currentList = [];
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
        <sup key={`${keyPrefix}-cite-${i}`} className="ml-0.5">
          <span
            title={src?.filename}
            className="inline-flex items-center justify-center min-w-[16px] h-[16px] px-1 text-[10px] font-semibold align-middle rounded bg-nelb-primary/12 text-nelb-primary ring-1 ring-nelb-primary/20 hover:bg-nelb-primary/20 transition-colors cursor-default"
          >
            {n}
          </span>
        </sup>
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
