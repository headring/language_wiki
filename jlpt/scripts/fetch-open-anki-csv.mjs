#!/usr/bin/env node
import { rawCsvUrl, PATHS } from "./lib/paths.mjs";
import { parseArgs } from "./lib/args.mjs";
import { writeText } from "./lib/fs.mjs";
import { LEVELS, normalizeListArg } from "./lib/levels.mjs";

const args = parseArgs(process.argv.slice(2));
const outDir = typeof args.out === "string" ? args.out : `${PATHS.dataRoot}/raw/open-anki`;
const branch = typeof args.branch === "string" ? args.branch : "main";
const levels = normalizeListArg(args.levels, LEVELS);
const force = Boolean(args.force);

if (typeof fetch !== "function") {
  throw new Error("Global fetch is required. Use Node 18+.");
}

for (const level of levels) {
  const fileName = `${level.toLowerCase()}.csv`;
  const url = rawCsvUrl(level, branch);
  const destination = `${outDir}/${fileName}`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status} ${response.statusText}`);
  }

  if (!force) {
    console.log(`[download] ${destination}`);
  }

  await writeText(destination, await response.text());
  console.log(`[saved] ${destination}`);
}
