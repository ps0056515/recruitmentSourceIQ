import { test, expect } from "@playwright/test";
import { DEMO_EMAIL, DEMO_PASSWORD, SAMPLE_RESUME } from "./fixtures";

test.describe("sourceIQ UI end-to-end", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill(DEMO_EMAIL);
    await page.getByLabel("Password").fill(DEMO_PASSWORD);
    await page.getByRole("button", { name: /Continue to workspace/i }).click();
    await expect(page).toHaveURL(/\/jobs/);
  });

  test("jobs dashboard shows real demo job data", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "Your jobs" })).toBeVisible();
    await expect(page.getByText("Senior Full Stack Engineer")).toBeVisible();
    await expect(page.getByText("Acme Corp")).toBeVisible();
    await expect(page.getByText("Horizon Labs")).toBeVisible();
  });

  test("ranked candidates list shows named demo profiles", async ({ page, request }) => {
    const login = await request.post("/api/v1/auth/login", {
      data: { email: DEMO_EMAIL, role: "recruiter" },
    });
    const { token } = await login.json();
    const list = await request.get("/api/v1/jobs/seed-job-1/candidates", {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(list.ok()).toBeTruthy();
    const { candidates } = await list.json();
    expect(candidates.length).toBeGreaterThanOrEqual(8);
    expect(candidates.some((c: { name: string }) => c.name === "Priya Sharma")).toBe(true);

    await page.goto("/jobs/seed-job-1/ranked");
    await expect(page.getByRole("heading", { name: /Ranked candidates/i })).toBeVisible();
    await expect(page.getByText("Priya Sharma")).toBeVisible();
    await expect(page.getByText("Sarah Chen")).toBeVisible();
  });

  test("candidate profile shows match score and gaps", async ({ page }) => {
    await page.goto("/candidates/cand-priya");
    await expect(page.getByRole("heading", { name: "Priya Sharma" })).toBeVisible();
    await expect(page.getByText("91 match")).toBeVisible();
    await expect(page.getByText(/TypeScript/i).first()).toBeVisible();
  });

  test("manual paste imports resume and shows match result", async ({ page }) => {
    await page.goto("/jobs/seed-job-1/discover");
    await page.getByRole("button", { name: "Manual paste" }).click();
    await page.getByLabel(/Candidate name/i).fill("E2E Alex Rivera");
    await page.getByLabel(/Resume \/ profile text/i).fill(SAMPLE_RESUME);
    await page.getByRole("button", { name: /Analyze & add to pipeline/i }).click();

    await expect(page.getByText(/E2E Alex Rivera|Alex Rivera/i)).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText(/%/)).toBeVisible();
  });

  test("automated discovery completes and ranked list grows", async ({ page }) => {
    const jobRes = await page.request.post("/api/v1/jobs", {
      data: { title: "E2E Discovery Role", company: "Playwright Inc" },
    });
    expect(jobRes.ok()).toBeTruthy();
    const { job } = await jobRes.json();

    const parseRes = await page.request.post("/api/v1/jd/parse", {
      data: {
        text: "Senior Engineer. Must have: TypeScript, React, Node.js. Nice: AWS.",
      },
    });
    const { parsed } = await parseRes.json();
    await page.request.patch(`/api/v1/jobs/${job.id}`, { data: { parsedJd: parsed } });

    await page.request.post(`/api/v1/jobs/${job.id}/search`, {
      data: { sources: ["linkedin", "github"], maxResults: 10 },
    });

    const deadline = Date.now() + 25_000;
    let candidates: { name: string }[] = [];
    while (Date.now() < deadline) {
      const list = await page.request.get(`/api/v1/jobs/${job.id}/candidates`);
      const body = await list.json();
      candidates = body.candidates ?? [];
      if (candidates.length > 0) break;
      await page.waitForTimeout(500);
    }
    expect(candidates.length).toBeGreaterThan(0);
    expect(candidates[0].name).not.toMatch(/^Candidate 1/i);
  });

  test("pipeline stage update via API reflects on pipeline page", async ({ page, request }) => {
    const login = await request.post("/api/v1/auth/login", { data: { email: DEMO_EMAIL, role: "recruiter" } });
    const { token } = await login.json();
    const patch = await request.patch("/api/v1/candidates/cand-rohan/stage", {
      headers: { Authorization: `Bearer ${token}` },
      data: { stage: "interview" },
    });
    expect(patch.ok()).toBeTruthy();

    await page.goto("/jobs/seed-job-1/pipeline");
    await expect(page.getByText("Rohan Gupta")).toBeVisible();
    const rohanCard = page.locator(".card").filter({ hasText: "Rohan Gupta" });
    await expect(rohanCard.locator("select")).toHaveValue("interview");
  });

  test("inbox and analytics pages load data", async ({ page }) => {
    await page.goto("/inbox");
    await expect(page.getByRole("heading", { name: /Reply inbox/i })).toBeVisible();
    await expect(page.locator("article, li, tr").filter({ hasText: /@|replied|interested/i }).first()).toBeVisible({
      timeout: 10_000,
    });

    await page.goto("/analytics");
    await expect(page.getByRole("heading", { name: /Workspace analytics/i })).toBeVisible();
    await expect(page.getByText(/scanned|matched|reply/i).first()).toBeVisible();
  });

  test("public share page shows shortlist", async ({ page }) => {
    await page.goto("/share/demo-hm-shortlist");
    await expect(page.getByRole("heading", { name: /Senior Full Stack Engineer/i })).toBeVisible();
    await expect(page.getByText("Acme Corp")).toBeVisible();
    await expect(page.getByText("Sarah Chen")).toBeVisible();
  });
});
