import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/AppShell";
import { listApplications, listSaved } from "@/lib/scholar.functions";
import { differenceInDays, format } from "date-fns";
import { CalendarClock } from "lucide-react";

export const Route = createFileRoute("/_authenticated/deadlines")({
  head: () => ({ meta: [{ title: "Deadlines — ScholarAI" }] }),
  component: DeadlinesPage,
});

function DeadlinesPage() {
  const apps = useServerFn(listApplications);
  const saved = useServerFn(listSaved);
  const a = useQuery({ queryKey: ["applications"], queryFn: () => apps() });
  const s = useQuery({ queryKey: ["saved"], queryFn: () => saved() });

  type Row = { id: string; title: string; deadline: string; source: string };
  const rows: Row[] = [];
  for (const app of a.data ?? []) {
    const sch = (app.scholarship as { id: string; title: string; deadline: string | null } | null);
    if (sch?.deadline) rows.push({ id: sch.id, title: sch.title, deadline: sch.deadline, source: `Application • ${app.status}` });
  }
  for (const sv of s.data ?? []) {
    const sch = (sv.scholarship as { id: string; title: string; deadline: string | null } | null);
    if (sch?.deadline && !rows.some((r) => r.id === sch.id)) rows.push({ id: sch.id, title: sch.title, deadline: sch.deadline, source: "Saved" });
  }
  rows.sort((x, y) => new Date(x.deadline).getTime() - new Date(y.deadline).getTime());
  const today = new Date();

  return (
    <AppShell>
      <div className="mb-6">
        <h1 className="font-display text-3xl font-bold">Deadlines</h1>
        <p className="text-muted-foreground text-sm">All your saved and in-progress scholarships, sorted by urgency.</p>
      </div>
      {rows.length ? (
        <div className="glass rounded-2xl p-2">
          {rows.map((r) => {
            const days = differenceInDays(new Date(r.deadline), today);
            const tone = days < 0 ? "text-muted-foreground line-through" : days < 14 ? "text-destructive" : days < 45 ? "text-warning" : "text-success";
            return (
              <Link key={r.id} to="/scholarship/$id" params={{ id: r.id }} className="flex items-center gap-4 p-3 rounded-xl hover:bg-white/5">
                <CalendarClock className="w-5 h-5 text-primary" />
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{r.title}</div>
                  <div className="text-xs text-muted-foreground">{r.source}</div>
                </div>
                <div className="text-right">
                  <div className="text-sm">{format(new Date(r.deadline), "PP")}</div>
                  <div className={`text-xs ${tone}`}>{days < 0 ? `${Math.abs(days)}d ago` : `${days}d left`}</div>
                </div>
              </Link>
            );
          })}
        </div>
      ) : (
        <div className="glass rounded-2xl p-10 text-center text-muted-foreground">Save or start applying to scholarships to see deadlines here.</div>
      )}
    </AppShell>
  );
}
