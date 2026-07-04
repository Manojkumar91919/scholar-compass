import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AppShell } from "@/components/AppShell";
import { analyzeEligibility, generateChecklist, getScholarship, listApplications, toggleSave, upsertApplication, listSaved } from "@/lib/scholar.functions";
import { ArrowLeft, ExternalLink, Sparkles, Loader2, Bookmark, CheckCircle2, AlertTriangle } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/scholarship/$id")({
  head: () => ({ meta: [{ title: "Scholarship — ScholarAI" }] }),
  component: ScholarshipPage,
});

const STATUSES = ["saved", "preparing", "ready", "redirected", "submitted", "under_review", "interview", "awarded", "rejected"] as const;

function ScholarshipPage() {
  const { id } = useParams({ from: "/_authenticated/scholarship/$id" });
  const fetchOne = useServerFn(getScholarship);
  const analyze = useServerFn(analyzeEligibility);
  const upsert = useServerFn(upsertApplication);
  const genList = useServerFn(generateChecklist);
  const toggle = useServerFn(toggleSave);
  const savedFn = useServerFn(listSaved);
  const apps = useServerFn(listApplications);
  const qc = useQueryClient();

  const scholarship = useQuery({ queryKey: ["scholarship", id], queryFn: () => fetchOne({ data: { id } }) });
  const saved = useQuery({ queryKey: ["saved"], queryFn: () => savedFn() });
  const applications = useQuery({ queryKey: ["applications"], queryFn: () => apps() });

  const [eligibility, setEligibility] = useState<null | { eligible: boolean; score: number; reasons?: string[]; gaps?: string[] }>(null);
  const isSaved = saved.data?.some((s) => s.scholarship_id === id);
  const app = applications.data?.find((a) => a.scholarship_id === id);

  const elMut = useMutation({
    mutationFn: () => analyze({ data: { scholarship_id: id } }),
    onSuccess: (r) => setEligibility(r),
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });
  const saveMut = useMutation({ mutationFn: () => toggle({ data: { scholarship_id: id } }), onSuccess: () => qc.invalidateQueries({ queryKey: ["saved"] }) });
  const statusMut = useMutation({
    mutationFn: (status: (typeof STATUSES)[number]) => upsert({ data: { scholarship_id: id, status } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["applications"] });
      toast.success("Status updated");
    },
  });
  const cListMut = useMutation({
    mutationFn: async () => {
      const application = app ?? (await upsert({ data: { scholarship_id: id, status: "preparing" } }));
      return await genList({ data: { application_id: application.id } });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["applications"] });
      toast.success("Checklist generated");
    },
  });

  if (scholarship.isLoading) return <AppShell><div className="glass rounded-2xl p-10 shimmer h-96" /></AppShell>;
  const s = scholarship.data;
  if (!s) return <AppShell><div>Not found. <Link to="/discover" className="text-primary">Back to discover</Link></div></AppShell>;

  return (
    <AppShell>
      <Link to="/discover" className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1 mb-4"><ArrowLeft className="w-3.5 h-3.5" /> Back to discover</Link>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="glass rounded-2xl p-6">
            <div className="text-sm text-primary">{s.provider} • {s.source}</div>
            <h1 className="font-display text-3xl font-bold mt-1">{s.title}</h1>
            <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
              <Info label="Country" value={s.country ?? "—"} />
              <Info label="Level" value={s.degree_level ?? "—"} />
              <Info label="Funding" value={s.funding_type ?? "—"} />
              <Info label="Deadline" value={s.deadline ?? "rolling"} />
            </div>
            {s.amount_usd && <div className="mt-4 text-sm">Approx. value: <span className="text-gradient font-semibold">${s.amount_usd.toLocaleString()}</span></div>}
          </div>

          <Section title="Summary">{s.summary}</Section>
          <Section title="Benefits">{s.benefits}</Section>
          <Section title="Eligibility">{s.eligibility}</Section>
          {s.required_documents?.length ? (
            <div className="glass rounded-2xl p-6">
              <div className="font-display text-lg font-semibold mb-3">Required documents</div>
              <div className="flex flex-wrap gap-2">
                {s.required_documents.map((d: string) => (
                  <span key={d} className="text-xs px-3 py-1 rounded-full bg-primary/10 text-primary border border-primary/20">{d}</span>
                ))}
              </div>
            </div>
          ) : null}
        </div>

        <div className="space-y-4">
          <div className="glass rounded-2xl p-5">
            {s.apply_url && (
              <a href={s.apply_url} target="_blank" rel="noopener noreferrer" className="w-full flex items-center justify-center gap-2 bg-brand text-white py-3 rounded-xl font-medium glow">
                Apply on official site <ExternalLink className="w-4 h-4" />
              </a>
            )}
            <button
              onClick={() => saveMut.mutate()}
              className={`mt-3 w-full flex items-center justify-center gap-2 py-2 rounded-xl border text-sm ${
                isSaved ? "bg-primary/20 border-primary/40 text-primary" : "border-border hover:bg-white/5"
              }`}
            >
              <Bookmark className={`w-4 h-4 ${isSaved ? "fill-primary" : ""}`} /> {isSaved ? "Saved" : "Save for later"}
            </button>

            <div className="mt-4 text-xs text-muted-foreground">Application status</div>
            <select
              value={app?.status ?? ""}
              onChange={(e) => statusMut.mutate(e.target.value as (typeof STATUSES)[number])}
              className="mt-1 w-full bg-input/60 border border-border rounded-lg px-3 py-2 text-sm"
            >
              <option value="" disabled>Choose status…</option>
              {STATUSES.map((st) => <option key={st} value={st}>{st.replace(/_/g, " ")}</option>)}
            </select>
          </div>

          <div className="glass rounded-2xl p-5">
            <div className="flex items-center justify-between">
              <div className="font-display font-semibold">Eligibility Agent</div>
              <Sparkles className="w-4 h-4 text-primary" />
            </div>
            <button
              onClick={() => elMut.mutate()}
              disabled={elMut.isPending}
              className="mt-3 w-full bg-white/5 hover:bg-white/10 border border-border rounded-lg py-2 text-sm flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {elMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4 text-primary" />}
              Analyze my eligibility
            </button>
            {eligibility && (
              <div className="mt-4 text-sm">
                <div className="flex items-center gap-2 mb-2">
                  {eligibility.eligible ? <CheckCircle2 className="w-4 h-4 text-success" /> : <AlertTriangle className="w-4 h-4 text-warning" />}
                  <span className="font-medium">{eligibility.eligible ? "Likely eligible" : "Gaps detected"}</span>
                  <span className="ml-auto text-xs px-2 py-0.5 rounded-full bg-primary/15 text-primary">{eligibility.score}%</span>
                </div>
                {(eligibility.reasons?.length ?? 0) > 0 && (
                  <ul className="space-y-1 text-xs text-muted-foreground list-disc pl-4">
                    {eligibility.reasons!.slice(0, 4).map((r) => <li key={r}>{r}</li>)}
                  </ul>
                )}
                {(eligibility.gaps?.length ?? 0) > 0 && (
                  <div className="mt-2 text-xs">
                    <div className="text-warning font-medium">Gaps</div>
                    <ul className="space-y-1 text-muted-foreground list-disc pl-4">
                      {eligibility.gaps!.slice(0, 4).map((g) => <li key={g}>{g}</li>)}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="glass rounded-2xl p-5">
            <div className="flex items-center justify-between">
              <div className="font-display font-semibold">Checklist Agent</div>
              <Sparkles className="w-4 h-4 text-primary" />
            </div>
            <button
              onClick={() => cListMut.mutate()}
              disabled={cListMut.isPending}
              className="mt-3 w-full bg-white/5 hover:bg-white/10 border border-border rounded-lg py-2 text-sm flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {cListMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4 text-primary" />}
              Generate application checklist
            </button>
            {cListMut.isSuccess && (
              <Link to="/checklist" className="mt-3 block text-center text-xs text-primary hover:underline">View checklist →</Link>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground uppercase tracking-widest">{label}</div>
      <div className="mt-1 capitalize">{value}</div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  if (!children) return null;
  return (
    <div className="glass rounded-2xl p-6">
      <div className="font-display text-lg font-semibold mb-2">{title}</div>
      <p className="text-sm text-muted-foreground whitespace-pre-wrap">{children}</p>
    </div>
  );
}
