import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/AppShell";
import { embedScholarships, listAgentRuns } from "@/lib/scholar.functions";
import { Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({ meta: [{ title: "Admin — ScholarAI" }] }),
  component: AdminPage,
});

function AdminPage() {
  const embed = useServerFn(embedScholarships);
  const runs = useServerFn(listAgentRuns);
  const r = useQuery({ queryKey: ["adminRuns"], queryFn: () => runs() });
  const mut = useMutation({
    mutationFn: () => embed(),
    onSuccess: (d) => toast.success(`Embedded ${d.embedded} scholarships`),
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed. Are you an admin?"),
  });
  return (
    <AppShell>
      <div className="mb-6">
        <h1 className="font-display text-3xl font-bold">Admin</h1>
        <p className="text-muted-foreground text-sm">Ingestion, embeddings, and agent activity.</p>
      </div>
      <div className="glass rounded-2xl p-6 mb-6 max-w-xl">
        <div className="font-semibold mb-2">Embed scholarships for RAG</div>
        <p className="text-sm text-muted-foreground mb-4">Populates pgvector embeddings for the top 50 scholarships without embeddings. Runs Gemini embeddings via Lovable AI Gateway.</p>
        <button onClick={() => mut.mutate()} disabled={mut.isPending} className="bg-brand text-white px-4 py-2 rounded-lg flex items-center gap-2 disabled:opacity-60">
          {mut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
          Run embedding job
        </button>
      </div>
      <div className="glass rounded-2xl p-6">
        <div className="font-semibold mb-3">Recent agent runs (your account)</div>
        <table className="w-full text-sm">
          <thead className="text-xs text-muted-foreground uppercase tracking-widest">
            <tr><th className="text-left py-2">Kind</th><th className="text-left">Status</th><th className="text-left">Started</th></tr>
          </thead>
          <tbody>
            {(r.data ?? []).map((run) => (
              <tr key={run.id} className="border-t border-border/30">
                <td className="py-2 capitalize">{run.kind}</td>
                <td className="capitalize">{run.status}</td>
                <td>{new Date(run.started_at).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AppShell>
  );
}
