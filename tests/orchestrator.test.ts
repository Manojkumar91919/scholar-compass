import { describe, it, expect } from "vitest";
import { scoreScholarship, postFilter, type Profile, type Scholarship } from "@/lib/agents/orchestrator";

const inOneYear = new Date(Date.now() + 365 * 86400000).toISOString().slice(0, 10);
const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);

const baseScholarship = (overrides: Partial<Scholarship> = {}): Scholarship => ({
  id: "s1",
  title: "Fulbright STEM Master's",
  provider: "Fulbright",
  summary: "Fully funded master's program in STEM fields",
  benefits: null,
  deadline: inOneYear,
  eligibility: null,
  country: "USA",
  degree_level: "master",
  funding_type: "full",
  amount_usd: 50000,
  fields: ["Computer Science", "Engineering"],
  tags: ["stem", "fully-funded"],
  min_cgpa: 3.0,
  eligible_countries: ["India", "Pakistan"],
  apply_url: "https://example.com",
  required_documents: null,
  ...overrides,
});

const baseProfile = (overrides: Partial<Profile> = {}): Profile => ({
  full_name: "Test User",
  country: "India",
  degree_level: "master",
  field_of_study: "Computer Science",
  cgpa: 3.7,
  skills: ["python"],
  achievements: null,
  work_years: 2,
  target_countries: ["USA"],
  target_fields: ["Computer Science"],
  ...overrides,
});

describe("scoreScholarship", () => {
  it("gives strong score for a well-aligned profile", () => {
    const { score, urgency } = scoreScholarship(baseProfile(), baseScholarship(), "master stem usa");
    expect(score).toBeGreaterThanOrEqual(75);
    expect(urgency).toBe("low");
  });

  it("penalizes when profile CGPA is below minimum", () => {
    const good = scoreScholarship(baseProfile({ cgpa: 3.9 }), baseScholarship({ min_cgpa: 3.5 }));
    const bad = scoreScholarship(baseProfile({ cgpa: 2.5 }), baseScholarship({ min_cgpa: 3.5 }));
    expect(good.score).toBeGreaterThan(bad.score);
  });

  it("marks near-deadline scholarships as high urgency", () => {
    const soon = new Date(Date.now() + 10 * 86400000).toISOString().slice(0, 10);
    const { urgency } = scoreScholarship(baseProfile(), baseScholarship({ deadline: soon }));
    expect(urgency).toBe("high");
  });

  it("penalizes zero-keyword overlap for irrelevant queries", () => {
    const relevant = scoreScholarship(baseProfile(), baseScholarship(), "master stem engineering");
    const irrelevant = scoreScholarship(baseProfile(), baseScholarship(), "medical residency dermatology cardiology");
    expect(relevant.score).toBeGreaterThan(irrelevant.score);
  });

  it("clamps score between 0 and 100", () => {
    const { score } = scoreScholarship(baseProfile(), baseScholarship());
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(100);
  });
});

describe("postFilter", () => {
  it("removes expired scholarships", () => {
    const arr = [baseScholarship({ id: "expired", deadline: yesterday }), baseScholarship({ id: "ok" })];
    const out = postFilter(arr, {}, baseProfile());
    expect(out.map((s) => s.id)).toEqual(["ok"]);
  });

  it("filters by country when supplied", () => {
    const arr = [
      baseScholarship({ id: "us", country: "USA" }),
      baseScholarship({ id: "uk", country: "UK" }),
      baseScholarship({ id: "global", country: "Global" }),
    ];
    const out = postFilter(arr, { country: "USA" }, baseProfile());
    const ids = out.map((s) => s.id).sort();
    expect(ids).toEqual(["global", "us"]);
  });

  it("filters by degree level", () => {
    const arr = [
      baseScholarship({ id: "m", degree_level: "master" }),
      baseScholarship({ id: "p", degree_level: "phd" }),
      baseScholarship({ id: "any", degree_level: "any" }),
    ];
    const out = postFilter(arr, { degree_level: "master" }, baseProfile());
    expect(out.map((s) => s.id).sort()).toEqual(["any", "m"]);
  });

  it("removes scholarships restricted to countries the applicant doesn't hold", () => {
    const arr = [
      baseScholarship({ id: "restricted", eligible_countries: ["Germany", "France"] }),
      baseScholarship({ id: "open", eligible_countries: ["India"] }),
    ];
    const out = postFilter(arr, {}, baseProfile({ country: "India" }));
    expect(out.map((s) => s.id)).toEqual(["open"]);
  });

  it("filters by field of study when specified", () => {
    const arr = [
      baseScholarship({ id: "cs", fields: ["Computer Science"] }),
      baseScholarship({ id: "law", fields: ["Law"] }),
    ];
    const out = postFilter(arr, { field: "Computer Science" }, baseProfile());
    expect(out.map((s) => s.id)).toEqual(["cs"]);
  });
});
