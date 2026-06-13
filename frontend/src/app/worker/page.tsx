"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { useWorkerStore } from "@/lib/store";
import { useAuthStore } from "@/lib/auth";
import { runAgent } from "@/lib/api";
import FloatingChatInput from "@/components/FloatingChatInput";

function CitedContent({ content }: { content: string }) {
  const parts = content.split(/(\[doc\d+\])/g);
  return (
    <span className="whitespace-pre-wrap">
      {parts.map((part, i) => {
        const match = part.match(/^\[doc(\d+)\]$/);
        if (match) {
          return (
            <sup
              key={i}
              className="inline-flex items-center justify-center w-4 h-4 ml-0.5 text-[10px] font-medium bg-nelb-primary text-white rounded"
            >
              {match[1]}
            </sup>
          );
        }
        return <span key={i}>{part}</span>;
      })}
    </span>
  );
}

export default function WorkerPage() {
  const store = useWorkerStore();
  const { currentUser, isLoggedIn } = useAuthStore();
  const [input, setInput] = useState("");
  const mode = store.activeMode;

  const handleSend = async () => {
    if (!input.trim() || store.isLoading) return;

    const userMessage = input.trim();
    setInput("");
    store.addChatMessage(mode, "user", userMessage);
    store.setLoading(true);

    try {
      if (mode === "memory" && !isLoggedIn) {
        store.addChatMessage(mode, "nelb", "Please log in to access your job history. Click the Login button in the top-right corner.");
        store.setLoading(false);
        return;
      }

      const result = await runAgent({
        message: userMessage,
        worker_id: currentUser?.worker_id,
      });

      const citations = result.raw_result && "citations" in result.raw_result
        ? (result.raw_result as { citations?: Array<{ index: number; filename: string; content: string }> }).citations
        : undefined;

      store.addChatMessage(mode, "nelb", result.response, citations);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Something went wrong";
      store.setError(msg);
      store.addChatMessage(mode, "nelb", `Error: ${msg}`);
    }

    store.setLoading(false);
  };

  const currentMessages = mode === "memory" ? store.memoryChatHistory : store.assistChatHistory;
  const isEmpty = currentMessages.length === 0;

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Chat area */}
      <div className="flex-1 overflow-y-auto">
        {isEmpty ? (
          /* Empty state - centered */
          <div className="flex flex-col items-center justify-center h-full px-6">
            <div className="text-center space-y-6 mb-8">
              <h1 className="text-5xl font-bold text-nelb-secondary">
                Work Assistant
              </h1>
              <p className="text-lg text-gray-600 max-w-2xl">
                {isLoggedIn ? "Ask about your job history, profile, or get practical help on site." : "Get practical work guidance from NELB's knowledge base."}
              </p>

              {/* Suggestion chips — memory hints only when logged in */}
              <div className="flex flex-wrap gap-3 justify-center max-w-3xl pt-4">
                {mode === "memory" && isLoggedIn ? (
                  <>
                    <button
                      onClick={() => setInput("Who did I paint for?")}
                      className="px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm text-gray-700 hover:border-nelb-secondary hover:text-nelb-secondary transition-colors"
                    >
                      Who did I paint for?
                    </button>
                    <button
                      onClick={() => setInput("How many jobs have I done in total?")}
                      className="px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm text-gray-700 hover:border-nelb-secondary hover:text-nelb-secondary transition-colors"
                    >
                      Total jobs I've done?
                    </button>
                    <button
                      onClick={() => setInput("What's my reliability score?")}
                      className="px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm text-gray-700 hover:border-nelb-secondary hover:text-nelb-secondary transition-colors"
                    >
                      My reliability score?
                    </button>
                    <button
                      onClick={() => setInput("What are my skills?")}
                      className="px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm text-gray-700 hover:border-nelb-secondary hover:text-nelb-secondary transition-colors"
                    >
                      What are my skills?
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => setInput("Which drill bit for a 6mm wall plug in brick?")}
                      className="px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm text-gray-700 hover:border-amber-500 hover:text-amber-600 transition-colors"
                    >
                      🔩 Drill bit for 6mm wall plug?
                    </button>
                    <button
                      onClick={() => setInput("How many bags of cement for a 3m x 4m slab at 100mm depth?")}
                      className="px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm text-gray-700 hover:border-amber-500 hover:text-amber-600 transition-colors"
                    >
                      🏗️ Cement for 3x4m slab?
                    </button>
                    <button
                      onClick={() => setInput("What safety precautions when using bleach indoors?")}
                      className="px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm text-gray-700 hover:border-amber-500 hover:text-amber-600 transition-colors"
                    >
                      🧪 Safety with bleach?
                    </button>
                    <button
                      onClick={() => setInput("What is the correct angle for a ladder against a wall?")}
                      className="px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm text-gray-700 hover:border-amber-500 hover:text-amber-600 transition-colors"
                    >
                      🪜 Correct ladder angle?
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Centered input */}
            <FloatingChatInput
              value={input}
              onChange={setInput}
              onSend={handleSend}
              isLoading={store.isLoading}
              placeholder={isLoggedIn && mode === "memory" ? "Ask about your history or profile..." : "Ask a work-related question..."}
              isCentered
              showModeToggle={isLoggedIn}
              activeMode={mode}
              onModeChange={(m) => store.setMode(m)}
            />
          </div>
        ) : (
          /* Messages view */
          <div className="max-w-4xl mx-auto p-6 pb-32 space-y-6">
            {currentMessages.map((msg, idx) => (
              <div key={idx}>
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25 }}
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[85%] px-5 py-3 rounded-2xl text-sm whitespace-pre-wrap ${
                      msg.role === "user"
                        ? "bg-nelb-secondary text-white"
                        : "bg-white border border-gray-200 text-gray-800"
                    }`}
                  >
                    <CitedContent content={msg.content} />
                  </div>
                </motion.div>

                {/* Citation cards */}
                {msg.citations && msg.citations.length > 0 && (
                  <motion.div
                    className="mt-3 ml-4 space-y-2"
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2, duration: 0.2 }}
                  >
                    {msg.citations.map((c) => (
                      <div
                        key={c.index}
                        className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-xs text-gray-600"
                      >
                        <span className="font-medium text-nelb-primary">{c.index}</span>
                        <span className="text-gray-300">|</span>
                        <span>📄 {c.filename}</span>
                        <span className="text-gray-300">|</span>
                        <span className="text-gray-400">nelb-trade-guides</span>
                      </div>
                    ))}
                  </motion.div>
                )}
              </div>
            ))}

            {/* Typing indicator */}
            {store.isLoading && (
              <div className="flex justify-start">
                <motion.div className="flex gap-1.5 items-center px-5 py-3 bg-white border border-gray-200 rounded-2xl">
                  {[0, 1, 2].map((i) => (
                    <motion.span
                      key={i}
                      className="w-2 h-2 bg-gray-400 rounded-full"
                      animate={{ y: [0, -6, 0] }}
                      transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15 }}
                    />
                  ))}
                </motion.div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Sticky bottom input - only show when messages exist */}
      {!isEmpty && (
        <div className="sticky bottom-0 bg-gradient-to-t from-nelb-light via-nelb-light to-transparent pt-8 pb-6 px-6">
          <div className="max-w-4xl mx-auto">
            <FloatingChatInput
              value={input}
              onChange={setInput}
              onSend={handleSend}
              isLoading={store.isLoading}
              placeholder={isLoggedIn && mode === "memory" ? "Ask about your history or profile..." : "Ask a work-related question..."}
              isCentered={false}
              showModeToggle={isLoggedIn}
              activeMode={mode}
              onModeChange={(m) => store.setMode(m)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
