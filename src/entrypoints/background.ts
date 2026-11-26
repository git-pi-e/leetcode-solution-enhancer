import { defineBackground } from "wxt/utils/define-background";
import { onMessage } from "@/messaging";
import { hasYouTubeAccess } from "@/videos/access";
import { bundled } from "@/videos/bundled";
import { createVideoService } from "@/videos/service";
import { searchLive } from "@/videos/youtube";

export default defineBackground(() => {
  const getVideos = createVideoService({ searchLive, bundled, hasYouTubeAccess });
  onMessage("getVideos", ({ data }) => getVideos(data));
});
