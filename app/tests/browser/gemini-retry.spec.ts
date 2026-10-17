import { expect, test } from "@playwright/test";

test("same-run Gemini retry control recovers from a simulated provider failure", async ({ page }) => {
  const response = await page.request.post("/api/runs", { data: { scenarioId: "healthy-retry" } });
  expect(response.status()).toBe(201);
  const run = await response.json();
  let attempts = 0;
  await page.route("**/api/health", route => route.fulfill({ json: { graph: "connected", model: "configured", modelProvider: "Gemini" } }));
  await page.route(`**/api/runs/${run.id}/investigate`, route => {
    attempts++;
    return route.fulfill({ json: { ...run, investigation: {
      revision: run.revision, status: "healthy", paths: [], candidates: [], selectedId: null,
      explanation: "The bounded retry drained.", receipts: [], modelProvider: "Gemini",
      mode: attempts === 1 ? "graph" : "model",
      ...(attempts === 1 ? { modelNote: "Gemini is temporarily unavailable." } : {}),
    } } });
  });
  await page.addInitScript(id => localStorage.setItem("loopsuture:last-run", id), run.id);
  await page.goto("/");
  await page.getByRole("button", { name: "Investigate this run" }).click();
  await expect(page.getByText("Gemini is temporarily unavailable.", { exact: true })).toBeVisible();
  const retry = page.getByRole("button", { name: "Retry Gemini investigation" });
  await expect(retry).toBeVisible();
  await retry.click();
  await expect(page.getByText("Gemini investigation with verified tools · revision 0", { exact: true })).toBeVisible();
  await expect(retry).toHaveCount(0);
  expect(attempts).toBe(2);
  expect(await page.evaluate(() => localStorage.getItem("loopsuture:last-run"))).toBe(run.id);
});
