"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { useAuthStore } from "@/lib/auth";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { profileLookup, type ProfileResponse } from "@/lib/api";
import PageTransition from "@/components/PageTransition";

export default function ProfilePage() {
  const { currentUser, isLoggedIn } = useAuthStore();
  const router = useRouter();
  const [profile, setProfile] = useState<ProfileResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isLoggedIn) {
      router.push("/");
    }
  }, [isLoggedIn, router]);

  // Fetch real profile from API
  useEffect(() => {
    if (!currentUser) return;

    profileLookup(currentUser.worker_id)
      .then((result) => {
        setProfile(result);
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  }, [currentUser]);

  if (!currentUser) {
    return null;
  }

  return (
    <PageTransition>
      <main className="max-w-4xl mx-auto p-6">
        <div className="mb-6">
          <Link
            href="/"
            className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            ← Back to home
          </Link>
        </div>

        <div className="bg-white rounded-lg shadow-sm border p-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-nelb-primary mb-2">Profile</h1>
            <p className="text-gray-600">
              This is what NELB knows about you. Ask the agent anything below — it reads from the same data.
            </p>
          </div>

          {loading ? (
            <div className="text-center py-12 text-gray-500">Loading profile from database...</div>
          ) : profile ? (
            <div className="space-y-6">
              {/* Identity */}
              <div className="flex items-start gap-4">
                <span className="text-5xl">
                  {profile.skills.includes("tiling")
                    ? "👷"
                    : profile.skills.includes("cleaning")
                    ? "🧹"
                    : "🎨"}
                </span>
                <div>
                  <h2 className="text-2xl font-semibold text-gray-900">
                    {profile.name}
                  </h2>
                  <div className="mt-2 space-y-1 text-gray-600">
                    <p className="flex items-center gap-2">
                      <span>📧</span> {profile.email}
                    </p>
                    <p className="flex items-center gap-2">
                      <span>📍</span> {profile.address}
                    </p>
                  </div>
                </div>
              </div>

              {/* Skills */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Skills</h3>
                <div className="flex flex-wrap gap-2">
                  {profile.skills.map((skill) => (
                    <span
                      key={skill}
                      className="px-4 py-2 bg-nelb-primary/10 text-nelb-primary rounded-lg font-medium"
                    >
                      {skill.charAt(0).toUpperCase() + skill.slice(1)}
                    </span>
                  ))}
                </div>
                <p className="text-xs text-gray-400 mt-2">
                  Try asking: &ldquo;What are my skills?&rdquo;
                </p>
              </div>

              {/* Statistics — all from real database */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">
                  Statistics
                </h3>
                <motion.div
                  className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"
                  initial="hidden"
                  animate="visible"
                  variants={{ visible: { transition: { staggerChildren: 0.08 } } }}
                >
                  <motion.div
                    className="p-4 bg-gray-50 rounded-lg border"
                    variants={{
                      hidden: { opacity: 0, scale: 0.95 },
                      visible: { opacity: 1, scale: 1 }
                    }}
                  >
                    <p className="text-sm text-gray-600 mb-1">Reliability Score</p>
                    <p className="text-2xl font-bold text-nelb-primary">
                      {profile.reliability_score}%
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      Ask: &ldquo;What&apos;s my reliability?&rdquo;
                    </p>
                  </motion.div>
                  <motion.div
                    className="p-4 bg-gray-50 rounded-lg border"
                    variants={{
                      hidden: { opacity: 0, scale: 0.95 },
                      visible: { opacity: 1, scale: 1 }
                    }}
                  >
                    <p className="text-sm text-gray-600 mb-1">Total Jobs</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {profile.total_jobs}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      Ask: &ldquo;How many jobs have I done?&rdquo;
                    </p>
                  </motion.div>
                  <motion.div
                    className="p-4 bg-gray-50 rounded-lg border"
                    variants={{
                      hidden: { opacity: 0, scale: 0.95 },
                      visible: { opacity: 1, scale: 1 }
                    }}
                  >
                    <p className="text-sm text-gray-600 mb-1">Jobs (Last 7 days)</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {profile.recent_jobs_7d}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      Affects fairness score
                    </p>
                  </motion.div>
                  <motion.div
                    className="p-4 bg-gray-50 rounded-lg border"
                    variants={{
                      hidden: { opacity: 0, scale: 0.95 },
                      visible: { opacity: 1, scale: 1 }
                    }}
                  >
                    <p className="text-sm text-gray-600 mb-1">Average Rating</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {profile.average_rating ? `${profile.average_rating}/5` : "—"}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      Ask: &ldquo;What&apos;s my average rating?&rdquo;
                    </p>
                  </motion.div>
                </motion.div>
              </div>

              {/* Availability */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">
                  Availability
                </h3>
                <div className="flex items-center gap-3">
                  <div
                    className={`w-4 h-4 rounded-full ${
                      profile.is_available ? "bg-green-500" : "bg-red-500"
                    }`}
                  />
                  <span className="text-gray-700">
                    {profile.is_available
                      ? "Available for Work"
                      : "Currently Unavailable"}
                  </span>
                </div>
                <p className="text-xs text-gray-400 mt-2">
                  Ask: &ldquo;Am I available?&rdquo;
                </p>
              </div>

              {/* Agent prompt hint */}
              <div className="bg-nelb-primary/5 border border-nelb-primary/20 rounded-lg p-4">
                <p className="text-sm font-medium text-nelb-primary mb-2">
                  💡 Everything above is queryable via the agent
                </p>
                <p className="text-sm text-gray-600">
                  Go to <Link href="/agent" className="text-nelb-primary underline">Talk to NELB</Link> and
                  ask anything about your profile. The agent reads from the same database — your skills,
                  reliability, job count, ratings, and availability are all accessible in natural language.
                </p>
              </div>
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">
              Could not load profile. Make sure the backend is running.
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link
            href="/employer"
            className="p-4 bg-white border rounded-lg hover:border-nelb-primary transition-colors"
          >
            <h3 className="font-semibold text-gray-900 mb-1">Find Workers</h3>
            <p className="text-sm text-gray-600">Post a job and hire others</p>
          </Link>
          <Link
            href="/worker"
            className="p-4 bg-white border rounded-lg hover:border-nelb-primary transition-colors"
          >
            <h3 className="font-semibold text-gray-900 mb-1">My Memory</h3>
            <p className="text-sm text-gray-600">Query your job history</p>
          </Link>
          <Link
            href="/agent"
            className="p-4 bg-white border rounded-lg hover:border-nelb-primary transition-colors"
          >
            <h3 className="font-semibold text-gray-900 mb-1">Talk to NELB</h3>
            <p className="text-sm text-gray-600">Ask questions naturally</p>
          </Link>
        </div>
      </main>
    </PageTransition>
  );
}
