#!/usr/bin/env node
import { createHash } from "node:crypto";

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
const darakwonFile =
  typeof args.darakwon === "string"
    ? args.darakwon
    : `${inputDir}/../n1_1051_examples_corrected.csv`;
const N1_ROW_COUNT = 2698;
const N1_SOURCE_FIELDS_SHA256 =
  "2243227da25d57ff1fa487037b2011a1b7a6b9d51439d2b719b00a977281cb22";
const DARAKWON_ROW_COUNT = 1051;
const DARAKWON_SOURCE_FIELDS_SHA256 =
  "4317a4f925f79c46b0f92193feb3e8106ecbb1263825bfb9468e43a30c7c0235";
const expectedExamples = Number(args["expected-examples"] ?? N1_ROW_COUNT);

if (
  !Number.isInteger(expectedExamples) ||
  expectedExamples < 0 ||
  expectedExamples > N1_ROW_COUNT
) {
  throw new Error(`--expected-examples must be an integer from 0 to ${N1_ROW_COUNT}`);
}

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

function chunk(values, size) {
  const chunks = [];
  for (let index = 0; index < values.length; index += size) {
    chunks.push(values.slice(index, index + size));
  }
  return chunks;
}

function validateExampleRows(
  rows,
  { label, rowCount, expectedSourceFieldsHash, completedExamples },
) {
  const header = rows[0].map((value, index) =>
    index === 0 ? value.replace(/^\uFEFF/, "") : value,
  );
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

  if (JSON.stringify(header) !== JSON.stringify(expectedHeader)) {
    throw new Error(`${label} CSV header mismatch: ${header.join(",")}`);
  }

  const dataRows = rows.slice(1);

  if (dataRows.length !== rowCount) {
    throw new Error(`${label} CSV must contain ${rowCount} rows, got ${dataRows.length}`);
  }

  const actualSourceFieldsHash = createHash("sha256")
    .update(JSON.stringify(dataRows.map((row) => row.slice(0, 5))))
    .digest("hex");

  if (actualSourceFieldsHash !== expectedSourceFieldsHash) {
    throw new Error(`${label} CSV source fields or row order changed`);
  }

  const examples = new Set();

  for (let index = 0; index < dataRows.length; index += 1) {
    const row = dataRows[index];
    const exampleFields = [row[5] ?? "", row[6] ?? "", row[7] ?? ""].map(
      (value) => value.trim(),
    );
    const hasAnyExampleField = exampleFields.some(Boolean);
    const hasAllExampleFields = exampleFields.every(Boolean);
    const shouldBeComplete = index < completedExamples;

    if (shouldBeComplete && !hasAllExampleFields) {
      throw new Error(`${label} row ${index + 1} is missing example fields`);
    }

    if (!shouldBeComplete && hasAnyExampleField) {
      throw new Error(`${label} row ${index + 1} is outside the completed range`);
    }

    if (shouldBeComplete) {
      const exampleJp = exampleFields[0];
      if (examples.has(exampleJp)) {
        throw new Error(`Duplicate ${label} example_jp at row ${index + 1}: ${exampleJp}`);
      }
      examples.add(exampleJp);
    }
  }
}

function validateN1Rows(rows) {
  validateExampleRows(rows, {
    label: "N1",
    rowCount: N1_ROW_COUNT,
    expectedSourceFieldsHash: N1_SOURCE_FIELDS_SHA256,
    completedExamples: expectedExamples,
  });
}

function validateDarakwonRows(rows) {
  validateExampleRows(rows, {
    label: "N1-다락원",
    rowCount: DARAKWON_ROW_COUNT,
    expectedSourceFieldsHash: DARAKWON_SOURCE_FIELDS_SHA256,
    completedExamples: DARAKWON_ROW_COUNT,
  });
}

function createPresetSeed(level, sequenceNo, roundType, rangeStart, rangeEnd) {
  return {
    jlptLevel: level,
    sequenceNo,
    presetCode: `${level}-${rangeStart}-${rangeEnd}`,
    label: `${level} ${rangeStart + 1}-${rangeEnd}`,
    roundType,
    rangeStart,
    rangeEnd,
  };
}

