export const YOUTUBE_ORIGIN = "https://www.youtube.com";
export const YOUTUBE_HOSTS = [`${YOUTUBE_ORIGIN}/*`];

export const watchUrl = (videoId: string) => `${YOUTUBE_ORIGIN}/watch?v=${encodeURIComponent(videoId)}`;
export const channelPageUrl = (handle: string, path = "") => `${YOUTUBE_ORIGIN}/${handle}${path && `/${path}`}`;
export const embedUrl = (videoId: string) =>
  `https://www.youtube-nocookie.com/embed/${encodeURIComponent(videoId)}?autoplay=1&rel=0`;
export const thumbnailUrl = (videoId: string) => `https://i.ytimg.com/vi/${encodeURIComponent(videoId)}/hqdefault.jpg`;
