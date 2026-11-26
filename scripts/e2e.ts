// Loads the built Chrome extension into Playwright's Chromium and checks the carousel on live LeetCode.
// It runs once with the desktop layout and once with the mobile page LeetCode serves to phones.
// Usage: bun run build:chrome && node scripts/e2e.ts [problem-slug]
// A Chromium window opens for about a minute. Screenshots land in .output/e2e/.

import { mkdir } from "node:fs/promises";
import path from "node:path";
import { chromium, devices, type Page } from "playwright";

const slug = process.argv[2] ?? "two-sum";
const extensionPath = path.resolve(".output/chrome-mv3");
const shots = path.resolve(".output/e2e");
await mkdir(shots, { recursive: true });

const layouts = {
  desktop: { viewport: { width: 1440, height: 960 }, colorScheme: "dark" as const },
  mobile: { ...devices["iPhone 15"], deviceScaleFactor: 2 },
};

async function check(page: Page, layout: string) {
  await page.goto(`https://leetcode.com/problems/${slug}/solutions/`, { waitUntil: "domcontentloaded" });
  const carousel = page.getByRole("region", { name: "Video solutions" });
  const cards = carousel.getByRole("listitem");
  await cards.first().waitFor({ timeout: 45_000 });

  const titles = await carousel.getByRole("list").getByRole("link").allTextContents();
  console.log(`\n[${layout}] ${slug}: ${titles.length} cards`);
  for (const [i, t] of titles.entries()) console.log(`  ${i + 1}. ${t}`);

  const placement = await page.locator("lse-video-solutions").evaluate((host, problem) => {
    const toolbar = host.nextElementSibling;
    const laterSiblings = [];
    for (let el = toolbar?.nextElementSibling; el; el = el.nextElementSibling) laterSiblings.push(el);
    const aboveList =
      Boolean(toolbar?.querySelector("input")) &&
      laterSiblings.some((el) => el.querySelector(`a[href*="/problems/${problem}/solutions/"]`));
    const shell = document.querySelector(".flexlayout__layout") ? "panel layout" : "single-column layout";
    return { aboveList, shell };
  }, slug);
  if (!placement.aboveList) throw new Error(`[${layout}] carousel is not directly above the solutions list`);
  console.log(`  placed above the solutions list, ${placement.shell}`);
  await carousel.screenshot({ path: path.join(shots, `${slug}-${layout}.png`) });

  await carousel
    .getByRole("button", { name: /^Play / })
    .first()
    .click();
  const player = carousel.getByRole("list").locator("iframe");
  await player.waitFor({ timeout: 15_000 });
  console.log(`  player: ${await player.getAttribute("src")}`);

  await carousel
    .getByRole("button", { name: /in a larger player$/ })
    .nth(1)
    .click();
  const theater = page.getByRole("dialog", { name: "Video player" });
  await theater.locator("iframe").waitFor({ timeout: 15_000 });
  if ((await player.count()) !== 0) throw new Error(`[${layout}] inline player kept playing behind the larger player`);
  console.log(`  larger player: ${await theater.locator("iframe").getAttribute("src")}`);
  await page.waitForTimeout(3_000);
  await page.screenshot({ path: path.join(shots, `${slug}-${layout}-theater.png`) });
  await page.keyboard.press("Escape");
  await theater.waitFor({ state: "hidden", timeout: 5_000 });
  console.log("  larger player closes with Esc");
}

// LeetCode's Cloudflare check never clears for headless Chromium.
const context = await chromium.launchPersistentContext("", {
  channel: "chromium",
  headless: false,
  args: [`--disable-extensions-except=${extensionPath}`, `--load-extension=${extensionPath}`],
});

try {
  const desktop = await context.newPage();
  await desktop.setViewportSize(layouts.desktop.viewport);
  await desktop.emulateMedia({ colorScheme: layouts.desktop.colorScheme });
  await check(desktop, "desktop");

  await desktop.locator(".flexlayout__tab_button", { hasText: "Description" }).first().click();
  await desktop.locator("lse-video-solutions").waitFor({ state: "detached", timeout: 5_000 });
  console.log("  removed after leaving the Solutions tab");
  await desktop.locator(".flexlayout__tab_button", { hasText: "Solutions" }).first().click();
  await desktop
    .getByRole("region", { name: "Video solutions" })
    .getByRole("listitem")
    .first()
    .waitFor({ timeout: 20_000 });
  console.log("  restored after returning to Solutions");
  await desktop.close();

  const mobile = await context.newPage();
  const { userAgent, viewport } = layouts.mobile;
  await mobile.setViewportSize(viewport);
  await mobile.setExtraHTTPHeaders({ "user-agent": userAgent });
  await mobile.addInitScript((ua) => Object.defineProperty(navigator, "userAgent", { get: () => ua }), userAgent);
  await check(mobile, "mobile");
} finally {
  await context.close();
}
