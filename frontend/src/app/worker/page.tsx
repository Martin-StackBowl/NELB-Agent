"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import { useWorkerStore } from "@/lib/store";
import { useAuthStore } from "@/lib/auth";
import { runAgent } from "@/lib/api";
import PageTransition from "@/components/PageTransition";

/** Renders text with [doc1], [doc2] etc replaced by styled superscript badges */
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
  const [mode, setMode] = useState<"memory" | "assist">(isLoggedIn ? "memory" : "assist");

  const handleSend = async () => {
    if (!input.trim()) return;

    store.addChatMessage(mode, "user", input);
    store.setLoading(true);

    try {
      if (mode === "memory" && !isLoggedIn) {
        store.addChatMessage(mode, "nelb", "Please log in to access your job history. Click the Login button in the top-right corner.");
        store.setLoading(false);
        setInput("");
        return;
      }

      // Route through the unified agent orchestrator (o4-mini)
      const result = await runAgent({
        message: input,
        worker_id: currentUser?.worker_id,
      });

      // Extract citations if the tool used was work_assist
      const citations = result.raw_result && "citations" in result.raw_result
        ? (result.raw_result as { citations?: Array<{ index: number; filename: string; content: string }> }).citations
        : undefined;

      store.addChatMessage(mode, "nelb", result.response, citations);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Something went wrong";
      store.setError(msg);
      store.addChatMessage(mode, "nelb", `Error: ${msg}`);
    }

    setInput("");
    store.setLoading(false);
  };

  return (
    <PageTransition>
      <main className="max-w-3xl mx-auto p-6 flex flex-col h-screen">
        <header className="mb-4">
          <h1 className="text-3xl font-bold text-nelb-secondary mt-2">
            NELB Assistant
          </h1>
          <p className="text-gray-600 mt-1">
            {isLoggedIn ? "Ask about your job history, profile, or get help on site." : "Get practical help on site."}
          </p>
        </header>

        {/* Mode toggle — only show when logged in */}
        {isLoggedIn && (
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => setMode("memory")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                mode === "memory"
                  ? "bg-nelb-secondary text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              Memory &amp; Profile
            </button>
            <button
              onClick={() => setMode("assist")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                mode === "assist"
                  ? "bg-nelb-secondary text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              Work assistant
            </button>
          </div>
        )}

        {/* Chat area */}
        <div className="flex-1 overflow-y-auto border rounded-lg p-4 bg-white space-y-3 mb-4">
          {(mode === "memory" ? store.memoryChatHistory : store.assistChatHistory).length === 0 && (
            <div className="text-center text-gray-400 py-12">
              {mode === "memory" ? (
                <div className="space-y-3">
                  <p>Ask about your job history or profile.</p>
                  <div className="flex flex-wrap gap-2 justify-center text-xs">
                    <button onClick={() => setInput("Who did I paint for?")} className="px-3 py-1.5 bg-gray-50 border rounded-full hover:bg-gray-100 text-gray-600">Who did I paint for?</button>
                    <button onClick={() => setInput("How many jobs have I done in total?")} className="px-3 py-1.5 bg-gray-50 border rounded-full hover:bg-gray-100 text-gray-600">Total jobs I&apos;ve done?</button>
                    <button onClick={() => setInput("What's my reliability score?")} className="px-3 py-1.5 bg-gray-50 border rounded-full hover:bg-gray-100 text-gray-600">My reliability score?</button>
                    <button onClick={() => setInput("What are my skills?")} className="px-3 py-1.5 bg-gray-50 border rounded-full hover:bg-gray-100 text-gray-600">What are my skills?</button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <p>Ask a work-related question.</p>
                  <div className="flex flex-wrap gap-2 justify-center text-xs">
                    <button onClick={() => setInput("Which drill bit for a 6mm wall plug in brick?")} className="px-3 py-1.5 bg-gray-50 border rounded-full hover:bg-gray-100 text-gray-600">Drill bit for 6mm wall plug?</button>
                    <button onClick={() => setInput("How many bags of cement for a 3m x 4m slab at 100mm depth?")} className="px-3 py-1.5 bg-gray-50 border rounded-full hover:bg-gray-100 text-gray-600">Cement for a 3x4m slab?</button>
                    <button onClick={() => setInput("What safety precautions when using bleach indoors?")} className="px-3 py-1.5 bg-gray-50 border rounded-full hover:bg-gray-100 text-gray-600">Safety with bleach indoors?</button>
                    <button onClick={() => setInput("What is the correct angle for a ladder against a wall?")} className="px-3 py-1.5 bg-gray-50 border rounded-full hover:bg-gray-100 text-gray-600">Correct ladder angle?</button>
                  </div>
                </div>
              )}
            </div>
          )}
          {(mode === "memory" ? store.memoryChatHistory : store.assistChatHistory).map((msg, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
              className={`flex ${
                msg.role === "user" ? "justify-end" : "justify-start"
              }`}
            >
              <div className="max-w-[80%]">
                <div
                  className={`px-4 py-2 rounded-lg text-sm ${
                    msg.role === "user"
                      ? "bg-nelb-secondary text-white"
                      : "bg-gray-100 text-gray-800"
                  }`}
                >
                  <CitedContent content={msg.content} />
                </div>
                {/* Citation cards with animation */}
                {msg.citations && msg.citations.length > 0 && (
                  <motion.div
                    className="mt-2 space-y-1"
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3, duration: 0.2 }}
                  >
                    {msg.citations.map((c) => (
                      <div
                        key={c.index}
                        className="flex items-center gap-2 px-3 py-1.5 bg-white border rounded text-xs text-gray-600"
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
            </motion.div>
          ))}
          {/* Typing indicator */}
          {store.isLoading && (
            <div className="flex justify-start">
              <motion.div className="flex gap-1 items-center px-4 py-3 bg-gray-100 rounded-lg w-fit">
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

        {/* Input */}
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder={
              mode === "memory"
                ? "Ask about your history or profile..."
                : "Ask a work-related question..."
            }
            className="flex-1 border rounded-lg px-4 py-3"
          />
          <button
            onClick={handleSend}
            disabled={store.isLoading || !input.trim()}
            className="px-6 py-3 bg-nelb-secondary text-white rounded-lg font-medium hover:bg-green-700 transition-colors disabled:opacity-50"
          >
            Send
          </button>
        </div>
      </main>
    </PageTransition>
  );
}
