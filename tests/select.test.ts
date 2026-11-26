import { describe, expect, it } from "vitest";
import { displayName } from "@/videos/channels";
import { selectVideos } from "@/videos/select";
import { type Found, makeFound, type RawVideo } from "@/videos/types";

const twoSum = { slug: "two-sum", id: "1", title: "Two Sum" };
const policy = { channels: ["@NeetCode", "@codestorywithMIK", "@NickWhite"], target: 4 };

let nextId = 0;
function video(handle: string | null, title = "Two Sum - Leetcode 1", extra: Partial<RawVideo> = {}): RawVideo {
  return {
    id: `video${String(nextId++).padStart(6, "0")}`,
    title,
    channel: handle ? displayName(handle) : "Someone",
    handle,
    duration: "10:00",
    views: null,
    publishedAt: null,
    isShort: false,
    ...extra,
  };
}

const found = (byChannel: Record<string, RawVideo[]>, anyChannel: RawVideo[] = []): Found =>
  makeFound(Object.entries(byChannel), anyChannel);

const channelsOf = (videos: { channel: string }[]) => videos.map((v) => v.channel);

describe("selectVideos", () => {
  it("puts preferred channels first, in configured order, then fills from other channels", () => {
    const live = found({ "@NickWhite": [video("@NickWhite")], "@NeetCode": [video("@NeetCode")] }, [
      video("@Other1"),
      video("@Other2"),
      video("@Other3"),
    ]);
    const picks = selectVideos(twoSum, [live], policy);
    expect(channelsOf(picks)).toEqual(["NeetCode", "NickWhite", "Other1", "Other2"]);
    expect(picks.map((v) => v.preferred)).toEqual([true, true, false, false]);
  });

  it("finds a preferred channel's video in the general search when its own search came back empty", () => {
    const live = found({ "@codestorywithMIK": [] }, [video("@codestorywithMIK")]);
    expect(channelsOf(selectVideos(twoSum, [live], policy))).toEqual(["codestorywithMIK"]);
  });

  it("uses bundled videos for channels the live search missed, and live videos where both have one", () => {
    const liveNeet = video("@NeetCode");
    const live = found({ "@NeetCode": [liveNeet] });
    const bundled = found({ "@NeetCode": [video("@NeetCode")], "@codestorywithMIK": [video("@codestorywithMIK")] });
    const picks = selectVideos(twoSum, [live, bundled], policy);
    expect(picks.map((v) => v.id)).toEqual([liveNeet.id, expect.any(String)]);
    expect(channelsOf(picks)).toEqual(["NeetCode", "codestorywithMIK"]);
  });

  it("prefers a number-and-title match over a title-only match from the same channel", () => {
    const vague = video("@NeetCode", "Two Sum explained");
    const exact = video("@NeetCode", "Two Sum - Leetcode 1");
    const [pick] = selectVideos(twoSum, [found({ "@NeetCode": [vague, exact] })], policy);
    expect(pick?.id).toBe(exact.id);
  });

  it("skips shorts, videos under a minute, and videos about other problems, but keeps long videos", () => {
    const live = found({}, [
      video("@A", "Two Sum", { isShort: true }),
      video("@E", "Two Sum in 30 seconds #shorts"),
      video("@B", "Two Sum", { duration: "0:45" }),
      video("@C", "Two Sum II - Leetcode 167"),
      video("@D", "Two Sum"),
      video("@F", "Two Sum", { duration: "1:02:03" }),
    ]);
    expect(channelsOf(selectVideos(twoSum, [live], policy))).toEqual(["D", "F"]);
  });

  it("does not repeat a channel saved by its id when the general search lists it by handle", () => {
    const byId = { channels: ["channel/UC123"], target: 4 };
    const live = found({ "channel/UC123": [video("@NeetCode")] }, [video("@NeetCode"), video("@Other")]);
    expect(channelsOf(selectVideos(twoSum, [live], byId))).toEqual(["NeetCode", "Other"]);
  });

  it("shows each video once, even when several channels list it", () => {
    const shared = video("@NeetCode");
    const live = found({ "@NeetCode": [shared], "@NickWhite": [shared] }, [shared]);
    expect(selectVideos(twoSum, [live], policy).map((v) => v.id)).toEqual([shared.id]);
  });
});
