import { describe, expect, it } from "vitest";
import { DEMO_CANDIDATES, DEMO_JOBS } from "../data/demoDataset.js";

describe("demo dataset integrity", () => {
  it("defines two jobs with stable ids", () => {
    expect(DEMO_JOBS.map((j) => j.id)).toEqual(["seed-job-1", "seed-job-2"]);
    const active = DEMO_JOBS.find((j) => j.id === "seed-job-1")!;
    expect(active.title).toBe("Senior Full Stack Engineer");
    expect(active.company).toBe("Acme Corp");
    expect(active.parsedJd?.mustHaves).toContain("TypeScript");
    expect(active.parsedJd?.mustHaves).toContain("React");
    expect(active.stats?.matched).toBe(8);
  });

  it("has eight unique candidates on seed-job-1", () => {
    const forJob = DEMO_CANDIDATES.filter((c) => c.jobId === "seed-job-1");
    expect(forJob).toHaveLength(8);
    const names = forJob.map((c) => c.name);
    expect(new Set(names).size).toBe(8);
  });

  it("scores and gaps are internally consistent", () => {
    for (const c of DEMO_CANDIDATES) {
      expect(c.matchScore).toBeGreaterThanOrEqual(0);
      expect(c.matchScore).toBeLessThanOrEqual(100);
      expect(c.gaps?.length).toBeGreaterThan(0);
      for (const g of c.gaps ?? []) {
        expect(["must_have", "nice_have"]).toContain(g.severity);
        expect(typeof g.matched).toBe("boolean");
      }
    }
  });

  it("top demo candidate Priya matches JD must-haves in gaps", () => {
    const priya = DEMO_CANDIDATES.find((c) => c.id === "cand-priya")!;
    expect(priya.matchScore).toBeGreaterThanOrEqual(85);
    const ts = priya.gaps?.find((g) => g.label === "TypeScript");
    const react = priya.gaps?.find((g) => g.label === "React");
    expect(ts?.matched).toBe(true);
    expect(react?.matched).toBe(true);
  });

  it("sorts by match score descending when listed", () => {
    const sorted = [...DEMO_CANDIDATES.filter((c) => c.jobId === "seed-job-1")].sort(
      (a, b) => b.matchScore - a.matchScore,
    );
    expect(sorted[0]?.name).toBe("Sarah Chen");
    expect(sorted[0]?.matchScore).toBe(94);
  });
});
