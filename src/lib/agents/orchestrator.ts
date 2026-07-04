/**
 * Multi-agent orchestrator for ScholarAI.
 *
 * Design: a TypeScript LangGraph-style DAG. Supervisor decides which agents run,
 * each agent is a typed function, and every step is logged to agent_steps so the
 * user can inspect the full trace (LangSmith-equivalent in-app).
 *
 * All calls to the LLM go through Lovable AI Gateway via the AI SDK.
 */

import { generateText } from "ai";
import { z } from "zod";
import {
  createLovableAiGatewayProvider,
  DEFAULT_CHAT_MODEL,
  embed,
  requireApiKey,
} from "@/lib/ai-gateway.server";
import {
  CHAT_SYSTEM,
  CHECKLIST_SYSTEM,
  DOC_REVIEW_SYSTEM,
  ELIGIBILITY_SYSTEM,
  RANKING_SYSTEM,
  SEARCH_SYSTEM,
  SUPERVISOR_SYSTEM,
} from "@/lib/agents/prompts";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

type SB = SupabaseClient<Database>;

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------
export type Profile = {
  full_name?: string | null;
  country?: string | null;
  degree_level?: string | null;
  field_of_study?: string | null;
  cgpa?: number | null;
  skills?: string[] | null;
  achievements?: string | null;
  work_years?: number | null;
  target_countries?: string[] | null;
  target_fields?: string[] | null;
};

export type Scholarship = {
  id: string;
  title: string;
  provider: string;
  summary: string | null;
  benefits: string | null;
  deadline: string | null;
  eligibility: string | null;
  country: string | null;
  degree_level: string | null;
  funding_type: string | null;
  amount_usd: number | null;
  fields: string[] | null;
  tags: string[] | null;
  min_cgpa: number | null;
  eligible_countries: string[] | null;
  apply_url: string | null;
  required_documents: string[] | null;
};

// -----------------------------------------------------------------------------
// Trace helpers
// -----------------------------------------------------------------------------
async function startRun(sb: SB, userId: string, kind: string, input: unknown) {
  const { data, error } = await sb
    .from("agent_runs")
    .insert({ user_id: userId, kind: kind as never, input: input as never, status: "running" })
    .select("id")
    .single();
  if (error) throw error;
  return data.id;
}
async function finishRun(sb: SB, runId: string, output: unknown, error?: string) {
  await sb
    .from("agent_runs")
    .update({
      status: error ? "failed" : "succeeded",
      output: output as never,
      error: error ?? null,
      finished_at: new Date().toISOString(),
    })
    .eq("id", runId);
}
async function logStep(
  sb: SB,
  runId: string,
  agent: string,
  input: unknown,
  output: unknown,
  latencyMs: number,
  error?: string,
) {
  await sb.from("agent_steps").insert({
    run_id: runId,
    agent: agent as never,
    input: input as never,
    output: output as never,
    latency_ms: latencyMs,
    error: error ?? null,
  });
}

// -----------------------------------------------------------------------------
// LLM helper — resilient JSON extraction (SDK v7 output helpers are strict; we
// keep it simple and parse the fenced JSON block ourselves).
// -----------------------------------------------------------------------------
function extractJson(text: string): unknown {
  const trimmed = text.trim();
  // Strip markdown fences
  const cleaned = trimmed.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "");
  try {
    return JSON.parse(cleaned);
  } catch {
    // Try to grab first JSON object
    const match = cleaned.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
    if (match) {
      try {
        return JSON.parse(match[0]);
      } catch {
        // fallthrough
      }
    }
    return null;
  }
}

async function llmJson<T>(system: string, user: string, schema: z.ZodType<T>): Promise<T | null> {
  const gateway = createLovableAiGatewayProvider(requireApiKey());
  const model = gateway(DEFAULT_CHAT_MODEL);
  const { text } = await generateText({
    model,
    system: `${system}\n\nRespond with ONLY valid JSON, no prose, no markdown fences.`,
    prompt: user,
  });
  const parsed = extractJson(text);
  const result = schema.safeParse(parsed);
  return result.success ? result.data : null;
}

