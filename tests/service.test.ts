import { beforeEach, describe, expect, it } from "vitest";
import { fakeBrowser } from "wxt/testing/fake-browser";
import { createVideoService } from "@/videos/service";
import { type LiveResult, makeFound, type RawVideo } from "@/videos/types";

function video(id: string, handle: string): RawVideo {
  return {
    id,
    title: "Two Sum - Leetcode 1",
    channel: handle,
    handle,
    duration: "10:00",
    views: null,
    publishedAt: null,
    isShort: false,
  };
}

const bundledFound = makeFound([["@NeetCode", [video("bundledNeet", "@NeetCode")]]]);
const liveFound = makeFound([["@codestorywithMIK", [video("liveMik", "@codestorywithMIK")]]]);

function setup(live: () => Promise<LiveResult>, access = true, indexVersion = "test") {
  const calls: string[][] = [];
  const getVideos = createVideoService({
    searchLive: async (_problem, channels) => {
      calls.push(channels);
      return live();
    },
    bundled: {
      version: indexVersion,
      problem: (slug) => ({ slug, id: "1", title: "Two Sum" }),
      videos: () => bundledFound,
    },
    hasYouTubeAccess: async () => access,
  });
  return { getVideos, calls };
}

const request = { slug: "two-sum", force: false };
const ids = (r: { videos: { id: string }[] }) => r.videos.map((v) => v.id);

beforeEach(() => fakeBrowser.reset());

describe("video service", () => {
  it("merges live and bundled videos", async () => {
    const { getVideos } = setup(async () => ({ found: liveFound, complete: true }));
    const result = await getVideos(request);
    expect(ids(result).sort()).toEqual(["bundledNeet", "liveMik"]);
    expect(result.notice).toBeUndefined();
  });

  it("shows bundled videos with a permission notice when YouTube access is off", async () => {
    const { getVideos, calls } = setup(async () => ({ found: liveFound, complete: true }), false);
    const result = await getVideos(request);
    expect(calls).toEqual([]);
    expect(ids(result)).toEqual(["bundledNeet"]);
    expect(result.notice).toEqual({ kind: "permission" });
  });

  it("shows bundled videos with a failure notice when live search fails", async () => {
    const { getVideos } = setup(async () => {
      throw new Error("YouTube responded 429");
    });
    const result = await getVideos(request);
    expect(ids(result)).toEqual(["bundledNeet"]);
    expect(result.notice).toEqual({ kind: "failed", message: "YouTube responded 429" });
  });

  it("serves repeats from the cache until forced", async () => {
    const { getVideos, calls } = setup(async () => ({ found: liveFound, complete: true }));
    const first = await getVideos(request);
    expect(await getVideos(request)).toEqual(first);
    expect(calls).toHaveLength(1);
    await getVideos({ ...request, force: true });
    expect(calls).toHaveLength(2);
  });

  it.each([
    ["a failed search", async () => Promise.reject(new Error("down"))],
    ["a partly failed search", async () => ({ found: liveFound, complete: false })],
  ])("does not cache the result of %s", async (_, live) => {
    const { getVideos, calls } = setup(live as () => Promise<LiveResult>);
    await getVideos(request);
    await getVideos(request);
    expect(calls).toHaveLength(2);
  });

  it("searches again once a new bundled index ships", async () => {
    const live = async () => ({ found: liveFound, complete: true });
    const first = setup(live, true, "index-1");
    await first.getVideos(request);
    await first.getVideos(request);
    expect(first.calls).toHaveLength(1);

    const updated = setup(live, true, "index-2");
    await updated.getVideos(request);
    expect(updated.calls).toHaveLength(1);
  });
});
