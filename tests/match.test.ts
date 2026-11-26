import { describe, expect, it } from "vitest";
import { createProblemMatcher, scoreTitle } from "@/videos/match";

const twoSum = { id: "1", title: "Two Sum" };
const rain = { id: "42", title: "Trapping Rain Water" };
const jumpGame = { id: "55", title: "Jump Game" };

describe("scoreTitle", () => {
  it.each([
    ["Two Sum - Leetcode 1 - HashMap - Python", twoSum],
    ["1. Two Sum | LeetCode Solution", twoSum],
    ["Two Sum | Brute force to optimal", twoSum],
    ["L3. Trapping Rainwater | 2 Pointers", { id: "42", title: "Trapping Rainwater" }],
    ["Leetcode #42: trapping rain water", rain],
    ["Leetcode 42 rain water trapping problem", rain],
    ["Two Sum - Python", { id: null, title: "Two Sum" }],
  ])("accepts %s", (title, problem) => {
    expect(scoreTitle(title, problem)).toBeGreaterThan(0);
  });

  it("ranks the number and title together above the number alone, and that above the title alone", () => {
    const both = scoreTitle("Trapping Rain Water - Leetcode 42", rain);
    const numberOnly = scoreTitle("Leetcode 42 rain water trapping problem", rain);
    const titleOnly = scoreTitle("Trapping Rain Water explained", rain);
    expect(both).toBeGreaterThan(numberOnly);
    expect(numberOnly).toBeGreaterThan(titleOnly);
    expect(titleOnly).toBeGreaterThan(0);
  });

  it.each([
    ["Two Sum II - Input Array Is Sorted - Leetcode 167", twoSum],
    ["Trapping rain water 2 | Heap", rain],
    ["Jump Game VII | Greedy + Sliding Window", jumpGame],
    ["Leetcode 15 - the Two Sum trick applied to 3Sum", twoSum],
    ["Leetcode 1 explained in 60 seconds", twoSum],
  ])("rejects %s", (title, problem) => {
    expect(scoreTitle(title, problem)).toBe(0);
  });

  describe("when a longer problem starts with the same title", () => {
    const twoSumFamily = {
      ...twoSum,
      longerTitles: ["Two Sum II - Input Array Is Sorted", "Two Sum IV - Input is a BST", "Two Sum Less Than K"],
    };
    const maxSubarray = {
      id: "53",
      title: "Maximum Subarray",
      longerTitles: ["Maximum Subarray Sum with One Deletion", "Maximum Subarray Sum After One Operation"],
    };

    it("rejects a video whose next words name the longer problem", () => {
      expect(scoreTitle("L51. Two Sum In BST | Check if there exists a pair with Sum K", twoSumFamily)).toBe(0);
    });

    it("keeps it when the video also gives this problem's number", () => {
      expect(scoreTitle("Two Sum in a BST style - Leetcode 1", twoSumFamily)).toBeGreaterThan(0);
    });

    it("keeps a common name that shares only one word with a longer title", () => {
      expect(
        scoreTitle("Kadane's Algorithm | Maximum Subarray Sum | Finding and Printing", maxSubarray),
      ).toBeGreaterThan(0);
    });
  });
});

describe("createProblemMatcher", () => {
  const catalog = [
    { slug: "candy", id: "135", title: "Candy" },
    { slug: "candy-crush", id: "723", title: "Candy Crush" },
    { slug: "jump-game", id: "55", title: "Jump Game" },
    { slug: "jump-game-vii", id: "1871", title: "Jump Game VII" },
  ];
  const match = createProblemMatcher(catalog);

  it.each([
    ["Candy Crush | Simulation explained", "candy-crush"],
    ["Candy - Leetcode 135 - Greedy", "candy"],
    ["Jump Game VII - Leetcode 1871", "jump-game-vii"],
    ["Leetcode 55 Jump Game | Greedy", "jump-game"],
  ])("files %s under %s", (title, slug) => {
    expect(match(title)?.problem.slug).toBe(slug);
  });

  it("files unrelated titles nowhere", () => {
    expect(match("My Last Day at Google")).toBeNull();
  });
});
