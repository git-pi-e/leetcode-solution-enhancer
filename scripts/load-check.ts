// Loads the built Chrome extension and waits for its background service worker.
// Chrome shows a blocking dialog for a manifest it rejects, which web-ext lint (Firefox) does not catch.
// Usage: bun run build:chrome && node scripts/load-check.ts

import path from "node:path";
import { chromium } from "playwright";

const extensionPath = path.resolve(".output/chrome-mv3");

const context = await chromium.launchPersistentContext("", {
  channel: "chromium",
  headless: false,
  timeout: 30_000,
  args: [`--disable-extensions-except=${extensionPath}`, `--load-extension=${extensionPath}`],
});

try {
  const worker = context.serviceWorkers()[0] ?? (await context.waitForEvent("serviceworker", { timeout: 15_000 }));
  console.log(`Chrome loaded the extension: ${worker.url()}`);
} finally {
  await context.close();
}
