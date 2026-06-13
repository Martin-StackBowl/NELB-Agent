"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useWorkerStore } from "@/lib/store";
import { useAuthStore } from "@/lib/auth";
import { runAgent } from "@/lib/api";
import { useChatScroll } from "@/lib/useChatScroll";
import FloatingChatInput from "@/components/FloatingChatInput";
import StreamingText from "@/components/StreamingText";
import CitedContent from "@/components/CitedContent";
import { Wrench, FileText, ArrowDown } from "lucide-react";

type Citation = { index: number; filename: string; content: string };

const MEMORY_PROMPTS = [
  "Who did I paint for?",
  "How many jobs have I done in total?",
  "What's my reliability score?",
  "What are my skills?",
];
const ASSIST_PROMPTS = [
  "Which drill bit for a 6mm wall plug in brick?",
  "How many bags of cement for a 3m x 4m slab at 100mm depth?",
  "What safety precautions when using bleach indoors?",
  "What is the correct angle for a ladder against a wall?",
];

export default function WorkerPage() {
  const store = useWorkerStore();
  const { currentUser, isLoggedIn } = useAuthStore();
  const [input, setInput] = useState("");
  const [streamingKey, setStreamingKey] = useState<string | null>(null);
  const mode = store.activeMode;

  const currentMessages = mode === "memory" ? store.memoryChatHistory : store.assistChatHistory;
  const isEmpty = currentMessages.length === 0;

  const { ref, atBottom, onScroll, scrollToBottom, stick } = useChatScroll(
    currentMessages.length + (store.isLoading ? 1 : 0) + mode
  );

  const handleSend = async () => {
    if (!input.trim() || store.isLoading) return;
    const userMessage = input.trim();
    setInput("");
    store.addChatMessage(mode, "user", userMessage);
    store.setLoading(true);

    try {
      if (mode === "memory" && !isLoggedIn) {
        store.addChatMessage(
          mode,
          "nelb",
          "Please log in to access your job history. Use the Log in button in the top-right corner."
        );
        store.setLoading(false);
        return;
      }

      const result = await runAgent({
        message: userMessage,
        worker_id: currentUser?.worker_id,
      });

      const citations =
        result.raw_result && "citations" in result.raw_result
          ? (result.raw_result as { citations?: Citation[] }).citations
          : undefined;

      store.addChatMessage(mode, "nelb", result.response, citations);
      setStreamingKey(`${mode}-${result.response.slice(0, 12)}-${Date.now()}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Something went wrong";
      store.setError(msg);
      store.addChatMessage(mode, "nelb", `Error: ${msg}`);
    }
    store.setLoading(false);
  };

  const prompts = mode === "memory" && isLoggedIn ? MEMORY_PROMPTS : ASSIST_PROMPTS;
  const accent = mode === "memory" ? "from-nelb-secondary to-nelb-cyan" : "from-nelb-accent to-nelb-pink";

  // index of last nelb message (the one allowed to stream)
  const lastNelbIdx = (() => {
    for (let i = currentMessages.length - 1; i >= 0; i--) {
      if (currentMessages[i].role === "nelb") return i;
    }
    return -1;
  })();

  return (
    <div className="flex flex-col h-full">
      <div ref={ref} onScroll={onScroll} className="flex-1 overflow-y-auto scroll-area">
        {isEmpty ? (
          <div className="min-h-full flex flex-col items-center justify-center px-6 py-10">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="text-center max-w-2xl"
            >
              <div className={`inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br ${accent} shadow-xl mb-6`}>
                <Wrench className="w-8 h-8 text-white" />
              </div>
              <h1 className="text-4xl sm:text-5xl font-bold tracking-tight">Work Assistant</h1>
              <p className="mt-4 text-muted text-lg">
                {isLoggedIn
                  ? "Ask about your job history, profile, or get practical help on site."
                  : "Get practical, grounded work guidance from NELB's knowledge base."}
              </p>

              <div className="mt-8 grid sm:grid-cols-2 gap-3 text-left">
                {prompts.map((p) => (
                  <button
                    key={p}
                    onClick={() => setInput(p)}
                    className="glass rounded-2xl p-4 text-sm text-foreground/90 hover:text-foreground hover:border-nelb-primary/40 transition-colors text-left"
                  >
                    {p}
                  </button>
                ))}
              </div>
            </motion.div>
          </div>
        ) : (
          <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-6">
            {currentMessages.map((msg, idx) => {
              const isStreaming =
                msg.role === "nelb" &&
                idx === lastNelbIdx &&
                streamingKey !== null &&
                streamingKey.startsWith(mode);

              if (msg.role === "user") {
                return (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.25 }}
                    className="flex justify-end"
                  >
                    <div className={`max-w-[85%] px-5 py-3 rounded-2xl rounded-tr-sm text-[15px] bg-gradient-to-br ${accent} text-white shadow-lg whitespace-pre-wrap`}>
                      {msg.content}
                    </div>
                  </motion.div>
                );
              }

              return (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25 }}
                  className="flex items-start gap-3"
                >
                  <div className={`w-9 h-9 shrink-0 rounded-xl bg-gradient-to-br ${accent} grid place-items-center shadow-lg`}>
                    <Wrench className="w-5 h-5 text-white" />
                  </div>
                  <div className="min-w-0 flex-1 space-y-2">
                    <div className={`glass rounded-2xl rounded-tl-sm px-5 py-3.5 text-[15px] leading-relaxed text-foreground/90 ${isStreaming ? "stream-caret" : ""}`}>
                      {isStreaming ? (
                        <StreamingText
                          text={msg.content}
                          onUpdate={stick}
                          onDone={() => setStreamingKey(null)}
                          render={(shown) => <CitedContent content={shown} />}
                        />
                      ) : (
                        <CitedContent content={msg.content} />
                      )}
                    </div>

                    {msg.citations && msg.citations.length > 0 && !isStreaming && (
                      <div className="space-y-2">
                        {msg.citations.map((c) => (
                          <div
                            key={c.index}
                            className="flex items-center gap-2 px-4 py-2 glass rounded-xl text-xs text-muted"
                          >
                            <span className="font-semibold text-nelb-primary">{c.index}</span>
                            <span className="text-faint">·</span>
                            <FileText className="w-3.5 h-3.5" />
                            <span className="text-foreground/80">{c.filename}</span>
                            <span className="text-faint ml-auto">nelb-trade-guides</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })}

            {store.isLoading && (
              <div className="flex items-start gap-3">
                <div className={`w-9 h-9 shrink-0 rounded-xl bg-gradient-to-br ${accent} grid place-items-center shadow-lg`}>
                  <Wrench className="w-5 h-5 text-white" />
                </div>
                <div className="glass rounded-2xl rounded-tl-sm px-5 py-4">
                  <span className="flex gap-1.5 items-center">
                    {[0, 1, 2].map((i) => (
                      <motion.span
                        key={i}
                        className="w-2 h-2 bg-faint rounded-full"
                        animate={{ y: [0, -6, 0] }}
                        transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15 }}
                      />
                    ))}
                  </span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Pinned input */}
      <div className="shrink-0 px-4 sm:px-6 pb-5 pt-2 relative">
        <AnimatePresence>
          {!atBottom && !isEmpty && (
            <motion.button
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              onClick={() => scrollToBottom("smooth")}
              className="absolute -top-12 left-1/2 -translate-x-1/2 w-10 h-10 grid place-items-center rounded-full glass-strong shadow-lg text-muted hover:text-foreground transition-colors"
              aria-label="Scroll to latest"
            >
              <ArrowDown className="w-4 h-4" />
            </motion.button>
          )}
        </AnimatePresence>

        <FloatingChatInput
          value={input}
          onChange={setInput}
          onSend={handleSend}
          isLoading={store.isLoading}
          placeholder={isLoggedIn && mode === "memory" ? "Ask about your history or profile…" : "Ask a work-related question…"}
          showModeToggle={isLoggedIn}
          activeMode={mode}
          onModeChange={(m) => store.setMode(m)}
        />
      </div>
    </div>
  );
}
