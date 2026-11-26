import { mount, unmount } from "svelte";
import { createShadowRootUi } from "wxt/utils/content-script-ui/shadow-root";
import { defineContentScript } from "wxt/utils/define-content-script";
import { findSolutionsToolbar, isDarkTheme, PROBLEM_PAGES, solutionsSlug } from "@/leetcode/page";
import Carousel from "./Carousel.svelte";
import { PageState } from "./page.svelte";

const placeAbove = (toolbar: Element, host: Element) => {
  if (toolbar.previousElementSibling !== host) toolbar.before(host);
};

export default defineContentScript({
  matches: [PROBLEM_PAGES],
  cssInjectionMode: "ui",
  runAt: "document_idle",

  async main(ctx) {
    const page = new PageState();
    let toolbar: Element | null = null;
    let mounted = false;

    const ui = await createShadowRootUi(ctx, {
      name: "lse-video-solutions",
      position: "inline",
      anchor: () => toolbar,
      append: placeAbove,
      isolateEvents: ["keydown", "keyup", "keypress"],
      onMount: (container) => mount(Carousel, { target: container, props: { page } }),
      onRemove: (app) => {
        if (app) unmount(app);
      },
    });

    // LeetCode is a single-page app that rebuilds its panels freely, so placement is rechecked on every DOM change.
    const ensure = () => {
      const slug = solutionsSlug(location.pathname);
      toolbar = slug ? findSolutionsToolbar(document, slug) : null;
      if (!slug) {
        if (mounted) ui.remove();
        mounted = false;
        return;
      }
      if (!toolbar) return;

      page.slug = slug;
      page.dark = isDarkTheme(document);

      if (!mounted) {
        ui.mount();
        mounted = true;
      } else {
        placeAbove(toolbar, ui.shadowHost);
      }
    };

    let scheduled = false;
    const schedule = () => {
      if (scheduled || ctx.isInvalid) return;
      scheduled = true;
      ctx.requestAnimationFrame(() => {
        scheduled = false;
        ensure();
      });
    };

    const domObserver = new MutationObserver(schedule);
    domObserver.observe(document.documentElement, { childList: true, subtree: true });
    const themeObserver = new MutationObserver(schedule);
    themeObserver.observe(document.documentElement, { attributeFilter: ["class"] });
    ctx.onInvalidated(() => {
      domObserver.disconnect();
      themeObserver.disconnect();
    });
    ctx.addEventListener(window, "wxt:locationchange", schedule);
    schedule();
  },
});
