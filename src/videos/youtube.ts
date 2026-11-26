// Reads videos out of the ytInitialData JSON that YouTube embeds in its HTML pages and browse API responses.
// There is no API key involved, so this follows YouTube's undocumented field names.
// Search results use `videoRenderer`. Channel uploads and YouTube's newer search layout use `lockupViewModel`.

import type { Problem } from "../leetcode/problem";
import { displayName } from "./channels";
import { parseDuration, parsePublished } from "./format";
import { type LiveResult, makeFound, type RawVideo } from "./types";
import { channelPageUrl, YOUTUBE_ORIGIN } from "./youtube-urls";

interface ChannelFallback {
  handle: string;
  name: string;
}

const INITIAL_DATA_MARKERS = ["var ytInitialData = ", 'window["ytInitialData"] = '];
const VIDEOS_ONLY_FILTER = "EgIQAQ%253D%253D";
const SEARCH_CONCURRENCY = 4;
const DESCRIPTION_ROW = "METADATA_ROW_CONTENT_TYPE_DESCRIPTION";

function at(value: unknown, ...path: (string | number)[]): unknown {
  let node = value;
  for (const key of path) {
    if (node === null || typeof node !== "object") return undefined;
    node = (node as Record<string | number, unknown>)[key];
  }
  return node;
}

function text(node: unknown): string {
  for (const key of ["simpleText", "content"]) {
    const value = at(node, key);
    if (typeof value === "string") return value;
  }
  const runs = at(node, "runs");
  return Array.isArray(runs) ? runs.map((run) => String(at(run, "text") ?? "")).join("") : "";
}

function channelUrl(node: unknown): string | null {
  const url =
    at(node, "runs", 0, "navigationEndpoint", "browseEndpoint", "canonicalBaseUrl") ??
    at(node, "commandRuns", 0, "onTap", "innertubeCommand", "browseEndpoint", "canonicalBaseUrl");
  return typeof url === "string" ? url.replace(/^\//, "") : null;
}

function cleanViews(value: string): string | null {
  return value.replace(/\s*views?$/i, "").trim() || null;
}

function fromVideoRenderer(v: unknown, fallback: ChannelFallback | null): RawVideo | null {
  const id = at(v, "videoId");
  if (typeof id !== "string") return null;
  const owner = at(v, "ownerText") ?? at(v, "longBylineText") ?? at(v, "shortBylineText");
  const handle = channelUrl(owner) ?? fallback?.handle ?? null;
  const published = text(at(v, "publishedTimeText"));
  return {
    id,
    title: text(at(v, "title")),
    channel: text(owner) || fallback?.name || (handle && displayName(handle)) || "",
    handle,
    duration: text(at(v, "lengthText")) || null,
    views: cleanViews(text(at(v, "shortViewCountText"))),
    publishedAt: published ? parsePublished(published) : null,
    isShort: at(v, "navigationEndpoint", "reelWatchEndpoint") !== undefined,
  };
}

function findDuration(node: unknown): string | null {
  const stack = [node];
  while (stack.length) {
    const current = stack.pop();
    if (typeof current === "string" && parseDuration(current) !== null) return current;
    if (current && typeof current === "object") stack.push(...Object.values(current));
  }
  return null;
}

function fromLockup(v: unknown, fallback: ChannelFallback | null): RawVideo | null {
  const id = at(v, "contentId");
  if (typeof id !== "string" || at(v, "contentType") !== "LOCKUP_CONTENT_TYPE_VIDEO") return null;
  const meta = at(v, "metadata", "lockupMetadataViewModel");
  const rows = at(meta, "metadata", "contentMetadataViewModel", "metadataRows");
  const parts = (Array.isArray(rows) ? rows : [])
    .filter((row) => at(row, "lockupContentMetadataRowExtension", "contentType") !== DESCRIPTION_ROW)
    .flatMap((row) => (at(row, "metadataParts") as unknown[]) ?? []);

  let channel = fallback?.name ?? "";
  let handle = fallback?.handle ?? null;
  let views: string | null = null;
  let publishedAt: number | null = null;
  for (const part of parts) {
    const node = at(part, "text") ?? at(part, "avatarStack", "avatarStackViewModel", "text");
    const label = text(node);
    const url = channelUrl(node);
    if (url) {
      channel = label;
      handle = url;
    } else if (/\bago$/i.test(label)) {
      publishedAt = parsePublished(label);
    } else if (/^[\d.,]+\s*[KMB]?(\s*views?)?$/i.test(label)) {
      views = cleanViews(label);
    }
  }
  return {
    id,
    title: text(at(meta, "title")),
    channel,
    handle,
    duration: findDuration(at(v, "contentImage")),
    views,
    publishedAt,
    isShort: false,
  };
}

export function extractInitialData(html: string): unknown {
  for (const marker of INITIAL_DATA_MARKERS) {
    const start = html.indexOf(marker);
    const end = start < 0 ? -1 : html.indexOf(";</script>", start);
    if (end >= 0) return JSON.parse(html.slice(start + marker.length, end));
  }
  return null;
}

export function collectVideos(data: unknown, fallback: ChannelFallback | null = null): RawVideo[] {
  const out: RawVideo[] = [];
  const stack: unknown[] = [data];
  while (stack.length) {
    const node = stack.pop();
    if (!node || typeof node !== "object") continue;
    const renderer = at(node, "videoRenderer");
    const lockup = at(node, "lockupViewModel");
    const video = renderer ? fromVideoRenderer(renderer, fallback) : lockup ? fromLockup(lockup, fallback) : null;
    if (video) out.push(video);
    else stack.push(...Object.values(node).reverse());
  }
  return out;
}

// An anonymous request can land on YouTube's cookie consent page instead of results. Cookies get past it.
async function fetchYouTubePage(url: string): Promise<{ html: string; data: unknown }> {
  for (const credentials of ["omit", "include"] as const) {
    const res = await fetch(url, { credentials, headers: { "Accept-Language": "en-US,en;q=0.9" } });
    if (!res.ok) throw new Error(`YouTube responded ${res.status}`);
    const html = await res.text();
    const data = extractInitialData(html);
    if (data) return { html, data };
  }
  throw new Error("YouTube returned a page without readable results");
}

function continuationToken(data: unknown): string | null {
  return JSON.stringify(data).match(/"continuationCommand":\{"token":"([^"]+)"/)?.[1] ?? null;
}

// Every upload of a channel, newest first, paged through the same browse API YouTube's own page uses.
export async function crawlChannelUploads(
  handle: string,
  maxPages: number,
): Promise<{ name: string; videos: RawVideo[] }> {
  const { html, data } = await fetchYouTubePage(channelPageUrl(handle, "videos"));
  const clientVersion = html.match(/"INNERTUBE_CLIENT_VERSION":"([^"]+)"/)?.[1];
  if (!clientVersion) throw new Error(`${handle}: uploads page has no client version`);

  const title = at(data, "metadata", "channelMetadataRenderer", "title");
  const fallback = { handle, name: typeof title === "string" ? title : displayName(handle) };
  const videos = collectVideos(data, fallback);
  let token = continuationToken(data);
  for (let page = 1; token && page < maxPages; page++) {
    const res = await fetch(`${YOUTUBE_ORIGIN}/youtubei/v1/browse?prettyPrint=false`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        context: { client: { clientName: "WEB", clientVersion, hl: "en", gl: "US" } },
        continuation: token,
      }),
    });
    if (!res.ok) throw new Error(`${handle}: browse responded ${res.status} on page ${page}`);
    const json: unknown = await res.json();
    videos.push(...collectVideos(json, fallback));
    token = continuationToken(json);
  }
  return { name: fallback.name, videos };
}

