#!/usr/bin/env node
import { createHash } from "node:crypto";
import { basename } from "node:path";

import { parseArgs } from "./lib/args.mjs";
import { parseCsv } from "./lib/csv.mjs";
import { readText, writeText } from "./lib/fs.mjs";

const N1_ROW_COUNT = 2698;
const N1_SOURCE_FIELDS_SHA256 =
  "2243227da25d57ff1fa487037b2011a1b7a6b9d51439d2b719b00a977281cb22";
const EXAMPLE_FIELDS = [
  "example_jp",
  "example_reading_hiragana",
  "example_ko",
];
const FORBIDDEN_READING_CHARACTER = /[\p{Script=Han}\p{Script=Katakana}\p{Script=Latin}\p{Number}]/u;

const args = parseArgs(process.argv.slice(2));
const csvFile = typeof args.csv === "string" ? args.csv : "data/translated/n1.csv";
const expectedComplete = Number(args["expected-complete"]);
const batchFiles = Array.isArray(args.batch)
  ? args.batch
  : typeof args.batch === "string"
    ? [args.batch]
    : [];

if (!Number.isInteger(expectedComplete) || expectedComplete < 0 || expectedComplete > N1_ROW_COUNT) {
  throw new Error(`--expected-complete must be an integer from 0 to ${N1_ROW_COUNT}`);
}

if (batchFiles.length !== 2) {
  throw new Error("exactly two --batch JSON files are required");
}

const rows = parseCsv(await readText(csvFile));
const dataRows = rows.slice(1);

if (dataRows.length !== N1_ROW_COUNT) {
  throw new Error(`N1 CSV must contain ${N1_ROW_COUNT} rows, got ${dataRows.length}`);
}

const sourceFieldsHash = createHash("sha256")
  .update(JSON.stringify(dataRows.map((row) => row.slice(0, 5))))
  .digest("hex");

if (sourceFieldsHash !== N1_SOURCE_FIELDS_SHA256) {
  throw new Error("N1 CSV source fields or row order changed");
}

for (let index = 0; index < dataRows.length; index += 1) {
  const examples = [dataRows[index][5] ?? "", dataRows[index][6] ?? "", dataRows[index][7] ?? ""];
  const shouldBeComplete = index < expectedComplete;

  if (shouldBeComplete !== examples.every(Boolean) || (!shouldBeComplete && examples.some(Boolean))) {
    throw new Error(`N1 row ${index + 1} does not match completed range ${expectedComplete}`);
  }
}

const batches = [];
for (const file of batchFiles) {
  const match = /^n1_(\d+)_(\d+)\.json$/.exec(basename(file));
  if (!match) {
    throw new Error(`invalid batch filename: ${file}`);
  }

  const start = Number(match[1]);
  const end = Number(match[2]);
  const entries = JSON.parse(await readText(file));

  if (!Array.isArray(entries) || entries.length !== end - start + 1) {
    throw new Error(`${file} must contain ${end - start + 1} entries`);
  }

  entries.forEach((entry, index) => {
    const rowNumber = start + index;
    const csvRow = dataRows[rowNumber - 1];

    if (entry.row !== rowNumber) {
      throw new Error(`${file} has a missing or out-of-order row at ${rowNumber}`);
    }
    if (entry.guid !== csvRow[4]) {
      throw new Error(`${file} row ${rowNumber} guid does not match n1.csv`);
    }
    if ([csvRow[5] ?? "", csvRow[6] ?? "", csvRow[7] ?? ""].some(Boolean)) {
      throw new Error(`N1 row ${rowNumber} already has example fields`);
    }
    if (EXAMPLE_FIELDS.some((field) => typeof entry[field] !== "string" || !entry[field].trim())) {
      throw new Error(`${file} row ${rowNumber} has an empty example field`);
    }
    if (FORBIDDEN_READING_CHARACTER.test(entry.example_reading_hiragana)) {
      throw new Error(`${file} row ${rowNumber} reading contains a forbidden character`);
    }
  });

  batches.push({ start, end, entries });
}

batches.sort((left, right) => left.start - right.start);
if (batches[0].start !== expectedComplete + 1 || batches[0].end + 1 !== batches[1].start) {
  throw new Error("batch ranges must be non-overlapping and contiguous after the completed range");
}

const examples = new Set(dataRows.slice(0, expectedComplete).map((row) => row[5]));
for (const { entries } of batches) {
  for (const entry of entries) {
    if (examples.has(entry.example_jp)) {
      throw new Error(`duplicate example_jp at N1 row ${entry.row}: ${entry.example_jp}`);
    }
    examples.add(entry.example_jp);
  }
}

for (const { entries } of batches) {
  for (const entry of entries) {
    dataRows[entry.row - 1].splice(
      5,
      3,
      entry.example_jp.trim(),
      entry.example_reading_hiragana.trim(),
      entry.example_ko.trim(),
    );
  }
}

const encodeCell = (value) => {
  const text = String(value ?? "");
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
};

await writeText(csvFile, `${rows.map((row) => row.map(encodeCell).join(",")).join("\n")}\n`);
console.log(`[merged] ${batches.map(({ start, end }) => `${start}-${end}`).join(", ")}`);
