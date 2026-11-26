import { channelKey } from "./channels";

export interface RawVideo {
  id: string;
  title: string;
  channel: string;
  handle: string | null;
  duration: string | null;
  views: string | null;
  publishedAt: number | null;
  isShort: boolean;
}

export interface Video {
  id: string;
  title: string;
  channel: string;
  duration: string | null;
  views: string | null;
  publishedAt: number | null;
  preferred: boolean;
}

export interface Found {
  byChannel: Map<string, RawVideo[]>;
  anyChannel: RawVideo[];
}

export function makeFound(
  byHandle: Iterable<[handle: string, videos: RawVideo[]]>,
  anyChannel: RawVideo[] = [],
): Found {
  const byChannel = new Map<string, RawVideo[]>();
  for (const [handle, videos] of byHandle) {
    const key = channelKey(handle);
    byChannel.set(key, [...(byChannel.get(key) ?? []), ...videos]);
  }
  return { byChannel, anyChannel };
}

export interface LiveResult {
  found: Found;
  complete: boolean;
}

export interface VideoRequest {
  slug: string;
  force: boolean;
}

export type Notice = { kind: "permission" } | { kind: "failed"; message: string };

export interface VideosResult {
  videos: Video[];
  notice?: Notice;
}

export function failedNotice(error: unknown): Notice {
  return { kind: "failed", message: error instanceof Error ? error.message : String(error) };
}
