"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { runAgent, type RunResponse, type AllocationResponse } from "@/lib/api";
import { useAuthStore } from "@/lib/auth";
import FloatingChatInput from "@/components/FloatingChatInput";

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

  const isEmpty = messages.length === 0;

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Chat area */}
      <div className="flex-1 overflow-y-auto">
        {isEmpty ? (
          /* Empty state - centered */
          <div className="flex flex-col items-center justify-center h-full px-6">
            <div className="text-center space-y-6 mb-8">
              <h1 className="text-5xl font-bold text-nelb-primary">
                Talk to NELB
              </h1>
              <p className="text-lg text-gray-600 max-w-2xl">
                Natural language interface to all four brains. NELB decides which tool to use.
              </p>

              {/* Suggestion chips */}
              <div className="flex flex-wrap gap-3 justify-center max-w-3xl pt-4">
                <button
                  onClick={() => setInput("I need a cleaner for my yard, budget R500")}
                  className="px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm text-gray-700 hover:border-nelb-primary hover:text-nelb-primary transition-colors"
                >
                  💼 Find a cleaner
                </button>
                {currentUser && (
                  <>
                    <button
                      onClick={() => setInput("Who did I tile for last year?")}
                      className="px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm text-gray-700 hover:border-nelb-secondary hover:text-nelb-secondary transition-colors"
                    >
                      💾 My job history
                    </button>
                    <button
                      onClick={() => setInput("What's my reliability score?")}
                      className="px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm text-gray-700 hover:border-nelb-accent hover:text-nelb-accent transition-colors"
                    >
                      📊 My profile stats
                    </button>
                  </>
                )}
                <button
                  onClick={() => setInput("Which drill bit for a 6mm wall plug in brick?")}
                  className="px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm text-gray-700 hover:border-amber-500 hover:text-amber-600 transition-colors"
                >
                  🔧 Work assistant
                </button>
              </div>
            </div>

            {/* Centered input */}
            <FloatingChatInput
              value={input}
              onChange={setInput}
              onSend={handleSend}
              isLoading={isLoading}
              placeholder="Ask NELB anything..."
              showLocationToggle
              latitude={latitude}
              longitude={longitude}
              radiusKm={radiusKm}
              onLocationChange={(lat, lng) => {
                setLatitude(lat);
                setLongitude(lng);
              }}
              onRadiusChange={setRadiusKm}
              isCentered
            />
          </div>
        ) : (
          /* Messages view */
          <div className="max-w-4xl mx-auto p-6 pb-32 space-y-6">
            {messages.map((msg, idx) => (
              <div key={idx}>
                {/* Message bubble */}
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25 }}
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[85%] px-5 py-3 rounded-2xl text-sm whitespace-pre-wrap ${
                      msg.role === "user"
                        ? "bg-nelb-primary text-white"
                        : "bg-white border border-gray-200 text-gray-800"
                    }`}
                  >
                    {/* Tool badge */}
                    {msg.toolUsed && msg.toolUsed !== "none" && msg.toolUsed !== "error" && (
                      <div className="mb-2">
                        <motion.span
                          initial={{ scale: 0.8, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          transition={{ type: "spring", stiffness: 300, damping: 20 }}
                          className={`inline-block px-2.5 py-1 rounded-lg text-xs font-medium ${
                            msg.toolUsed === "allocate_job"
                              ? "bg-blue-100 text-blue-700"
                              : msg.toolUsed === "recall_memory"
                              ? "bg-green-100 text-green-700"
                              : msg.toolUsed === "profile_lookup"
                              ? "bg-purple-100 text-purple-700"
                              : "bg-amber-100 text-amber-700"
                          }`}
                        >
                          {msg.toolUsed === "allocate_job" && "🧠 Allocation Brain"}
                          {msg.toolUsed === "recall_memory" && "💾 Memory Brain"}
                          {msg.toolUsed === "work_assist" && "🔧 Assistant Brain"}
                          {msg.toolUsed === "profile_lookup" && "👤 Profile Brain"}
                        </motion.span>
                      </div>
                    )}
                    {msg.content}
                  </div>
                </motion.div>

                {/* Allocation results inline */}
                {msg.rawResult && msg.toolUsed === "allocate_job" && (
                  <div className="mt-4 ml-4 space-y-4">
                    {/* Reasoning trace */}
                    <div className="bg-white border border-gray-200 rounded-2xl p-5">
                      <h3 className="text-sm font-semibold mb-3 text-gray-700">Reasoning trace</h3>
                      <motion.div
                        className="space-y-3"
                        initial="hidden"
                        animate="visible"
                        variants={{ visible: { transition: { staggerChildren: 0.15 } } }}
                      >
                        {(msg.rawResult as AllocationResponse).reasoning_trace.map((step) => (
                          <motion.div
                            key={step.step}
                            className="flex items-start gap-3 text-xs"
                            variants={{
                              hidden: { opacity: 0, x: -20 },
                              visible: { opacity: 1, x: 0 }
                            }}
                          >
                            <span className="w-6 h-6 rounded-full bg-nelb-primary text-white flex items-center justify-center text-[11px] font-bold shrink-0">
                              {step.step}
                            </span>
                            <div>
                              <span className="font-medium text-gray-900">{step.name}</span>
                              <span className="text-gray-400 ml-2">
                                {step.candidates_before} → {step.candidates_after}
                              </span>
                            </div>
                          </motion.div>
                        ))}
                      </motion.div>
                    </div>

                    {/* Top workers */}
                    <motion.div
                      className="space-y-2"
                      initial="hidden"
                      animate="visible"
                      variants={{ visible: { transition: { staggerChildren: 0.1 } } }}
                    >
                      {(msg.rawResult as AllocationResponse).recommendations.map((worker, i) => (
                        <motion.div
                          key={worker.worker_id}
                          className="flex items-center gap-3 p-4 bg-white border border-gray-200 rounded-2xl text-sm"
                          variants={{
                            hidden: { opacity: 0, y: 16 },
                            visible: { opacity: 1, y: 0 }
                          }}
                        >
                          <span className="text-xs text-gray-400 font-medium">#{i + 1}</span>
                          <div className="flex-1">
                            <span className="font-semibold text-gray-900">{worker.worker_name}</span>
                            <span className="text-gray-500 ml-2">{worker.distance_km}km</span>
                          </div>
                          <span className="font-bold text-nelb-primary text-lg">{worker.composite_score}%</span>
                        </motion.div>
                      ))}
                    </motion.div>
                  </div>
                )}
              </div>
            ))}

            {/* Typing indicator */}
            {isLoading && (
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
              isLoading={isLoading}
              placeholder="Ask NELB anything..."
              showLocationToggle
              latitude={latitude}
              longitude={longitude}
              radiusKm={radiusKm}
              onLocationChange={(lat, lng) => {
                setLatitude(lat);
                setLongitude(lng);
              }}
              onRadiusChange={setRadiusKm}
              isCentered={false}
            />
          </div>
        </div>
      )}
    </div>
  );
}
