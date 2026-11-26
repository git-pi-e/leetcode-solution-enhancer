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

The e2e run opens a visible Chromium window, because LeetCode's Cloudflare check never clears for headless Chromium. CI cannot reach LeetCode for the same reason, so run it by hand after changing how the carousel is placed or rendered.

Svelte compiles with `fragments: "tree"` (set in `wxt.config.ts`). Its default clones each component's markup through `innerHTML`, which addons.mozilla.org's validator reports as an unsafe assignment. Keep the option, and check that `bun run build:firefox` still ends with 0 warnings after upgrading Svelte.

Type-checking uses TypeScript 7 through `svelte-check-native`, a third-party replacement for `svelte-check`, which does not support TypeScript 7 yet. Keep `--svelte-warnings bridge` in the `lint` script. Without it, Svelte's warnings come from the tool's own reimplementation, which misses unused CSS selectors. When upgrading the tool, plant a type error in a `.svelte` file and a `.ts` file and confirm both still fail `bun run lint`.

## CI

`.github/workflows/ci.yml` runs on every push to `main` and every pull request. It lints, type-checks, runs the unit tests, lints the Firefox package, loads the Chrome build in Chromium, and uploads the built packages as the `extension-packages` artifact.

The Firefox source archive contains `src/data/`, so `bun install && bun run zip:firefox` rebuilds the package without rerunning the index builder.

`npm install && npm run build-for-amo` in the unpacked source archive reproduces `.output/firefox-mv3/` byte for byte. The script first reinstalls from `bun.lock`, because a plain npm install resolves newer Vite and Rolldown versions, which change the bundled content script. Keep the Bun version in the script in step with `packageManager`.

## README media

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
- A title match is also rejected when the next few words cover at least half of what a longer problem's title adds, unless the video gives this problem's number. "Two Sum In BST" is about "Two Sum IV - Input is a BST", not "Two Sum". One shared word is not enough, so "Maximum Subarray Sum" still counts as "Maximum Subarray".
- When building the index, a title matching several problems goes to the longest one, so "Candy Crush" is not filed under "Candy".
- Shorts and videos under a minute are dropped.

## Placement

The content script finds the first visible link to a solution of the current problem, walks up to the first container that also holds the list's search box, and inserts the carousel above that toolbar. LeetCode's panel layout and its mobile page share that structure. The pre-2023 UI is no longer served.

## Known limits

- YouTube has no keyless search API. If it renames the `videoRenderer` or `lockupViewModel` fields, `bun scripts/smoke.ts` fails and the bundled index keeps the carousel populated until `src/videos/youtube.ts` is fixed.
- The index only knows uploads that existed when it was built. Re-run `bun scripts/build-index.ts` to pick up newer uploads.
- A problem with no community solutions yet has nothing to anchor to, so it shows no carousel.
- The grant flow has not been exercised end to end by automation. Firefox's remote protocol cannot reach extension frames or the permission prompt. Check it by hand: remove the youtube.com permission in `about:addons`, reload a Solutions page, and click **Allow YouTube access**.
