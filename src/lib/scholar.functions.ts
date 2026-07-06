import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import {
  chatAgent,
  checklistAgent,
  discoverPipeline,
  docReviewAgent,
  eligibilityAgent,
  type Profile,
  type Scholarship,
} from "@/lib/agents/orchestrator";
import { embed, requireApiKey } from "@/lib/ai-gateway.server";

// ============================================================
// PROFILE
// ============================================================
export const getMyProfile = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("profiles")
      .select("*")
      .eq("user_id", context.userId)
      .maybeSingle();
    if (error) throw error;
    return data;
  });

const ProfileUpdate = z.object({
  full_name: z.string().nullable().optional(),
  country: z.string().nullable().optional(),
  degree_level: z.string().nullable().optional(),
  field_of_study: z.string().nullable().optional(),
  university: z.string().nullable().optional(),
  graduation_year: z.number().nullable().optional(),
  cgpa: z.number().nullable().optional(),
  skills: z.array(z.string()).optional(),
  achievements: z.string().nullable().optional(),
  work_years: z.number().nullable().optional(),
  target_countries: z.array(z.string()).optional(),
  target_fields: z.array(z.string()).optional(),
  bio: z.string().nullable().optional(),
});
export const updateMyProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => ProfileUpdate.parse(input))
  .handler(async ({ data, context }) => {
    // completion
    const filled = Object.values(data).filter((v) => v != null && v !== "" && !(Array.isArray(v) && v.length === 0)).length;
    const total = Object.keys(ProfileUpdate.shape).length;
    const completion_pct = Math.round((filled / total) * 100);

    const { data: row, error } = await context.supabase
      .from("profiles")
      .update({ ...data, completion_pct, degree_level: (data.degree_level as never) ?? undefined })
      .eq("user_id", context.userId)
      .select("*")
      .single();
    if (error) throw error;
    return row;
  });

// ============================================================
// SCHOLARSHIPS
// ============================================================
export const listScholarships = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) => z.object({ q: z.string().optional(), country: z.string().optional() }).parse(input ?? {}))
  .handler(async ({ data }) => {
    const { createClient } = await import("@supabase/supabase-js");
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_PUBLISHABLE_KEY!,
      { auth: { persistSession: false, autoRefreshToken: false } },
    );
    let q = supabase.from("scholarships").select("*").eq("is_active", true).limit(60);
    if (data.q) q = q.or(`title.ilike.%${data.q}%,summary.ilike.%${data.q}%`);
    if (data.country) q = q.eq("country", data.country);
    const { data: rows, error } = await q.order("deadline", { ascending: true, nullsFirst: false });
    if (error) throw error;
    return rows;
  });

export const getScholarship = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) => z.object({ id: z.string() }).parse(input))
  .handler(async ({ data }) => {
    const { createClient } = await import("@supabase/supabase-js");
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_PUBLISHABLE_KEY!,
      { auth: { persistSession: false, autoRefreshToken: false } },
    );
    const { data: row, error } = await supabase.from("scholarships").select("*").eq("id", data.id).maybeSingle();
    if (error) throw error;
    return row;
  });

// ============================================================
// SAVES / APPLICATIONS
// ============================================================
export const toggleSave = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ scholarship_id: z.string() }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: existing } = await context.supabase
      .from("saved_scholarships")
      .select("id")
      .eq("user_id", context.userId)
      .eq("scholarship_id", data.scholarship_id)
      .maybeSingle();
    if (existing) {
      await context.supabase.from("saved_scholarships").delete().eq("id", existing.id);
      return { saved: false };
    }
    await context.supabase
      .from("saved_scholarships")
      .insert({ user_id: context.userId, scholarship_id: data.scholarship_id });
    return { saved: true };
  });

export const listSaved = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("saved_scholarships")
      .select("*, scholarship:scholarships(*)")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data;
  });

export const listApplications = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("applications")
      .select("*, scholarship:scholarships(*)")
      .eq("user_id", context.userId)
      .order("updated_at", { ascending: false });
    if (error) throw error;
    return data;
  });

