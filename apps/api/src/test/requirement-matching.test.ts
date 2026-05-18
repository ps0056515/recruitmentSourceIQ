import { describe, expect, it } from "vitest";
import {
  buildManualMatchSummary,
  requirementMatched,
  resolveMustRequirements,
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
});

describe("requirementMatched", () => {
  it("matches Node.js when resume says Node", () => {
    expect(requirementMatched("Node.js", "skills: node, postgresql, typescript")).toBe(true);
  });
});

describe("buildManualMatchSummary", () => {
  it("lists matched and gap requirements by name", () => {
    const summary = buildManualMatchSummary("AJAY D", 45, "Senior Engineer", [
      { label: "TypeScript", matched: true },
      { label: "React", matched: false },
      { label: "Node.js", matched: true },
    ]);
    expect(summary).toMatch(/2\/3 requirements matched/i);
    expect(summary).toMatch(/TypeScript/);
    expect(summary).toMatch(/Gaps:.*React/i);
  });
});
