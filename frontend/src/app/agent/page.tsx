"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { runAgent, type RunResponse, type AllocationResponse } from "@/lib/api";
import { useAuthStore } from "@/lib/auth";

const MapPicker = dynamic(() => import("@/components/MapPicker"), { ssr: false });

interface ChatMessage {
  role: "user" | "agent";
  content: string;
  toolUsed?: string;
  rawResult?: AllocationResponse | null;
  timestamp: number;
}

export default function AgentPage() {
  const { currentUser } = useAuthStore();
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [latitude, setLatitude] = useState(-25.7479);
  const [longitude, setLongitude] = useState(28.2293);
  const [radiusKm, setRadiusKm] = useState(5);
  const [showMap, setShowMap] = useState(false);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput("");
    setMessages((prev) => [
      ...prev,
      { role: "user", content: userMessage, timestamp: Date.now() },
    ]);
    setIsLoading(true);

    try {
      const result: RunResponse = await runAgent({
        message: userMessage,
        latitude,
        longitude,
        radius_km: radiusKm,
        worker_id: currentUser?.worker_id,
      });

      setMessages((prev) => [
        ...prev,
        {
          role: "agent",
          content: result.response,
          toolUsed: result.tool_used,
          rawResult: result.tool_used === "allocate_job" ? (result.raw_result as AllocationResponse) : null,
          timestamp: Date.now(),
        },
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: "agent",
          content: `Error: ${err instanceof Error ? err.message : "Something went wrong"}`,
          timestamp: Date.now(),
        },
      ]);
    }

    setIsLoading(false);
  };

  return (
    <main className="max-w-4xl mx-auto p-6 flex flex-col h-screen">
      <header className="mb-4">
        <a href="/" className="text-sm text-gray-500 hover:text-gray-700">
          ← Back to home
        </a>
        <h1 className="text-3xl font-bold text-nelb-primary mt-2">
          NELB Agent
        </h1>
        <p className="text-gray-600 mt-1">
          Talk to NELB in natural language. It decides which brain to use.
        </p>
      </header>

      {/* Location toggle */}
      <div className="mb-4">
        <button
          onClick={() => setShowMap(!showMap)}
          className="text-sm px-3 py-1.5 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
        >
          {showMap ? "Hide map" : "Set location on map"} — {latitude.toFixed(4)}, {longitude.toFixed(4)} ({radiusKm}km)
        </button>
        {showMap && (
          <div className="mt-3 space-y-2">
            <MapPicker
              latitude={latitude}
              longitude={longitude}
              radiusKm={radiusKm}
              onLocationSelect={(lat, lng) => {
                setLatitude(lat);
                setLongitude(lng);
              }}
            />
            <div className="flex items-center gap-2">
              <label className="text-xs text-gray-500">Radius:</label>
              <input
                type="range"
                min={1}
                max={20}
                value={radiusKm}
                onChange={(e) => setRadiusKm(Number(e.target.value))}
                className="flex-1"
              />
              <span className="text-xs text-gray-500 w-8">{radiusKm}km</span>
            </div>
          </div>
        )}
      </div>

      {/* Chat area */}
      <div className="flex-1 overflow-y-auto border rounded-lg p-4 bg-white space-y-4 mb-4">
        {messages.length === 0 && (
          <div className="text-center text-gray-400 py-16 space-y-3">
            <p className="text-lg">Talk to NELB</p>
            <p className="text-sm">Try:</p>
            <div className="space-y-1 text-sm">
              <p className="text-nelb-primary">&ldquo;I need a cleaner for my yard, budget R500&rdquo;</p>
              {currentUser && (
                <>
                  <p className="text-nelb-secondary">&ldquo;Who did I tile for last year?&rdquo;</p>
                  <p className="text-gray-500">&ldquo;What&apos;s my reliability score?&rdquo;</p>
                </>
              )}
              <p className="text-nelb-accent">&ldquo;Which drill bit for a 6mm wall plug in brick?&rdquo;</p>
            </div>
          </div>
        )}

        {messages.map((msg, idx) => (
          <div key={idx}>
            {/* Message bubble */}
            <div
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[85%] px-4 py-3 rounded-lg text-sm whitespace-pre-wrap ${
                  msg.role === "user"
                    ? "bg-nelb-primary text-white"
                    : "bg-gray-50 border text-gray-800"
                }`}
              >
                {/* Tool badge */}
                {msg.toolUsed && msg.toolUsed !== "none" && msg.toolUsed !== "error" && (
                  <div className="mb-2">
                    <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                      msg.toolUsed === "allocate_job"
                        ? "bg-blue-100 text-blue-700"
                        : msg.toolUsed === "recall_memory"
                        ? "bg-green-100 text-green-700"
                        : "bg-amber-100 text-amber-700"
                    }`}>
                      {msg.toolUsed === "allocate_job" && "🧠 Allocation Brain"}
                      {msg.toolUsed === "recall_memory" && "💾 Memory Brain"}
                      {msg.toolUsed === "work_assist" && "🔧 Assistant Brain"}
                    </span>
                  </div>
                )}
                {msg.content}
              </div>
            </div>

            {/* Allocation results inline */}
            {msg.rawResult && msg.toolUsed === "allocate_job" && (
              <div className="mt-3 ml-4 space-y-3">
                {/* Reasoning trace */}
                <div className="bg-white border rounded-lg p-4">
                  <h3 className="text-sm font-semibold mb-2 text-gray-700">Reasoning trace</h3>
                  <div className="space-y-2">
                    {(msg.rawResult as AllocationResponse).reasoning_trace.map((step) => (
                      <div key={step.step} className="flex items-start gap-2 text-xs">
                        <span className="w-5 h-5 rounded-full bg-nelb-primary text-white flex items-center justify-center text-[10px] font-bold shrink-0">
                          {step.step}
                        </span>
                        <div>
                          <span className="font-medium">{step.name}</span>
                          <span className="text-gray-400 ml-2">
                            {step.candidates_before} → {step.candidates_after}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Top workers */}
                <div className="space-y-2">
                  {(msg.rawResult as AllocationResponse).recommendations.map((worker, i) => (
                    <div key={worker.worker_id} className="flex items-center gap-3 p-3 border rounded-lg text-sm">
                      <span className="text-xs text-gray-400">#{i + 1}</span>
                      <div className="flex-1">
                        <span className="font-medium">{worker.worker_name}</span>
                        <span className="text-gray-400 ml-2">{worker.distance_km}km</span>
                      </div>
                      <span className="font-bold text-nelb-primary">{worker.composite_score}%</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-50 border px-4 py-3 rounded-lg text-sm text-gray-500">
              <span className="inline-block animate-pulse">NELB is reasoning...</span>
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
          placeholder="Talk to NELB..."
          className="flex-1 border rounded-lg px-4 py-3"
        />
        <button
          onClick={handleSend}
          disabled={isLoading || !input.trim()}
          className="px-6 py-3 bg-nelb-primary text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
        >
          Send
        </button>
      </div>
    </main>
  );
}
