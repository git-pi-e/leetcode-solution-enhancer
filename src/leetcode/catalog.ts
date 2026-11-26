import catalog from "../data/problems.json";
import type { ProblemsFile } from "../data/schema";
import { withLongerTitles } from "../videos/match";
import type { Problem } from "./problem";

const { generatedAt, problems } = catalog as unknown as ProblemsFile;

export const CATALOG_VERSION = generatedAt;

let known: Map<string, Problem> | null = null;
function knownProblems(): Map<string, Problem> {
  known ??= new Map(
    withLongerTitles(Object.entries(problems).map(([slug, [id, title]]) => ({ slug, id, title }))).map((p) => [
      p.slug,
      p,
    ]),
  );
  return known;
}

// A LeetCode slug is its title in kebab case, which is enough to search for problems newer than the catalog.
export function resolveProblem(slug: string): Problem {
  return knownProblems().get(slug) ?? { slug, id: null, title: slug.replace(/-/g, " ") };
}
