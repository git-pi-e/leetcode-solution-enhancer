<script lang="ts" module>
  import { storage } from "wxt/utils/storage";

  const collapsedItem = storage.defineItem<boolean>("local:collapsed", { fallback: false });
</script>

<script lang="ts">
  import { onMount, tick, untrack } from "svelte";
  import { browser } from "wxt/browser";
  import Icon from "@/components/Icon.svelte";
  import { requestVideos } from "@/messaging";
  import { ACCESS_GRANTED_MESSAGE } from "@/videos/access";
  import type { Video, VideosResult } from "@/videos/types";
  import { watchUrl } from "@/videos/youtube-urls";
  import Player from "./Player.svelte";
  import type { PageState } from "./page.svelte";
  import VideoCard from "./VideoCard.svelte";

  let { page }: { page: PageState } = $props();

  let result = $state<VideosResult | null>(null);
  let refreshing = $state(false);
  let playing = $state<string | null>(null);
  let collapsed = $state(false);
  let track = $state<HTMLElement>();
  let grantFrame = $state<HTMLIFrameElement>();
  let theater = $state<Video | null>(null);
  let theaterDialog = $state<HTMLDialogElement>();
  let theaterClose = $state<HTMLButtonElement>();
  let canPrev = $state(false);
  let canNext = $state(false);
  let loadToken = 0;

  const videos = $derived(result?.videos ?? []);
  const status = $derived(result && describe(result));

  function describe({ videos, notice }: VideosResult): { text: string; action: "grant" | "retry" } | null {
    if (!notice) return videos.length ? null : { text: "No video solutions found.", action: "retry" };
    switch (notice.kind) {
      case "permission":
        return videos.length
          ? { text: "Showing saved videos.", action: "grant" }
          : { text: "YouTube access is needed to search for videos.", action: "grant" };
      case "failed":
        return videos.length
          ? { text: "Live search failed, showing saved videos.", action: "retry" }
          : { text: `Could not load videos: ${notice.message}`, action: "retry" };
      default:
        return notice satisfies never;
    }
  }

  async function load(slug: string, force: boolean) {
    const token = ++loadToken;
    playing = null;
    result = null;
    refreshing = force;

    const next = await requestVideos({ slug, force });
    if (token !== loadToken) return;
    result = next;

    await tick();
    track?.scrollTo({ left: 0 });
    updateArrows();
  }

  $effect(() => {
    const slug = page.slug;
    if (slug) untrack(() => load(slug, false));
  });

  onMount(() => {
    collapsedItem.getValue().then((value) => (collapsed = value));
    const resize = new ResizeObserver(updateArrows);
    if (track) resize.observe(track);
    const onGranted = (event: MessageEvent) => {
      if (event.data === ACCESS_GRANTED_MESSAGE && event.source === grantFrame?.contentWindow) refresh();
    };
    window.addEventListener("message", onGranted);
    return () => {
      resize.disconnect();
      window.removeEventListener("message", onGranted);
    };
  });

  function updateArrows() {
    if (!track) return;
    canPrev = track.scrollLeft > 4;
    canNext = track.scrollLeft + track.clientWidth < track.scrollWidth - 4;
  }

  function scrollByCard(direction: -1 | 1) {
    const card = track?.firstElementChild;
    if (!track || !card) return;
    const step = card.getBoundingClientRect().width + Number.parseFloat(getComputedStyle(track).columnGap);
    const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
    track.scrollBy({ left: direction * step, behavior: reduceMotion ? "instant" : "smooth" });
  }

  function onTrackKeydown(event: KeyboardEvent) {
    if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
      event.preventDefault();
      scrollByCard(event.key === "ArrowLeft" ? -1 : 1);
    }
  }

  function toggleCollapsed() {
    collapsed = !collapsed;
    if (collapsed) playing = null;
    collapsedItem.setValue(collapsed);
  }

  function refresh() {
    if (page.slug) load(page.slug, true);
  }

  async function openTheater(video: Video) {
    playing = null;
    theater = video;
    await tick();
    theaterDialog?.showModal();
    // Focus would otherwise land in the YouTube iframe, which swallows Esc.
    theaterClose?.focus();
  }

  function onTheaterClick(event: MouseEvent) {
    if (event.target === theaterDialog) theaterDialog.close();
  }
