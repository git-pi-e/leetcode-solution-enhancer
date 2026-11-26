// Shapes of the files scripts/build-index.ts writes next to this one.

export interface ProblemsFile {
  generatedAt: string;
  problems: Record<string, [id: string, title: string]>;
}

export type VideoEntry = [
  id: string,
  channel: number,
  title: string,
  duration: string | null,
  views: string | null,
  publishedAt: number | null,
];

export interface VideosFile {
  generatedAt: string;
  channels: { handle: string; name: string }[];
  videos: Record<string, VideoEntry[]>;
}
