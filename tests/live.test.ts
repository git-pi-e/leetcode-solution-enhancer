import { afterEach, describe, expect, it, vi } from "vitest";
import { searchLive } from "@/videos/youtube";

const twoSum = { slug: "two-sum", id: "1", title: "Two Sum" };

function resultsPage(...ids: string[]): string {
  const contents = ids.map((videoId) => ({ videoRenderer: { videoId, title: { simpleText: `Two Sum ${videoId}` } } }));
  return `<script>var ytInitialData = ${JSON.stringify({ contents })};</script>`;
}

function stubYouTube(respond: (url: string) => string | number) {
  vi.stubGlobal("fetch", async (url: string) => {
    const body = respond(url);
    return typeof body === "number" ? new Response("", { status: body }) : new Response(body);
  });
}

afterEach(() => vi.unstubAllGlobals());

describe("searchLive", () => {
  it("files each channel's results under that channel and the global search under any channel", async () => {
    stubYouTube((url) =>
      url.includes("/@NeetCode/")
        ? resultsPage("neetcodeVid")
        : url.includes("/@NickWhite/")
          ? resultsPage("nickVid01")
          : resultsPage("globalVid"),
    );
    const { found, complete } = await searchLive(twoSum, ["@NeetCode", "@NickWhite"]);
    expect(complete).toBe(true);
    expect(found.anyChannel.map((v) => v.id)).toEqual(["globalVid"]);
    expect(Object.fromEntries([...found.byChannel].map(([key, videos]) => [key, videos.map((v) => v.id)]))).toEqual({
      "@neetcode": ["neetcodeVid"],
      "@nickwhite": ["nickVid01"],
    });
  });

  it("counts a page without readable results as a failed search, not an empty one", async () => {
    stubYouTube((url) => (url.includes("/@NeetCode/") ? "<html>consent</html>" : resultsPage("globalVid")));
    const { complete } = await searchLive(twoSum, ["@NeetCode"]);
    expect(complete).toBe(false);
  });

  it("fails when every search fails", async () => {
    stubYouTube(() => 429);
    await expect(searchLive(twoSum, ["@NeetCode"])).rejects.toThrow("YouTube responded 429");
  });
});
