import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AppShell } from "@/components/AppShell";
import { listApplications, upsertApplication } from "@/lib/scholar.functions";

export const Route = createFileRoute("/_authenticated/tracker")({
  head: () => ({ meta: [{ title: "Tracker — ScholarAI" }] }),
  component: TrackerPage,
});

const STAGES = ["saved", "preparing", "ready", "redirected", "submitted", "under_review", "interview", "awarded", "rejected"] as const;
const LABELS: Record<string, string> = { saved: "Saved", preparing: "Preparing", ready: "Ready", redirected: "Redirected", submitted: "Submitted", under_review: "Under review", interview: "Interview", awarded: "Awarded", rejected: "Rejected" };

function TrackerPage() {
  const list = useServerFn(listApplications);
  const upsert = useServerFn(upsertApplication);
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["applications"], queryFn: () => list() });
  const mut = useMutation({
    mutationFn: (p: { scholarship_id: string; status: (typeof STAGES)[number] }) => upsert({ data: p }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["applications"] }),
  });

  return (
    <AppShell>
      <div className="mb-6">
        <h1 className="font-display text-3xl font-bold">Application tracker</h1>
        <p className="text-muted-foreground text-sm">9-stage kanban across every scholarship you're pursuing.</p>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        {STAGES.map((st) => {
          const items = (q.data ?? []).filter((a) => a.status === st);
          return (
            <div key={st} className="glass rounded-2xl p-3 min-h-[200px]">
              <div className="text-xs uppercase tracking-widest text-muted-foreground mb-2 px-1">{LABELS[st]} • {items.length}</div>
              <div className="space-y-2">
                {items.map((a) => {
                  const sch = a.scholarship as { id: string; title: string; provider: string; deadline: string | null } | null;
                  if (!sch) return null;
                  return (
                    <div key={a.id} className="glass rounded-lg p-3 border border-border/50">
                      <Link to="/scholarship/$id" params={{ id: sch.id }} className="text-sm font-medium hover:text-primary line-clamp-2">{sch.title}</Link>
                      <div className="text-xs text-muted-foreground">{sch.provider}</div>
                      <select
                        value={a.status}
                        onChange={(e) => mut.mutate({ scholarship_id: sch.id, status: e.target.value as never })}
                        className="mt-2 w-full text-xs bg-input/60 border border-border rounded px-2 py-1"
                      >
                        {STAGES.map((s) => <option key={s} value={s}>{LABELS[s]}</option>)}
                      </select>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </AppShell>
  );
}
