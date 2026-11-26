import catalog from "../data/problems.json";
import type { ProblemsFile } from "../data/schema";
import type { Problem } from "./problem";

const { generatedAt, problems } = catalog as unknown as ProblemsFile;

export const CATALOG_VERSION = generatedAt;

// A LeetCode slug is its title in kebab case, which is enough to search for problems newer than the catalog.
export function resolveProblem(slug: string): Problem {
  const known = problems[slug];
  if (known) return { slug, id: known[0], title: known[1] };
  return { slug, id: null, title: slug.replace(/-/g, " ") };
}
