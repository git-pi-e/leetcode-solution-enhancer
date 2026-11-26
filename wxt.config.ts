import { defineConfig } from "wxt";
import { ANY_LEETCODE_PAGE } from "./src/leetcode/page";
import { YOUTUBE_HOSTS } from "./src/videos/youtube-urls";

export default defineConfig({
  srcDir: "src",
  manifestVersion: 3,
  modules: ["@wxt-dev/module-svelte", "@wxt-dev/auto-icons"],
  // Build component DOM node by node. The default clones templates through innerHTML, which AMO's validator flags.
  svelte: {
    vite: { compilerOptions: { fragments: "tree" } },
  },
  autoIcons: {
    baseIconPath: "assets/icon.svg",
  },
  zip: {
    excludeSources: ["docs/**"],
  },
  webExt: {
    startUrls: ["https://leetcode.com/problems/two-sum/solutions/"],
  },
  manifest: ({ browser }) => ({
    name: "LeetCode Solution Enhancer",
    permissions: ["storage"],
    host_permissions: YOUTUBE_HOSTS,
    web_accessible_resources: [{ resources: ["grant.html"], matches: [ANY_LEETCODE_PAGE] }],
    // Chrome's manifest only takes an author email, so its publisher name comes from the store dashboard instead.
    ...(browser === "firefox" && {
      developer: { name: "git-pi-e", url: "https://github.com/git-pi-e" },
      browser_specific_settings: {
        gecko: {
          // Fixed by the existing addons.mozilla.org listing, which was created under this ID. AMO never lets it change.
          id: "leetcode-video-solutions@local",
          strict_min_version: "142.0",
          data_collection_permissions: { required: ["none"] },
        },
      },
    }),
  }),
});
