export const LEETCODE_ORIGIN = "https://leetcode.com";
export const PROBLEM_PAGES = `${LEETCODE_ORIGIN}/problems/*`;
// Chrome rejects web_accessible_resources patterns whose path is anything but "/*".
export const ANY_LEETCODE_PAGE = `${LEETCODE_ORIGIN}/*`;

const SOLUTIONS_LIST_PATH = /^\/problems\/([^/]+)\/solutions\/?$/;

export function solutionsSlug(pathname: string): string | null {
  return pathname.match(SOLUTIONS_LIST_PATH)?.[1] ?? null;
}

export function isDarkTheme(doc: Document): boolean {
  return doc.documentElement.classList.contains("dark");
}

const isVisible = (el: Element) => el.getClientRects().length > 0;

// LeetCode's desktop panels and its mobile page render the same Solutions list.
// It is a toolbar with a search box, followed by links to individual solutions.
// Returns that toolbar, which the carousel goes right above.
export function findSolutionsToolbar(doc: Document, slug: string): Element | null {
  const solutionLink = /\/solutions\/\d+\//;
  const link = [...doc.querySelectorAll(`a[href*="/problems/${CSS.escape(slug)}/solutions/"]`)].find(
    (a) => solutionLink.test(a.getAttribute("href") ?? "") && isVisible(a),
  );
  for (let parent = link?.parentElement; parent && parent !== doc.body; parent = parent.parentElement) {
    const search = [...parent.querySelectorAll("input")].find(isVisible);
    const toolbar = search && [...parent.children].find((child) => child.contains(search));
    if (toolbar) return toolbar;
  }
  return null;
}