interface Search {
  url: string;
  channel: ChannelFallback | null;
}

interface Searched extends Search {
  videos: RawVideo[];
  error?: unknown;
}

async function runAll(searches: Search[], limit: number): Promise<Searched[]> {
  const queue = [...searches];
  const done: Searched[] = [];
  const worker = async () => {
    for (let search = queue.shift(); search; search = queue.shift()) {
      try {
        const { data } = await fetchYouTubePage(search.url);
        done.push({ ...search, videos: collectVideos(data, search.channel) });
      } catch (error) {
        done.push({ ...search, videos: [], error });
      }
    }
  };
  await Promise.all(Array.from({ length: limit }, worker));
  return done;
}

export async function searchLive(problem: Problem, handles: string[]): Promise<LiveResult> {
  const globalQuery = ["leetcode", problem.id, problem.title].filter(Boolean).join(" ");
  const searches: Search[] = [
    {
      url: `${YOUTUBE_ORIGIN}/results?search_query=${encodeURIComponent(globalQuery)}&sp=${VIDEOS_ONLY_FILTER}`,
      channel: null,
    },
    ...handles.map((handle) => ({
      url: channelPageUrl(handle, `search?query=${encodeURIComponent(problem.title)}`),
      channel: { handle, name: displayName(handle) },
    })),
  ];
  const results = await runAll(searches, SEARCH_CONCURRENCY);

  const failures = results.filter((r) => "error" in r);
  if (failures.length === results.length) {
    const reason = failures[0]?.error;
    throw reason instanceof Error ? reason : new Error(String(reason));
  }
  return {
    found: makeFound(
      results.flatMap(({ channel, videos }) => (channel ? [[channel.handle, videos] as [string, RawVideo[]]] : [])),
      results.flatMap(({ channel, videos }) => (channel ? [] : videos)),
    ),
    complete: failures.length === 0,
  };
}
