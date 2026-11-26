import { describe, expect, it } from "vitest";
import index from "@/data/videos.json";
import { bundled } from "@/videos/bundled";
import { CHANNEL_POLICY } from "@/videos/channels";
import { selectVideos } from "@/videos/select";

// Guards the shipped data files against drifting from src/data/schema.ts, which the JSON import casts cannot catch.
describe("bundled data", () => {
  it("knows problem numbers and titles", () => {
    expect(bundled.problem("two-sum")).toMatchObject({ slug: "two-sum", id: "1", title: "Two Sum" });
    expect(bundled.problem("two-sum").longerTitles).toContain("Two Sum IV - Input is a BST");
    expect(bundled.problem("lru-cache")).toEqual({ slug: "lru-cache", id: "146", title: "LRU Cache" });
  });

  it("shows every shipped video, and each is well formed", () => {
    const entries = Object.entries(index.videos as Record<string, unknown[]>);
    expect(entries.length).toBeGreaterThan(3000);
    const shortfalls = entries.flatMap(([slug, shipped]) => {
      const found = bundled.videos(slug);
      for (const v of [...found.byChannel.values()].flat()) {
        expect(v.id).toMatch(/^[\w-]{11}$/);
        expect(v.handle).toMatch(/^@/);
        expect(v.duration ?? "0:00").toMatch(/^\d+(:\d+)+$/);
      }
      const shown = selectVideos(bundled.problem(slug), [found], CHANNEL_POLICY).length;
      return shown === shipped.length ? [] : [`${slug}: ${shown} of ${shipped.length}`];
    });
    expect(shortfalls).toEqual([]);
  });
});