const ApplicationUpsert = z.object({
  scholarship_id: z.string(),
  status: z.enum([
    "saved", "preparing", "ready", "redirected", "submitted", "under_review", "interview", "awarded", "rejected",
  ]),
  notes: z.string().optional(),
});
export const upsertApplication = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => ApplicationUpsert.parse(input))
  .handler(async ({ data, context }) => {
    const { data: existing } = await context.supabase
      .from("applications")
      .select("id, timeline, status")
      .eq("user_id", context.userId)
      .eq("scholarship_id", data.scholarship_id)
      .maybeSingle();
    const now = new Date().toISOString();
    const timeline = [
      ...((existing?.timeline as Array<{ status: string; at: string }> | null) ?? []),
      { status: data.status, at: now },
    ];
    if (existing) {
      const { data: row, error } = await context.supabase
        .from("applications")
        .update({ status: data.status, notes: data.notes ?? null, timeline: timeline as never, submitted_at: data.status === "submitted" ? now : undefined })
        .eq("id", existing.id)
        .select("*")
        .single();
      if (error) throw error;
      return row;
    } else {
      const { data: row, error } = await context.supabase
        .from("applications")
        .insert({
          user_id: context.userId,
          scholarship_id: data.scholarship_id,
          status: data.status,
          notes: data.notes ?? null,
          timeline: timeline as never,
          submitted_at: data.status === "submitted" ? now : null,
        })
        .select("*")
        .single();
      if (error) throw error;
      return row;
    }
  });

// ============================================================
// AI: DISCOVERY (SUPERVISOR PIPELINE)
// ============================================================
export const discoverScholarships = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ query: z.string().min(1) }).parse(input))
  .handler(async ({ data, context }) => {
    return await discoverPipeline(context.supabase, context.userId, data.query);
  });

// ============================================================
// AI: CHAT
// ============================================================
export const aiChat = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        messages: z.array(z.object({ role: z.enum(["user", "assistant"]), content: z.string() })),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    return await chatAgent(context.supabase, context.userId, data.messages);
  });

// ============================================================
// AI: ELIGIBILITY
// ============================================================
export const analyzeEligibility = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ scholarship_id: z.string() }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: sch, error } = await context.supabase.from("scholarships").select("*").eq("id", data.scholarship_id).single();
    if (error || !sch) throw error ?? new Error("Scholarship not found");
    const { data: profile } = await context.supabase.from("profiles").select("*").eq("user_id", context.userId).maybeSingle();
    // create run
    const { data: run } = await context.supabase
      .from("agent_runs")
      .insert({ user_id: context.userId, kind: "eligibility" as never, input: { scholarship_id: data.scholarship_id } as never })
      .select("id")
      .single();
    const result = await eligibilityAgent(context.supabase, run!.id, (profile ?? {}) as Profile, sch as unknown as Scholarship);
    await context.supabase.from("agent_runs").update({ status: "succeeded", output: result as never, finished_at: new Date().toISOString() }).eq("id", run!.id);
    return result;
  });

// ============================================================
// AI: DOCUMENT REVIEW
// ============================================================
export const reviewDocument = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        title: z.string(),
        kind: z.enum(["resume", "sop", "essay", "personal_statement", "recommendation", "transcript", "other"]),
        text: z.string().min(50),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { data: run } = await context.supabase
      .from("agent_runs")
      .insert({ user_id: context.userId, kind: "doc_review" as never, input: { title: data.title, kind: data.kind } as never })
      .select("id")
      .single();
    const review = await docReviewAgent(context.supabase, run!.id, data.kind, data.text);
    const { data: doc, error } = await context.supabase
      .from("documents")
      .insert({
        user_id: context.userId,
        kind: data.kind,
        title: data.title,
        extracted_text: data.text,
        review: review as never,
        score: review.score,
      })
      .select("*")
      .single();
    if (error) throw error;
    await context.supabase.from("agent_runs").update({ status: "succeeded", output: { doc_id: doc.id } as never, finished_at: new Date().toISOString() }).eq("id", run!.id);

    // Auto-analyze profile from resume uploads
    if (data.kind === "resume") {
      try {
        await analyzeResumeInternal(context.supabase, context.userId, data.text);
      } catch {
        /* profile analysis is best-effort; review already succeeded */
      }
    }
    return doc;
  });

