#!/usr/bin/env node
import { readText, writeText } from "./lib/fs.mjs";
import { parseArgs } from "./lib/args.mjs";
import { PATHS } from "./lib/paths.mjs";

const args = parseArgs(process.argv.slice(2));
const inputFile = typeof args.in === "string" ? args.in : `${PATHS.dataRoot}/tasks/example.jobs.jsonl`;
const outputDir = typeof args.out === "string" ? args.out : `${PATHS.dataRoot}/results`;
const model = typeof args.model === "string" ? args.model : "gpt-4.1-mini";
const apiBase = typeof args.apiBase === "string" ? args.apiBase : "https://api.openai.com/v1";
const dryRun = !(args["dry-run"] === false || args.dryRun === false);

const text = await readText(inputFile);
const jobs = text.split("\n").map((line) => line.trim()).filter(Boolean).map((line) => JSON.parse(line));
const grouped = new Map();

for (const job of jobs) {
  const fileName = `${job.level.toLowerCase()}.example.jsonl`;
  const record = {
    sourceId: job.sourceId,
    taskId: job.taskId,
    kind: job.kind,
    model,
    apiBase,
    exampleJp: dryRun ? `[stub:${job.level}] ${job.input.expression} ...` : "",
    exampleKo: dryRun ? "예문 번역 stub" : "",
    notes: dryRun ? ["dry-run placeholder; wire OpenAI-compatible API later"] : []
  };

  if (!grouped.has(fileName)) {
    grouped.set(fileName, []);
  }

  grouped.get(fileName).push(record);
}

for (const [fileName, records] of grouped.entries()) {
  await writeText(`${outputDir}/${fileName}`, `${records.map((record) => JSON.stringify(record)).join("\n")}\n`);
}

console.log(`[openai-example] jobs=${jobs.length} dryRun=${dryRun}`);
