import { describe, expect, it } from "vitest";
import type { GapItem } from "@sourceiq/shared";
import {
  buildManualMatchSummary,
  computeMatchScoreFromGaps,
  requirementMatched,
  resolveMustRequirements,
  SCORE_WEIGHT_BEHAVIORAL,
  SCORE_WEIGHT_TECHNICAL,
} from "../config/requirementMatching.js";
import { PARSED_JD_FULLSTACK } from "./jd-resume-fixtures.js";

describe("resolveMustRequirements", () => {
  it("uses concrete must-haves from JD, not only generic fallbacks", () => {
    const must = resolveMustRequirements(PARSED_JD_FULLSTACK);
    expect(must).toEqual(expect.arrayContaining(["TypeScript", "React", "Node.js", "PostgreSQL"]));
    expect(must.length).toBeGreaterThanOrEqual(4);
  });

  it("falls back to skills when must-haves are generic", () => {
    const must = resolveMustRequirements({
      ...PARSED_JD_FULLSTACK,
      mustHaves: ["Relevant experience", "Core skills for role"],
    });
    expect(must).toContain("TypeScript");
    expect(must.length).toBeGreaterThan(2);
  });

  it("uses skills and nice-to-haves when must-haves are Clear impact placeholders", () => {
    const must = resolveMustRequirements({
      title: "Full Stack Developer",
      summary: "",
      mustHaves: ["Clear impact", "Relevant ownership"],
      niceToHaves: ["Strong communication", "AWS"],
      skills: ["JavaScript", "Node.js", "Angular"],
      rawExcerpt: "",
    });
    expect(must).not.toContain("Clear impact");
    expect(must).toEqual(expect.arrayContaining(["JavaScript", "Node.js", "Angular"]));
  });
});

describe("requirementMatched", () => {
  it("matches Node.js when resume says Node", () => {
    expect(requirementMatched("Node.js", "skills: node, postgresql, typescript")).toBe(true);
  });

  it("matches Angular in resume text", () => {
    expect(requirementMatched("Angular", "built apps with Angular and JavaScript")).toBe(true);
  });
});

describe("computeMatchScoreFromGaps", () => {
  it("ignores interview-only soft traits and scores technical fit", () => {
    const gaps: GapItem[] = [
      { id: "1", label: "TypeScript", severity: "must_have", matched: true, category: "technical" },
      { id: "2", label: "React", severity: "must_have", matched: true, category: "technical" },
      { id: "3", label: "Node.js", severity: "must_have", matched: false, category: "technical" },
      { id: "4", label: "PostgreSQL", severity: "must_have", matched: false, category: "technical" },
      {
        id: "5",
        label: "Strong communication",
        severity: "info",
        matched: true,
        category: "behavioral",
      },
      {
        id: "6",
        label: "Clear impact",
        severity: "info",
        matched: true,
        category: "behavioral",
      },
    ];
    const { score, scoreBreakdown } = computeMatchScoreFromGaps(gaps);
    // tech 2/4 = 50% with 100% tech weight → 50
    expect(score).toBe(50);
    expect(scoreBreakdown.technicalWeight).toBe(100);
    expect(scoreBreakdown.behavioralWeight).toBe(0);
  });

  it("still supports 80/20 when scorable (non-interview) behavioral gaps exist", () => {
    const gaps: GapItem[] = [
      { id: "1", label: "TypeScript", severity: "must_have", matched: true, category: "technical" },
      { id: "2", label: "React", severity: "must_have", matched: false, category: "technical" },
      { id: "3", label: "Mentorship", severity: "nice_have", matched: true, category: "behavioral" },
    ];
    const { score, scoreBreakdown } = computeMatchScoreFromGaps(gaps);
    // tech 1/2 = 50% → 40; beh 1/1 = 100% → 20 → 60
    expect(score).toBe(60);
    expect(scoreBreakdown.technicalWeight).toBe(SCORE_WEIGHT_TECHNICAL);
    expect(scoreBreakdown.behavioralWeight).toBe(SCORE_WEIGHT_BEHAVIORAL);
  });
});

describe("buildManualMatchSummary", () => {
  it("mentions technical and behavioral breakdown", () => {
    const summary = buildManualMatchSummary("AJAY D", 60, "Senior Engineer", [
      { id: "1", label: "TypeScript", severity: "must_have", matched: true, category: "technical" },
      { id: "2", label: "React", severity: "must_have", matched: false, category: "technical" },
      { id: "3", label: "Communication", severity: "nice_have", matched: true, category: "behavioral" },
    ]);
    expect(summary).toMatch(/technical 1\/2/i);
    expect(summary).toMatch(/behavioral 1\/1/i);
    expect(summary).toMatch(/80% weight/i);
  });
});