// ------- Resume → Profile auto-analysis -------
async function analyzeResumeInternal(
  supabase: Awaited<ReturnType<typeof getSb>>,
  userId: string,
  text: string,
) {
  const { generateText } = await import("ai");
  const { createLovableAiGatewayProvider, DEFAULT_CHAT_MODEL, requireApiKey } = await import(
    "@/lib/ai-gateway.server"
  );
  const { RESUME_EXTRACT_SYSTEM } = await import("@/lib/agents/prompts");
  const gateway = createLovableAiGatewayProvider(requireApiKey());
  const model = gateway(DEFAULT_CHAT_MODEL);
  const { text: out } = await generateText({
    model,
    system: `${RESUME_EXTRACT_SYSTEM}\n\nRespond with ONLY valid JSON, no prose, no markdown fences.`,
    prompt: `Resume text:\n\n${text.slice(0, 12000)}`,
  });
  const cleaned = out.trim().replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "");
  let parsed: Record<string, unknown> = {};
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    const m = cleaned.match(/\{[\s\S]*\}/);
    if (!m) return null;
    parsed = JSON.parse(m[0]);
  }

  // Merge with existing profile — never wipe good data with nulls.
  const { data: existing } = await supabase.from("profiles").select("*").eq("user_id", userId).maybeSingle();
  const merge = <T,>(next: T | null | undefined, prev: T | null | undefined) =>
    next === null || next === undefined || next === "" ? prev : next;
  const patch = {
    full_name: merge(parsed.full_name as string | null, existing?.full_name),
    country: merge(parsed.country as string | null, existing?.country),
    degree_level: merge(parsed.degree_level as string | null, existing?.degree_level),
    field_of_study: merge(parsed.field_of_study as string | null, existing?.field_of_study),
    university: merge(parsed.university as string | null, existing?.university),
    graduation_year: merge(parsed.graduation_year as number | null, existing?.graduation_year),
    cgpa: merge(parsed.cgpa as number | null, existing?.cgpa),
    skills: Array.isArray(parsed.skills) && parsed.skills.length
      ? Array.from(new Set([...(existing?.skills ?? []), ...(parsed.skills as string[])]))
      : existing?.skills,
    achievements: merge(parsed.achievements as string | null, existing?.achievements),
    work_years: merge(parsed.work_years as number | null, existing?.work_years),
    bio: merge(parsed.bio as string | null, existing?.bio),
  };
  const values = Object.values(patch);
  const filled = values.filter((v) => v != null && v !== "" && !(Array.isArray(v) && v.length === 0)).length;
  const completion_pct = Math.round((filled / values.length) * 100);

  await supabase
    .from("profiles")
    .update({ ...(patch as never), completion_pct })
    .eq("user_id", userId);
  return patch;
}

async function getSb() {
  // helper type-only shim
  return null as unknown as import("@supabase/supabase-js").SupabaseClient<
    import("@/integrations/supabase/types").Database
  >;
}

export const analyzeResume = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ text: z.string().min(50) }).parse(input))
  .handler(async ({ data, context }) => {
    const patch = await analyzeResumeInternal(context.supabase, context.userId, data.text);
    return { ok: true, patch };
  });

export const listDocuments = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("documents")
      .select("*")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data;
  });

