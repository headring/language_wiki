#!/usr/bin/env node
import { readText, writeText } from "./lib/fs.mjs";
import { parseArgs } from "./lib/args.mjs";
import { PATHS } from "./lib/paths.mjs";
import { LEVELS, normalizeListArg } from "./lib/levels.mjs";

const args = parseArgs(process.argv.slice(2));
const inputDir = typeof args.in === "string" ? args.in : `${PATHS.dataRoot}/enriched`;
const outputFile = typeof args.out === "string" ? args.out : `${PATHS.dataRoot}/packs/jlpt.pack.json`;
const levels = normalizeListArg(args.levels, LEVELS);

const words = [];

for (const level of levels) {
  const filePath = `${inputDir}/${level.toLowerCase()}.enriched.jsonl`;
  const text = await readText(filePath);

  for (const line of text.split("\n").map((item) => item.trim()).filter(Boolean)) {
    const record = JSON.parse(line);
    const sourceId = `${record.source.level}:${record.source.fileName}:${record.source.rowNumber}`;
    const wordId = `open-anki-${level.toLowerCase()}-${String(record.source.rowNumber - 1).padStart(4, "0")}`;
    words.push({
      wordId,
      jlptLevel: level,
      sequenceInLevel: record.source.rowNumber - 1,
      kanji: record.word.expression,
      readingHiragana: record.word.reading,
      meaningKoVariants: record.translation?.meaningKoVariants ?? [],
      exampleJp: record.example?.exampleJp ?? null,
      exampleKo: record.example?.exampleKo ?? null,
      source: {
        sourceId,
        fileName: record.source.fileName,
        rowNumber: record.source.rowNumber,
        guid: record.word.guid,
        sourceUrl: record.source.sourceUrl
      }
    });
  }
}

const pack = {
  schemaVersion: "jlpt.pack.v1",
  source: {
    repo: "jamsinclair/open-anki-jlpt-decks",
    branch: "main",
    generatedAt: new Date().toISOString()
  },
  words
};

await writeText(outputFile, JSON.stringify(pack, null, 2) + "\n");
console.log(`[pack] ${outputFile} -> ${words.length} words`);
