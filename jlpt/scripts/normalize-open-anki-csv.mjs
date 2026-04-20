#!/usr/bin/env node
import { readText, writeText } from "./lib/fs.mjs";
import { parseCsv, splitTags, toJsonl } from "./lib/csv.mjs";
import { parseArgs } from "./lib/args.mjs";
import { PATHS, levelFileName, rawCsvUrl } from "./lib/paths.mjs";
import { LEVELS, normalizeListArg } from "./lib/levels.mjs";

const args = parseArgs(process.argv.slice(2));
const inputDir = typeof args.in === "string" ? args.in : `${PATHS.dataRoot}/raw/open-anki`;
const outputDir = typeof args.out === "string" ? args.out : `${PATHS.dataRoot}/normalized/open-anki`;
const levels = normalizeListArg(args.levels, LEVELS);

for (const level of levels) {
  const fileName = levelFileName(level, "csv");
  const csvText = await readText(`${inputDir}/${fileName}`);
  const rows = parseCsv(csvText);
  const header = rows[0] ?? [];
  const expected = ["expression", "reading", "meaning", "tags", "guid"];
  const headerLower = header.map((value) => value.trim().toLowerCase());
  const warnings = [];

  if (headerLower.join(",") !== expected.join(",")) {
    warnings.push(`Unexpected header for ${fileName}: ${header.join(",")}`);
  }

  const normalized = [];
  for (let index = 1; index < rows.length; index += 1) {
    const [expression = "", reading = "", meaning = "", tags = "", guid = ""] = rows[index];
    normalized.push({
      schemaVersion: "jlpt.open-anki.normalized.v1",
      source: {
        repo: "jamsinclair/open-anki-jlpt-decks",
        level,
        fileName,
        rowNumber: index + 1,
        sourceUrl: rawCsvUrl(level)
      },
      word: {
        expression,
        reading,
        meaningEnRaw: meaning,
        tags: splitTags(tags),
        guid
      },
      warnings: [...warnings]
    });
  }

  await writeText(`${outputDir}/${level.toLowerCase()}.jsonl`, toJsonl(normalized));
  await writeText(
    `${outputDir}/${level.toLowerCase()}.meta.json`,
    JSON.stringify(
      {
        schemaVersion: "jlpt.normalized.meta.v1",
        level,
        sourceFile: fileName,
        recordCount: normalized.length,
        warnings
      },
      null,
      2
    ) + "\n"
  );
  console.log(`[normalized] ${level} -> ${normalized.length} rows`);
}