// ============================================================
// CHECKLIST
// ============================================================
export const generateChecklist = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ application_id: z.string() }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: app, error } = await context.supabase
      .from("applications")
      .select("*, scholarship:scholarships(*)")
      .eq("id", data.application_id)
      .eq("user_id", context.userId)
      .single();
    if (error || !app) throw error ?? new Error("Application not found");
    const { data: profile } = await context.supabase.from("profiles").select("*").eq("user_id", context.userId).maybeSingle();

    const { data: run } = await context.supabase
      .from("agent_runs")
      .insert({ user_id: context.userId, kind: "checklist" as never, input: { application_id: data.application_id } as never })
      .select("id")
      .single();
    const items = await checklistAgent(context.supabase, run!.id, (profile ?? {}) as Profile, (app.scholarship as unknown) as Scholarship);

    const { data: checklist, error: cerr } = await context.supabase
      .from("checklists")
      .upsert(
        { application_id: data.application_id, user_id: context.userId, items: items as never },
        { onConflict: "application_id" },
      )
      .select("*")
      .single();
    if (cerr) throw cerr;
    await context.supabase.from("agent_runs").update({ status: "succeeded", output: { count: items.length } as never, finished_at: new Date().toISOString() }).eq("id", run!.id);
    return checklist;
  });

export const listChecklists = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("checklists")
      .select("*, application:applications(*, scholarship:scholarships(id, title, deadline, apply_url))")
      .eq("user_id", context.userId);
    if (error) throw error;
    return data;
  });

export const updateChecklist = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string(), items: z.array(z.any()) }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("checklists")
      .update({ items: data.items as never })
      .eq("id", data.id)
      .eq("user_id", context.userId);
    if (error) throw error;
    return { ok: true };
  });

// ============================================================
// REMINDERS / NOTIFICATIONS
// ============================================================
export const listReminders = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("reminders")
      .select("*, scholarship:scholarships(id, title, deadline, apply_url)")
      .eq("user_id", context.userId)
      .order("remind_at", { ascending: true });
    if (error) throw error;
    return data;
  });

export const markReminderRead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string() }).parse(input))
  .handler(async ({ data, context }) => {
    await context.supabase.from("reminders").update({ read_at: new Date().toISOString() }).eq("id", data.id).eq("user_id", context.userId);
    return { ok: true };
  });

// ============================================================
// AGENT TRACES (for AI Insights panel)
// ============================================================
export const listAgentRuns = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("agent_runs")
      .select("*")
      .eq("user_id", context.userId)
      .order("started_at", { ascending: false })
      .limit(30);
    if (error) throw error;
    return data;
  });

// ============================================================
// EMBEDDINGS BACKFILL (admin only)
// ============================================================
export const embedScholarships = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" as never });
    if (!isAdmin) throw new Error("Forbidden");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows } = await supabaseAdmin.from("scholarships").select("id, title, summary, provider, eligibility, tags").is("embedding", null).limit(50);
    let done = 0;
    for (const r of rows ?? []) {
      const text = [r.title, r.provider, r.summary, r.eligibility, (r.tags ?? []).join(" ")].filter(Boolean).join(" — ");
      try {
        const v = await embed(text, requireApiKey());
        await supabaseAdmin.from("scholarships").update({ embedding: v as never }).eq("id", r.id);
        done++;
      } catch {
        /* skip */
      }
    }
    return { embedded: done };
  });

// ============================================================
// DASHBOARD STATS
// ============================================================
export const dashboardStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const [{ count: saved }, { count: applying }, { count: submitted }, { data: upcoming }] = await Promise.all([
      context.supabase.from("saved_scholarships").select("*", { count: "exact", head: true }).eq("user_id", context.userId),
      context.supabase.from("applications").select("*", { count: "exact", head: true }).eq("user_id", context.userId).in("status", ["preparing", "ready"]),
      context.supabase.from("applications").select("*", { count: "exact", head: true }).eq("user_id", context.userId).in("status", ["submitted", "under_review", "interview"]),
      context.supabase
        .from("applications")
        .select("*, scholarship:scholarships(*)")
        .eq("user_id", context.userId)
        .order("updated_at", { ascending: false })
        .limit(5),
    ]);
    return {
      saved: saved ?? 0,
      applying: applying ?? 0,
      submitted: submitted ?? 0,
      upcoming: upcoming ?? [],
    };
  });