</script>

<section class="lse" class:dark={page.dark} aria-label="Video solutions">
  <header>
    <div class="heading">
      <span class="label">Video Solutions</span>
      {#if videos.length}
        <span class="count">{videos.length}</span>
      {/if}
    </div>
    <div class="actions">
      {#if !collapsed && videos.length}
        <button
          class="icon-button"
          type="button"
          title="Previous"
          aria-label="Previous video"
          disabled={!canPrev}
          onclick={() => scrollByCard(-1)}
        >
          <Icon name="prev" />
        </button>
        <button
          class="icon-button"
          type="button"
          title="Next"
          aria-label="Next video"
          disabled={!canNext}
          onclick={() => scrollByCard(1)}
        >
          <Icon name="next" />
        </button>
      {/if}
      <button
        class="icon-button"
        type="button"
        title="Search again"
        aria-label="Search YouTube again"
        onclick={refresh}
      >
        <Icon name="refresh" />
      </button>
      <button
        class="icon-button"
        type="button"
        title={collapsed ? "Expand" : "Collapse"}
        aria-label={collapsed ? "Expand video solutions" : "Collapse video solutions"}
        aria-expanded={!collapsed}
        onclick={toggleCollapsed}
      >
        <Icon name={collapsed ? "down" : "up"} />
      </button>
    </div>
  </header>

  <div class="body" hidden={collapsed}>
    {#if !result}
      <p class="status">{refreshing ? "Searching YouTube again…" : "Finding video solutions…"}</p>
      <div class="track" aria-hidden="true">
        {#each { length: 3 } as _}
          <div class="skeleton">
            <div class="shimmer frame"></div>
            <div class="shimmer bar"></div>
            <div class="shimmer bar short"></div>
          </div>
        {/each}
      </div>
    {:else if status}
      <p class="status">
        {status.text}
        {#if status.action === "grant"}
          <iframe
            class="grant"
            title="Allow YouTube access"
            src={browser.runtime.getURL("/grant.html")}
            bind:this={grantFrame}
          ></iframe>
        {:else}
          <button type="button" class="link" onclick={refresh}>Retry</button>
        {/if}
      </p>
    {/if}

    <!-- svelte-ignore a11y_no_noninteractive_tabindex, a11y_no_noninteractive_element_interactions -->
    <ul
      class="track"
      tabindex={videos.length ? 0 : -1}
      hidden={!videos.length}
      bind:this={track}
      onscroll={updateArrows}
      onkeydown={onTrackKeydown}
    >
      {#each videos as video, i (video.id)}
        <VideoCard
          {video}
          rank={i + 1}
          playing={playing === video.id}
          onplay={() => (playing = video.id)}
          onexpand={() => openTheater(video)}
        />
      {/each}
    </ul>
  </div>

  <!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_noninteractive_element_interactions -->
  <!-- biome-ignore lint/a11y/useKeyWithClickEvents: Esc already closes the dialog natively -->
  <dialog
    class="theater"
    aria-label="Video player"
    bind:this={theaterDialog}
    onclose={() => (theater = null)}
    onclick={onTheaterClick}
  >
    {#if theater}
      <div class="theater-player"><Player video={theater} /></div>
      <div class="theater-bar">
        <a href={watchUrl(theater.id)} target="_blank" rel="noopener noreferrer">{theater.title}</a>
        <span class="theater-channel">{theater.channel}</span>
        <button
          class="icon-button"
          type="button"
          title="Close"
          aria-label="Close player"
          bind:this={theaterClose}
          onclick={() => theaterDialog?.close()}
        >
          <Icon name="close" />
        </button>
      </div>
    {/if}
  </dialog>
</section>

<style>
  .lse {
    --lse-bg: #fff;
    --lse-card: #f7f7f8;
    --lse-border: rgb(0 0 0 / 0.08);
    --lse-text: #262626;
    --lse-muted: #737373;
    --lse-accent: #ffa116;
    --lse-skeleton: rgb(0 0 0 / 0.07);
    --lse-card-width: min(88%, 420px);

    display: block;
    margin: 12px 16px 4px;
    padding: 10px 12px 12px;
    border: 1px solid var(--lse-border);
    border-radius: 10px;
    background: var(--lse-bg);
    color: var(--lse-text);
    font:
      13px / 1.4 -apple-system,
      BlinkMacSystemFont,
      "Segoe UI",
      Roboto,
      "Helvetica Neue",
      Arial,
      sans-serif;
    -webkit-font-smoothing: antialiased;
  }

  .lse.dark {
    --lse-bg: #262626;
    --lse-card: #303030;
    --lse-border: rgb(255 255 255 / 0.1);
    --lse-text: #eff1f6;
    --lse-muted: #a3a3a3;
    --lse-skeleton: rgb(255 255 255 / 0.08);
  }

  header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
  }

  .heading {
    display: flex;
    align-items: center;
    gap: 8px;
    min-width: 0;
  }

  .label {
    font-size: 14px;
    font-weight: 600;
  }

  .count {
    padding: 0 7px;
    border-radius: 999px;
    background: var(--lse-card);
    color: var(--lse-muted);
    font-size: 12px;
  }

  .actions {
    display: flex;
    gap: 2px;
  }

  .icon-button {
    all: unset;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 30px;
    height: 30px;
    border-radius: 6px;
    color: var(--lse-muted);
    cursor: pointer;
  }

  .icon-button:focus-visible {
    outline: 2px solid var(--lse-accent);
  }

  .icon-button:disabled {
    opacity: 0.35;
    cursor: default;
  }

  .icon-button:hover:not(:disabled) {
    background: var(--lse-card);
    color: var(--lse-text);
  }

  .body[hidden],
  .track[hidden] {
    display: none;
  }

  .status {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px;
    margin: 8px 0 0;
    color: var(--lse-muted);
  }

  .link {
    all: unset;
    color: var(--lse-accent);
    font-weight: 500;
    cursor: pointer;
  }

  .link:hover,
  .link:focus-visible {
    text-decoration: underline;
  }

  .theater {
    /* The 16:9 player plus the 50px bar must fit the window height too, with room around the dialog. */
    width: min(92vw, 1280px, (100dvh - 120px) * 16 / 9);
    max-width: none;
    max-height: none;
    padding: 0;
    border: 0;
    border-radius: 12px;
    background: var(--lse-bg);
    color: var(--lse-text);
    overflow: hidden;
  }

  .theater::backdrop {
    background: rgb(0 0 0 / 0.75);
  }

  .theater-player {
    position: relative;
    aspect-ratio: 16 / 9;
    background: #000;
  }

  .theater-bar {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 10px 12px 10px 16px;
  }

  .theater-bar a {
    overflow: hidden;
    color: var(--lse-text);
    font-size: 15px;
    font-weight: 500;
    text-decoration: none;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .theater-bar a:hover {
    color: var(--lse-accent);
  }

  .theater-channel {
    flex: 1;
    color: var(--lse-muted);
    white-space: nowrap;
  }

  .grant {
    width: 150px;
    height: 20px;
    border: 0;
    color-scheme: normal;
  }

  .track {
    display: flex;
    gap: 12px;
    margin: 10px 0 0;
    padding: 0 0 6px;
    list-style: none;
    overflow-x: auto;
    scroll-snap-type: x mandatory;
    scrollbar-width: thin;
    outline: none;
  }

  .track:focus-visible {
    outline: 2px solid var(--lse-accent);
    outline-offset: 2px;
  }

  .skeleton {
    flex: 0 0 var(--lse-card-width);
    border-radius: 8px;
    background: var(--lse-card);
    overflow: hidden;
  }

  .shimmer {
    background: var(--lse-skeleton);
    animation: pulse 1.2s ease-in-out infinite;
  }

  .frame {
    aspect-ratio: 16 / 9;
  }

  .bar {
    height: 10px;
    margin: 10px 10px 0;
    border-radius: 4px;
  }

  .bar.short {
    width: 55%;
    margin-bottom: 12px;
  }

  @keyframes pulse {
    50% {
      opacity: 0.5;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .shimmer {
      animation: none;
    }
  }
</style>
