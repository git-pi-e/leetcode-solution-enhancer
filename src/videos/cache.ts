import { storage } from "wxt/utils/storage";
import type { Video } from "./types";

const HIT_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const MISS_TTL_MS = 24 * 60 * 60 * 1000;
interface Entry {
  at: number;
  fingerprint: string;
  videos: Video[];
}

// One entry per problem. It only counts as a hit while everything it was computed from is unchanged.
export function openCache(slug: string, dependsOn: unknown) {
  const item = storage.defineItem<Entry | null>(`local:cache:${slug}`, { fallback: null });
  const fingerprint = JSON.stringify(dependsOn);
  return {
    id: `${slug}\n${fingerprint}`,
    async read(): Promise<Video[] | null> {
      const entry = await item.getValue();
      if (entry?.fingerprint !== fingerprint) return null;
      const ttl = entry.videos.length ? HIT_TTL_MS : MISS_TTL_MS;
      return Date.now() - entry.at < ttl ? entry.videos : null;
    },
    write: (videos: Video[]) => item.setValue({ at: Date.now(), fingerprint, videos }),
  };
}