function buildN1PresetSeeds(level, count) {
  const next = [];
  let sequenceNo = 1;
  let bandStart = 0;

  while (bandStart + 1200 <= count) {
    const firstHalfStart = bandStart;
    const firstHalfEnd = bandStart + 600;
    const secondHalfStart = firstHalfEnd;
    const secondHalfEnd = bandStart + 1200;

    next.push(
      createPresetSeed(level, sequenceNo, "block", firstHalfStart, firstHalfStart + 300),
    );
    sequenceNo += 1;
    next.push(
      createPresetSeed(level, sequenceNo, "block", firstHalfStart + 300, firstHalfEnd),
    );
    sequenceNo += 1;
    next.push(
      createPresetSeed(level, sequenceNo, "merge", firstHalfStart, firstHalfEnd),
    );
    sequenceNo += 1;

    next.push(
      createPresetSeed(level, sequenceNo, "block", secondHalfStart, secondHalfStart + 300),
    );
    sequenceNo += 1;
    next.push(
      createPresetSeed(level, sequenceNo, "block", secondHalfStart + 300, secondHalfEnd),
    );
    sequenceNo += 1;
    next.push(
      createPresetSeed(level, sequenceNo, "merge", secondHalfStart, secondHalfEnd),
    );
    sequenceNo += 1;

    next.push(createPresetSeed(level, sequenceNo, "merge", bandStart, secondHalfEnd));
    sequenceNo += 1;

    if (bandStart > 0) {
      next.push(createPresetSeed(level, sequenceNo, "merge", 0, secondHalfEnd));
      sequenceNo += 1;
    }

    bandStart = secondHalfEnd;
  }

  while (bandStart + 300 <= count) {
    const blockEnd = bandStart + 300;
    next.push(createPresetSeed(level, sequenceNo, "block", bandStart, blockEnd));
    sequenceNo += 1;
    bandStart = blockEnd;
  }

  if (bandStart < count) {
    next.push(createPresetSeed(level, sequenceNo, "block", bandStart, count));
    sequenceNo += 1;
  }

  const hasFullRangePreset = next.some(
    (preset) => preset.rangeStart === 0 && preset.rangeEnd === count,
  );

  if (!hasFullRangePreset) {
    next.push(createPresetSeed(level, sequenceNo, "merge", 0, count));
  }

  return next;
}

function buildDarakwonPresetSeeds(level, count) {
  const next = [];
  let sequenceNo = 1;
  let bandStart = 0;

  while (bandStart < count) {
    const bandEnd = Math.min(bandStart + 600, count);
    let blockStart = bandStart;

    while (blockStart < bandEnd) {
      const blockEnd = Math.min(blockStart + 300, bandEnd);
      next.push(createPresetSeed(level, sequenceNo, "block", blockStart, blockEnd));
      sequenceNo += 1;
      blockStart = blockEnd;
    }

    if (bandEnd - bandStart > 300) {
      next.push(createPresetSeed(level, sequenceNo, "merge", bandStart, bandEnd));
      sequenceNo += 1;
    }

    bandStart = bandEnd;
  }

  if (!next.some((preset) => preset.rangeStart === 0 && preset.rangeEnd === count)) {
    next.push(createPresetSeed(level, sequenceNo, "merge", 0, count));
  }

  return next;
}

function buildPresetSeeds(level, count) {
  if (level === "N1") {
    return buildN1PresetSeeds(level, count);
  }

  if (level === "N1-다락원") {
    return buildDarakwonPresetSeeds(level, count);
  }

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

const sources = [
  ...fileNames.map((fileName) => ({
    file: `${inputDir}/${fileName}`,
    idPrefix: normalizeLevel(fileName).toLowerCase(),
    level: normalizeLevel(fileName),
  })),
  {
    file: darakwonFile,
    idPrefix: "n1-darakwon",
    level: "N1-다락원",
  },
];

for (const source of sources) {
  const csvText = await readText(source.file);
  const rows = parseCsv(csvText);

  if (source.level === "N1") {
    validateN1Rows(rows);
  } else if (source.level === "N1-다락원") {
    validateDarakwonRows(rows);
  }

  for (let index = 1; index < rows.length; index += 1) {
    const [
      expression = "",
      reading = "",
      meaning = "",
      ,
      ,
      exampleJp = "",
      exampleReadingHiragana = "",
      exampleKo = "",
    ] = rows[index];
    if (!expression.trim()) {
      continue;
    }

    words.push({
      id: `${source.idPrefix}-${index}`,
      jlptLevel: source.level,
      sequenceInLevel: index,
      kanji: expression.trim(),
      kana: reading.trim(),
      readingHiragana: reading.trim(),
      meaningKo: meaning.trim(),
      partOfSpeech: "",
      exampleJp: exampleJp.trim(),
      exampleReadingHiragana: exampleReadingHiragana.trim(),
      exampleKo: exampleKo.trim(),
      isCommonLife: false,
    });
  }

  presets.push(...buildPresetSeeds(source.level, rows.length - 1));
}

const renderedWords = words.map(
  (word) => `    {
      id: ${escapeTs(word.id)},
      jlptLevel: ${escapeTs(word.jlptLevel)},
      sequenceInLevel: ${word.sequenceInLevel},
      kanji: ${escapeTs(word.kanji)},
      kana: ${escapeTs(word.kana)},
      readingHiragana: ${escapeTs(word.readingHiragana)},
      meaningKo: ${escapeTs(word.meaningKo)},
      partOfSpeech: ${escapeTs(word.partOfSpeech)},
      exampleJp: ${escapeTs(word.exampleJp)},
      exampleReadingHiragana: ${escapeTs(word.exampleReadingHiragana)},
      exampleKo: ${escapeTs(word.exampleKo)},
      isCommonLife: ${word.isCommonLife ? "true" : "false"},
    }`,
);

const content = `import type { PresetSeed, WordSeed } from "../types/study";

export const IMPORTED_DATA_VERSION = ${escapeTs(
  `translated-${new Date().toISOString()}`,
)};

const IMPORTED_WORD_SEED_CHUNKS: WordSeed[][] = [
${chunk(renderedWords, 500)
  .map((wordChunk) => `  [\n${wordChunk.join(",\n")}\n  ]`)
  .join(",\n")}
];

export const IMPORTED_WORD_SEEDS: WordSeed[] = IMPORTED_WORD_SEED_CHUNKS.flat();

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
