import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { getMyProfile, updateMyProfile } from "@/lib/scholar.functions";
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({ meta: [{ title: "Profile — ScholarAI" }] }),
  component: ProfilePage,
});

const DEGREES = ["school", "undergraduate", "postgraduate", "phd", "postdoc"];

function ProfilePage() {
  const fetchP = useServerFn(getMyProfile);
  const updateP = useServerFn(updateMyProfile);
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["myProfile"], queryFn: () => fetchP() });

  const [form, setForm] = useState({
    full_name: "",
    country: "",
    degree_level: "undergraduate",
    field_of_study: "",
    university: "",
    graduation_year: "",
    cgpa: "",
    skills: "",
    achievements: "",
    work_years: "",
    target_countries: "",
    target_fields: "",
    bio: "",
  });

  useEffect(() => {
    if (q.data) {
      setForm({
        full_name: q.data.full_name ?? "",
        country: q.data.country ?? "",
        degree_level: q.data.degree_level ?? "undergraduate",
        field_of_study: q.data.field_of_study ?? "",
        university: q.data.university ?? "",
        graduation_year: q.data.graduation_year?.toString() ?? "",
        cgpa: q.data.cgpa?.toString() ?? "",
        skills: (q.data.skills ?? []).join(", "),
        achievements: q.data.achievements ?? "",
        work_years: q.data.work_years?.toString() ?? "",
        target_countries: (q.data.target_countries ?? []).join(", "),
        target_fields: (q.data.target_fields ?? []).join(", "),
        bio: q.data.bio ?? "",
      });
    }
  }, [q.data]);

  const save = useMutation({
    mutationFn: () =>
      updateP({
        data: {
          full_name: form.full_name || null,
          country: form.country || null,
          degree_level: form.degree_level,
          field_of_study: form.field_of_study || null,
          university: form.university || null,
          graduation_year: form.graduation_year ? Number(form.graduation_year) : null,
          cgpa: form.cgpa ? Number(form.cgpa) : null,
          skills: form.skills.split(",").map((s) => s.trim()).filter(Boolean),
          achievements: form.achievements || null,
          work_years: form.work_years ? Number(form.work_years) : 0,
          target_countries: form.target_countries.split(",").map((s) => s.trim()).filter(Boolean),
          target_fields: form.target_fields.split(",").map((s) => s.trim()).filter(Boolean),
          bio: form.bio || null,
        },
      }),
    onSuccess: () => {
      toast.success("Profile saved");
      qc.invalidateQueries({ queryKey: ["myProfile"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Save failed"),
  });

  return (
    <AppShell>
      <div className="mb-6">
        <h1 className="font-display text-3xl font-bold">Your profile</h1>
        <p className="text-muted-foreground text-sm">Better data = better matches. {q.data?.completion_pct ?? 0}% complete.</p>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          save.mutate();
        }}
        className="glass rounded-2xl p-6 grid md:grid-cols-2 gap-4"
      >
        <Field label="Full name"><input className={ipt} value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} /></Field>
        <Field label="Country"><input className={ipt} value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} /></Field>
        <Field label="Degree level">
          <select className={ipt} value={form.degree_level} onChange={(e) => setForm({ ...form, degree_level: e.target.value })}>
            {DEGREES.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
        </Field>
        <Field label="Field of study"><input className={ipt} value={form.field_of_study} onChange={(e) => setForm({ ...form, field_of_study: e.target.value })} /></Field>
        <Field label="University"><input className={ipt} value={form.university} onChange={(e) => setForm({ ...form, university: e.target.value })} /></Field>
        <Field label="Graduation year"><input type="number" className={ipt} value={form.graduation_year} onChange={(e) => setForm({ ...form, graduation_year: e.target.value })} /></Field>
        <Field label="CGPA (0-10)"><input type="number" step="0.1" min={0} max={10} className={ipt} value={form.cgpa} onChange={(e) => setForm({ ...form, cgpa: e.target.value })} /></Field>
        <Field label="Work experience (years)"><input type="number" className={ipt} value={form.work_years} onChange={(e) => setForm({ ...form, work_years: e.target.value })} /></Field>
        <Field label="Skills (comma-separated)" full><input className={ipt} value={form.skills} onChange={(e) => setForm({ ...form, skills: e.target.value })} placeholder="Python, ML, Public Speaking" /></Field>
        <Field label="Target countries (comma-separated)" full><input className={ipt} value={form.target_countries} onChange={(e) => setForm({ ...form, target_countries: e.target.value })} placeholder="USA, UK, Germany" /></Field>
        <Field label="Target fields (comma-separated)" full><input className={ipt} value={form.target_fields} onChange={(e) => setForm({ ...form, target_fields: e.target.value })} placeholder="AI, Computer Science, Public Policy" /></Field>
        <Field label="Achievements" full><textarea rows={3} className={ipt} value={form.achievements} onChange={(e) => setForm({ ...form, achievements: e.target.value })} /></Field>
        <Field label="Bio" full><textarea rows={3} className={ipt} value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} /></Field>

        <div className="md:col-span-2 flex justify-end">
          <button disabled={save.isPending} className="bg-brand text-white px-6 py-2.5 rounded-xl flex items-center gap-2 glow disabled:opacity-60">
            {save.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save profile
          </button>
        </div>
      </form>
    </AppShell>
  );
}

const ipt = "w-full bg-input/50 border border-border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/40";
function Field({ label, children, full }: { label: string; children: React.ReactNode; full?: boolean }) {
  return (
    <label className={`block ${full ? "md:col-span-2" : ""}`}>
      <div className="text-xs text-muted-foreground uppercase tracking-widest mb-1">{label}</div>
      {children}
    </label>
  );
}
