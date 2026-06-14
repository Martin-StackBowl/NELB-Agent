"use client";

type Citation = { index: number; filename: string; content?: string };

/** Renders text with [doc1], [doc2] markers replaced by styled superscript badges.
 *  When citations metadata is provided, hovering a badge shows the source filename. */
export default function CitedContent({
  content,
  citations,
}: {
  content: string;
  citations?: Citation[];
}) {
  const parts = content.split(/(\[doc\d+\])/g);
  return (
    <span className="whitespace-pre-wrap">
      {parts.map((part, i) => {
        const match = part.match(/^\[doc(\d+)\]$/);
        if (match) {
          const n = Number(match[1]);
          const src = citations?.find((c) => c.index === n);
          return (
            <sup key={i} className="ml-0.5">
              <span
                title={src?.filename}
                className="inline-flex items-center justify-center min-w-[16px] h-[16px] px-1 text-[10px] font-semibold align-middle rounded bg-nelb-primary/12 text-nelb-primary ring-1 ring-nelb-primary/20 hover:bg-nelb-primary/20 transition-colors cursor-default"
              >
                {n}
              </span>
            </sup>
          );
        }
        return <span key={i}>{part}</span>;
      })}
    </span>
  );
}
