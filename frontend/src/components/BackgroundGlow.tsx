"use client";

/**
 * Fixed, full-viewport animated gradient glow that sits behind the entire app.
 * Pure CSS animation (no JS per-frame cost). Adapts to light/dark via opacity.
 */
export default function BackgroundGlow() {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
    >
      {/* base wash */}
      <div className="absolute inset-0 bg-background" />

      {/* colorful blobs */}
      <div className="absolute -top-40 -left-32 h-[42rem] w-[42rem] rounded-full bg-nelb-primary/30 dark:bg-nelb-primary/25 blur-[120px] animate-blob" />
      <div
        className="absolute top-1/4 -right-40 h-[40rem] w-[40rem] rounded-full bg-nelb-violet/30 dark:bg-nelb-violet/25 blur-[130px] animate-blob"
        style={{ animationDelay: "-6s" }}
      />
      <div
        className="absolute -bottom-48 left-1/4 h-[38rem] w-[38rem] rounded-full bg-nelb-cyan/25 dark:bg-nelb-cyan/20 blur-[130px] animate-blob"
        style={{ animationDelay: "-12s" }}
      />
      <div
        className="absolute bottom-1/3 right-1/4 h-[30rem] w-[30rem] rounded-full bg-nelb-pink/20 dark:bg-nelb-pink/15 blur-[120px] animate-blob"
        style={{ animationDelay: "-3s" }}
      />

      {/* subtle grain/veil to keep text legible */}
      <div className="absolute inset-0 bg-background/40 dark:bg-background/55" />
    </div>
  );
}
