import type { Candidate } from "@sourceiq/shared";

export function candidateOrigin(c: Candidate): { label: string; className: string } {
  if (c.source === "manual_paste") {
    return { label: "Pasted resume · JD match", className: "bg-violet-light text-violet" };
  }
  if (c.id.startsWith("cand-")) {
    return { label: "Sample dataset", className: "bg-sand-dark/80 text-slateiq" };
  }
  return { label: "Auto discovery", className: "bg-ocean-light text-ocean" };
}
