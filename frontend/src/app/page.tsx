"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { useAuthStore } from "@/lib/auth";
import { Brain, MessageSquare, Briefcase, Wrench, History, Shield, ArrowRight } from "lucide-react";

const features = [
  {
    icon: Brain,
    title: "Allocation Brain",
    description:
      "A multi-step reasoning pipeline that matches workers to jobs on skills, reliability, distance, and fairness — with a full transparent trace.",
    color: "text-nelb-primary",
  },
  {
    icon: History,
    title: "Memory Brain",
    description:
      "Natural language queries over work history. Ask who you worked for, how many jobs you did, or what your rating was.",
    color: "text-nelb-secondary",
  },
  {
    icon: Wrench,
    title: "Work Assistant",
    description:
      "Grounded answers from a curated knowledge base — cited sources, no hallucination. Tools, materials, safety, techniques.",
    color: "text-nelb-accent",
  },
  {
    icon: Shield,
    title: "Fairness Engine",
    description:
      "No worker monopolises jobs. The system penalises over-allocation and ensures fair distribution across the community.",
    color: "text-nelb-violet",
  },
];

export default function Home() {
  const { isLoggedIn } = useAuthStore();

  return (
    <div className="h-full overflow-y-auto scroll-area">
      {/* Hero */}
      <section className="relative px-6 pt-20 pb-16 sm:pt-28">
        <div className="mx-auto max-w-3xl text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="flex flex-col items-center"
          >
            <img src="/logo.svg" alt="NELB Logo" className="w-20 h-20 mb-6 drop-shadow-xl" />
            <h1 className="text-5xl sm:text-6xl font-bold tracking-tight">
              No Employee <span className="text-gradient">Left Behind</span>
            </h1>
            <p className="mt-6 text-lg leading-8 text-muted max-w-2xl mx-auto">
              An intelligent reasoning agent that distributes work fairly across communities.
              Four brains. One mission. Every decision explained.
            </p>
          </motion.div>

          <motion.div
            className="mt-10 flex flex-wrap items-center justify-center gap-3"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.4 }}
          >
            <Link
              href="/agent"
              className="group inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-nelb-primary to-nelb-violet text-white rounded-full font-medium shadow-lg shadow-nelb-primary/30 transition-all hover:scale-[1.03]"
            >
              <MessageSquare className="w-4 h-4" />
              Talk to NELB
              <ArrowRight className="w-4 h-4 opacity-0 -translate-x-2 transition-all group-hover:opacity-100 group-hover:translate-x-0" />
            </Link>
            <Link
              href="/employer"
              className="group inline-flex items-center gap-2 px-6 py-3 glass-strong rounded-full font-medium text-foreground hover:border-nelb-primary/40 transition-all hover:scale-[1.03]"
            >
              <Briefcase className="w-4 h-4" />
              {isLoggedIn ? "Find Workers" : "I need work done"}
              <ArrowRight className="w-4 h-4 opacity-0 -translate-x-2 transition-all group-hover:opacity-100 group-hover:translate-x-0" />
            </Link>
            <Link
              href="/worker"
              className="group inline-flex items-center gap-2 px-6 py-3 glass-strong rounded-full font-medium text-foreground hover:border-nelb-primary/40 transition-all hover:scale-[1.03]"
            >
              <Wrench className="w-4 h-4" />
              {isLoggedIn ? "My Assistant" : "Help me on site"}
              <ArrowRight className="w-4 h-4 opacity-0 -translate-x-2 transition-all group-hover:opacity-100 group-hover:translate-x-0" />
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section className="px-6 pb-20">
        <div className="mx-auto max-w-5xl">
          <motion.div
            className="grid grid-cols-1 sm:grid-cols-2 gap-5"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={{ visible: { transition: { staggerChildren: 0.1 } } }}
          >
            {features.map((feature) => {
              const Icon = feature.icon;
              return (
                <motion.div
                  key={feature.title}
                  className="group glass rounded-2xl p-6 transition-all duration-300 hover:-translate-y-1 hover:border-nelb-primary/40"
                  variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }}
                >
                  <div className="inline-flex p-2.5 rounded-xl bg-foreground/[0.05] mb-4">
                    <Icon className={`w-5 h-5 ${feature.color}`} />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                  <p className="text-sm text-muted leading-relaxed">{feature.description}</p>
                </motion.div>
              );
            })}
          </motion.div>
        </div>
      </section>

      {/* How it works */}
      <section className="px-6 pb-20">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-2xl font-bold mb-8">How NELB reasons</h2>
          <motion.div
            className="flex flex-nowrap items-center justify-center gap-2 text-sm overflow-x-auto"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            {["Skills filter", "Reliability", "Availability", "Distance", "Budget fit", "Fairness"].map((step, i) => (
              <div key={step} className="flex items-center gap-2 shrink-0">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1.5 glass rounded-full text-xs font-medium text-foreground/90">
                  <span className="w-4 h-4 rounded-full bg-gradient-to-br from-nelb-primary to-nelb-violet text-white text-[10px] grid place-items-center font-bold shrink-0">
                    {i + 1}
                  </span>
                  {step}
                </span>
                {i < 5 && <span className="text-faint">→</span>}
              </div>
            ))}
          </motion.div>
          <p className="mt-6 text-muted text-sm">
            Every recommendation includes a full reasoning trace — visible, auditable, explainable.
          </p>
        </div>
      </section>

      {/* Tech strip */}
      <section className="px-6 pb-12">
        <div className="mx-auto max-w-3xl">
          <div className="flex flex-wrap justify-center gap-x-5 gap-y-2 text-xs text-faint font-medium">
            {["Azure AI Foundry", "Foundry IQ", "Semantic Kernel", "o4-mini", "Next.js", "FastAPI", "PostgreSQL"].map(
              (t, i, arr) => (
                <span key={t} className="flex items-center gap-5">
                  {t}
                  {i < arr.length - 1 && <span className="text-border">·</span>}
                </span>
              )
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
