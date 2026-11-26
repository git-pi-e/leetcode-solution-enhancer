import { describe, expect, it } from "vitest";
import { collectVideos, extractInitialData } from "@/videos/youtube";

describe("extractInitialData", () => {
  it("reads the JSON YouTube embeds in its pages", () => {
    expect(extractInitialData('<script>var ytInitialData = {"a":1};</script>')).toEqual({ a: 1 });
    expect(extractInitialData('<script>window["ytInitialData"] = {"b":2};</script>')).toEqual({ b: 2 });
  });

  it("returns null for pages without search data", () => {
    expect(extractInitialData("<html>consent</html>")).toBeNull();
  });

  it("reports why embedded data could not be read", () => {
    expect(() => extractInitialData("var ytInitialData = {broken;</script>")).toThrow(SyntaxError);
  });
});

describe("collectVideos", () => {
  it("reads search results in the videoRenderer shape", () => {
    const data = {
      contents: [
        {
          videoRenderer: {
            videoId: "KLlXCFG5TnA",
            title: { runs: [{ text: "Two Sum - Leetcode 1" }] },
            ownerText: {
              runs: [{ text: "NeetCode", navigationEndpoint: { browseEndpoint: { canonicalBaseUrl: "/@NeetCode" } } }],
            },
            lengthText: { simpleText: "8:26" },
            shortViewCountText: { simpleText: "2.4M views" },
            publishedTimeText: { simpleText: "6 years ago" },
          },
        },
      ],
    };
    expect(collectVideos(data)).toMatchObject([
      {
        id: "KLlXCFG5TnA",
        title: "Two Sum - Leetcode 1",
        channel: "NeetCode",
        handle: "@NeetCode",
        duration: "8:26",
        views: "2.4M",
        isShort: false,
      },
    ]);
  });

  it("reads channel uploads in the lockupViewModel shape", () => {
    const data = {
      items: [
        {
          lockupViewModel: {
            contentId: "6pzoo2HXJT8",
            contentType: "LOCKUP_CONTENT_TYPE_VIDEO",
            contentImage: {
              thumbnailViewModel: {
                overlays: [
                  { thumbnailBottomOverlayViewModel: { badges: [{ thumbnailBadgeViewModel: { text: "14:59" } }] } },
                ],
              },
            },
            metadata: {
              lockupMetadataViewModel: {
                title: { content: "LRU Cache - Leetcode 146" },
                metadata: {
                  contentMetadataViewModel: {
                    metadataRows: [{ metadataParts: [{ text: { content: "603K" } }, { text: { content: "3y ago" } }] }],
                  },
                },
              },
            },
          },
        },
        { lockupViewModel: { contentId: "PLAYLIST01", contentType: "LOCKUP_CONTENT_TYPE_PLAYLIST" } },
      ],
    };
    const [video, ...rest] = collectVideos(data, { handle: "@NeetCode", name: "NeetCode" });
    expect(rest).toEqual([]);
    expect(video).toMatchObject({
      id: "6pzoo2HXJT8",
      title: "LRU Cache - Leetcode 146",
      channel: "NeetCode",
      handle: "@NeetCode",
      duration: "14:59",
      views: "603K",
    });
  });

  it("reads the channel from search results in the lockupViewModel shape", () => {
    const byline = {
      avatarStack: {
        avatarStackViewModel: {
          text: {
            content: "Sean Chuah",
            commandRuns: [{ onTap: { innertubeCommand: { browseEndpoint: { canonicalBaseUrl: "/@chuahtseyung" } } } }],
          },
        },
      },
    };
    const data = {
      lockupViewModel: {
        contentId: "LRUCache146",
        contentType: "LOCKUP_CONTENT_TYPE_VIDEO",
        metadata: {
          lockupMetadataViewModel: {
            title: { content: "LRU Cache - LeetCode #146 - C++" },
            metadata: {
              contentMetadataViewModel: {
                metadataRows: [
                  {
                    metadataParts: [byline, { text: { content: "645" } }, { text: { content: "3y ago" } }],
                    lockupContentMetadataRowExtension: { contentType: "METADATA_ROW_CONTENT_TYPE_BYLINE" },
                  },
                  {
                    metadataParts: [{ text: { content: "Started coding 2 years ago" } }],
                    lockupContentMetadataRowExtension: { contentType: "METADATA_ROW_CONTENT_TYPE_DESCRIPTION" },
                  },
                ],
              },
            },
          },
        },
      },
    };
    const [video] = collectVideos(data);
    expect(video).toMatchObject({ channel: "Sean Chuah", handle: "@chuahtseyung", views: "645" });
    expect(video?.publishedAt).toBeLessThan(Date.now() - 2.5 * 365 * 86_400_000);
  });

  it("flags shorts", () => {
    const data = [{ videoRenderer: { videoId: "abcdefghijk", navigationEndpoint: { reelWatchEndpoint: {} } } }];
    expect(collectVideos(data)[0]?.isShort).toBe(true);
  });
});
