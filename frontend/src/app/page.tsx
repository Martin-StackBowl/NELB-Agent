"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { useAuthStore } from "@/lib/auth";
import { Search, Clock, Wrench, User, MessageSquare, Briefcase, ArrowRight, CheckCircle2 } from "lucide-react";

export default function Home() {
  const { isLoggedIn } = useAuthStore();

  const capabilities = [
    {
      icon: Search,
      title: "Find the Right Worker",
      brain: "Allocation Brain",
      brainColor: "bg-nelb-primary/15 text-nelb-primary",
      description: "Post a job and get ranked recommendations based on skills, reliability, distance, and fairness—with full transparency.",
      example: "\"I need a painter, budget R1200\"",
    },
    {
      icon: Clock,
      title: "Track Your Work History",
      brain: "Work History Brain",
      brainColor: "bg-nelb-secondary/15 text-nelb-secondary",
      description: "Ask about past jobs, clients, and ratings in plain language. Your work history becomes searchable.",
      example: "\"Who did I tile for last year?\"",
    },
    {
      icon: Wrench,
      title: "Get On-Site Guidance",
      brain: "Assistant Brain",
      brainColor: "bg-nelb-accent/15 text-nelb-accent",
      description: "Ask practical questions about tools, materials, techniques, and safety—with sources cited.",
      example: "\"How much cement for a 4m × 5m slab?\"",
    },
    {
      icon: User,
      title: "Check Your Profile & Stats",
      brain: "Profile Brain",
      brainColor: "bg-nelb-violet/15 text-nelb-violet",
      description: "View your reliability score, ratings, total jobs, availability, and skills instantly.",
      example: "\"What's my current rating?\"",
    },
  ];

  const benefits = [
    { text: "Transparent decision-making at every step" },
    { text: "Fair distribution of work across the community" },
    { text: "Answers backed by cited sources" },
    { text: "Covers 9 common job categories" },
  ];

  return (
    <div className="h-full overflow-y-auto scroll-area">
      {/* Hero */}
      <section className="relative px-6 pt-16 pb-12 sm:pt-24 sm:pb-16">
        <div className="mx-auto max-w-4xl text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="flex flex-col items-center"
          >
            <img src="/logo.svg" alt="NELB Logo" className="w-16 h-16 sm:w-20 sm:h-20 mb-6 drop-shadow-xl" />
            <h1 className="text-4xl sm:text-6xl font-bold tracking-tight">
              No Employee <span className="text-gradient">Left Behind</span>
            </h1>
            <p className="mt-6 text-base sm:text-lg leading-relaxed text-muted max-w-2xl">
              Intelligent job allocation for community-level gig work.
              Fair distribution. Full transparency. Every decision explained.
            </p>
          </motion.div>

          <motion.div
            className="mt-8 flex flex-wrap items-center justify-center gap-3"
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
              Find Workers
              <ArrowRight className="w-4 h-4 opacity-0 -translate-x-2 transition-all group-hover:opacity-100 group-hover:translate-x-0" />
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Job Categories */}
      <section className="px-6 pb-16">
        <div className="mx-auto max-w-4xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-center"
          >
            <h2 className="text-2xl sm:text-3xl font-bold mb-3">9 Community Job Categories</h2>
            <p className="text-sm text-muted mb-12">Low-to-mid-risk civilian work only. High-risk work requires licensed professionals.</p>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
              {[
                { name: "Cleaning", icon: "🧹" },
                { name: "Gardening", icon: "🌱" },
                { name: "Painting", icon: "🎨" },
                { name: "Plumbing", icon: "🔧" },
                { name: "Electrical", icon: "⚡" },
                { name: "Tiling", icon: "🔲" },
                { name: "Carpentry", icon: "🪚" },
                { name: "Moving", icon: "📦" },
                { name: "General Repair", icon: "🔨" },
              ].map((category) => (
                <motion.div
                  key={category.name}
                  className="glass rounded-xl px-2 py-3 sm:px-3 sm:py-4 flex flex-col items-center gap-2 hover:border-nelb-primary/40 transition-all"
                  whileHover={{ y: -2 }}
                >
                  <span className="text-2xl">{category.icon}</span>
                  <span className="text-xs font-medium text-foreground">{category.name}</span>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* What You Can Do */}
      <section className="px-6 pb-16">
        <div className="mx-auto max-w-5xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-2xl sm:text-3xl font-bold mb-3">What You Can Do</h2>
            <p className="text-sm text-muted">Four ways NELB helps you get work done</p>
          </motion.div>

          <motion.div
            className="grid grid-cols-1 sm:grid-cols-2 gap-6"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={{ visible: { transition: { staggerChildren: 0.1 } } }}
          >
            {capabilities.map((cap) => {
              const Icon = cap.icon;
              return (
                <motion.div
                  key={cap.title}
                  className="glass rounded-2xl p-6 hover:border-nelb-primary/40 transition-all"
                  variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }}
                >
                  <div className="flex items-start gap-4">
                    <div className="shrink-0 inline-flex p-2.5 rounded-xl bg-gradient-to-br from-nelb-primary/10 to-nelb-violet/10">
                      <Icon className="w-5 h-5 text-nelb-primary" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="text-base font-semibold">{cap.title}</h3>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider ${cap.brainColor}`}>
                          {cap.brain}
                        </span>
                      </div>
                      <p className="text-sm text-muted leading-relaxed mb-3">{cap.description}</p>
                      <p className="text-xs text-faint italic">Example: {cap.example}</p>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        </div>
      </section>

      {/* Why NELB */}
      <section className="px-6 pb-16">
        <div className="mx-auto max-w-3xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="glass rounded-2xl p-8 sm:p-10"
          >
            <h2 className="text-2xl font-bold mb-6 text-center">Why NELB?</h2>
            <div className="space-y-3">
              {benefits.map((benefit) => (
                <div key={benefit.text} className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-nelb-primary shrink-0 mt-0.5" />
                  <p className="text-sm text-foreground">{benefit.text}</p>
                </div>
              ))}
            </div>
            <div className="mt-8 pt-8 border-t border-border">
              <h3 className="text-sm font-semibold mb-3 text-muted">How Allocation Works:</h3>
              <div className="flex flex-wrap items-center gap-2 text-xs">
                {["Skills", "Reliability", "Availability", "Distance", "Budget Fit", "Fairness"].map((step, i) => (
                  <div key={step} className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1.5 glass rounded-full font-medium">
                      <span className="w-4 h-4 rounded-full bg-gradient-to-br from-nelb-primary to-nelb-violet text-white text-[10px] grid place-items-center font-bold">
                        {i + 1}
                      </span>
                      {step}
                    </span>
                    {i < 5 && <span className="text-faint">→</span>}
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Tech footer */}
      <section className="px-6 pb-12">
        <div className="mx-auto max-w-3xl">
          <div className="flex flex-wrap justify-center gap-x-5 gap-y-2 text-xs text-faint font-medium">
            {["Azure AI Foundry", "Foundry IQ", "o4-mini", "Next.js", "FastAPI", "PostgreSQL"].map(
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
