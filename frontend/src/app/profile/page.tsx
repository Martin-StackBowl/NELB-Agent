"use client";

import { motion } from "motion/react";
import { useAuthStore } from "@/lib/auth";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { profileLookup, type ProfileResponse } from "@/lib/api";
import { MapPin, Mail, Star, Briefcase, TrendingUp, CheckCircle, XCircle } from "lucide-react";
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
      <div className="max-w-2xl mx-auto px-6 py-10">
        {loading ? (
          <div className="text-center py-20 text-gray-400">Loading...</div>
        ) : profile ? (
          <div className="space-y-8">
            {/* Identity */}
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-nelb-primary/10 flex items-center justify-center">
                <span className="text-2xl font-bold text-nelb-primary">
                  {profile.name.charAt(0)}
                </span>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{profile.name}</h1>
                <div className="flex items-center gap-3 mt-1 text-sm text-gray-500">
                  <span className="flex items-center gap-1">
                    <Mail className="w-3.5 h-3.5" />
                    {profile.email}
                  </span>
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5" />
                    {profile.address}
                  </span>
                </div>
              </div>
            </div>

            {/* Skills */}
            <div>
              <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-3">Skills</h2>
              <div className="flex flex-wrap gap-2">
                {profile.skills.map((skill) => (
                  <span
                    key={skill}
                    className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-full text-sm font-medium"
                  >
                    {skill.charAt(0).toUpperCase() + skill.slice(1)}
                  </span>
                ))}
              </div>
            </div>

            {/* Stats */}
            <div>
              <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-3">Stats</h2>
              <motion.div
                className="grid grid-cols-2 sm:grid-cols-4 gap-3"
                initial="hidden"
                animate="visible"
                variants={{ visible: { transition: { staggerChildren: 0.06 } } }}
              >
                <motion.div
                  className="p-4 rounded-xl bg-white border border-gray-200"
                  variants={{ hidden: { opacity: 0, scale: 0.95 }, visible: { opacity: 1, scale: 1 } }}
                >
                  <TrendingUp className="w-4 h-4 text-nelb-primary mb-2" />
                  <p className="text-2xl font-bold text-gray-900">{profile.reliability_score}%</p>
                  <p className="text-xs text-gray-500 mt-0.5">Reliability</p>
                </motion.div>
                <motion.div
                  className="p-4 rounded-xl bg-white border border-gray-200"
                  variants={{ hidden: { opacity: 0, scale: 0.95 }, visible: { opacity: 1, scale: 1 } }}
                >
                  <Briefcase className="w-4 h-4 text-nelb-secondary mb-2" />
                  <p className="text-2xl font-bold text-gray-900">{profile.total_jobs}</p>
                  <p className="text-xs text-gray-500 mt-0.5">Total jobs</p>
                </motion.div>
                <motion.div
                  className="p-4 rounded-xl bg-white border border-gray-200"
                  variants={{ hidden: { opacity: 0, scale: 0.95 }, visible: { opacity: 1, scale: 1 } }}
                >
                  <Star className="w-4 h-4 text-nelb-accent mb-2" />
                  <p className="text-2xl font-bold text-gray-900">
                    {profile.average_rating ? profile.average_rating : "—"}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">Avg rating</p>
                </motion.div>
                <motion.div
                  className="p-4 rounded-xl bg-white border border-gray-200"
                  variants={{ hidden: { opacity: 0, scale: 0.95 }, visible: { opacity: 1, scale: 1 } }}
                >
                  {profile.is_available ? (
                    <CheckCircle className="w-4 h-4 text-green-500 mb-2" />
                  ) : (
                    <XCircle className="w-4 h-4 text-red-500 mb-2" />
                  )}
                  <p className="text-2xl font-bold text-gray-900">
                    {profile.is_available ? "Yes" : "No"}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">Available</p>
                </motion.div>
              </motion.div>
            </div>

            {/* Recent activity hint */}
            <div className="text-sm text-gray-400 pt-4 border-t border-gray-100">
              {profile.recent_jobs_7d > 0
                ? `${profile.recent_jobs_7d} job${profile.recent_jobs_7d > 1 ? "s" : ""} completed in the last 7 days`
                : "No jobs in the last 7 days"
              }
            </div>
          </div>
        ) : (
          <div className="text-center py-20 text-gray-400">
            Could not load profile. Make sure the backend is running.
          </div>
        )}
      </div>
    </PageTransition>
  );
}
