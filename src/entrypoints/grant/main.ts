import { LEETCODE_ORIGIN } from "@/leetcode/page";
import { ACCESS_GRANTED_MESSAGE, requestYouTubeAccess } from "@/videos/access";

// Runs inside an iframe in the carousel, so the click counts as a click on an extension page.
const button = document.querySelector("button");
button?.addEventListener("click", async () => {
  try {
    if (await requestYouTubeAccess()) window.parent.postMessage(ACCESS_GRANTED_MESSAGE, LEETCODE_ORIGIN);
  } catch (e) {
    button.textContent = e instanceof Error ? e.message : String(e);
  }
});
