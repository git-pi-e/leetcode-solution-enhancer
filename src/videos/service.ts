import { version } from "../../package.json";
import type { Problem } from "../leetcode/problem";
import { openCache } from "./cache";
import { CHANNEL_POLICY } from "./channels";
import { selectVideos } from "./select";
import { type Found, failedNotice, type LiveResult, type Notice, type VideoRequest, type VideosResult } from "./types";

interface Sources {
  searchLive: (problem: Problem, channels: string[]) => Promise<LiveResult>;
  bundled: { version: string; problem: (slug: string) => Problem; videos: (slug: string) => Found };
  hasYouTubeAccess: () => Promise<boolean>;
}

export function createVideoService({ searchLive, bundled, hasYouTubeAccess }: Sources) {
  const inFlight = new Map<string, Promise<VideosResult>>();

  async function answer(slug: string, cache: ReturnType<typeof openCache>): Promise<VideosResult> {
    const problem = bundled.problem(slug);
    let live: LiveResult | null = null;
    let notice: Notice | undefined;
    if (!(await hasYouTubeAccess())) {
      notice = { kind: "permission" };
    } else {
      try {
        live = await searchLive(problem, CHANNEL_POLICY.channels);
      } catch (e) {
        notice = failedNotice(e);
      }
    }

    const fallback = bundled.videos(slug);
    const videos = selectVideos(problem, live ? [live.found, fallback] : [fallback], CHANNEL_POLICY);
    if (live?.complete) await cache.write(videos);
    return notice ? { videos, notice } : { videos };
  }

  return async function getVideos({ slug, force }: VideoRequest): Promise<VideosResult> {
    const cache = openCache(slug, [bundled.version, version]);
    const cached = force ? null : await cache.read();
    if (cached) return { videos: cached };

    let job = inFlight.get(cache.id);
    if (!job) {
      job = answer(slug, cache).finally(() => inFlight.delete(cache.id));
      inFlight.set(cache.id, job);
    }
    return job;
  };
}
