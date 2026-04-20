#!/usr/bin/env node
import { readText, writeText } from "./lib/fs.mjs";
import { parseArgs } from "./lib/args.mjs";
import { PATHS } from "./lib/paths.mjs";
import { LEVELS, EXAMPLE_LEVELS, normalizeListArg } from "./lib/levels.mjs";

const args = parseArgs(process.argv.slice(2));
const inputDir = typeof args.in === "string" ? args.in : `${PATHS.dataRoot}/normalized/open-anki`;
const outputDir = typeof args.out === "string" ? args.out : `${PATHS.dataRoot}/tasks`;
const levels = normalizeListArg(args.levels, LEVELS);

const translationJobs = [];
const exampleJobs = [];

for (const level of levels) {
  const jsonlText = await readText(`${inputDir}/${level.toLowerCase()}.jsonl`);
  const lines = jsonlText.split("\n").map((line) => line.trim()).filter(Boolean);

  for (const line of lines) {
    const record = JSON.parse(line);
    const taskBaseId = `${level}-${String(record.source.rowNumber).padStart(4, "0")}`;

    translationJobs.push({
      taskId: `translate-${taskBaseId}`,
      kind: "translate-meaning",
      sourceId: `${level}:${record.source.fileName}:${record.source.rowNumber}`,
      level,
      input: record.word,
      outputSchema: {
        meaningKoVariants: ["string"],
        notes: ["string"]
      }
    });

    if (EXAMPLE_LEVELS.has(level)) {
      exampleJobs.push({
        taskId: `example-${taskBaseId}`,
        kind: "generate-example",
        sourceId: `${level}:${record.source.fileName}:${record.source.rowNumber}`,
        level,
        input: {
          expression: record.word.expression,
          reading: record.word.reading,
          meaningKoVariants: ["pending-translation"]
        },
        outputSchema: {
          exampleJp: "string",
          exampleKo: "string",
          notes: ["string"]
        }
      });
    }
  }
}

await writeText(`${outputDir}/translation.jobs.jsonl`, `${translationJobs.map((job) => JSON.stringify(job)).join("\n")}\n`);
await writeText(`${outputDir}/example.jobs.jsonl`, `${exampleJobs.map((job) => JSON.stringify(job)).join("\n")}\n`);

console.log(`[tasks] translation=${translationJobs.length} example=${exampleJobs.length}`);
