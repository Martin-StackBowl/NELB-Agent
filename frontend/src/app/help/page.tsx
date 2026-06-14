"use client";

import Link from "next/link";
import { motion } from "motion/react";
import {
  Brain,
  History,
  Wrench,
  Shield,
  MessageSquare,
  Briefcase,
  MapPin,
  Scale,
  Eye,
  BookOpen,
  ArrowRight,
  Lock,
  Sparkles,
} from "lucide-react";

const brains = [
  {
    icon: Brain,
    name: "Allocation Brain",
    color: "text-nelb-primary",
    tint: "bg-nelb-primary/10",
    summary:
      "Runs a 5-step reasoning pipeline to rank the best workers for a job — skills, reliability, availability, distance, then fairness. It's real Python logic, not a prompt, and every decision comes with a visible trace.",
  },
  {
    icon: History,
    name: "Memory Brain",
    color: "text-nelb-secondary",
    tint: "bg-nelb-secondary/10",
    summary:
      "Answers natural-language questions about your own work history — who you worked for, how many jobs you did, your ratings. Requires login so it knows whose history to read.",
  },
  {
    icon: Wrench,
    name: "Work Assistant",
    color: "text-nelb-accent",
    tint: "bg-nelb-accent/10",
    summary:
      "A practical on-site buddy. Ask about tools, materials, quantities, and safety. Answers are grounded in a curated knowledge base with cited sources — no guesswork. Open to everyone, no login needed.",
  },
  {
    icon: Shield,
    name: "Fairness Engine",
    color: "text-nelb-violet",
    tint: "bg-nelb-violet/10",
    summary:
      "NELB's defining feature. Workers who've already had several jobs recently are ranked lower so others get a fair turn. No single person monopolises the work in a community.",
  },
];

const pipeline = [
  { n: 1, name: "Skills filter", desc: "Only workers with the required skill (or a general-repair fallback) move on." },
  { n: 2, name: "Reliability", desc: "Workers below 50% reliability are removed." },
  { n: 3, name: "Availability", desc: "Anyone marked unavailable is excluded." },
  { n: 4, name: "Distance", desc: "Scored by proximity within your radius; closer ranks higher." },
  { n: 5, name: "Budget fit", desc: "Each worker's expected price (from their job history, or a category baseline) is compared to your budget. Far over-budget workers are dropped." },
  { n: 6, name: "Fairness", desc: "Recent over-allocation is penalised so work spreads fairly." },
];

const howTo = [
  {
    icon: MessageSquare,
    title: "Talk to NELB",
    href: "/agent",
    steps: [
      "Type what you need in plain language.",
      "NELB picks the right brain automatically — find workers, recall history, or answer a work question.",
      "For finding workers, open Location to drop a pin and set a radius.",
    ],
  },
  {
    icon: Briefcase,
    title: "Find Workers",
    href: "/employer",
    steps: [
      "Pick a category, describe the job, and set a budget.",
      "Drop your pin on the map and choose a search radius.",
      "Get a ranked shortlist with a full reasoning trace and a confidence score.",
    ],
  },
  {
    icon: Wrench,
    title: "Work Assistant",
    href: "/worker",
    steps: [
      "Use Assist for practical questions — open to everyone.",
      "Switch to Memory (login required) to query your own job history.",
      "Cited sources appear under answers so you can verify them.",
    ],
  },
];

const principles = [
  { icon: Scale, title: "Fairness is structural", desc: "The fairness engine is code, not a policy statement." },
  { icon: Eye, title: "Explainability is mandatory", desc: "Every decision ships with a reasoning trace. No black boxes." },
  { icon: BookOpen, title: "Grounded, not guessed", desc: "The assistant cites its sources instead of hallucinating." },
];

