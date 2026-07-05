import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { listDocuments, reviewDocument } from "@/lib/scholar.functions";
import { extractTextFromFile } from "@/lib/pdf-extract";
import { Loader2, Sparkles, FileText, Upload } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/documents")({
  head: () => ({ meta: [{ title: "Documents — ScholarAI" }] }),
  component: DocsPage,
});

const KINDS = ["resume", "sop", "essay", "personal_statement", "recommendation", "transcript", "other"] as const;

function DocsPage() {
  const list = useServerFn(listDocuments);
  const review = useServerFn(reviewDocument);
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["docs"], queryFn: () => list() });
  const [title, setTitle] = useState("");
  const [kind, setKind] = useState<(typeof KINDS)[number]>("sop");
  const [text, setText] = useState("");
  const [selected, setSelected] = useState<string | null>(null);

  const mut = useMutation({
    mutationFn: () => review({ data: { title, kind, text } }),
    onSuccess: () => {
      toast.success("Review complete");
      qc.invalidateQueries({ queryKey: ["docs"] });
      setTitle(""); setText("");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  const active = q.data?.find((d) => d.id === selected) ?? q.data?.[0];
  const rev = active?.review as null | { score: number; grammar: number; ats: number; readability: number; strengths: string[]; weaknesses: string[]; suggestions: string[]; missing: string[] };

  return (
    <AppShell>
      <div className="mb-6">
        <h1 className="font-display text-3xl font-bold">Documents</h1>
        <p className="text-muted-foreground text-sm">Paste your resume, SOP, or essay. The Document Review Agent grades and gives actionable feedback.</p>
      </div>
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <div className="glass rounded-2xl p-5 space-y-3">
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Document title" className="w-full bg-input/50 border border-border rounded-lg px-3 py-2" />
            <select value={kind} onChange={(e) => setKind(e.target.value as never)} className="w-full bg-input/50 border border-border rounded-lg px-3 py-2">
              {KINDS.map((k) => <option key={k} value={k}>{k}</option>)}
            </select>
            <textarea value={text} onChange={(e) => setText(e.target.value)} rows={12} placeholder="Paste content (min 50 chars)…" className="w-full bg-input/50 border border-border rounded-lg px-3 py-2 font-mono text-sm" />
            <button onClick={() => mut.mutate()} disabled={mut.isPending || text.length < 50 || !title} className="bg-brand text-white px-4 py-2 rounded-lg glow flex items-center gap-2 disabled:opacity-50">
              {mut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              Review with AI
            </button>
          </div>

          {active && rev && (
            <div className="glass rounded-2xl p-6">
              <div className="flex items-center gap-2 mb-3">
                <FileText className="w-4 h-4 text-primary" />
                <div className="font-display text-lg font-semibold">{active.title}</div>
                <span className="ml-auto text-3xl font-display font-bold text-gradient">{rev.score}</span>
              </div>
              <div className="grid grid-cols-3 gap-3 text-center mb-4">
                <Metric label="Grammar" v={rev.grammar} />
                <Metric label="ATS" v={rev.ats} />
                <Metric label="Readability" v={rev.readability} />
              </div>
              <Block title="Strengths" items={rev.strengths} tone="success" />
              <Block title="Weaknesses" items={rev.weaknesses} tone="warning" />
              <Block title="Suggestions" items={rev.suggestions} tone="primary" />
              <Block title="Missing" items={rev.missing} tone="destructive" />
            </div>
          )}
        </div>
        <div className="glass rounded-2xl p-4">
          <div className="text-sm font-semibold mb-2">Your documents</div>
          {q.data?.length ? (
            <div className="space-y-1">
              {q.data.map((d) => (
                <button key={d.id} onClick={() => setSelected(d.id)} className={`w-full text-left px-3 py-2 rounded-lg text-sm ${(active?.id === d.id) ? "bg-primary/15 border border-primary/30" : "hover:bg-white/5"}`}>
                  <div className="truncate font-medium">{d.title}</div>
                  <div className="text-xs text-muted-foreground">{d.kind} • {d.score ?? "—"}</div>
                </button>
              ))}
            </div>
          ) : <div className="text-xs text-muted-foreground">No documents yet</div>}
        </div>
      </div>
    </AppShell>
  );
}
function Metric({ label, v }: { label: string; v: number }) {
  return <div className="glass rounded-lg p-3"><div className="text-xl font-bold">{v}</div><div className="text-xs text-muted-foreground">{label}</div></div>;
}
function Block({ title, items, tone }: { title: string; items: string[]; tone: "success" | "warning" | "primary" | "destructive" }) {
  if (!items?.length) return null;
  const cls = { success: "text-success", warning: "text-warning", primary: "text-primary", destructive: "text-destructive" }[tone];
  return (
    <div className="mt-3">
      <div className={`text-xs uppercase tracking-widest font-medium ${cls}`}>{title}</div>
      <ul className="mt-1 space-y-1 text-sm text-muted-foreground list-disc pl-5">{items.map((i) => <li key={i}>{i}</li>)}</ul>
    </div>
  );
}
