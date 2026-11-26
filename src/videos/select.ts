import type { Problem } from "../leetcode/problem";
import { type ChannelPolicy, channelKey } from "./channels";
import { parseDuration } from "./format";
import { scoreTitle } from "./match";
import type { Found, RawVideo, Video } from "./types";

const MIN_SECONDS = 60;

function isEligible(video: RawVideo): boolean {
  if (video.isShort || /#shorts?\b/i.test(video.title)) return false;
  return (parseDuration(video.duration) ?? MIN_SECONDS) >= MIN_SECONDS;
}

// 0 means the carousel never shows this video for this problem.
export function acceptScore(video: RawVideo, problem: Problem): number {
  return isEligible(video) ? scoreTitle(video.title, problem) : 0;
}

interface Candidate {
  video: RawVideo;
  score: number;
  priority: number;
}

const byScoreThenPriority = (a: Candidate, b: Candidate) => b.score - a.score || a.priority - b.priority;

function rank(videos: { video: RawVideo; priority: number }[], problem: Problem): Candidate[] {
  return videos
    .map((c) => ({ ...c, score: acceptScore(c.video, problem) }))
    .filter((c) => c.score > 0)
    .sort(byScoreThenPriority);
}

export function selectVideos(problem: Problem, sourcesByPriority: Found[], policy: ChannelPolicy): Video[] {
  const listed = (pick: (s: Found) => RawVideo[]) =>
    sourcesByPriority.flatMap((source, priority) => pick(source).map((video) => ({ video, priority })));

  const anyChannel = rank(
    listed((s) => s.anyChannel),
    problem,
  );
  const picked: Video[] = [];
  const usedIds = new Set<string>();
  const usedChannels = new Set<string>();

  const take = ({ video }: Candidate, preferred: boolean, ...channelKeys: string[]) => {
    const { id, title, channel, duration, views, publishedAt } = video;
    picked.push({ id, title, channel, duration, views, publishedAt, preferred });
    usedIds.add(id);
    for (const key of channelKeys) usedChannels.add(key);
  };
  const keyOf = (video: RawVideo) => channelKey(video.handle ?? video.channel);

  for (const handle of policy.channels) {
    const key = channelKey(handle);
    const own = rank(
      listed((s) => s.byChannel.get(key) ?? []),
      problem,
    );
    const listedElsewhere = anyChannel.filter((c) => keyOf(c.video) === key);
    const best = [...own, ...listedElsewhere].sort(byScoreThenPriority).find((c) => !usedIds.has(c.video.id));
    if (best) take(best, true, key, keyOf(best.video));
  }

  for (const candidate of anyChannel) {
    if (picked.length >= policy.target) break;
    const key = keyOf(candidate.video);
    if (!usedIds.has(candidate.video.id) && !usedChannels.has(key)) take(candidate, false, key);
  }

  return picked;
}