export default function HelpPage() {
  return (
    <div className="h-full overflow-y-auto scroll-area">
      <div className="max-w-4xl mx-auto px-6 py-12 space-y-16">
        {/* Hero */}
        <motion.header
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center"
        >
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-nelb-primary to-nelb-violet shadow-xl shadow-nelb-primary/30 mb-6">
            <Sparkles className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight">
            What is <span className="text-gradient">NELB</span>?
          </h1>
          <p className="mt-5 text-lg text-muted max-w-2xl mx-auto leading-relaxed">
            NELB — No Employee Left Behind — is an intelligent reasoning agent for the
            community gig economy. It matches people to nearby work fairly, remembers every
            job, and helps workers get the job done. Every recommendation is explained, never
            a black box.
          </p>
        </motion.header>

        {/* What it does */}
        <section>
          <h2 className="text-2xl font-bold mb-2">Four brains, one agent</h2>
          <p className="text-muted mb-6">
            NELB routes your request to the right capability automatically.
          </p>
          <div className="grid sm:grid-cols-2 gap-4">
            {brains.map((b) => {
              const Icon = b.icon;
              return (
                <div key={b.name} className="glass rounded-2xl p-5">
                  <div className={`inline-flex p-2.5 rounded-xl ${b.tint} mb-3`}>
                    <Icon className={`w-5 h-5 ${b.color}`} />
                  </div>
                  <h3 className="font-semibold text-lg mb-1.5">{b.name}</h3>
                  <p className="text-sm text-muted leading-relaxed">{b.summary}</p>
                </div>
              );
            })}
          </div>
        </section>

        {/* The pipeline */}
        <section>
          <h2 className="text-2xl font-bold mb-2">How the allocation reasons</h2>
          <p className="text-muted mb-6">
            When a job is posted, NELB narrows the candidate pool one constraint at a time —
            and shows its work.
          </p>
          <div className="glass rounded-3xl p-6 space-y-4">
            {pipeline.map((s) => (
              <div key={s.n} className="flex items-start gap-4">
                <span className="w-8 h-8 rounded-full bg-gradient-to-br from-nelb-primary to-nelb-violet text-white grid place-items-center text-sm font-bold shrink-0">
                  {s.n}
                </span>
                <div>
                  <p className="font-medium text-foreground">{s.name}</p>
                  <p className="text-sm text-muted">{s.desc}</p>
                </div>
              </div>
            ))}
            <div className="pt-4 mt-2 border-t border-border">
              <p className="text-sm text-muted">
                Workers who clear all five filters are then ranked by a weighted score.
                These weights decide the <span className="text-foreground font-medium">order</span> of the
                survivors — they don&apos;t override the filters above (a worker already
                eliminated for low reliability or distance never reaches this stage):
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {[
                  { label: "Skill", value: 25 },
                  { label: "Reliability", value: 20 },
                  { label: "Distance", value: 20 },
                  { label: "Fairness", value: 20 },
                  { label: "Budget fit", value: 15 },
                ].map((w) => (
                  <span
                    key={w.label}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 glass rounded-full text-sm"
                  >
                    <span className="text-foreground font-medium">{w.label}</span>
                    <span className="text-nelb-primary font-semibold">{w.value}%</span>
                  </span>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* How to use */}
        <section>
          <h2 className="text-2xl font-bold mb-6">How to use NELB</h2>
          <div className="space-y-4">
            {howTo.map((h) => {
              const Icon = h.icon;
              return (
                <Link
                  key={h.title}
                  href={h.href}
                  className="group glass rounded-2xl p-5 flex gap-4 hover:border-nelb-primary/40 transition-colors"
                >
                  <div className="w-11 h-11 shrink-0 rounded-xl bg-gradient-to-br from-nelb-primary to-nelb-violet grid place-items-center shadow-lg shadow-nelb-primary/25">
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-lg">{h.title}</h3>
                      <ArrowRight className="w-4 h-4 text-faint opacity-0 -translate-x-2 transition-all group-hover:opacity-100 group-hover:translate-x-0" />
                    </div>
                    <ul className="mt-2 space-y-1.5">
                      {h.steps.map((step, i) => (
                        <li key={i} className="flex gap-2 text-sm text-muted">
                          <span className="text-nelb-primary font-semibold shrink-0">{i + 1}.</span>
                          <span>{step}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>

        {/* Login note */}
        <section className="glass rounded-2xl p-5 flex items-start gap-4">
          <div className="w-10 h-10 shrink-0 rounded-xl bg-nelb-violet/10 grid place-items-center">
            <Lock className="w-5 h-5 text-nelb-violet" />
          </div>
          <div>
            <h3 className="font-semibold mb-1">Do I need to log in?</h3>
            <p className="text-sm text-muted leading-relaxed">
              Finding workers and the Work Assistant are open to everyone. Memory — your
              personal job history and profile stats — requires login so NELB knows whose
              records to read. Use the demo accounts from the <span className="text-foreground font-medium">Log in</span> button
              in the top bar to explore a worker's history.
            </p>
          </div>
        </section>

        {/* Categories */}
        <section>
          <h2 className="text-2xl font-bold mb-2 flex items-center gap-2">
            <MapPin className="w-5 h-5 text-nelb-primary" /> What NELB covers
          </h2>
          <p className="text-muted mb-5">
            NELB is deliberately scoped to low-to-mid-risk civilian work for safety and trust.
          </p>
          <div className="flex flex-wrap gap-2">
            {[
              "Cleaning", "Gardening", "Painting", "Plumbing", "Electrical",
              "Tiling", "Carpentry", "Moving", "General repair",
            ].map((c) => (
              <span key={c} className="px-3.5 py-1.5 glass rounded-full text-sm font-medium text-foreground/90">
                {c}
              </span>
            ))}
          </div>
        </section>

        {/* Principles */}
        <section>
          <h2 className="text-2xl font-bold mb-6">What makes NELB different</h2>
          <div className="grid sm:grid-cols-3 gap-4">
            {principles.map((p) => {
              const Icon = p.icon;
              return (
                <div key={p.title} className="glass rounded-2xl p-5">
                  <Icon className="w-5 h-5 text-nelb-primary mb-3" />
                  <h3 className="font-semibold mb-1">{p.title}</h3>
                  <p className="text-sm text-muted leading-relaxed">{p.desc}</p>
                </div>
              );
            })}
          </div>
        </section>

        {/* CTA */}
        <section className="text-center pb-4">
          <Link
            href="/agent"
            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-nelb-primary to-nelb-violet text-white rounded-full font-medium shadow-lg shadow-nelb-primary/30 transition-all hover:scale-[1.03]"
          >
            <MessageSquare className="w-4 h-4" />
            Start talking to NELB
            <ArrowRight className="w-4 h-4" />
          </Link>
        </section>
      </div>
    </div>
  );
}
