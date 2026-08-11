#!/usr/bin/env node
import { readFile } from "node:fs/promises";

import { parseCsv } from "./lib/csv.mjs";

const [basePath, candidatePath] = process.argv.slice(2);

if (!basePath || !candidatePath) {
  throw new Error("usage: validate-n1-example-correction.mjs BASE.csv CANDIDATE.csv");
}

const expectedHeader = [
  "expression",
  "reading",
  "meaning",
  "tags",
  "guid",
  "example_jp",
  "example_reading_hiragana",
  "example_ko",
];
const forbiddenPatterns = [
  /この文章では、.*ことの意味が問われている。/,
  /授業で.*の意味と背景を学んだ。/,
  /.*について、専門家が詳しく説明した。/,
  /.*に関する資料を集めて比較した。/,
  /新聞で.*についての記事を読んだ。/,
  /日常生活では、ときに.*ことがある。/,
  /状況によっては、.*場合もある。/,
  /実際に.*かどうかは、状況を見て判断する。/,
  /辞書で「.*」の使い方を確かめた。/,
];

const load = async (path) => {
  const rows = parseCsv(await readFile(path, "utf8"));
  rows[0][0] = rows[0][0].replace(/^\uFEFF/, "");
  return rows;
};

const [base, candidate] = await Promise.all([load(basePath), load(candidatePath)]);

if (JSON.stringify(candidate[0]) !== JSON.stringify(expectedHeader)) {
  throw new Error(`header mismatch: ${candidate[0].join(",")}`);
}
if (candidate.length !== base.length || candidate.length !== 1052) {
  throw new Error(`row count mismatch: base=${base.length - 1}, candidate=${candidate.length - 1}`);
}

const examples = new Set();
for (let index = 1; index < candidate.length; index += 1) {
  const source = base[index];
  const row = candidate[index];
  const rowNumber = index;

  if (row.length !== 8) throw new Error(`row ${rowNumber}: expected 8 columns`);
  if (JSON.stringify(row.slice(0, 5)) !== JSON.stringify(source.slice(0, 5))) {
    throw new Error(`row ${rowNumber}: source fields changed`);
  }

  const [exampleJp, exampleReading, exampleKo] = row.slice(5).map((value) => value.trim());
  if (!exampleJp || !exampleReading || !exampleKo) {
    throw new Error(`row ${rowNumber}: missing example field`);
  }
  if (examples.has(exampleJp)) throw new Error(`row ${rowNumber}: duplicate example_jp`);
  examples.add(exampleJp);

  if (index > 20 && forbiddenPatterns.some((pattern) => pattern.test(exampleJp))) {
    throw new Error(`row ${rowNumber}: forbidden template: ${exampleJp}`);
  }
  if (/[\p{Script=Han}\p{Script=Katakana}A-Za-z0-9]/u.test(exampleReading)) {
    throw new Error(`row ${rowNumber}: reading contains non-hiragana content: ${exampleReading}`);
  }
}

console.log(`validated ${candidate.length - 1} rows`);
