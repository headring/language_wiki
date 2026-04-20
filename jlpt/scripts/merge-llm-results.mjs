#!/usr/bin/env node
import { readText, writeText } from "./lib/fs.mjs";
import { parseArgs } from "./lib/args.mjs";
import { PATHS } from "./lib/paths.mjs";
import { LEVELS, normalizeListArg } from "./lib/levels.mjs";

const args = parseArgs(process.argv.slice(2));
const inputDir = typeof args.in === "string" ? args.in : `${PATHS.dataRoot}/normalized/open-anki`;
const resultDir = typeof args.results === "string" ? args.results : `${PATHS.dataRoot}/results`;
const outputDir = typeof args.out === "string" ? args.out : `${PATHS.dataRoot}/enriched`;
const levels = normalizeListArg(args.levels, LEVELS);

for (const level of levels) {
  const normalizedText = await readText(`${inputDir}/${level.toLowerCase()}.jsonl`);
  const translationResultPath = `${resultDir}/${level.toLowerCase()}.translation.jsonl`;
  const exampleResultPath = `${resultDir}/${level.toLowerCase()}.example.jsonl`;

  const translations = new Map();
  const examples = new Map();

  try {
    const translationText = await readText(translationResultPath);
    for (const line of translationText.split("\n").map((item) => item.trim()).filter(Boolean)) {
      const record = JSON.parse(line);
      translations.set(record.sourceId, record);
    }
  } catch {
    // Optional until an LLM is wired in.
  }

  try {
    const exampleText = await readText(exampleResultPath);
    for (const line of exampleText.split("\n").map((item) => item.trim()).filter(Boolean)) {
      const record = JSON.parse(line);
      examples.set(record.sourceId, record);
    }
  } catch {
    // Optional until an LLM is wired in.
  }

  const enriched = normalizedText
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => JSON.parse(line))
    .map((record) => {
      const sourceId = `${record.source.level}:${record.source.fileName}:${record.source.rowNumber}`;
      const translation = translations.get(sourceId);
      const example = examples.get(sourceId);

      return {
        ...record,
        translation: translation
          ? {
              meaningKoVariants: translation.meaningKoVariants ?? [],
              notes: translation.notes ?? []
            }
          : null,
        example: example
          ? {
              exampleJp: example.exampleJp ?? null,
              exampleKo: example.exampleKo ?? null,
              notes: example.notes ?? []
            }
          : null
      };
    });

  await writeText(`${outputDir}/${level.toLowerCase()}.enriched.jsonl`, `${enriched.map((record) => JSON.stringify(record)).join("\n")}\n`);
  console.log(`[merged] ${level} -> ${enriched.length} rows`);
}
