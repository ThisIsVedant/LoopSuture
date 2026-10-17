import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "tests/browser",
  timeout: 60000,
  use: { baseURL: "http://127.0.0.1:3025", channel: "chrome", headless: true, screenshot: "only-on-failure" },
  reporter: "list",
});
