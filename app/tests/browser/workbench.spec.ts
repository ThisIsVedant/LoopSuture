import { expect, test } from "@playwright/test";

test("desktop workbench executes, investigates, repairs, and preserves a fresh edit", async ({ page }) => {
  const problems: string[] = [];
  page.on("pageerror", (error) => problems.push(error.message));
  await page.setViewportSize({ width: 1512, height: 1100 });
  await page.goto("/");
  await expect(page.getByText("FalkorDB connected", { exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Keep the workflow. Cut the loop." })).toBeVisible();
  await page.screenshot({ path: "artifacts/workbench-empty.png", fullPage: true });
  await page.getByRole("button", { name: "Run scenario", exact: true }).click();
  await expect(page.getByText("Bound reached", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Investigate this run" }).click();
  await expect(page.getByText("Verified candidate found", { exact: true })).toBeVisible();
  await expect(page.getByText("Rejected", { exact: true }).first()).toBeVisible();
  await page.getByRole("button", { name: "Apply verified repair" }).click();
  await expect(page.getByText("Verified repair installed", { exact: true })).toBeVisible();
  await page.screenshot({ path: "artifacts/workbench-repaired.png", fullPage: true });
  await page.getByLabel("Test a new customer edit").selectOption("marketing");
  await page.getByRole("button", { name: "Send edit", exact: true }).click();
  await expect(page.getByText("Completed", { exact: true })).toBeVisible();
  await expect(page.getByText("Version 2 · qualified")).toHaveCount(3);
  await page.reload();
  await expect(page.getByText("Version 2 · qualified")).toHaveCount(3);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  expect(overflow).toBe(false);
  expect(problems).toEqual([]);
});