async function llmText(system: string, user: string): Promise<string> {
  const gateway = createLovableAiGatewayProvider(requireApiKey());
  const model = gateway(DEFAULT_CHAT_MODEL);
  const { text } = await generateText({ model, system, prompt: user });
  return text;
}

// -----------------------------------------------------------------------------
// Individual Agents
// -----------------------------------------------------------------------------

// ----- SEARCH AGENT -----
const SearchFilters = z.object({
  keywords: z.string().default(""),
  country: z.string().nullable().optional(),
  degree_level: z.string().nullable().optional(),
  field: z.string().nullable().optional(),
});
export async function searchAgent(sb: SB, runId: string, profile: Profile, query: string) {
  const t0 = Date.now();
  try {
    const filters = (await llmJson(
      SEARCH_SYSTEM,
      `Student profile: ${JSON.stringify(profile)}\n\nQuery: ${query}`,
      SearchFilters,
    )) ?? { keywords: query, country: null, degree_level: null, field: null };

    // Hybrid retrieval: try embedding first, fall back to text ilike.
    let scholarships: Scholarship[] = [];
    try {
      const emb = await embed(`${query} ${filters.keywords}`, requireApiKey());
      const { data } = await sb.rpc("match_scholarships", {
        query_embedding: emb as never,
        match_count: 20,
        filter_country: filters.country ?? undefined,
        filter_degree: (filters.degree_level as never) ?? undefined,
      });
      if (data && data.length) {
        // Enrich with full row
        const ids = data.map((d) => d.id);
        const { data: full } = await sb
          .from("scholarships")
          .select("*")
          .in("id", ids);
        scholarships = (full ?? []) as Scholarship[];
      }
    } catch {
      // Embedding failed — fall back
    }
    if (scholarships.length === 0) {
      const kw = filters.keywords || query;
      const q = sb.from("scholarships").select("*").eq("is_active", true);
      if (filters.country) q.eq("country", filters.country);
      const { data } = kw
        ? await q.or(`title.ilike.%${kw}%,summary.ilike.%${kw}%,tags.cs.{${kw}}`).limit(20)
        : await q.limit(20);
      scholarships = (data ?? []) as Scholarship[];
    }

    await logStep(sb, runId, "search", { query, filters }, { count: scholarships.length }, Date.now() - t0);
    return { filters, scholarships };
  } catch (e) {
    const err = e instanceof Error ? e.message : String(e);
    await logStep(sb, runId, "search", { query }, null, Date.now() - t0, err);
    throw e;
  }
}

// ----- ELIGIBILITY AGENT -----
const EligibilityResult = z.object({
  eligible: z.boolean(),
  score: z.number(),
  reasons: z.array(z.string()).default([]),
  gaps: z.array(z.string()).default([]),
});
export async function eligibilityAgent(sb: SB, runId: string, profile: Profile, scholarship: Scholarship) {
  const t0 = Date.now();
  const result =
    (await llmJson(
      ELIGIBILITY_SYSTEM,
      `Profile: ${JSON.stringify(profile)}\n\nScholarship:\n${JSON.stringify({
        title: scholarship.title,
        eligibility: scholarship.eligibility,
        country: scholarship.country,
        degree_level: scholarship.degree_level,
        min_cgpa: scholarship.min_cgpa,
        eligible_countries: scholarship.eligible_countries,
      })}`,
      EligibilityResult,
    )) ?? { eligible: false, score: 0, reasons: [], gaps: ["LLM parse failed"] };
  await logStep(sb, runId, "eligibility", { scholarship: scholarship.id }, result, Date.now() - t0);
  return result;
}

