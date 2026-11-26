<script lang="ts">
  import Icon from "@/components/Icon.svelte";
  import { formatAge } from "@/videos/format";
  import type { Video } from "@/videos/types";
  import { thumbnailUrl, watchUrl } from "@/videos/youtube-urls";
  import Player from "./Player.svelte";

  let {
    video,
    rank,
    playing,
    onplay,
    onexpand,
  }: { video: Video; rank: number; playing: boolean; onplay: () => void; onexpand: () => void } = $props();

  const meta = $derived(
    [video.views && `${video.views} views`, video.publishedAt !== null && formatAge(video.publishedAt)]
      .filter(Boolean)
      .join(" · "),
  );
</script>

<li class="card">
  <div class="player">
    {#if playing}
      <Player {video} />
    {:else}
      <button class="thumb" type="button" aria-label={`Play ${video.title}`} onclick={onplay}>
        <img src={thumbnailUrl(video.id)} alt="" loading="lazy" decoding="async">
        <span class="play"><Icon name="play" size={22} /></span>
        {#if video.duration}
          <span class="badge duration">{video.duration}</span>
        {/if}
        <span class="badge rank">{rank}</span>
      </button>
    {/if}
  </div>
  <div class="info">
    <div class="text">
      <a class="title" href={watchUrl(video.id)} target="_blank" rel="noopener noreferrer" title={video.title}
        >{video.title}</a
      >
      <div class="meta">
        <span class="channel" class:preferred={video.preferred}>{video.channel}</span>
        {#if meta}
          <span>{meta}</span>
        {/if}
      </div>
    </div>
    <button
      class="expand"
      type="button"
      title="Watch in a larger player"
      aria-label={`Watch ${video.title} in a larger player`}
      onclick={onexpand}
    >
      <Icon name="expand" size={18} />
    </button>
  </div>
</li>

<style>
  .card {
    flex: 0 0 var(--lse-card-width);
    scroll-snap-align: start;
    border-radius: 8px;
    background: var(--lse-card);
    overflow: hidden;
  }

  .player {
    position: relative;
    aspect-ratio: 16 / 9;
    background: #000;
  }

  .thumb {
    all: unset;
    position: absolute;
    inset: 0;
    cursor: pointer;
  }

  .thumb:focus-visible {
    outline: 2px solid var(--lse-accent);
    outline-offset: -2px;
  }

  img {
    display: block;
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .play {
    position: absolute;
    top: 50%;
    left: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 52px;
    height: 36px;
    border-radius: 10px;
    background: rgb(0 0 0 / 0.7);
    color: #fff;
    transform: translate(-50%, -50%);
    transition: background 0.15s ease;
  }

  .thumb:hover .play,
  .thumb:focus-visible .play {
    background: #f00;
  }

  .badge {
    position: absolute;
    padding: 1px 5px;
    border-radius: 4px;
    background: rgb(0 0 0 / 0.78);
    color: #fff;
    font-size: 11px;
    font-weight: 500;
  }

  .duration {
    right: 6px;
    bottom: 6px;
  }

  .rank {
    top: 6px;
    left: 6px;
  }

  .info {
    display: flex;
    align-items: flex-start;
    gap: 8px;
    padding: 10px 8px 12px 12px;
  }

  .text {
    flex: 1;
    min-width: 0;
  }

  .expand {
    all: unset;
    display: inline-flex;
    flex: none;
    align-items: center;
    justify-content: center;
    width: 30px;
    height: 30px;
    border-radius: 6px;
    color: var(--lse-muted);
    cursor: pointer;
  }

  .expand:hover {
    background: var(--lse-bg);
    color: var(--lse-text);
  }

  .expand:focus-visible {
    outline: 2px solid var(--lse-accent);
  }

  .title {
    display: -webkit-box;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
    color: var(--lse-text);
    font-size: 14px;
    font-weight: 500;
    text-decoration: none;
  }

  .title:hover {
    color: var(--lse-accent);
  }

  .meta {
    display: flex;
    flex-wrap: wrap;
    gap: 2px 8px;
    margin-top: 4px;
    color: var(--lse-muted);
    font-size: 12px;
  }

  .preferred {
    color: var(--lse-accent);
    font-weight: 500;
  }
</style>
