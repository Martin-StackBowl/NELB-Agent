"use client";

import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { Listbox, ListboxButton, ListboxOption, ListboxOptions, Label as ListboxLabel } from "@headlessui/react";
import { Check, ChevronDown, MapPin, Sparkles, ArrowLeft, FileText } from "lucide-react";
import dynamic from "next/dynamic";
import { useJobStore } from "@/lib/store";
import { useAuthStore } from "@/lib/auth";
import { allocateJob } from "@/lib/api";
import CitedContent from "@/components/CitedContent";

const MapPicker = dynamic(() => import("@/components/MapPicker"), { ssr: false });

/** Free-text coordinate field. Applies on blur or Enter — never mid-type. */
function CoordInput({
  value,
  onChange,
  title,
}: {
  value: number;
  onChange: (v: number) => void;
  title: string;
}) {
  const [draft, setDraft] = useState(String(value));
  const [focused, setFocused] = useState(false);

  // Sync when the map pin is moved externally (but not while the user is typing)
  useEffect(() => {
    if (!focused) setDraft(String(value));
  }, [value, focused]);

  const commit = (raw: string) => {
    const parsed = parseFloat(raw.trim());
    if (!isNaN(parsed)) {
      onChange(parsed);
      setDraft(String(parsed));
    } else {
      setDraft(String(value));
    }
  };

  return (
    <input
      type="text"
      title={title}
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onFocus={() => setFocused(true)}
      onBlur={(e) => { setFocused(false); commit(e.target.value); }}
      onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur(); }}
      className="w-28 text-xs tabular-nums bg-foreground/[0.04] border border-border rounded-lg px-2 py-1 text-foreground focus:outline-none focus:ring-1 focus:ring-nelb-primary/40"
      placeholder={title}
      spellCheck={false}
    />
  );
}

const JOB_CATEGORIES = [
  "cleaning", "gardening", "painting", "plumbing", "electrical",
  "tiling", "carpentry", "moving", "general repair",
];

