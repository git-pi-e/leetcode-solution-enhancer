import { defineExtensionMessaging } from "@webext-core/messaging";
import { failedNotice, type VideoRequest, type VideosResult } from "./videos/types";

interface ProtocolMap {
  getVideos(request: VideoRequest): VideosResult;
}

const messaging = defineExtensionMessaging<ProtocolMap>();

export const { onMessage } = messaging;

export async function requestVideos(request: VideoRequest): Promise<VideosResult> {
  try {
    return await messaging.sendMessage("getVideos", request);
  } catch (e) {
    return { videos: [], notice: failedNotice(e) };
  }
}
