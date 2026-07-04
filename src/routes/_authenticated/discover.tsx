import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { discoverScholarships, listScholarships, toggleSave, listSaved } from "@/lib/scholar.functions";
import { motion } from "framer-motion";
import { Search, Sparkles, Loader2, Bookmark, ExternalLink, Calendar, MapPin, GraduationCap } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/discover")({
  head: () => ({ meta: [{ title: "Discover — ScholarAI" }] }),
  component: DiscoverPage,
});

function DiscoverPage() {
  const list = useServerFn(listScholarships);
  const discover = useServerFn(discoverScholarships);
  const toggle = useServerFn(toggleSave);
  const saved = useServerFn(listSaved);
  const qc = useQueryClient();

  const [query, setQuery] = useState("");
  const [aiResults, setAiResults] = useState<Array<{ id: string; match_score: number; rationale: string; urgency: string }> | null>(null);

  const items = useQuery({ queryKey: ["scholarships"], queryFn: () => list() });
  const savedQ = useQuery({ queryKey: ["saved"], queryFn: () => saved() });
  const savedIds = new Set(savedQ.data?.map((s) => s.scholarship_id) ?? []);

  const runAi = useMutation({
    mutationFn: (q: string) => discover({ data: { query: q } }),
    onSuccess: (r) => {
      setAiResults(
        r.ranked.map((s) => ({
          id: s.id,
          match_score: s.match_score,
          rationale: s.rationale,
          urgency: s.urgency,
        })),
      );
      toast.success(`Found ${r.ranked.length} matches`);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "AI discovery failed"),
  });

  const saveMut = useMutation({
    mutationFn: (id: string) => toggle({ data: { scholarship_id: id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["saved"] }),
  });

  const rankedIds = new Set(aiResults?.map((r) => r.id));
  const rankedMap = new Map(aiResults?.map((r) => [r.id, r]));
  const displayed = aiResults
    ? (items.data ?? [])
        .filter((s) => rankedIds.has(s.id))
        .sort((a, b) => (rankedMap.get(b.id)?.match_score ?? 0) - (rankedMap.get(a.id)?.match_score ?? 0))
    : items.data ?? [];

  return (
    <AppShell>
      <div className="mb-6">
        <h1 className="font-display text-3xl md:text-4xl font-bold">Discover scholarships</h1>
        <p className="text-muted-foreground mt-1">Search 30+ curated scholarships or let the AI supervisor find your best matches.</p>
      </div>

      <div className="glass rounded-2xl p-4 mb-6">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!query.trim()) return;
            runAi.mutate(query);
          }}
          className="flex flex-col md:flex-row gap-3"
        >
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="e.g. STEM postgrad in Germany, need-based, women in tech..."
              className="w-full pl-10 pr-4 py-3 bg-input/50 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>
          <button
            type="submit"
            disabled={runAi.isPending}
            className="bg-brand text-white px-6 py-3 rounded-xl font-medium flex items-center justify-center gap-2 glow disabled:opacity-60"
          >
            {runAi.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            AI Match
          </button>
          {aiResults && (
            <button
              type="button"
              onClick={() => {
                setAiResults(null);
                setQuery("");
              }}
              className="glass px-4 py-3 rounded-xl text-sm"
            >
              Clear AI
            </button>
          )}
        </form>
        {aiResults && (
          <div className="mt-3 text-xs text-muted-foreground flex items-center gap-2">
            <Sparkles className="w-3 h-3 text-primary" />
            Supervisor → Search → Ranking. Showing top {aiResults.length} matches with explainable scores.
          </div>
        )}
      </div>

      {items.isLoading ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="glass rounded-2xl p-5 h-52 shimmer" />
          ))}
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {displayed.map((s, i) => {
            const rank = rankedMap.get(s.id);
            const isSaved = savedIds.has(s.id);
            return (
              <motion.div
                key={s.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                className="glass rounded-2xl p-5 flex flex-col hover:border-primary/40 transition"
              >
                {rank && (
                  <div className="flex items-center justify-between mb-3">
                    <div className="text-xs font-mono bg-primary/15 border border-primary/30 text-primary px-2 py-0.5 rounded-full">
                      {rank.match_score}% match
                    </div>
                    <div className={`text-xs px-2 py-0.5 rounded-full ${
                      rank.urgency === "high" ? "bg-destructive/20 text-destructive" : rank.urgency === "medium" ? "bg-warning/20 text-warning" : "bg-muted"
                    }`}>
                      {rank.urgency} urgency
                    </div>
                  </div>
                )}
                <Link to="/scholarship/$id" params={{ id: s.id }} className="font-display text-lg font-semibold leading-tight hover:text-primary transition">
                  {s.title}
                </Link>
                <div className="text-xs text-muted-foreground mt-1">{s.provider}</div>
                <p className="text-sm text-muted-foreground mt-3 line-clamp-2">{s.summary}</p>
                {rank?.rationale && (
                  <div className="mt-3 text-xs bg-primary/10 border border-primary/20 rounded-lg p-2 text-primary-foreground/90">
                    <Sparkles className="w-3 h-3 inline mr-1 text-primary" />{rank.rationale}
                  </div>
                )}
                <div className="mt-4 flex flex-wrap gap-2 text-xs text-muted-foreground">
                  {s.country && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{s.country}</span>}
                  {s.degree_level && <span className="flex items-center gap-1"><GraduationCap className="w-3 h-3" />{s.degree_level}</span>}
                  {s.deadline && <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{s.deadline}</span>}
                </div>
                <div className="mt-4 flex items-center gap-2">
                  <button
                    onClick={() => saveMut.mutate(s.id)}
                    className={`flex-1 flex items-center justify-center gap-1 py-2 rounded-lg text-sm border transition ${
                      isSaved ? "bg-primary/20 border-primary/40 text-primary" : "border-border hover:bg-white/5"
                    }`}
                  >
                    <Bookmark className={`w-3.5 h-3.5 ${isSaved ? "fill-primary" : ""}`} /> {isSaved ? "Saved" : "Save"}
                  </button>
                  {s.apply_url && (
                    <a href={s.apply_url} target="_blank" rel="noopener noreferrer" className="bg-brand text-white px-3 py-2 rounded-lg text-sm flex items-center gap-1">
                      Apply <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </AppShell>
  );
}