export default function EmployerPage() {
  const store = useJobStore();
  const { currentUser } = useAuthStore();
  const [submitted, setSubmitted] = useState(false);

  // Sync the results/form view with browser history so the browser back button
  // returns to the form (not the previous page) while viewing results.
  useEffect(() => {
    const onPop = () => {
      setSubmitted(false);
      store.reset();
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleLocationSelect = (lat: number, lng: number) => {
    store.setJobDetails({ latitude: lat, longitude: lng });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!store.category) {
      store.setError("Please select a job category");
      return;
    }
    store.setLoading(true);
    try {
      const result = await allocateJob({
        job_category: store.category,
        description: store.description,
        budget: store.budget,
        location: { latitude: store.latitude, longitude: store.longitude, address: store.address },
        radius_km: store.radiusKm,
        exclude_worker_id: currentUser?.worker_id,
      });
      store.setAllocation(result);
      setSubmitted(true);
      // Push a history entry so browser-back returns to the form
      window.history.pushState({ nelbView: "results" }, "");
    } catch (err) {
      store.setError(err instanceof Error ? err.message : "Something went wrong");
    }
  };

  return (
    <div className="h-full overflow-y-auto scroll-area">
      <div className="max-w-6xl mx-auto px-6 py-10">
        {!submitted ? (
          <>
            <header className="mb-8">
              <h1 className="text-3xl font-bold tracking-tight">Post a Job</h1>
              <p className="text-muted mt-1">Describe what you need. NELB finds the fairest match nearby.</p>
            </header>

            <form onSubmit={handleSubmit} className="grid lg:grid-cols-2 gap-6">
              {/* Left — fields */}
              <div className="glass rounded-3xl p-6 space-y-6">
                {/* Category */}
                <Listbox value={store.category} onChange={(val) => store.setJobDetails({ category: val })}>
                  <ListboxLabel className="block text-sm font-medium text-foreground mb-1.5">
                    Job category <span className="text-nelb-pink">*</span>
                  </ListboxLabel>
                  <div className="relative">
                    <ListboxButton className="relative w-full cursor-pointer rounded-xl border border-border bg-foreground/[0.03] py-2.5 pl-3.5 pr-10 text-left text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-nelb-primary/40">
                      <span className="block truncate">
                        {store.category
                          ? store.category.charAt(0).toUpperCase() + store.category.slice(1)
                          : <span className="text-faint">Select a category</span>}
                      </span>
                      <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                        <ChevronDown className="w-4 h-4 text-faint" />
                      </span>
                    </ListboxButton>
                    <ListboxOptions
                      transition
                      className="absolute z-20 mt-1 max-h-60 w-full overflow-auto scroll-area rounded-xl bg-elevated border border-border shadow-2xl py-1 text-sm focus:outline-none transition duration-100 ease-in data-[closed]:opacity-0"
                    >
                      {JOB_CATEGORIES.map((cat) => (
                        <ListboxOption
                          key={cat}
                          value={cat}
                          className="group relative cursor-pointer select-none py-2.5 pl-3.5 pr-9 text-foreground data-[focus]:bg-nelb-primary/10 data-[focus]:text-nelb-primary"
                        >
                          <span className="block truncate group-data-[selected]:font-semibold">
                            {cat.charAt(0).toUpperCase() + cat.slice(1)}
                          </span>
                          <span className="absolute inset-y-0 right-0 flex items-center pr-3 text-nelb-primary group-[&:not([data-selected])]:hidden">
                            <Check className="w-4 h-4" />
                          </span>
                        </ListboxOption>
                      ))}
                    </ListboxOptions>
                  </div>
                </Listbox>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">
                    Describe the job <span className="text-nelb-pink">*</span>
                  </label>
                  <textarea
                    value={store.description}
                    onChange={(e) => store.setJobDetails({ description: e.target.value })}
                    required
                    rows={3}
                    placeholder="e.g. Clean my yard, trim hedges, rake leaves"
                    className="w-full rounded-xl border border-border bg-foreground/[0.03] px-3.5 py-2.5 text-sm text-foreground placeholder-faint resize-none focus:outline-none focus:ring-2 focus:ring-nelb-primary/40"
                  />
                </div>

                {/* Budget */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">
                    Budget (R) <span className="text-nelb-pink">*</span>
                  </label>
                  <input
                    type="number"
                    value={store.budget || ""}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (value === "" || /^[1-9]\d*$/.test(value)) {
                        store.setJobDetails({ budget: Number(value) || 0 });
                      }
                    }}
                    onKeyDown={(e) => {
                      if (["e", "E", "+", "-", "."].includes(e.key)) e.preventDefault();
                    }}
                    required
                    min={1}
                    placeholder="500"
                    className="w-full rounded-xl border border-border bg-foreground/[0.03] px-3.5 py-2.5 text-sm text-foreground placeholder-faint focus:outline-none focus:ring-2 focus:ring-nelb-primary/40 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                </div>

                {/* Radius lives inside the map card for spatial context */}

                {store.error && <p className="text-nelb-pink text-sm">{store.error}</p>}

                <button
                  type="submit"
                  disabled={store.isLoading || !store.category}
                  className="w-full py-3 bg-gradient-to-r from-nelb-primary to-nelb-violet text-white rounded-xl font-medium shadow-lg shadow-nelb-primary/25 hover:shadow-nelb-primary/40 transition-all hover:scale-[1.01] disabled:opacity-50 disabled:hover:scale-100 min-h-[48px]"
                >
                  {store.isLoading ? (
                    <span className="flex gap-1 items-center justify-center h-6">
                      {[0, 1, 2].map((i) => (
                        <motion.span
                          key={i}
                          className="w-2 h-2 bg-white rounded-full"
                          animate={{ y: [0, -6, 0] }}
                          transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15 }}
                        />
                      ))}
                    </span>
                  ) : "Find workers"}
                </button>
              </div>

              {/* Right — live map (stretches to match the form height) */}
              <div className="flex flex-col">
                <div className="glass rounded-3xl overflow-hidden flex flex-col flex-1">
                  <div className="flex items-center gap-2 px-5 py-3.5 border-b border-border shrink-0 flex-wrap gap-y-2">
                    <MapPin className="w-4 h-4 text-nelb-primary shrink-0" />
                    <span className="text-sm font-medium shrink-0">Job location</span>
                    {/* Editable coordinates — lets judges jump straight to the demo zone */}
                    <div className="ml-auto flex items-center gap-1.5">
                      <CoordInput
                        value={store.latitude}
                        onChange={(v) => store.setJobDetails({ latitude: v })}
                        title="Latitude"
                      />
                      <span className="text-faint text-xs">,</span>
                      <CoordInput
                        value={store.longitude}
                        onChange={(v) => store.setJobDetails({ longitude: v })}
                        title="Longitude"
                      />
                      <button
                        type="button"
                        onClick={() => store.setJobDetails({ latitude: -25.7463, longitude: 28.1885 })}
                        title="Reset to Pretoria CBD"
                        className="ml-1 text-xs font-medium bg-foreground/[0.04] border border-border rounded-lg px-2 py-1 text-nelb-primary hover:bg-nelb-primary/10 hover:border-nelb-primary/40 transition-colors shrink-0"
                      >
                        Reset
                      </button>
                    </div>
                  </div>
                  <div className="flex-1 min-h-[300px]">
                    <MapPicker
                      latitude={store.latitude}
                      longitude={store.longitude}
                      radiusKm={store.radiusKm}
                      onLocationSelect={handleLocationSelect}
                    />
                  </div>
                  {/* Radius slider */}
                  <div className="px-5 py-3.5 border-t border-border shrink-0">
                    <label className="flex items-center justify-between text-sm font-medium text-foreground mb-2">
                      <span>Search radius</span>
                      <span className="text-nelb-primary font-semibold">{store.radiusKm} km</span>
                    </label>
                    <input
                      type="range"
                      min={1}
                      max={20}
                      value={store.radiusKm}
                      onChange={(e) => store.setJobDetails({ radiusKm: Number(e.target.value) })}
                      className="w-full accent-nelb-primary"
                    />
                  </div>
                </div>
              </div>
            </form>
          </>
        ) : (
          <Results onBack={() => window.history.back()} />
        )}
      </div>
    </div>
  );
}

