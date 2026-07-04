
# ScholarAI — Build Plan

A production-grade multi-agent scholarship discovery & application assistant, built on Lovable's stack (TanStack Start + Lovable Cloud + Lovable AI Gateway). The original spec calls for FastAPI/LangGraph/LangSmith/Chroma/Redis; on this platform we implement the same architecture using TypeScript server functions, pgvector, Postgres, and the AI SDK — same capabilities, one deployable artifact.

## Stack mapping (spec → Lovable)

| Spec | Lovable equivalent |
|---|---|
| FastAPI + JWT | TanStack Start server functions + Lovable Cloud (Supabase) auth |
| LangGraph supervisor + agents | Supervisor server fn orchestrating typed AI SDK "agent" nodes (tool calling + structured output) |
| LangSmith tracing | `agent_runs` + `agent_steps` tables (traces viewable in-app + AI Gateway logs) |
| ChromaDB / Pinecone | pgvector on Postgres |
| Redis cache | Postgres materialized cache tables + HTTP cache headers |
| Background scheduler | `pg_cron` job → `/api/public/cron/reminders` |
| Docker / Nginx / GH Actions | Lovable managed hosting (documented in README) |

## Scope for this build

**Ship now (this turn):**
1. Design system (dark-first, glassmorphism, indigo→teal gradient, Space Grotesk + Inter).
2. Lovable Cloud: schema (profiles, scholarships, saved, applications, documents, reminders, agent_runs, agent_steps, embeddings, user_roles) + RLS + grants + trigger.
3. Auth (email/password + Google), profile trigger, `_authenticated` gate.
4. Supervisor multi-agent orchestrator + 8 agents (search, eligibility, ranking, doc review, checklist, reminder, tracker, supervisor) in `src/lib/agents/`.
5. RAG pipeline: `google/gemini-embedding-001` → pgvector → `match_scholarships` RPC.
6. Seed 30+ real-shape scholarships (NSP/Buddy4Study/AICTE/international samples).
7. Pages: Landing, Auth, Dashboard, Discover, Scholarship detail, AI Chat, Profile Builder, Documents (upload + review), Checklist, Deadlines calendar, Tracker (kanban), Notifications, Settings, Admin.
8. Cron endpoint for daily reminder scan.
9. README with architecture, ER diagram (Mermaid), agent workflow, deployment.

**Deferred to follow-ups (explicit):**
- Live scraping of NSP/Buddy4Study (legal + captcha); we seed + accept admin ingestion of scraped JSON.
- Email sending (needs Resend connector; will offer after core ships).
- Full test harness (unit/integration/e2e) — will scaffold vitest + one smoke test.
- Password reset page (added when user confirms email flow).

## Architecture (Mermaid)

```text
Browser (React 19 + TanStack Router + Query + shadcn + Framer Motion)
  │
  ├── useServerFn ──► TanStack server functions (edge worker)
  │                     │
  │                     ├── requireSupabaseAuth middleware
  │                     ├── Supervisor agent
  │                     │     ├── SearchAgent  ──► pgvector RAG (match_scholarships)
  │                     │     ├── EligibilityAgent (LLM + profile)
  │                     │     ├── RankingAgent (deterministic + LLM rationale)
  │                     │     ├── DocReviewAgent (grammar/ATS/score)
  │                     │     ├── ChecklistAgent
  │                     │     ├── ReminderAgent (pg_cron)
  │                     │     └── TrackerAgent
  │                     └── Lovable AI Gateway (gemini-3-flash + embeddings)
  │
  └── /api/public/cron/reminders  ──► pg_cron daily
```

## Data model (highlights)

- `profiles(user_id, full_name, country, degree_level, field, cgpa, skills[], achievements, work_years, target_countries[], completion_pct)`
- `scholarships(id, title, provider, source, benefits, deadline, eligibility, required_documents[], apply_url, country, degree_level, funding_type, amount_usd, tags[], embedding vector(3072))`
- `saved_scholarships(user_id, scholarship_id, note)`
- `applications(user_id, scholarship_id, status enum, notes, submitted_at, timeline jsonb)` — status: saved|preparing|ready|redirected|submitted|under_review|interview|awarded|rejected
- `documents(id, user_id, kind enum, storage_path, extracted_text, review jsonb, score)`
- `checklists(id, application_id, items jsonb)`
- `reminders(id, user_id, application_id, remind_at, kind, sent_at)`
- `agent_runs(id, user_id, kind, input, output, status, started_at, finished_at)`
- `agent_steps(run_id, agent, input, output, tokens, latency_ms, ts)`
- `user_roles(user_id, role)` + `has_role()` SECURITY DEFINER
- pgvector index on `scholarships.embedding` (HNSW cosine).

## Agent contracts

Each agent = a typed server function with Zod I/O, called by the supervisor. Every step is logged to `agent_steps`. Failures return typed error envelopes; retries handled by supervisor with exponential backoff (max 2). Supervisor uses `stopWhen: stepCountIs(50)`.

## Deliverables

- Working app at every listed page (real UI, real data, real AI where applicable).
- `README.md` with the full architecture doc (Mermaid diagrams, ER, agent design, API list, deployment).
- Seed migration for scholarships + admin role seeding via first-signup fallback (documented).

I'll proceed with implementation now.
