"use client";

import { motion } from "motion/react";
import { useAuthStore } from "@/lib/auth";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { profileLookup, type ProfileResponse } from "@/lib/api";
import { MapPin, Mail, Star, Briefcase, TrendingUp, CheckCircle, XCircle } from "lucide-react";

export default function ProfilePage() {
  const { currentUser, isLoggedIn } = useAuthStore();
  const router = useRouter();
  const [profile, setProfile] = useState<ProfileResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isLoggedIn) router.push("/");
  }, [isLoggedIn, router]);

  useEffect(() => {
    if (!currentUser) return;
    profileLookup(currentUser.worker_id)
      .then((result) => {
        setProfile(result);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [currentUser]);

  if (!currentUser) return null;

  const stats = profile
    ? [
        { icon: TrendingUp, label: "Reliability", value: `${profile.reliability_score}%`, color: "text-nelb-primary" },
        { icon: Briefcase, label: "Total jobs", value: `${profile.total_jobs}`, color: "text-nelb-secondary" },
        { icon: Star, label: "Avg rating", value: profile.average_rating ? `${profile.average_rating}` : "—", color: "text-nelb-accent" },
        {
          icon: profile.is_available ? CheckCircle : XCircle,
          label: "Available",
          value: profile.is_available ? "Yes" : "No",
          color: profile.is_available ? "text-green-500" : "text-red-500",
        },
      ]
    : [];

  return (
    <div className="h-full overflow-y-auto scroll-area">
      <div className="max-w-2xl mx-auto px-6 py-10">
        {loading ? (
          <div className="text-center py-20 text-faint">Loading…</div>
        ) : profile ? (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="space-y-8"
          >
            {/* Identity */}
            <div className="glass rounded-3xl p-6 flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-nelb-primary to-nelb-violet grid place-items-center text-white text-2xl font-bold shadow-lg shadow-nelb-primary/30">
                {profile.name.charAt(0)}
              </div>
              <div className="min-w-0">
                <h1 className="text-2xl font-bold tracking-tight">{profile.name}</h1>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-sm text-muted">
                  <span className="flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5" /> {profile.email}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5" /> {profile.address}
                  </span>
                </div>
              </div>
            </div>

            {/* Skills */}
            <div>
              <h2 className="text-xs font-semibold text-faint uppercase tracking-wider mb-3">Skills</h2>
              <div className="flex flex-wrap gap-2">
                {profile.skills.map((skill) => (
                  <span key={skill} className="px-3.5 py-1.5 glass rounded-full text-sm font-medium text-foreground/90">
                    {skill.charAt(0).toUpperCase() + skill.slice(1)}
                  </span>
                ))}
              </div>
            </div>

            {/* Stats */}
            <div>
              <h2 className="text-xs font-semibold text-faint uppercase tracking-wider mb-3">Stats</h2>
              <motion.div
                className="grid grid-cols-2 sm:grid-cols-4 gap-3"
                initial="hidden"
                animate="visible"
                variants={{ visible: { transition: { staggerChildren: 0.06 } } }}
              >
                {stats.map((s) => {
                  const Icon = s.icon;
                  return (
                    <motion.div
                      key={s.label}
                      className="glass rounded-2xl p-4"
                      variants={{ hidden: { opacity: 0, scale: 0.95 }, visible: { opacity: 1, scale: 1 } }}
                    >
                      <Icon className={`w-4 h-4 mb-2 ${s.color}`} />
                      <p className="text-2xl font-bold">{s.value}</p>
                      <p className="text-xs text-muted mt-0.5">{s.label}</p>
                    </motion.div>
                  );
                })}
              </motion.div>
            </div>

            {/* Recent activity */}
            <div className="text-sm text-faint pt-4 border-t border-border">
              {profile.recent_jobs_7d > 0
                ? `${profile.recent_jobs_7d} job${profile.recent_jobs_7d > 1 ? "s" : ""} completed in the last 7 days`
                : "No jobs in the last 7 days"}
            </div>
          </motion.div>
        ) : (
          <div className="text-center py-20 text-faint">
            Could not load profile. Make sure the backend is running.
          </div>
        )}
      </div>
    </div>
  );
}
