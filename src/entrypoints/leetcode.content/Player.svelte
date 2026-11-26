<script lang="ts">
  import type { Video } from "@/videos/types";
  import { embedUrl } from "@/videos/youtube-urls";

  let { video }: { video: Video } = $props();
</script>

<iframe
  src={embedUrl(video.id)}
  title={video.title}
  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
  referrerpolicy="strict-origin-when-cross-origin"
  allowfullscreen
></iframe>

<style>
  iframe {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    border: 0;
  }
</style>
