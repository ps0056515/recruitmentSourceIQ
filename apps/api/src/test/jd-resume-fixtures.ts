import type { ParsedJD } from "@sourceiq/shared";
import { SAMPLE_JD_TEXT, SAMPLE_RESUME_STRONG, SAMPLE_RESUME_WEAK } from "./fixtures.js";

export { SAMPLE_JD_TEXT, SAMPLE_RESUME_STRONG, SAMPLE_RESUME_WEAK };

export const PARSED_JD_FULLSTACK: ParsedJD = {
  title: "Senior Full Stack Engineer",
  company: "Acme Corp",
  location: "Bangalore / Remote",
  summary: "Own end-to-end product features.",
  mustHaves: ["TypeScript", "React", "Node.js", "PostgreSQL"],
  niceToHaves: ["AWS", "Kafka", "system design"],
  skills: ["TypeScript", "React", "Node.js", "PostgreSQL", "REST APIs"],
  yearsExperience: 5,
  rawExcerpt: SAMPLE_JD_TEXT.slice(0, 200),
};

export const PARSED_JD_PM: ParsedJD = {
  title: "Senior Product Manager",
  company: "Horizon Labs",
  summary: "B2B SaaS roadmap.",
  mustHaves: ["Product strategy", "B2B SaaS", "User research"],
  niceToHaves: ["HR tech", "SQL literacy"],
  skills: ["Roadmapping", "Analytics", "Stakeholder management"],
  yearsExperience: 6,
  rawExcerpt: "Senior Product Manager",
};

export const RESUME_PERFECT_MATCH = `
Jordan Lee
Staff Full Stack Engineer · 8 years

Skills: TypeScript, React, Node.js, PostgreSQL, AWS, Kafka, system design
Built hiring platform with React and Node.js. PostgreSQL at scale.
`.trim();

export const RESUME_PARTIAL_MATCH = `
Sam Kim
Backend developer

Skills: Node.js, PostgreSQL, Python
3 years API work. No React or TypeScript listed.
`.trim();

export const RESUME_PM_MATCH = `
Taylor Morgan
Senior Product Manager

Skills: Product strategy, B2B SaaS, User research, Roadmapping
Led SaaS roadmap at HR tech startup. Stakeholder management.
`.trim();

export const RESUME_WRONG_ROLE = `
Chris Designer
UI/UX specialist

Skills: Figma, Sketch, Adobe XD, user interface design
No engineering stack.
`.trim();

export const JD_MINIMAL_TEXT = `
Backend Engineer
Must have:
- Go
- gRPC
`.trim();
