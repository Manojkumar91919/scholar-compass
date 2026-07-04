import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/AppShell";
import { listReminders, listAgentRuns } from "@/lib/scholar.functions";
import { Bell, Sparkles } from "lucide-react";
import { formatDistanceToNowStrict } from "date-fns";

export const Route = createFileRoute("/_authenticated/notifications")({
  head: () => ({ meta: [{ title: "Notifications — ScholarAI" }] }),
  component: NotifPage,
});

function NotifPage() {
  const rems = useServerFn(listReminders);
  const runs = useServerFn(listAgentRuns);
  const r = useQuery({ queryKey: ["reminders"], queryFn: () => rems() });
  const ar = useQuery({ queryKey: ["runs"], queryFn: () => runs() });
  return (
    <AppShell>
      <div className="mb-6">
        <h1 className="font-display text-3xl font-bold">Notifications</h1>
        <p className="text-muted-foreground text-sm">Reminders + AI agent activity log.</p>
      </div>
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="glass rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-3"><Bell className="w-4 h-4 text-primary" /><div className="font-display font-semibold">Reminders</div></div>
          {r.data?.length ? r.data.map((rem) => (
            <div key={rem.id} className="text-sm py-2 border-b border-border/30 last:border-0">
              <div>{rem.message}</div>
              <div className="text-xs text-muted-foreground">{formatDistanceToNowStrict(new Date(rem.remind_at), { addSuffix: true })}</div>
            </div>
          )) : <div className="text-sm text-muted-foreground">No reminders yet.</div>}
        </div>
        <div className="glass rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-3"><Sparkles className="w-4 h-4 text-primary" /><div className="font-display font-semibold">Recent AI runs</div></div>
          {ar.data?.length ? ar.data.map((run) => (
            <div key={run.id} className="text-sm py-2 border-b border-border/30 last:border-0 flex items-center justify-between">
              <div>
                <div className="capitalize">{run.kind}</div>
                <div className="text-xs text-muted-foreground">{run.status}</div>
              </div>
              <div className="text-xs text-muted-foreground">{formatDistanceToNowStrict(new Date(run.started_at), { addSuffix: true })}</div>
            </div>
          )) : <div className="text-sm text-muted-foreground">No runs yet.</div>}
        </div>
      </div>
    </AppShell>
  );
}
