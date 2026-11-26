import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const appsRoot = path.resolve(process.cwd(), "apps");

function gameFiles(fileName) {
  const files = [];
  for (const category of fs.readdirSync(appsRoot, { withFileTypes: true })) {
    if (!category.isDirectory() || category.name === "common" || category.name === "audio")
      continue;
    const categoryPath = path.join(appsRoot, category.name);
    for (const game of fs.readdirSync(categoryPath, { withFileTypes: true })) {
      if (!game.isDirectory()) continue;
      const file = path.join(categoryPath, game.name, fileName);
      if (fs.existsSync(file)) files.push(file);
    }
  }
  return files;
}

describe("AI difficulty coverage", () => {
  it("loads the shared control in every game page", () => {
    const pages = gameFiles("index.html");
    expect(pages).toHaveLength(28);
    for (const page of pages) {
      expect(fs.readFileSync(page, "utf8")).toContain("../../common/ai-difficulty.js");
    }
  });

  it("reads difficulty directly or through the shared card AI", () => {
    const aiFiles = gameFiles("ai.js");
    expect(aiFiles).toHaveLength(28);
    for (const aiFile of aiFiles) {
      const source = fs.readFileSync(aiFile, "utf8");
      expect(source.includes("AIDifficulty") || source.includes("smartAiDecide")).toBe(true);
    }
  });
});
