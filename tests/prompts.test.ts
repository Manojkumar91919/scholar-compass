import { describe, it, expect } from "vitest";
import {
  CHAT_SYSTEM,
  CHECKLIST_SYSTEM,
  DOC_REVIEW_SYSTEM,
  ELIGIBILITY_SYSTEM,
  RANKING_SYSTEM,
  RESUME_EXTRACT_SYSTEM,
  SEARCH_SYSTEM,
  SUPERVISOR_SYSTEM,
} from "@/lib/agents/prompts";

describe("agent prompts", () => {
  it("all prompts are non-empty strings", () => {
    for (const p of [
      CHAT_SYSTEM,
      CHECKLIST_SYSTEM,
      DOC_REVIEW_SYSTEM,
      ELIGIBILITY_SYSTEM,
      RANKING_SYSTEM,
      RESUME_EXTRACT_SYSTEM,
      SEARCH_SYSTEM,
      SUPERVISOR_SYSTEM,
    ]) {
      expect(typeof p).toBe("string");
      expect(p.length).toBeGreaterThan(30);
    }
  });

  it("chat prompt enforces markdown spacing rules", () => {
    expect(CHAT_SYSTEM.toLowerCase()).toContain("blank line");
    expect(CHAT_SYSTEM.toLowerCase()).toContain("markdown");
  });

  it("resume extractor prompt requests the required profile fields", () => {
    for (const field of ["full_name", "field_of_study", "cgpa", "skills", "bio"]) {
      expect(RESUME_EXTRACT_SYSTEM).toContain(field);
    }
  });

  it("eligibility prompt requests structured JSON with score", () => {
    expect(ELIGIBILITY_SYSTEM).toMatch(/eligible/i);
    expect(ELIGIBILITY_SYSTEM).toMatch(/score/i);
  });
});
