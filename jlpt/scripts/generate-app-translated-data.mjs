#!/usr/bin/env node
import { parseArgs } from "./lib/args.mjs";
import { readText, writeText } from "./lib/fs.mjs";
import { parseCsv } from "./lib/csv.mjs";

const args = parseArgs(process.argv.slice(2));
const inputDir =
  typeof args.in === "string"
    ? args.in
    : "jlpt/data/translated";
const outputFile =
  typeof args.out === "string"
    ? args.out
    : "jlpt/app/src/data/imported.ts";

const translatedFiles = (await import("node:fs/promises")).readdir(inputDir);
const fileNames = (await translatedFiles)
  .filter((name) => /^n[1-5]\.csv$/i.test(name))
  .sort((left, right) => left.localeCompare(right));

const words = [];
const presets = [];

function normalizeLevel(fileName) {
  return fileName.replace(".csv", "").toUpperCase();
}

function escapeTs(value) {
  return JSON.stringify(value);
}

function buildPresetSeeds(level, count) {
  const next = [];
  let sequenceNo = 1;
  const opening = [50, 100, 150, 200, 250, 260, 300];

  for (const end of opening) {
    if (end <= count) {
      next.push({
        jlptLevel: level,
        sequenceNo,
        presetCode: `${level}-0-${end}`,
        label: `${level} 0-${end}`,
        roundType: "micro",
        rangeStart: 0,
        rangeEnd: end,
      });
      sequenceNo += 1;
    }
  }

  if (count <= 300) {
    return next;
  }

  let previousUpper = 300;
  for (let upper = 600; upper <= count; upper += 300) {
    next.push({
      jlptLevel: level,
      sequenceNo,
      presetCode: `${level}-${previousUpper}-${upper}`,
      label: `${level} ${previousUpper}-${upper}`,
      roundType: "block",
      rangeStart: previousUpper,
      rangeEnd: upper,
    });
    sequenceNo += 1;

    next.push({
      jlptLevel: level,
      sequenceNo,
      presetCode: `${level}-0-${upper}`,
      label: `${level} 0-${upper}`,
      roundType: "merge",
      rangeStart: 0,
      rangeEnd: upper,
    });
    sequenceNo += 1;
    previousUpper = upper;
  }

  if (previousUpper < count) {
    next.push({
      jlptLevel: level,
      sequenceNo,
      presetCode: `${level}-${previousUpper}-${count}`,
      label: `${level} ${previousUpper}-${count}`,
      roundType: "block",
      rangeStart: previousUpper,
      rangeEnd: count,
    });
    sequenceNo += 1;

    next.push({
      jlptLevel: level,
      sequenceNo,
      presetCode: `${level}-0-${count}`,
      label: `${level} 0-${count}`,
      roundType: "merge",
      rangeStart: 0,
      rangeEnd: count,
    });
  }

  return next;
}

for (const fileName of fileNames) {
  const level = normalizeLevel(fileName);
  const csvText = await readText(`${inputDir}/${fileName}`);
  const rows = parseCsv(csvText);

  for (let index = 1; index < rows.length; index += 1) {
    const [expression = "", reading = "", meaning = ""] = rows[index];
    if (!expression.trim()) {
      continue;
    }

    words.push({
      id: `${level.toLowerCase()}-${index}`,
      jlptLevel: level,
      sequenceInLevel: index,
      kanji: expression.trim(),
      kana: reading.trim(),
      readingHiragana: reading.trim(),
      meaningKo: meaning.trim(),
      partOfSpeech: "",
      exampleJp: "",
      exampleKo: "",
      isCommonLife: false,
    });
  }

  presets.push(...buildPresetSeeds(level, rows.length - 1));
}

const content = `import type { PresetSeed, WordSeed } from "../types/study";

export const IMPORTED_DATA_VERSION = ${escapeTs(
  `translated-${new Date().toISOString()}`,
)};

export const IMPORTED_WORD_SEEDS: WordSeed[] = [
${words
  .map(
    (word) => `  {
    id: ${escapeTs(word.id)},
    jlptLevel: ${escapeTs(word.jlptLevel)},
    sequenceInLevel: ${word.sequenceInLevel},
    kanji: ${escapeTs(word.kanji)},
    kana: ${escapeTs(word.kana)},
    readingHiragana: ${escapeTs(word.readingHiragana)},
    meaningKo: ${escapeTs(word.meaningKo)},
    partOfSpeech: ${escapeTs(word.partOfSpeech)},
    exampleJp: ${escapeTs(word.exampleJp)},
    exampleKo: ${escapeTs(word.exampleKo)},
    isCommonLife: ${word.isCommonLife ? "true" : "false"},
  }`,
  )
  .join(",\n")}
];

export const IMPORTED_PRESET_SEEDS: PresetSeed[] = [
${presets
  .map(
    (preset) => `  {
    jlptLevel: ${escapeTs(preset.jlptLevel)},
    sequenceNo: ${preset.sequenceNo},
    presetCode: ${escapeTs(preset.presetCode)},
    label: ${escapeTs(preset.label)},
    roundType: ${escapeTs(preset.roundType)},
    rangeStart: ${preset.rangeStart},
    rangeEnd: ${preset.rangeEnd},
  }`,
  )
  .join(",\n")}
];
`;

await writeText(outputFile, content);
console.log(`[generated] ${outputFile} words=${words.length} presets=${presets.length}`);
