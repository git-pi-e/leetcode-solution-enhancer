// Runs live YouTube search outside the browser, through the same fetcher the extension uses.
// A problem with no live results usually means YouTube changed its page format.

import { resolveProblem } from "../src/leetcode/catalog";
import { CHANNEL_POLICY } from "../src/videos/channels";
import { selectVideos } from "../src/videos/select";
import { searchLive } from "../src/videos/youtube";

const slugs = Bun.argv.slice(2);
const problems = (
  slugs.length ? slugs : ["two-sum", "trapping-rain-water", "lru-cache", "median-of-two-sorted-arrays"]
).map(resolveProblem);

let empty = 0;
for (const problem of problems) {
  const started = performance.now();
  const { found, complete } = await searchLive(problem, CHANNEL_POLICY.channels);
  const videos = selectVideos(problem, [found], CHANNEL_POLICY);
  const ms = Math.round(performance.now() - started);
  console.log(
    `\n${problem.id}. ${problem.title}: ${videos.length} videos in ${ms} ms${complete ? "" : " (some searches failed)"}`,
  );
  for (const [i, v] of videos.entries()) {
    console.log(`  ${String(i + 1).padStart(2)} ${v.preferred ? "*" : " "} ${v.channel.padEnd(28)} ${v.title}`);
  }
  if (videos.length === 0) empty++;
}
process.exitCode = empty ? 1 : 0;
