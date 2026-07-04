import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AppShell } from "@/components/AppShell";
import { listChecklists, updateChecklist } from "@/lib/scholar.functions";
import { CheckCircle2, Circle, ListChecks } from "lucide-react";

export const Route = createFileRoute("/_authenticated/checklist")({
  head: () => ({ meta: [{ title: "Checklist — ScholarAI" }] }),
  component: ChecklistPage,
});

type Item = { id: string; label: string; category: string; priority: string; done: boolean; due_offset_days?: number };

function ChecklistPage() {
  const list = useServerFn(listChecklists);
  const update = useServerFn(updateChecklist);
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["checklists"], queryFn: () => list() });

  const mut = useMutation({
    mutationFn: (p: { id: string; items: Item[] }) => update({ data: p }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["checklists"] }),
  });

  return (
    <AppShell>
      <div className="mb-6">
        <h1 className="font-display text-3xl font-bold">Checklists</h1>
        <p className="text-muted-foreground text-sm">AI-generated per-application checklists. Toggle items to track your progress.</p>
      </div>
      {q.data?.length ? (
        <div className="space-y-6">
          {q.data.map((c) => {
            const items = (c.items as Item[]) ?? [];
            const done = items.filter((i) => i.done).length;
            const total = items.length;
            const sch = (c.application as { scholarship?: { id: string; title: string } } | null)?.scholarship;
            return (
              <div key={c.id} className="glass rounded-2xl p-5">
                <div className="flex items-center gap-2 mb-3">
                  <ListChecks className="w-4 h-4 text-primary" />
                  <div className="font-display text-lg font-semibold">
                    {sch ? <Link to="/scholarship/$id" params={{ id: sch.id }} className="hover:text-primary">{sch.title}</Link> : "Application"}
                  </div>
                  <div className="ml-auto text-xs text-muted-foreground">{done} / {total}</div>
                </div>
                <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden mb-3">
                  <div className="h-full bg-brand" style={{ width: `${total ? (done / total) * 100 : 0}%` }} />
                </div>
                <div className="space-y-1">
                  {items.map((it) => (
                    <button
                      key={it.id}
                      onClick={() => mut.mutate({ id: c.id, items: items.map((x) => x.id === it.id ? { ...x, done: !x.done } : x) })}
                      className="w-full flex items-center gap-3 py-1.5 text-left hover:bg-white/5 rounded px-2"
                    >
                      {it.done ? <CheckCircle2 className="w-4 h-4 text-success" /> : <Circle className="w-4 h-4 text-muted-foreground" />}
                      <span className={`text-sm ${it.done ? "line-through text-muted-foreground" : ""}`}>{it.label}</span>
                      <span className="ml-auto text-[10px] uppercase tracking-widest text-muted-foreground">{it.priority}</span>
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="glass rounded-2xl p-10 text-center">
          <p className="text-muted-foreground">No checklists yet. Open a scholarship and click "Generate application checklist".</p>
          <Link to="/discover" className="mt-4 inline-block bg-brand text-white px-4 py-2 rounded-lg text-sm">Browse scholarships</Link>
        </div>
      )}
    </AppShell>
  );
}
