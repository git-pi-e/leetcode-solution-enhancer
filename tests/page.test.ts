// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from "vitest";
import { findSolutionsToolbar, solutionsSlug } from "@/leetcode/page";

// happy-dom does no layout, so elements inside [data-hidden] stand in for panels LeetCode hides.
const realGetClientRects = Element.prototype.getClientRects;
vi.spyOn(Element.prototype, "getClientRects").mockImplementation(function (this: Element) {
  return this.closest("[data-hidden]") ? ([] as unknown as DOMRectList) : realGetClientRects.call(this);
});

const solutionsList = (slug: string) => `
  <div class="toolbar"><div><input placeholder="Search content..." /></div><button>Sort by</button></div>
  <div class="list">
    <div class="item"><a href="/problems/${slug}/solutions/127810/two-sum-by-leetcode/">Two Sum</a></div>
    <div class="item"><a href="/problems/${slug}/solutions/42/another/">Another</a></div>
  </div>`;

// Shapes captured from leetcode.com in November 2026, reduced to their structure.
const DESKTOP = `
  <div class="flexlayout__layout">
    <div class="flexlayout__tab" data-layout-path="/ts0/t0" data-hidden>
      <div class="overflow-auto"><input /><a href="/problems/two-sum/solutions/1/x/">editorial link</a></div>
    </div>
    <div class="flexlayout__tab" data-layout-path="/ts0/t2">
      <div class="overflow-auto">${solutionsList("two-sum")}</div>
    </div>
  </div>`;

const MOBILE = `
  <nav><input placeholder="Search problems" /></nav>
  <main><div class="tabs">Description Solutions Submissions</div>
    <div class="overflow-auto">${solutionsList("two-sum")}</div>
  </main>`;

afterEach(() => {
  document.body.innerHTML = "";
});

describe("findSolutionsToolbar", () => {
  it.each([
    ["desktop panels", DESKTOP],
    ["mobile page", MOBILE],
  ])("finds the toolbar above the solutions list on the %s", (_, html) => {
    document.body.innerHTML = html;
    const toolbar = findSolutionsToolbar(document, "two-sum");
    expect(toolbar?.className).toBe("toolbar");
    expect(toolbar?.nextElementSibling?.className).toBe("list");
  });

  it("waits while the list has not rendered yet", () => {
    document.body.innerHTML = `<main><div class="toolbar"><input /></div><div class="list"></div></main>`;
    expect(findSolutionsToolbar(document, "two-sum")).toBeNull();
  });

  it("ignores links to another problem's solutions", () => {
    document.body.innerHTML = `<main>${solutionsList("three-sum")}</main>`;
    expect(findSolutionsToolbar(document, "two-sum")).toBeNull();
    expect(findSolutionsToolbar(document, "three-sum")?.className).toBe("toolbar");
  });
});

describe("solutionsSlug", () => {
  it.each([
    ["/problems/two-sum/solutions/", "two-sum"],
    ["/problems/two-sum/solutions", "two-sum"],
    ["/problems/two-sum/solutions/127810/two-sum-by-leetcode/", null],
    ["/problems/two-sum/description/", null],
  ])("%s is %s", (path, slug) => {
    expect(solutionsSlug(path)).toBe(slug);
  });
});