function Results({ onBack }: { onBack: () => void }) {
  const store = useJobStore();
  if (!store.allocation) return null;
  const a = store.allocation;

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-end gap-3 mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Allocation results</h1>
          <p className="text-muted mt-1">{a.total_candidates_evaluated} workers evaluated</p>
        </div>
        <div className="ml-auto text-right">
          <div className="text-4xl font-bold text-gradient">{Math.round(a.confidence * 100)}%</div>
          <div className="text-xs text-faint uppercase tracking-wider">confidence</div>
        </div>
      </div>

      {/* Pipeline */}
      <div className="glass rounded-3xl p-6 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <h2 className="font-semibold text-lg">Allocation pipeline</h2>
          <span className="text-xs text-muted glass rounded-full px-2.5 py-1">⚙️ deterministic reasoning</span>
        </div>
        <motion.div
          className="space-y-3"
          initial="hidden"
          animate="visible"
          variants={{ visible: { transition: { staggerChildren: 0.12 } } }}
        >
          {a.reasoning_trace.map((step) => (
            <motion.div
              key={step.step}
              className="flex items-start gap-3 text-sm"
              variants={{ hidden: { opacity: 0, x: -16 }, visible: { opacity: 1, x: 0 } }}
            >
              <span className="w-6 h-6 rounded-full bg-gradient-to-br from-nelb-primary to-nelb-violet text-white grid place-items-center text-xs font-bold shrink-0">
                {step.step}
              </span>
              <div className="min-w-0">
                <p className="font-medium text-foreground">{step.name}</p>
                <p className="text-muted">{step.description}</p>
                <p className="text-faint text-xs mt-0.5 tabular-nums">
                  {step.candidates_before} → {step.candidates_after} candidates
                </p>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>

      {/* Recommendations */}
      <h2 className="font-semibold text-lg mb-3">Top recommendations</h2>
      <motion.div
        className="space-y-3 mb-6"
        initial="hidden"
        animate="visible"
        variants={{ visible: { transition: { staggerChildren: 0.08 } } }}
      >
        {a.recommendations.map((w, idx) => (
          <motion.div
            key={w.worker_id}
            onClick={() => store.setSelectedWorker(w)}
            variants={{ hidden: { opacity: 0, y: 14 }, visible: { opacity: 1, y: 0 } }}
            className={`glass rounded-2xl p-4 cursor-pointer transition-all ${
              store.selectedWorker?.worker_id === w.worker_id
                ? "ring-2 ring-nelb-primary"
                : "hover:border-nelb-primary/40"
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs text-faint font-semibold mr-2">#{idx + 1}</span>
                <span className="font-semibold text-foreground">{w.worker_name}</span>
                <span className="text-sm text-muted ml-2">{w.distance_km}km away</span>
              </div>
              <div className="text-right">
                <span className="text-lg font-bold text-gradient">{w.composite_score}%</span>
                <p className="text-xs text-faint tabular-nums">~R{Math.round(w.estimated_price)}</p>
              </div>
            </div>
            <div className="flex gap-2 mt-3 flex-wrap">
              {w.skills.map((skill) => (
                <span key={skill} className="px-2.5 py-1 bg-foreground/[0.05] border border-border rounded-full text-xs text-muted font-medium">
                  {skill}
                </span>
              ))}
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 mt-3 text-xs text-muted">
              <ScoreBar label="Skill" value={w.skill_score} />
              <ScoreBar label="Reliability" value={w.reliability_score} />
              <ScoreBar label="Distance" value={w.distance_score} />
              <ScoreBar label="Budget" value={w.budget_score} />
              <ScoreBar label="Fairness" value={w.fairness_score} />
            </div>
          </motion.div>
        ))}
      </motion.div>

      {/* Explanation */}
      <div className="glass rounded-3xl p-6">
        <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-nelb-violet" /> Decision explanation
        </h3>
        <div className="text-sm text-foreground/85 leading-relaxed">
          <CitedContent content={a.explanation} />
        </div>
        {a.citations && a.citations.length > 0 && (
          <div className="mt-4 pt-4 border-t border-border">
            <p className="text-xs text-faint mb-2 font-medium">Supporting references</p>
            <div className="flex flex-wrap gap-2">
              {a.citations.map((c) => (
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
          </div>
        )}
      </div>

      {/* Post another job — at the end, following the natural read order */}
      <button
        onClick={onBack}
        className="mt-6 flex items-center gap-1.5 text-sm text-muted hover:text-foreground transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Post another job
      </button>
    </div>
  );
}

function ScoreBar({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="flex justify-between mb-1">
        <span>{label}</span>
        <span className="text-foreground/70 font-medium tabular-nums">{value}%</span>
      </div>
      <div className="h-1.5 rounded-full bg-foreground/[0.08] overflow-hidden">
        <motion.div
          className="h-full rounded-full bg-gradient-to-r from-nelb-primary to-nelb-violet"
          initial={{ width: 0 }}
          animate={{ width: `${value}%` }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        />
      </div>
    </div>
  );
}
