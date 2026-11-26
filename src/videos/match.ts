import type { Problem } from "../leetcode/problem";

const SEQUEL_NUMERALS = new Set(["ii", "iii", "iv", "v", "vi", "vii", "viii", "ix", "x"]);
const SEQUEL_DIGITS = new Set(["2", "3", "4"]);
const COUNTED_WORDS = new Set([
  "pointer",
  "pointers",
  "approach",
  "approaches",
  "ways",
  "methods",
  "solutions",
  "min",
  "mins",
  "minutes",
  "lines",
]);
const STOPWORDS = new Set([
  "a",
  "an",
  "the",
  "of",
  "in",
  "on",
  "to",
  "is",
  "and",
  "or",
  "for",
  "with",
  "by",
  "from",
  "at",
]);
const LEETCODE_NUMBER = /\b(?:leetcode|leet\s*code|lc)\s*(?:problem|no\.?|number|q)?\s*[-#:|.]*\s*(\d{1,4})(?!\d)/gi;

function isSequel(following: string[]): boolean {
  const [first = "", second = ""] = following;
  if (SEQUEL_NUMERALS.has(first)) return true;
  return SEQUEL_DIGITS.has(first) && !COUNTED_WORDS.has(second);
}

function normalize(text: string): string {
  const words = text
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
  return ` ${words} `;
}

function referencedNumbers(title: string): Set<number> {
  return new Set([...title.matchAll(LEETCODE_NUMBER)].map((m) => Number(m[1])));
}

// How far past the matched title to look for words that belong to a longer problem's title.
const FOLLOWING_WINDOW = 4;

const contentWords = (words: string[]) =>
  words.filter((w) => w.length >= 3 && !STOPWORDS.has(w) && !SEQUEL_NUMERALS.has(w));

// The words each longer title adds after this problem's title: "Two Sum IV - Input is a BST" adds input and bst.
function addedWords(normProblem: string, longerTitles: string[]): Set<string>[] {
  return longerTitles
    .map((longer) => new Set(contentWords(normalize(longer).trim().slice(normProblem.length).trim().split(" "))))
    .filter((added) => added.size > 0);
}

// "Two Sum In BST" contains "Two Sum" but is about "Two Sum IV - Input is a BST".
// The words right after the match give it away when they cover at least half of what one longer title adds.
// One shared word is not enough on its own: "Maximum Subarray Sum" is just the common name of Maximum Subarray.
function namesLongerProblem(following: string[], addedPerTitle: Set<string>[]): boolean {
  const window = new Set(contentWords(following).slice(0, FOLLOWING_WINDOW));
  return addedPerTitle.some((added) => {
    const shared = [...added].filter((w) => window.has(w)).length;
    return shared > 0 && shared * 2 >= added.size;
  });
}

export function scoreTitle(videoTitle: string, problem: Pick<Problem, "id" | "title" | "longerTitles">): number {
  const id = problem.id ? Number(problem.id) : null;
  const normVideo = normalize(videoTitle);
  const normProblem = normalize(problem.title).trim();

  let titleMatch = false;
  let prefixedByNumber = false;
  let followedByLongerTitle = false;
  const added = addedWords(normProblem, problem.longerTitles ?? []);
  for (let from = 0; normProblem; ) {
    const idx = normVideo.indexOf(` ${normProblem} `, from);
    if (idx < 0) break;
    const following = normVideo.slice(idx + normProblem.length + 2).split(" ");
    if (!isSequel(following)) {
      titleMatch = true;
      prefixedByNumber = id !== null && normVideo.slice(0, idx + 1).endsWith(` ${id} `);
      followedByLongerTitle = namesLongerProblem(following, added);
      break;
    }
    from = idx + 1;
  }

  const referenced = referencedNumbers(videoTitle);
  const numberMatch = (id !== null && referenced.has(id)) || prefixedByNumber;
  if (referenced.size > 0 && !numberMatch) return 0;
  // The problem's own number outweighs the words around its title.
  if (followedByLongerTitle && !numberMatch) return 0;

  if (!titleMatch) {
    if (!numberMatch) return 0;
    const words = normProblem.split(" ").filter((w) => w && !STOPWORDS.has(w));
    const videoWords = new Set(normVideo.trim().split(" "));
    const overlap = words.filter((w) => videoWords.has(w)).length;
    if (overlap < Math.min(2, words.length)) return 0;
  }

  return (numberMatch ? 2 : 0) + (titleMatch ? 1 : 0);
}

// Fills in longerTitles from the rest of the catalog.
export function withLongerTitles<P extends Problem>(problems: P[]): P[] {
  const norms = problems.map((p) => normalize(p.title).trim());
  // A longer title shares the first word, so only that group needs comparing.
  const byFirstWord = new Map<string, number[]>();
  norms.forEach((n, i) => {
    const first = n.split(" ")[0] ?? "";
    byFirstWord.set(first, [...(byFirstWord.get(first) ?? []), i]);
  });
  return problems.map((p, i) => {
    const norm = norms[i] ?? "";
    const prefix = `${norm} `;
    const longerTitles = (byFirstWord.get(norm.split(" ")[0] ?? "") ?? [])
      .filter((j) => j !== i && norms[j]?.startsWith(prefix))
      .map((j) => problems[j]?.title as string);
    return longerTitles.length ? { ...p, longerTitles } : p;
  });
}

// Many LeetCode titles contain another problem's whole title, such as "Candy Crush" and "Candy".
interface ProblemMatch {
  problem: Problem;
  score: number;
}

const beats = (a: ProblemMatch, b: ProblemMatch | null) =>
  !b || a.score > b.score || (a.score === b.score && a.problem.title.length > b.problem.title.length);

export function createProblemMatcher(catalog: Problem[]) {
  const problems = withLongerTitles(catalog);
  const byId = new Map(problems.filter((p) => p.id).map((p) => [Number(p.id), p]));
  const byTitle = problems.map((p) => ({ problem: p, needle: ` ${normalize(p.title).trim()} ` }));

  return (videoTitle: string): ProblemMatch | null => {
    const normVideo = normalize(videoTitle);
    const candidates = new Set<Problem>();
    for (const n of referencedNumbers(videoTitle)) {
      const p = byId.get(n);
      if (p) candidates.add(p);
    }
    for (const { problem, needle } of byTitle) if (normVideo.includes(needle)) candidates.add(problem);

    return [...candidates]
      .map((problem) => ({ problem, score: scoreTitle(videoTitle, problem) }))
      .filter((m) => m.score > 0)
      .reduce<ProblemMatch | null>((best, m) => (beats(m, best) ? m : best), null);
  };
}
