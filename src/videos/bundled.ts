import type { VideosFile } from "../data/schema";
import index from "../data/videos.json";
import { CATALOG_VERSION, resolveProblem } from "../leetcode/catalog";
import { type Found, makeFound, type RawVideo } from "./types";

const { generatedAt, channels, videos } = index as unknown as VideosFile;

function bundledVideos(slug: string): Found {
  return makeFound(
    (videos[slug] ?? []).map(([id, channelIndex, title, duration, views, publishedAt]): [string, RawVideo[]] => {
      const channel = channels[channelIndex];
      if (!channel) throw new Error(`videos.json: ${slug} names channel ${channelIndex}, which does not exist`);
      const { handle, name } = channel;
      return [handle, [{ id, title, channel: name, handle, duration, views, publishedAt, isShort: false }]];
    }),
  );
}

// Everything that ships with the extension rather than coming from a live search.
export const bundled = {
  version: `${CATALOG_VERSION}/${generatedAt}`,
  problem: resolveProblem,
  videos: bundledVideos,
};