// ----- RANKING AGENT (deterministic + LLM rationale) -----
export type RankedScholarship = Scholarship & {
  match_score: number;
  rationale: string;
  urgency: "high" | "medium" | "low";
};
export async function rankingAgent(sb: SB, runId: string, profile: Profile, scholarships: Scholarship[]) {
  const t0 = Date.now();
  const today = Date.now();
  const day = 86400000;

  // Deterministic scoring
  const scored = scholarships.map((s) => {
    let score = 40; // baseline
    // Country alignment
    if (profile.target_countries?.includes(s.country ?? "")) score += 20;
    if (s.country === "Global") score += 8;
    // Degree
    if (profile.degree_level && (s.degree_level === profile.degree_level || s.degree_level === "any")) score += 12;
    // Field
    if (
      profile.field_of_study &&
      s.fields?.some((f) => profile.field_of_study!.toLowerCase().includes(f.toLowerCase()))
    )
      score += 10;
    // Eligible countries
    if (
      profile.country &&
      (!s.eligible_countries || s.eligible_countries.length === 0 || s.eligible_countries.includes(profile.country))
    )
      score += 6;
    // CGPA
    if (s.min_cgpa && profile.cgpa && profile.cgpa >= s.min_cgpa) score += 6;
    if (s.min_cgpa && profile.cgpa && profile.cgpa < s.min_cgpa) score -= 15;
    // Funding value
    if ((s.amount_usd ?? 0) > 30000) score += 4;
    // Deadline urgency
    let urgency: "high" | "medium" | "low" = "low";
    if (s.deadline) {
      const daysLeft = (new Date(s.deadline).getTime() - today) / day;
      if (daysLeft < 0) score -= 30;
      else if (daysLeft < 30) {
        score += 5;
        urgency = "high";
      } else if (daysLeft < 90) urgency = "medium";
    }
    score = Math.max(0, Math.min(100, score));
    return { ...s, match_score: score, urgency, rationale: "" };
  });

  scored.sort((a, b) => b.match_score - a.match_score);
  const top = scored.slice(0, 10);

  // LLM rationale for top 10
  try {
    const summary = await llmText(
      RANKING_SYSTEM,
      `Profile: ${JSON.stringify(profile)}\n\nTop scholarships (already scored):\n${top
        .map((s) => `- ${s.title} (${s.provider}, score ${s.match_score})`)
        .join("\n")}\n\nWrite a one-line rationale for each in JSON array format: [{"id":"<id>","rationale":"..."}]`,
    );
    const parsed = extractJson(summary);
    if (Array.isArray(parsed)) {
      for (const r of parsed) {
        const t = top.find((s) => s.id === r.id);
        if (t) t.rationale = r.rationale;
      }
    }
  } catch {
    /* rationale is optional */
  }
  await logStep(sb, runId, "ranking", { count: scholarships.length }, { top: top.map((t) => t.id) }, Date.now() - t0);
  return top as RankedScholarship[];
}

// ----- DOC REVIEW AGENT -----
const DocReview = z.object({
  score: z.number(),
  grammar: z.number(),
  ats: z.number(),
  readability: z.number(),
  strengths: z.array(z.string()).default([]),
  weaknesses: z.array(z.string()).default([]),
  suggestions: z.array(z.string()).default([]),
  missing: z.array(z.string()).default([]),
});
export async function docReviewAgent(
  sb: SB,
  runId: string,
  kind: string,
  text: string,
) {
  const t0 = Date.now();
  const result =
    (await llmJson(
      DOC_REVIEW_SYSTEM,
      `Document type: ${kind}\n\nContent:\n${text.slice(0, 12000)}`,
      DocReview,
    )) ?? {
      score: 0,
      grammar: 0,
      ats: 0,
      readability: 0,
      strengths: [],
      weaknesses: ["Could not parse review"],
      suggestions: [],
      missing: [],
    };
  await logStep(sb, runId, "doc_review", { kind, length: text.length }, result, Date.now() - t0);
  return result;
}

