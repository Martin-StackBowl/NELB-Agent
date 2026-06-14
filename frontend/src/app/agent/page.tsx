"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { runAgent, type RunResponse, type AllocationResponse } from "@/lib/api";
import { useAuthStore } from "@/lib/auth";
import { useChatScroll } from "@/lib/useChatScroll";
import FloatingChatInput from "@/components/FloatingChatInput";
import StreamingText from "@/components/StreamingText";
import CitedContent from "@/components/CitedContent";
import { useChatReset } from "@/lib/chatReset";
import {
  Brain,
  Briefcase,
  History,
  Wrench,
  User,
  ArrowDown,
  Sparkles,
  FileText,
} from "lucide-react";

type Citation = { index: number; filename: string; content: string };

interface ChatMessage {
  role: "user" | "agent";
  content: string;
  toolUsed?: string;
  rawResult?: AllocationResponse | null;
  citations?: Citation[];
  timestamp: number;
}

const BRAIN_META: Record<string, { label: string; cls: string }> = {
  allocate_job: { label: "Allocation Brain", cls: "bg-nelb-primary/15 text-nelb-primary" },
  recall_memory: { label: "Memory Brain", cls: "bg-nelb-secondary/15 text-nelb-secondary" },
  work_assist: { label: "Assistant Brain", cls: "bg-nelb-accent/15 text-nelb-accent" },
  profile_lookup: { label: "Profile Brain", cls: "bg-nelb-violet/15 text-nelb-violet" },
};

