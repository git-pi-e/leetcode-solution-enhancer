# Developer notes

## Commands

| Command                                  | What it does                                                                      |
| ---------------------------------------- | --------------------------------------------------------------------------------- |
| `bunx wxt` / `bunx wxt -b firefox`       | Open Chrome or Firefox with the extension loaded and hot reload                   |
| `bun run build:chrome` / `build:firefox` | Build into `.output/`. The Firefox build also runs Mozilla's `web-ext lint`       |
| `bun run zip:chrome` / `zip:firefox`     | Build the store packages. Firefox also gets the source archive AMO asks for       |
| `bun run lint`                           | Biome, then type-checking with `svelte-check-native`                              |
| `bun run test`                           | Unit tests                                                                        |
| `bun scripts/build-index.ts`             | Rebuild `src/data/` from LeetCode and YouTube (about 80 seconds)                  |
| `bun scripts/smoke.ts [slug ...]`        | Live YouTube search only. Exits non-zero if any problem comes back empty          |
| `node scripts/e2e.ts [slug]`             | After `build:chrome`, check the carousel on LeetCode's desktop and mobile layouts |
| `node scripts/load-check.ts`             | After `build:chrome`, load the extension and wait for its service worker          |

`bun install` points Git at `.githooks/`, whose pre-commit hook runs `bun run lint` and blocks the commit on lint, formatting or type errors. `git commit --no-verify` skips it once.

The e2e run opens a visible Chromium window, because LeetCode's Cloudflare check never clears for headless Chromium. CI cannot reach LeetCode for the same reason, so run it before tagging a release.

Svelte compiles with `fragments: "tree"` (set in `wxt.config.ts`). Its default clones each component's markup through `innerHTML`, which addons.mozilla.org's validator reports as an unsafe assignment. Keep the option, and check that `bun run build:firefox` still ends with 0 warnings after upgrading Svelte.

Type-checking uses TypeScript 7 through `svelte-check-native`, a third-party replacement for `svelte-check`, which does not support TypeScript 7 yet. Keep `--svelte-warnings bridge` in the `lint` script. Without it, Svelte's warnings come from the tool's own reimplementation, which misses unused CSS selectors. When upgrading the tool, plant a type error in a `.svelte` file and a `.ts` file and confirm both still fail `bun run lint`.

## Releasing

`.github/workflows/ci.yml` runs on every push to `main` and every pull request. It lints, type-checks, runs the unit tests, lints the Firefox package, loads the Chrome build in Chromium, and uploads both store packages plus the Firefox source archive as the `extension-packages` artifact.

`.github/workflows/release.yml` runs when a `v*` tag is pushed. It reruns CI, checks the tag against `version` in `package.json`, attaches the packages to a GitHub release, and submits them with `wxt submit`. Store review then decides when each listing goes live.

To release:

1. Run `bun scripts/build-index.ts`, `bun scripts/smoke.ts`, then `bun run build:chrome && node scripts/e2e.ts`.
2. Bump `version` in `package.json`, commit, and push a matching tag such as `v1.1.0`.

The publish job runs in the `stores` GitHub environment, which holds these secrets:

| Secret                                                                      | Where it comes from                                                                 |
| --------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| `CHROME_EXTENSION_ID`                                                       | The item ID shown in the Chrome Web Store developer dashboard                       |
| `CHROME_PUBLISHER_ID`                                                       | The ID in the dashboard URL, `chrome.google.com/webstore/devconsole/<publisher-id>` |
| `CHROME_SERVICE_ACCOUNT_CLIENT_EMAIL`, `CHROME_SERVICE_ACCOUNT_PRIVATE_KEY` | `client_email` and `private_key` from a Google Cloud service account's JSON key     |
| `FIREFOX_EXTENSION_ID`                                                      | The add-on's `gecko.id` in `wxt.config.ts`                                          |
| `FIREFOX_JWT_ISSUER`, `FIREFOX_JWT_SECRET`                                  | API credentials from addons.mozilla.org's developer hub                             |

The workflow uses version 2 of the Chrome Web Store API, which only accepts service accounts. Version 1.1 and its OAuth refresh tokens stopped working on October 15th, 2026.

`bunx wxt submit init` walks through creating them, and `wxt submit --dry-run` checks them without submitting.

Both stores need the first version uploaded by hand through their dashboards, together with the listing text, screenshots and privacy answers. Automated submissions only work for listings that already exist.

addons.mozilla.org reviewers rebuild the package from the source archive. It contains `src/data/`, so they do not need to rerun the index builder, and `bun install && bun run zip:firefox` reproduces the package.

The README screenshots in `docs/screenshots/` were captured from the Chrome build on live LeetCode. Retake them when the extension's UI changes.

`docs/demo.mp4` is a 1280 px H.264 cut of the README demo, and `docs/demo.gif` a 640 px, 10 fps loop of the same video, kept under 8 MB so the README loads quickly. GitHub only plays video it hosts itself, so the README shows the GIF and links it to the MP4. The demo's source project is not kept in this repository.

## Where videos come from

Every request merges two sources and picks from both with the same rules.

- **Live search:** one search inside each preferred channel plus one global YouTube search, read from the `ytInitialData` JSON embedded in each page.
- **Bundled index:** `scripts/build-index.ts` crawls every upload of the default channels, LeetCode's problem list and NeetCode's published problem-to-video map, then matches titles offline. A NeetCode pick whose title the runtime would reject is left out. The November 2026 build covers 3,400 of 4,124 problems.

YouTube serves search results in two formats (`videoRenderer` and `lockupViewModel`) and switches between them from one request to the next. The parser reads both.

The preferred channels and the minimum number of videos are fixed in `src/videos/channels.ts`.

When YouTube access is off or every live request fails, the bundled index answers alone. Results are cached per problem for 7 days, or 1 day when nothing matched, but only when every live search succeeded. A new index or a new extension version invalidates the cache, and the refresh button bypasses it.

## YouTube access

Chrome grants the `youtube.com` host permission at install. Firefox can withhold it. The carousel then shows **Allow YouTube access**, which is `src/entrypoints/grant/`, an extension page embedded as an iframe. Firefox only accepts `permissions.request` from an extension page during a click, and a click in the content script would not qualify. Once access is granted, the page messages the carousel, which searches again.

## Matching

- `Leetcode <number>`, or the number right before the title, counts as a number match.
- The full problem title counts as a title match unless a sequel marker such as `II`, `VII` or `2` follows it. Counted phrases such as `2 Pointers` are not sequels.
- A video naming a different LeetCode number is rejected.
- When building the index, a title matching several problems goes to the longest one, so "Candy Crush" is not filed under "Candy".
- Shorts and videos under a minute are dropped.

## Placement

The content script finds the first visible link to a solution of the current problem, walks up to the first container that also holds the list's search box, and inserts the carousel above that toolbar. LeetCode's panel layout and its mobile page share that structure. The pre-2023 UI is no longer served.

## Known limits

- YouTube has no keyless search API. If it renames the `videoRenderer` or `lockupViewModel` fields, `bun scripts/smoke.ts` fails and the bundled index keeps the carousel populated until `src/videos/youtube.ts` is fixed.
- The index only knows uploads that existed when it was built. Re-run `bun scripts/build-index.ts` before a release.
- A problem with no community solutions yet has nothing to anchor to, so it shows no carousel.
- The grant flow has not been exercised end to end by automation. Firefox's remote protocol cannot reach extension frames or the permission prompt. Check it by hand: remove the youtube.com permission in `about:addons`, reload a Solutions page, and click **Allow YouTube access**.
