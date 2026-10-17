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
  expect(problems).toEqual([]);
});