// ----- CHECKLIST AGENT -----
const Checklist = z.object({
  items: z
    .array(
      z.object({
        id: z.string().optional(),
        label: z.string(),
        category: z.string().default("document"),
        priority: z.string().default("medium"),
        due_offset_days: z.number().default(0),
      }),
    )
    .default([]),
});
export async function checklistAgent(
  sb: SB,
  runId: string,
  profile: Profile,
  scholarship: Scholarship,
) {
  const t0 = Date.now();
  const result =
    (await llmJson(
      CHECKLIST_SYSTEM,
      `Profile: ${JSON.stringify(profile)}\n\nScholarship: ${JSON.stringify(scholarship)}`,
      Checklist,
    )) ?? { items: [] };
  const items = (result.items ?? []).map((it, i) => ({
    id: it.id ?? `${Date.now()}-${i}`,
    label: it.label,
    category: it.category,
    priority: it.priority,
    due_offset_days: it.due_offset_days,
    done: false,
  }));
  await logStep(sb, runId, "checklist", { scholarship: scholarship.id }, { count: items.length }, Date.now() - t0);
  return items;
}

// ----- CHAT / SUPERVISOR ENTRY -----
export async function chatAgent(
  sb: SB,
  userId: string,
  history: { role: "user" | "assistant"; content: string }[],
) {
  const runId = await startRun(sb, userId, "chat", { history_length: history.length });
  try {
    // Profile context
    const { data: profile } = await sb.from("profiles").select("*").eq("user_id", userId).maybeSingle();

    // Retrieve last user message
    const lastUser = [...history].reverse().find((m) => m.role === "user")?.content ?? "";

    // Search agent → RAG context
    const { scholarships } = await searchAgent(sb, runId, profile ?? {}, lastUser);
    const context = scholarships
      .slice(0, 8)
      .map(
        (s) =>
          `- ${s.title} (${s.provider}) — ${s.country ?? "?"}, ${s.degree_level ?? "?"}, deadline ${s.deadline ?? "?"}. ${s.summary ?? ""}`,
      )
      .join("\n");

    const gateway = createLovableAiGatewayProvider(requireApiKey());
    const model = gateway(DEFAULT_CHAT_MODEL);
    const { text } = await generateText({
      model,
      system: `${CHAT_SYSTEM}\n\nStudent profile: ${JSON.stringify(profile)}\n\nScholarship context:\n${context}`,
      messages: history.map((m) => ({ role: m.role, content: m.content })),
    });

    await finishRun(sb, runId, { reply: text });
    return { reply: text, sources: scholarships.slice(0, 8) };
  } catch (e) {
    const err = e instanceof Error ? e.message : String(e);
    await finishRun(sb, runId, null, err);
    throw e;
  }
}

// ----- SUPERVISOR DISCOVERY PIPELINE -----
export async function discoverPipeline(sb: SB, userId: string, query: string) {
  const runId = await startRun(sb, userId, "supervisor", { query });
  try {
    const { data: profile } = await sb.from("profiles").select("*").eq("user_id", userId).maybeSingle();
    const p = (profile ?? {}) as Profile;

    // Log supervisor decision
    const t0 = Date.now();
    await logStep(
      sb,
      runId,
      "supervisor",
      { query },
      { plan: ["search", "ranking"], reason: "Discovery pipeline" },
      Date.now() - t0,
    );

    const { scholarships } = await searchAgent(sb, runId, p, query);
    const ranked = await rankingAgent(sb, runId, p, scholarships);

    await finishRun(sb, runId, { count: ranked.length });
    return { ranked, runId };
  } catch (e) {
    const err = e instanceof Error ? e.message : String(e);
    await finishRun(sb, runId, null, err);
    throw e;
  }
}

// re-export for named import convenience
export { SUPERVISOR_SYSTEM };
