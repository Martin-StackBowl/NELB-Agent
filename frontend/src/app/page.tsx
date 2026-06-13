"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { useAuthStore } from "@/lib/auth";
import { Brain, MessageSquare, Briefcase, Wrench, History, Shield, MapPin, ArrowRight } from "lucide-react";

const features = [
  {
    icon: Brain,
    title: "Allocation Brain",
    description: "6-step reasoning pipeline that matches workers to jobs based on skills, reliability, distance, and fairness — with full transparency.",
    color: "text-nelb-primary",
    bg: "bg-blue-50",
    border: "group-hover:border-nelb-primary",
  },
  {
    icon: History,
    title: "Memory Brain",
    description: "Natural language queries over work history. Ask who you worked for, how many jobs you did, or what your rating was.",
    color: "text-nelb-secondary",
    bg: "bg-emerald-50",
    border: "group-hover:border-nelb-secondary",
  },
  {
    icon: Wrench,
    title: "Work Assistant",
    description: "Grounded answers from a curated knowledge base — cited sources, no hallucination. Tools, materials, safety, techniques.",
    color: "text-nelb-accent",
    bg: "bg-amber-50",
    border: "group-hover:border-nelb-accent",
  },
  {
    icon: Shield,
    title: "Fairness Engine",
    description: "No worker monopolises jobs. The system penalises over-allocation and ensures fair distribution across the community.",
    color: "text-purple-600",
    bg: "bg-purple-50",
    border: "group-hover:border-purple-400",
  },
];

export default function Home() {
  const { isLoggedIn, currentUser } = useAuthStore();

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="relative px-6 pt-20 pb-16 sm:pt-28 sm:pb-24">
        <div className="mx-auto max-w-3xl text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="flex flex-col items-center"
          >
            <img src="/logo.svg" alt="NELB Logo" className="w-24 h-24 mb-6" />
            <h1 className="text-5xl sm:text-6xl font-bold tracking-tight text-nelb-dark">
              No Employee{" "}
              <span className="text-nelb-primary">Left Behind</span>
            </h1>
            <p className="mt-6 text-lg leading-8 text-gray-600 max-w-2xl mx-auto">
              An intelligent reasoning agent that distributes work fairly across communities.
              Four brains. One mission. Every decision explained.
            </p>
          </motion.div>

          {/* CTAs */}
          <motion.div
            className="mt-10 flex flex-wrap items-center justify-center gap-4"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.4 }}
          >
            {isLoggedIn ? (
              <>
                <Link
                  href="/agent"
                  className="group inline-flex items-center gap-2 px-6 py-3 bg-nelb-dark text-white rounded-full font-medium hover:bg-gray-800 transition-all hover:scale-[1.02]"
                >
                  <MessageSquare className="w-4 h-4" />
                  Talk to NELB
                  <ArrowRight className="w-4 h-4 opacity-0 -translate-x-2 transition-all group-hover:opacity-100 group-hover:translate-x-0" />
                </Link>
                <Link
                  href="/employer"
                  className="group inline-flex items-center gap-2 px-6 py-3 bg-nelb-primary text-white rounded-full font-medium hover:bg-blue-700 transition-all hover:scale-[1.02]"
                >
                  <Briefcase className="w-4 h-4" />
                  Find Workers
                  <ArrowRight className="w-4 h-4 opacity-0 -translate-x-2 transition-all group-hover:opacity-100 group-hover:translate-x-0" />
                </Link>
                <Link
                  href="/worker"
                  className="group inline-flex items-center gap-2 px-6 py-3 border border-gray-300 text-gray-700 rounded-full font-medium hover:border-gray-400 hover:bg-white transition-all hover:scale-[1.02]"
                >
                  <History className="w-4 h-4" />
                  My Memory
                  <ArrowRight className="w-4 h-4 opacity-0 -translate-x-2 transition-all group-hover:opacity-100 group-hover:translate-x-0" />
                </Link>
              </>
            ) : (
              <>
                <Link
                  href="/agent"
                  className="group inline-flex items-center gap-2 px-6 py-3 bg-nelb-dark text-white rounded-full font-medium hover:bg-gray-800 transition-all hover:scale-[1.02]"
                >
                  <MessageSquare className="w-4 h-4" />
                  Talk to NELB
                  <ArrowRight className="w-4 h-4 opacity-0 -translate-x-2 transition-all group-hover:opacity-100 group-hover:translate-x-0" />
                </Link>
                <Link
                  href="/employer"
                  className="group inline-flex items-center gap-2 px-6 py-3 bg-nelb-primary text-white rounded-full font-medium hover:bg-blue-700 transition-all hover:scale-[1.02]"
                >
                  <Briefcase className="w-4 h-4" />
                  I need work done
                  <ArrowRight className="w-4 h-4 opacity-0 -translate-x-2 transition-all group-hover:opacity-100 group-hover:translate-x-0" />
                </Link>
                <Link
                  href="/worker"
                  className="group inline-flex items-center gap-2 px-6 py-3 border border-gray-300 text-gray-700 rounded-full font-medium hover:border-gray-400 hover:bg-white transition-all hover:scale-[1.02]"
                >
                  <Wrench className="w-4 h-4" />
                  Help me on site
                  <ArrowRight className="w-4 h-4 opacity-0 -translate-x-2 transition-all group-hover:opacity-100 group-hover:translate-x-0" />
                </Link>
              </>
            )}
          </motion.div>
        </div>
      </section>

      {/* Features Grid */}
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
                  className={`group relative p-6 rounded-2xl border border-gray-200 bg-white transition-all duration-300 hover:shadow-lg hover:-translate-y-1 ${feature.border}`}
                  variants={{
                    hidden: { opacity: 0, y: 20 },
                    visible: { opacity: 1, y: 0 },
                  }}
                >
                  <div className={`inline-flex p-2.5 rounded-xl ${feature.bg} mb-4`}>
                    <Icon className={`w-5 h-5 ${feature.color}`} />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-sm text-gray-600 leading-relaxed">
                    {feature.description}
                  </p>
                </motion.div>
              );
            })}
          </motion.div>
        </div>
      </section>

      {/* How it works */}
      <section className="px-6 pb-20">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-8">How NELB reasons</h2>
          <motion.div
            className="flex flex-wrap items-center justify-center gap-3 text-sm"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            {["Skills filter", "Reliability", "Availability", "Distance", "Fairness"].map((step, i) => (
              <div key={step} className="flex items-center gap-3">
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 rounded-full font-medium text-gray-700">
                  <span className="w-5 h-5 rounded-full bg-nelb-primary text-white text-xs flex items-center justify-center font-bold">
                    {i + 1}
                  </span>
                  {step}
                </span>
                {i < 4 && <span className="text-gray-300">→</span>}
              </div>
            ))}
          </motion.div>
          <p className="mt-6 text-gray-500 text-sm">
            Every recommendation includes a full reasoning trace — visible, auditable, explainable.
          </p>
        </div>
      </section>

      {/* Tech strip */}
      <section className="px-6 pb-12">
        <div className="mx-auto max-w-3xl">
          <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-xs text-gray-400 font-medium">
            <span>Azure AI Foundry</span>
            <span>·</span>
            <span>Foundry IQ</span>
            <span>·</span>
            <span>Semantic Kernel</span>
            <span>·</span>
            <span>o4-mini</span>
            <span>·</span>
            <span>Next.js</span>
            <span>·</span>
            <span>FastAPI</span>
            <span>·</span>
            <span>PostgreSQL</span>
          </div>
        </div>
      </section>
    </div>
  );
}
