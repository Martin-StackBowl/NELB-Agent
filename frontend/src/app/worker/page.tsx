"use client";

import { useState } from "react";
import { useWorkerStore } from "@/lib/store";
import { recallMemory, workAssist } from "@/lib/api";

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
  const [input, setInput] = useState("");
  const [mode, setMode] = useState<"memory" | "assist">("memory");

  const handleSend = async () => {
    if (!input.trim()) return;

    store.addChatMessage("user", input);
    store.setLoading(true);

    try {
      if (mode === "memory") {
        const result = await recallMemory({
          worker_id: store.workerId || "00000000-0000-0000-0000-000000000000",
          query: input,
        });
        store.setRecallResult(result);
        store.addChatMessage("nelb", result.answer);
      } else {
        const result = await workAssist({
          worker_id: store.workerId || "00000000-0000-0000-0000-000000000000",
          question: input,
          job_context: "",
        });
        store.setAssistResult(result);
        // Add answer with citation data attached
        store.addChatMessage("nelb", result.answer, result.citations);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Something went wrong";
      store.setError(msg);
      store.addChatMessage("nelb", `Error: ${msg}`);
    }

    setInput("");
  };

  return (
    <main className="max-w-3xl mx-auto p-6 flex flex-col h-screen">
      <header className="mb-4">
        <a href="/" className="text-sm text-gray-500 hover:text-gray-700">
          ← Back to home
        </a>
        <h1 className="text-3xl font-bold text-nelb-secondary mt-2">
          NELB Assistant
        </h1>
        <p className="text-gray-600 mt-1">
          Ask about your job history or get help on site.
        </p>
      </header>

      {/* Mode toggle */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setMode("memory")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            mode === "memory"
              ? "bg-nelb-secondary text-white"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}
        >
          Memory recall
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

      {/* Chat area */}
      <div className="flex-1 overflow-y-auto border rounded-lg p-4 bg-white space-y-3 mb-4">
        {store.chatHistory.length === 0 && (
          <div className="text-center text-gray-400 py-12">
            {mode === "memory" ? (
              <p>
                Ask about your job history.
                <br />
                <span className="text-sm">
                  e.g. &ldquo;Who did I tile a kitchen for last year?&rdquo;
                </span>
              </p>
            ) : (
              <p>
                Ask a work-related question.
                <br />
                <span className="text-sm">
                  e.g. &ldquo;Which drill bit for a 6mm wall plug in
                  brick?&rdquo;
                </span>
              </p>
            )}
          </div>
        )}
        {store.chatHistory.map((msg, idx) => (
          <div
            key={idx}
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
              {/* Citation cards */}
              {msg.citations && msg.citations.length > 0 && (
                <div className="mt-2 space-y-1">
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
                </div>
              )}
            </div>
          </div>
        ))}
        {store.isLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 px-4 py-2 rounded-lg text-sm text-gray-500">
              NELB is thinking...
            </div>
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
              ? "Ask about your job history..."
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
  );
}
