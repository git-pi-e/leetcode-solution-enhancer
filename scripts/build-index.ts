// Rebuilds the files in src/data/ that ship with the extension (shapes in src/data/schema.ts).

import type { ProblemsFile, VideoEntry, VideosFile } from "../src/data/schema";
import type { Problem } from "../src/leetcode/problem";
import { CHANNEL_POLICY, sameHandle } from "../src/videos/channels";
import { createProblemMatcher } from "../src/videos/match";
import { acceptScore } from "../src/videos/select";
import type { RawVideo } from "../src/videos/types";
import { crawlChannelUploads } from "../src/videos/youtube";

const LEETCODE_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Safari/537.36";
const NEETCODE_DATA = "https://raw.githubusercontent.com/neetcode-gh/leetcode/main/.problemSiteData.json";
const NEETCODE_HANDLES = ["@NeetCode", "@NeetCodeIO"];
const MAX_PAGES_PER_CHANNEL = 400;

for (const handle of NEETCODE_HANDLES) {
  if (!CHANNEL_POLICY.channels.some((c) => sameHandle(c, handle))) {
    throw new Error(`${handle} is no longer a preferred channel. Update NEETCODE_HANDLES.`);
  }
}

interface ProblemPage {
  totalLength: number;
  questions: { titleSlug: string; title: string; questionFrontendId: string }[];
}

async function fetchProblemPage(skip: number): Promise<ProblemPage> {
  const res = await fetch("https://leetcode.com/graphql/", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      referer: "https://leetcode.com/problemset/",
      "user-agent": LEETCODE_UA,
    },
    body: JSON.stringify({
      query: `query page($skip: Int!) { problemsetQuestionListV2(limit: 100, skip: $skip) {
        totalLength questions { titleSlug title questionFrontendId } } }`,
      variables: { skip },
    }),
  });
  if (!res.ok) throw new Error(`LeetCode responded ${res.status}`);
  return (await res.json()).data.problemsetQuestionListV2;
}

async function fetchProblems(): Promise<Problem[]> {
  const questions: ProblemPage["questions"] = [];
  for (let total = Number.POSITIVE_INFINITY; questions.length < total; ) {
    const page = await fetchProblemPage(questions.length);
    if (page.questions.length === 0) break;
    questions.push(...page.questions);
    total = page.totalLength;
  }
  return questions.map((q) => ({ slug: q.titleSlug, id: q.questionFrontendId, title: q.title }));
}

async function fetchNeetCodePicks(): Promise<Map<string, string>> {
  const res = await fetch(NEETCODE_DATA);
  if (!res.ok) throw new Error(`NeetCode data responded ${res.status}`);
  const rows = (await res.json()) as { link: string; video?: string }[];
  return new Map(rows.filter((r) => r.video).map((r) => [r.link.replace(/\/$/, ""), r.video as string]));
}

const DAY_MS = 86_400_000;
const started = performance.now();

const [problems, neetcodePicks] = await Promise.all([fetchProblems(), fetchNeetCodePicks()]);
console.log(`${problems.length} problems, ${neetcodePicks.size} NeetCode picks`);

const crawled = await Promise.all(
  CHANNEL_POLICY.channels.map(async (handle) => {
    const channel = await crawlChannelUploads(handle, MAX_PAGES_PER_CHANNEL);
    console.log(`${handle}: ${channel.videos.length} uploads`);
    return { handle, ...channel };
  }),
);

const matchProblem = createProblemMatcher(problems);
const best = new Map<string, Map<number, { video: RawVideo; score: number }>>();
crawled.forEach(({ videos }, channelIndex) => {
  for (const video of videos) {
    const problem = matchProblem(video.title)?.problem;
    const score = problem ? acceptScore(video, problem) : 0;
    if (!problem || score === 0) continue;
    const perChannel = best.get(problem.slug) ?? new Map();
    const current = perChannel.get(channelIndex);
    if (!current || score > current.score) perChannel.set(channelIndex, { video, score });
    best.set(problem.slug, perChannel);
  }
});

// NeetCode publishes which of its videos solves which problem. That beats title matching when both exist.
// A pick the extension would reject at runtime (misspelled title, too short) is not shipped.
let neetcodeOverrides = 0;
let neetcodeRejected = 0;
const problemsBySlug = new Map(problems.map((p) => [p.slug, p]));
const neetcodeChannels = crawled.flatMap(({ handle }, i) =>
  NEETCODE_HANDLES.some((h) => sameHandle(h, handle)) ? [i] : [],
);
for (const [slug, videoId] of neetcodePicks) {
  const problem = problemsBySlug.get(slug);
  for (const channelIndex of neetcodeChannels) {
    const video = crawled[channelIndex]?.videos.find((v) => v.id === videoId);
    if (!video || !problem) continue;
    const score = acceptScore(video, problem);
    if (score === 0) {
      neetcodeRejected++;
      continue;
    }
    const perChannel = best.get(slug) ?? new Map();
    if (perChannel.get(channelIndex)?.video.id !== videoId) neetcodeOverrides++;
    perChannel.set(channelIndex, { video, score });
    best.set(slug, perChannel);
  }
}

const videos: Record<string, VideoEntry[]> = {};
for (const [slug, perChannel] of [...best].sort(([a], [b]) => a.localeCompare(b))) {
  videos[slug] = [...perChannel]
    .sort(([a], [b]) => a - b)
    .map(([channel, { video }]) => [
      video.id,
      channel,
      video.title,
      video.duration,
      video.views,
      video.publishedAt === null ? null : Math.round(video.publishedAt / DAY_MS) * DAY_MS,
    ]);
}

const generatedAt = new Date().toISOString();
const problemsFile: ProblemsFile = {
  generatedAt,
  problems: Object.fromEntries(problems.map((p) => [p.slug, [p.id ?? "", p.title]])),
};
const videosFile: VideosFile = { generatedAt, channels: crawled.map(({ handle, name }) => ({ handle, name })), videos };
await Bun.write("src/data/problems.json", `${JSON.stringify(problemsFile)}\n`);
await Bun.write("src/data/videos.json", `${JSON.stringify(videosFile)}\n`);

const covered = Object.keys(videos).length;
console.log(
  `${covered}/${problems.length} problems have at least one video, ` +
    `${neetcodeOverrides} NeetCode overrides (${neetcodeRejected} rejected), ` +
    `${Math.round((performance.now() - started) / 1000)}s`,
);
