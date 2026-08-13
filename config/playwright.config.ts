import process from "node:process";

import { defineConfig, devices } from "@playwright/test";

// noinspection JSUnusedGlobalSymbols -- Loaded by Playwright CLI.
export default defineConfig({
    expect: { timeout: 5_000 },
    forbidOnly: Boolean(process.env.CI),
    fullyParallel: true,
    outputDir: "../.cache/playwright/test-results",
    reporter: process.env.CI
        ? [
              ["line"],
              [
                  "html",
                  {
                      open: "never",
                      outputFolder: "../.cache/playwright/report",
                  },
              ],
          ]
        : "list",
    retries: 0,
    testDir: "../tests/ui",
    testMatch: "**/*.spec.ts",
    timeout: 120_000,
    use: {
        ...devices["Desktop Chrome"],
        screenshot: "only-on-failure",
        trace: "retain-on-failure",
    },
    workers: process.env.CI ? 2 : undefined,
});