export default function AgentPage() {
  const { currentUser } = useAuthStore();
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [streamingIdx, setStreamingIdx] = useState<number | null>(null);
  const [latitude, setLatitude] = useState(-25.7463);
  const [longitude, setLongitude] = useState(28.1885);
  const [radiusKm, setRadiusKm] = useState(5);

  const { ref, atBottom, onScroll, scrollToBottom, stick } = useChatScroll(
    messages.length + (isLoading ? 1 : 0)
  );

  // Coordinate "New chat" with the sidebar
  const { setActiveCount, nonce } = useChatReset();
  useEffect(() => {
    setActiveCount(messages.length);
  }, [messages.length, setActiveCount]);
  useEffect(() => {
    // Cleared from the sidebar's New chat action
    setMessages([]);
    setInput("");
    setStreamingIdx(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nonce]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;
    const userMessage = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: userMessage, timestamp: Date.now() }]);
    setIsLoading(true);

    try {
      const result: RunResponse = await runAgent({
        message: userMessage,
        history: messages.slice(-10).map((m) => ({
          role: m.role === "user" ? ("user" as const) : ("assistant" as const),
          content: m.content,
        })),
        latitude,
        longitude,
        radius_km: radiusKm,
        worker_id: currentUser?.worker_id,
      });

      setMessages((prev) => {
        const citations =
          result.raw_result && "citations" in result.raw_result
            ? (result.raw_result as { citations?: Citation[] }).citations
            : undefined;
        const next = [
          ...prev,
          {
            role: "agent" as const,
            content: result.response,
            toolUsed: result.tool_used,
            rawResult:
              result.tool_used === "allocate_job" ? (result.raw_result as AllocationResponse) : null,
            citations,
            timestamp: Date.now(),
          },
        ];
        setStreamingIdx(next.length - 1);
        return next;
      });
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

  const suggestions = [
    { icon: Briefcase, text: "I need a cleaner for my yard, budget R500", color: "text-nelb-primary" },
    ...(currentUser
      ? [
          { icon: History, text: "Who did I tile for last year?", color: "text-nelb-secondary" },
          { icon: User, text: "What's my reliability score?", color: "text-nelb-violet" },
        ]
      : []),
    { icon: Wrench, text: "Which drill bit for a 6mm wall plug in brick?", color: "text-nelb-accent" },
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Scroll region */}
      <div ref={ref} onScroll={onScroll} className="flex-1 overflow-y-auto scroll-area">
        {isEmpty ? (
          <div className="min-h-full flex flex-col items-center justify-center px-6 py-10">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="text-center max-w-2xl"
            >
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-nelb-primary to-nelb-violet shadow-xl shadow-nelb-primary/30 mb-6">
                <Brain className="w-8 h-8 text-white" />
              </div>
              <h1 className="text-4xl sm:text-5xl font-bold tracking-tight">
                Talk to <span className="text-gradient">NELB</span>
              </h1>
              <p className="mt-4 text-muted text-lg">
                One natural-language interface to all four brains. NELB decides which tool to use.
              </p>

              <div className="mt-8 grid sm:grid-cols-2 gap-3 text-left">
                {suggestions.map((s) => {
                  const Icon = s.icon;
                  return (
                    <button
                      key={s.text}
                      onClick={() => setInput(s.text)}
                      className="group glass rounded-2xl p-4 flex items-start gap-3 hover:border-nelb-primary/40 transition-colors text-left"
                    >
                      <Icon className={`w-5 h-5 mt-0.5 shrink-0 ${s.color}`} />
                      <span className="text-sm text-foreground/90 group-hover:text-foreground">{s.text}</span>
                    </button>
                  );
                })}
              </div>
            </motion.div>
          </div>
        ) : (
          <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-6">
            {messages.map((msg, idx) => (
              <MessageRow
                key={idx}
                msg={msg}
                isStreaming={idx === streamingIdx}
                onStreamUpdate={stick}
                onStreamDone={() => setStreamingIdx(null)}
              />
            ))}

            {isLoading && (
              <div className="flex items-start gap-3">
                <NelbAvatar />
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

      {/* Input dock — pinned, never scrolls with content */}
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
          isLoading={isLoading}
          placeholder="Ask NELB anything…"
          showLocationToggle
          latitude={latitude}
          longitude={longitude}
          radiusKm={radiusKm}
          onLocationChange={(lat, lng) => {
            setLatitude(lat);
            setLongitude(lng);
          }}
          onRadiusChange={setRadiusKm}
        />
        <p className="text-center text-[11px] text-faint mt-2 flex items-center justify-center gap-1">
          <Sparkles className="w-3 h-3" /> NELB reasons over skills, reliability, distance, budget & fairness.
        </p>
      </div>
    </div>
  );
}

function NelbAvatar() {
  return (
    <div className="w-9 h-9 shrink-0 rounded-xl bg-gradient-to-br from-nelb-primary to-nelb-violet grid place-items-center shadow-lg shadow-nelb-primary/25">
      <Brain className="w-5 h-5 text-white" />
    </div>
  );
}

function MessageRow({
  msg,
  isStreaming,
  onStreamUpdate,
  onStreamDone,
}: {
  msg: ChatMessage;
  isStreaming: boolean;
  onStreamUpdate: () => void;
  onStreamDone: () => void;
}) {
  if (msg.role === "user") {
    return (
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="flex justify-end"
      >
        <div className="max-w-[85%] px-5 py-3 rounded-2xl rounded-tr-sm text-[15px] bg-gradient-to-br from-nelb-primary to-nelb-violet text-white shadow-lg shadow-nelb-primary/20 whitespace-pre-wrap">
          {msg.content}
        </div>
      </motion.div>
    );
  }

  const brain = msg.toolUsed ? BRAIN_META[msg.toolUsed] : undefined;

  // Allocation answers get a dedicated sequence: reasoning trace "thinks" first,
  // then the text answer streams in — all within a SINGLE message container.
  if (msg.toolUsed === "allocate_job" && msg.rawResult) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="flex items-start gap-3"
      >
        <NelbAvatar />
        <div className="min-w-0 flex-1 space-y-2">
          <div className="glass rounded-2xl rounded-tl-sm px-5 py-4">
            {brain && (
              <motion.span
                initial={{ scale: 0.85, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
                className={`inline-block mb-3 px-2.5 py-1 rounded-lg text-xs font-semibold ${brain.cls}`}
              >
                {brain.label}
              </motion.span>
            )}
            <AllocationMessage
              result={msg.rawResult}
              text={msg.content}
              citations={msg.citations}
              animate={isStreaming}
              onStreamUpdate={onStreamUpdate}
              onStreamDone={onStreamDone}
            />
          </div>

          {/* Citation chips — outside the glass card, same row as Work Assistant */}
          {msg.citations && msg.citations.length > 0 && !isStreaming && (
            <div className="flex flex-wrap gap-2">
              {msg.citations.map((c) => (
                <span
                  key={c.index}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg glass text-xs text-muted"
                >
                  <span className="inline-flex items-center justify-center min-w-[16px] h-[16px] px-1 text-[10px] font-semibold rounded bg-nelb-primary/12 text-nelb-primary">
                    {c.index}
                  </span>
                  <FileText className="w-3.5 h-3.5" />
                  <span className="text-foreground/80">{c.filename}</span>
                </span>
              ))}
            </div>
          )}
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="flex items-start gap-3"
    >
      <NelbAvatar />
      <div className="min-w-0 flex-1 space-y-3">
        <div className="glass rounded-2xl rounded-tl-sm px-5 py-3.5 text-[15px] leading-relaxed text-foreground/90">
          {brain && (
            <motion.span
              initial={{ scale: 0.85, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
              className={`inline-block mb-2 px-2.5 py-1 rounded-lg text-xs font-semibold ${brain.cls}`}
            >
              {brain.label}
            </motion.span>
          )}
          <div className={isStreaming ? "stream-caret" : ""}>
            {isStreaming ? (
              <StreamingText
                text={msg.content}
                onUpdate={onStreamUpdate}
                onDone={onStreamDone}
                render={(shown) => <CitedContent content={shown} citations={msg.citations} />}
              />
            ) : (
              <CitedContent content={msg.content} citations={msg.citations} />
            )}
          </div>
        </div>

        {/* Citation chips — same style as Work Assistant */}
        {msg.citations && msg.citations.length > 0 && !isStreaming && (
          <div className="flex flex-wrap gap-2">
            {msg.citations.map((c) => (
              <span
                key={c.index}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg glass text-xs text-muted"
              >
                <span className="inline-flex items-center justify-center min-w-[16px] h-[16px] px-1 text-[10px] font-semibold rounded bg-nelb-primary/12 text-nelb-primary">
                  {c.index}
                </span>
                <FileText className="w-3.5 h-3.5" />
                <span className="text-foreground/80">{c.filename}</span>
              </span>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}

/**
 * Sequenced allocation reply: the reasoning trace reveals step-by-step (the
 * agent "thinking"), then the plain-language answer streams in below it.
 */
function AllocationMessage({
  result,
  text,
  citations,
  animate,
  onStreamUpdate,
  onStreamDone,
}: {
  result: AllocationResponse;
  text: string;
  citations?: Citation[];
  animate: boolean;
  onStreamUpdate: () => void;
  onStreamDone: () => void;
}) {
  const trace = result.reasoning_trace;
  const [revealed, setRevealed] = useState(animate ? 0 : trace.length);
  const [showText, setShowText] = useState(!animate);

  useEffect(() => {
    if (!animate) return;
    if (revealed < trace.length) {
      const t = setTimeout(() => {
        setRevealed((r) => r + 1);
        onStreamUpdate();
      }, 280);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => {
      setShowText(true);
      onStreamUpdate();
    }, 240);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [revealed, animate, trace.length]);

  const thinking = animate && revealed < trace.length;

  return (
    <div>
      {/* Reasoning trace — a section within the single message card */}
      <div className="text-xs font-semibold uppercase tracking-wider text-faint mb-3 flex items-center gap-2">
        {thinking ? (
          <>
            <span className="flex gap-1">
              {[0, 1, 2].map((i) => (
                <motion.span
                  key={i}
                  className="w-1.5 h-1.5 rounded-full bg-nelb-primary"
                  animate={{ opacity: [0.3, 1, 0.3] }}
                  transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
                />
              ))}
            </span>
            Reasoning
          </>
        ) : (
          "Reasoning trace"
        )}
      </div>

      <div className="space-y-2.5">
        <AnimatePresence initial={false}>
          {trace.slice(0, revealed).map((step) => (
            <motion.div
              key={step.step}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.2 }}
              className="flex items-center gap-3 text-xs"
            >
              <span className="w-6 h-6 rounded-full bg-gradient-to-br from-nelb-primary to-nelb-violet text-white grid place-items-center text-[11px] font-bold shrink-0">
                {step.step}
              </span>
              <span className="font-medium text-foreground">{step.name}</span>
              <span className="text-faint ml-auto tabular-nums">
                {step.candidates_before} → {step.candidates_after}
              </span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Answer text — same container, separated by a divider */}
      {showText && (
        <motion.div
          initial={animate ? { opacity: 0, y: 6 } : false}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className={`mt-4 pt-4 border-t border-border text-[15px] leading-relaxed text-foreground/90 ${animate ? "stream-caret" : ""}`}
        >
          {animate ? (
            <StreamingText
              text={text}
              onUpdate={onStreamUpdate}
              onDone={onStreamDone}
              render={(shown) => <CitedContent content={shown} citations={citations} />}
            />
          ) : (
            <CitedContent content={text} citations={citations} />
          )}
        </motion.div>
      )}
    </div>
  );
}
