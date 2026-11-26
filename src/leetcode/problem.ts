export interface Problem {
  slug: string;
  id: string | null;
  title: string;
  // Titles of other problems that start with this one, such as "Two Sum IV - Input is a BST" for "Two Sum".
  longerTitles?: string[];
}
