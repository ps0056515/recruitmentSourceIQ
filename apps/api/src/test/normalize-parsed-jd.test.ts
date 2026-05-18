import { describe, expect, it } from "vitest";
import { labelsFromList, normalizeParsedJd } from "../services/normalizeParsedJd.js";

describe("normalizeParsedJd", () => {
  it("maps Claude requirement objects to string labels", () => {
    const parsed = normalizeParsedJd({
      title: "Senior Engineer",
      summary: "Build APIs",
      mustHaves: [
        { id: "m1", label: "TypeScript", category: "skill" },
        { id: "m2", label: "React", category: "skill" },
      ],
      niceToHaves: [{ id: "n1", label: "GraphQL", category: "skill" }],
      yearsExperience: { minimum: 5, preferred: 7 },
    });

    expect(parsed.mustHaves).toEqual(["TypeScript", "React"]);
    expect(parsed.niceToHaves).toEqual(["GraphQL"]);
    expect(parsed.yearsExperience).toBe(5);
    expect(parsed.skills).toContain("TypeScript");
  });

  it("dedupes labels case-insensitively", () => {
    expect(
      labelsFromList(["React", { label: "react" }, { label: "Node.js" }]),
    ).toEqual(["React", "Node.js"]);
  });
});
