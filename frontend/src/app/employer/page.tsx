"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import { useJobStore } from "@/lib/store";
import { useAuthStore } from "@/lib/auth";
import { allocateJob } from "@/lib/api";
import PageTransition from "@/components/PageTransition";

// Lazy load the map to avoid SSR issues with Leaflet
import dynamic from "next/dynamic";
const MapPicker = dynamic(() => import("@/components/MapPicker"), { ssr: false });

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

const JOB_CATEGORIES = [
  "cleaning",
  "gardening",
  "painting",
  "plumbing",
  "electrical",
  "tiling",
  "carpentry",
  "moving",
  "general repair",
];

export default function EmployerPage() {
  const store = useJobStore();
  const { currentUser } = useAuthStore();
  const [submitted, setSubmitted] = useState(false);

  const handleLocationSelect = (lat: number, lng: number) => {
    store.setJobDetails({ latitude: lat, longitude: lng });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    store.setLoading(true);

    try {
      const result = await allocateJob({
        job_category: store.category,
        description: store.description,
        budget: store.budget,
        location: {
          latitude: store.latitude,
          longitude: store.longitude,
          address: store.address,
        },
        radius_km: store.radiusKm,
        exclude_worker_id: currentUser?.worker_id,
      });
      store.setAllocation(result);
      setSubmitted(true);
    } catch (err) {
      store.setError(
        err instanceof Error ? err.message : "Something went wrong"
      );
    }
  };

  return (
    <PageTransition>
      <main className="max-w-6xl mx-auto p-6">
        <header className="mb-8">
          <Link href="/" className="text-sm text-gray-500 hover:text-gray-700">
            ← Back to home
          </Link>
          <h1 className="text-3xl font-bold text-nelb-primary mt-2">
            Post a Job
          </h1>
          <p className="text-gray-600 mt-1">
            Describe what you need done. NELB will find the best workers nearby.
          </p>
        </header>

        {!submitted ? (
          <form onSubmit={handleSubmit} className="max-w-2xl space-y-5">
            {/* Category */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Job category
              </label>
              <select
                value={store.category}
                onChange={(e) => store.setJobDetails({ category: e.target.value })}
                required
                className="w-full border rounded-lg px-3 py-2"
              >
                <option value="">Select a category</option>
                {JOB_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat.charAt(0).toUpperCase() + cat.slice(1)}
                  </option>
                ))}
              </select>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Describe the job
              </label>
              <textarea
                value={store.description}
                onChange={(e) =>
                  store.setJobDetails({ description: e.target.value })
                }
                required
                rows={3}
                placeholder="e.g. Clean my yard, trim hedges, rake leaves"
                className="w-full border rounded-lg px-3 py-2"
              />
            </div>

            {/* Budget */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Budget (R)
              </label>
              <input
                type="number"
                value={store.budget || ""}
                onChange={(e) =>
                  store.setJobDetails({ budget: Number(e.target.value) })
                }
                required
                min={1}
                placeholder="500"
                className="w-full border rounded-lg px-3 py-2"
              />
            </div>

            {/* Map picker */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Your location — click the map to set
              </label>
              <MapPicker
                  latitude={store.latitude}
                  longitude={store.longitude}
                  radiusKm={store.radiusKm}
                  onLocationSelect={handleLocationSelect}
                />
              <p className="text-xs text-gray-400 mt-1">
                Selected: {store.latitude.toFixed(4)}, {store.longitude.toFixed(4)}
              </p>
            </div>

            {/* Radius */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Search radius: {store.radiusKm}km
              </label>
              <input
                type="range"
                min={1}
                max={20}
                value={store.radiusKm}
                onChange={(e) =>
                  store.setJobDetails({ radiusKm: Number(e.target.value) })
                }
                className="w-full"
              />
            </div>

            {store.error && (
              <p className="text-red-600 text-sm">{store.error}</p>
            )}

            <button
              type="submit"
              disabled={store.isLoading}
              className="w-full py-3 bg-nelb-primary text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {store.isLoading ? (
                <motion.span className="flex gap-1 items-center justify-center">
                  {[0, 1, 2].map((i) => (
                    <motion.span
                      key={i}
                      className="w-2 h-2 bg-white rounded-full"
                      animate={{ y: [0, -6, 0] }}
                      transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15 }}
                    />
                  ))}
                </motion.span>
              ) : "Find workers"}
            </button>
          </form>
        ) : (
          /* Results — Reasoning panel + recommendations */
          <div className="space-y-6">
            {store.allocation && (
              <>
                {/* Confidence badge */}
                <div className="flex items-center gap-3">
                  <span className="text-2xl font-bold text-nelb-primary">
                    {Math.round(store.allocation.confidence * 100)}%
                  </span>
                  <span className="text-gray-500">confidence</span>
                  <span className="text-sm text-gray-400 ml-auto">
                    {store.allocation.total_candidates_evaluated} workers
                    evaluated
                  </span>
                </div>

                {/* Reasoning trace with stagger */}
                <div className="bg-white border rounded-lg p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <h2 className="font-semibold text-lg">Allocation Pipeline</h2>
                    <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                      ⚙️ Python deterministic reasoning
                    </span>
                  </div>
                  <motion.div
                    className="space-y-3"
                    initial="hidden"
                    animate="visible"
                    variants={{ visible: { transition: { staggerChildren: 0.15 } } }}
                  >
                    {store.allocation.reasoning_trace.map((step) => (
                      <motion.div
                        key={step.step}
                        className="flex items-start gap-3 text-sm"
                        variants={{
                          hidden: { opacity: 0, x: -20 },
                          visible: { opacity: 1, x: 0 }
                        }}
                      >
                        <span className="w-6 h-6 rounded-full bg-nelb-primary text-white flex items-center justify-center text-xs font-bold shrink-0">
                          {step.step}
                        </span>
                        <div>
                          <p className="font-medium">{step.name}</p>
                          <p className="text-gray-500">{step.description}</p>
                          <p className="text-gray-400 text-xs mt-1">
                            {step.candidates_before} → {step.candidates_after}{" "}
                            candidates
                          </p>
                        </div>
                      </motion.div>
                    ))}
                  </motion.div>
                </div>

                {/* Recommendations with stagger */}
                <div>
                  <h2 className="font-semibold text-lg mb-3">
                    Top recommendations
                  </h2>
                  <motion.div
                    className="space-y-3"
                    initial="hidden"
                    animate="visible"
                    variants={{ visible: { transition: { staggerChildren: 0.1 } } }}
                  >
                    {store.allocation.recommendations.map((worker, idx) => (
                      <motion.div
                        key={worker.worker_id}
                        className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                          store.selectedWorker?.worker_id === worker.worker_id
                            ? "border-nelb-primary bg-blue-50"
                            : "hover:border-gray-300"
                        }`}
                        onClick={() => store.setSelectedWorker(worker)}
                        variants={{
                          hidden: { opacity: 0, y: 16 },
                          visible: { opacity: 1, y: 0 }
                        }}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="text-sm text-gray-400 mr-2">
                              #{idx + 1}
                            </span>
                            <span className="font-medium">
                              {worker.worker_name}
                            </span>
                            <span className="text-sm text-gray-500 ml-2">
                              {worker.distance_km}km away
                            </span>
                          </div>
                          <span className="text-lg font-bold text-nelb-primary">
                            {worker.composite_score}%
                          </span>
                        </div>
                        <div className="flex gap-2 mt-2 flex-wrap">
                          {worker.skills.map((skill) => (
                            <span
                              key={skill}
                              className="px-2 py-0.5 bg-gray-100 rounded text-xs text-gray-600"
                            >
                              {skill}
                            </span>
                          ))}
                        </div>
                        <div className="grid grid-cols-4 gap-2 mt-3 text-xs text-gray-500">
                          <span>Skill: {worker.skill_score}%</span>
                          <span>Reliability: {worker.reliability_score}%</span>
                          <span>Distance: {worker.distance_score}%</span>
                          <span>Fairness: {worker.fairness_score}%</span>
                        </div>
                      </motion.div>
                    ))}
                  </motion.div>
                </div>

                {/* Explanation with Foundry IQ enrichment */}
                <div className="bg-gray-50 border rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="text-sm font-semibold text-gray-700">Decision Explanation</h3>
                    {store.allocation.citations && store.allocation.citations.length > 0 && (
                      <span className="text-xs text-gray-500 bg-white px-2 py-0.5 rounded border">
                        📖 Grounded by Foundry IQ
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-gray-700 whitespace-pre-wrap">
                    <CitedContent content={store.allocation.explanation} />
                  </div>
                  {/* Citation cards with animation */}
                  {store.allocation.citations && store.allocation.citations.length > 0 && (
                    <motion.div
                      className="mt-4 pt-4 border-t"
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.3, duration: 0.2 }}
                    >
                      <p className="text-xs text-gray-500 mb-2">Sources:</p>
                      <div className="space-y-2">
                        {store.allocation.citations.map((c) => (
                          <div
                            key={c.index}
                            className="flex items-center gap-2 px-3 py-2 bg-white border rounded text-xs text-gray-600"
                          >
                            <span className="font-medium text-nelb-primary">{c.index}</span>
                            <span className="text-gray-300">|</span>
                            <span>📄 {c.filename}</span>
                            <span className="text-gray-300">|</span>
                            <span className="text-gray-400">nelb-allocation-criteria</span>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </div>

                <button
                  onClick={() => {
                    setSubmitted(false);
                    store.reset();
                  }}
                  className="text-sm text-gray-500 hover:text-gray-700"
                >
                  ← Post another job
                </button>
              </>
            )}
          </div>
        )}
      </main>
    </PageTransition>
  );
}
