import { browser } from "wxt/browser";
import { YOUTUBE_HOSTS } from "./youtube-urls";

// Firefox lets users withhold host access from Manifest V3 extensions, so it is checked rather than assumed.
export function hasYouTubeAccess(): Promise<boolean> {
  return browser.permissions.contains({ origins: YOUTUBE_HOSTS });
}

// Firefox only honors this from an extension page, during a click.
export function requestYouTubeAccess(): Promise<boolean> {
  return browser.permissions.request({ origins: YOUTUBE_HOSTS });
}

export const ACCESS_GRANTED_MESSAGE = "lse:youtube-access-granted";
