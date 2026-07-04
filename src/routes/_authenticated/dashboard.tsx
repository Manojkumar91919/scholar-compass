import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/AppShell";
import { dashboardStats, getMyProfile, listAgentRuns, listReminders } from "@/lib/scholar.functions";
import { motion } from "framer-motion";
import { Bookmark, ClipboardList, Send, Trophy, Sparkles, ArrowRight, TrendingUp, CheckCircle2, Loader2, XCircle } from "lucide-react";
import { formatDistanceToNowStrict } from "date-fns";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — ScholarAI" }] }),
  component: DashboardPage,
});

function DashboardPage() {
  const navigate = useNavigate();
  const stats = useServerFn(dashboardStats);
  const profile = useServerFn(getMyProfile);
  const runs = useServerFn(listAgentRuns);
  const reminders = useServerFn(listReminders);

  const s = useQuery({ queryKey: ["dashStats"], queryFn: () => stats() });
  const p = useQuery({ queryKey: ["myProfile"], queryFn: () => profile() });
  const r = useQuery({ queryKey: ["runs"], queryFn: () => runs() });
  const remQ = useQuery({ queryKey: ["reminders"], queryFn: () => reminders() });

  const kpis = [
    { label: "Saved", value: s.data?.saved ?? 0, icon: Bookmark, color: "from-indigo-500/20 to-indigo-500/5" },
    { label: "In progress", value: s.data?.applying ?? 0, icon: ClipboardList, color: "from-teal-500/20 to-teal-500/5" },
    { label: "Submitted", value: s.data?.submitted ?? 0, icon: Send, color: "from-emerald-500/20 to-emerald-500/5" },
    { label: "Profile", value: `${p.data?.completion_pct ?? 0}%`, icon: Trophy, color: "from-amber-500/20 to-amber-500/5" },
  ];

  return (
    <AppShell>
      <div className="mb-8">
        <motion.h1 initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="font-display text-3xl md:text-4xl font-bold">
          Welcome{p.data?.full_name ? `, ${p.data.full_name.split(" ")[0]}` : ""}
        </motion.h1>
        <p className="text-muted-foreground mt-1">Your scholarship command center</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {kpis.map((k, i) => (
          <motion.div
            key={k.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06 }}
            className={`glass rounded-2xl p-5 bg-gradient-to-br ${k.color}`}
          >
            <div className="flex items-center justify-between">
              <k.icon className="w-5 h-5 text-primary" />
              <span className="text-xs text-muted-foreground">{k.label}</span>
            </div>
            <div className="text-3xl font-display font-bold mt-3">{k.value}</div>
          </motion.div>
        ))}
      </div>

      {(p.data?.completion_pct ?? 0) < 60 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="glass rounded-2xl p-5 border border-primary/30 mb-8 flex items-center gap-4"
        >
          <Sparkles className="w-8 h-8 text-primary shrink-0" />
          <div className="flex-1">
            <div className="font-medium">Complete your profile for better matches</div>
            <div className="text-sm text-muted-foreground">The agents match scholarships based on your degree, CGPA, target countries and skills.</div>
          </div>
          <button onClick={() => navigate({ to: "/profile" })} className="bg-brand text-white text-sm px-4 py-2 rounded-lg flex items-center gap-1">
            Complete <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </motion.div>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 glass rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-xl font-semibold">Recent applications</h2>
            <Link to="/tracker" className="text-xs text-primary hover:underline">View all →</Link>
          </div>
          {s.data?.upcoming?.length ? (
            <div className="space-y-2">
              {s.data.upcoming.map((a) => {
                const sch = a.scholarship as { id: string; title: string; deadline: string | null; provider: string } | null;
                if (!sch) return null;
                return (
                  <Link key={a.id} to="/scholarship/$id" params={{ id: sch.id }} className="flex items-center gap-3 p-3 rounded-lg hover:bg-white/5 transition">
                    <div className="w-2 h-2 rounded-full bg-primary" />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{sch.title}</div>
                      <div className="text-xs text-muted-foreground">{sch.provider} • {a.status}</div>
                    </div>
                    <div className="text-xs text-muted-foreground">{sch.deadline ?? "no deadline"}</div>
                  </Link>
                );
              })}
            </div>
          ) : (
            <EmptyState label="No applications yet" cta="Discover scholarships" to="/discover" />
          )}
        </div>

        <div className="glass rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-xl font-semibold">Agent runs</h2>
            <TrendingUp className="w-4 h-4 text-primary" />
          </div>
          {r.data?.length ? (
            <div className="space-y-2 max-h-72 overflow-auto">
              {r.data.slice(0, 8).map((run) => (
                <div key={run.id} className="flex items-center gap-2 text-sm p-2 rounded-lg hover:bg-white/5">
                  {run.status === "succeeded" ? <CheckCircle2 className="w-4 h-4 text-success" /> : run.status === "failed" ? <XCircle className="w-4 h-4 text-destructive" /> : <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
                  <span className="capitalize">{run.kind}</span>
                  <span className="ml-auto text-xs text-muted-foreground">{formatDistanceToNowStrict(new Date(run.started_at), { addSuffix: true })}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">Start a discovery run to see agent traces.</div>
          )}
        </div>
      </div>

      <div className="mt-6 glass rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-xl font-semibold">Upcoming reminders</h2>
          <Link to="/notifications" className="text-xs text-primary hover:underline">View all →</Link>
        </div>
        {remQ.data?.length ? (
          <div className="space-y-2">
            {remQ.data.slice(0, 5).map((rem) => (
              <div key={rem.id} className="flex items-center gap-3 p-3 rounded-lg bg-white/5">
                <div className="text-xs text-muted-foreground">{new Date(rem.remind_at).toLocaleDateString()}</div>
                <div className="text-sm">{rem.message}</div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-sm text-muted-foreground">Reminders will appear here as your deadlines approach.</div>
        )}
      </div>
    </AppShell>
  );
}

function EmptyState({ label, cta, to }: { label: string; cta: string; to: string }) {
  return (
    <div className="text-center py-8">
      <div className="text-sm text-muted-foreground mb-3">{label}</div>
      <Link to={to} className="inline-flex items-center gap-1 bg-brand text-white text-sm px-4 py-2 rounded-lg">
        {cta} <ArrowRight className="w-3.5 h-3.5" />
      </Link>
    </div>
  );
}
