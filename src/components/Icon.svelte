<script lang="ts" module>
  const PATHS = {
    prev: "M15.4 7.4 14 6l-6 6 6 6 1.4-1.4L10.8 12z",
    next: "M8.6 16.6 10 18l6-6-6-6-1.4 1.4 4.6 4.6z",
    refresh:
      "M17.65 6.35A7.96 7.96 0 0 0 12 4a8 8 0 1 0 7.75 10h-2.08A6 6 0 1 1 12 6c1.66 0 3.14.69 4.22 1.78L13 11h7V4z",
    play: "M8 5v14l11-7z",
    up: "M7.4 15.4 12 10.8l4.6 4.6L18 14l-6-6-6 6z",
    down: "M7.4 8.6 12 13.2l4.6-4.6L18 10l-6 6-6-6z",
    expand: "M7 14H5v5h5v-2H7zm-2-4h2V7h3V5H5zm12 7h-3v2h5v-5h-2zM14 5v2h3v3h2V5z",
    close: "M19 6.41 17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z",
  } as const;
</script>

<script lang="ts">
  let { name, size = 18 }: { name: keyof typeof PATHS; size?: number } = $props();
</script>

<svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true" fill="currentColor">
  <path d={PATHS[name]} />
</svg>
