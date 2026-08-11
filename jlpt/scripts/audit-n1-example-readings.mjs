#!/usr/bin/env node
import { parseArgs } from "./lib/args.mjs";
import { parseCsv } from "./lib/csv.mjs";
import { readText, writeText } from "./lib/fs.mjs";

const EXPECTED_HEADER = [
  "expression",
  "reading",
  "meaning",
  "tags",
  "guid",
  "example_jp",
  "example_reading_hiragana",
  "example_ko",
];
const REPORT_HEADER = [
  "row",
  "guid",
  "expression",
  "reading",
  "status",
  "matched_or_expected_form",
  "detected_surface_form",
  "reason",
  "example_jp",
  "example_reading_hiragana",
];
const REVIEW_STATUSES = new Set(["mismatch", "target-not-found", "ambiguous"]);
const SPECIAL_NOTATION = /[～〜~()（）［］\[\]／/・·∙,\-]|\s/u;

const GODAN_SUFFIXES = {
  う: ["う", "わ", "い", "え", "お", "って", "った"],
  く: ["く", "か", "き", "け", "こ", "いて", "いた", "って", "った"],
  ぐ: ["ぐ", "が", "ぎ", "げ", "ご", "いで", "いだ"],
  す: ["す", "さ", "し", "せ", "そ", "して", "した"],
  つ: ["つ", "た", "ち", "て", "と", "って", "った"],
  ぬ: ["ぬ", "な", "に", "ね", "の", "んで", "んだ"],
  ぶ: ["ぶ", "ば", "び", "べ", "ぼ", "んで", "んだ"],
  む: ["む", "ま", "み", "め", "も", "んで", "んだ"],
  る: [
    "る",
    "ら",
    "り",
    "れ",
    "ろ",
    "って",
    "った",
    "ない",
    "なかった",
    "ながら",
    "ます",
    "れば",
    "よう",
    "て",
    "た",
    "られ",
    "させ",
  ],
};
const I_ADJECTIVE_SUFFIXES = ["い", "く", "かった", "ければ", "くて", "さ", "そう"];
const SURU_SUFFIXES = [
  "する",
  "し",
  "した",
  "して",
  "します",
  "しない",
  "され",
  "された",
  "させ",
  "すれば",
  "しよう",
];
const KURU_FORMS = [
  ["来る", "くる"],
  ["来た", "きた"],
  ["来て", "きて"],
  ["来ます", "きます"],
  ["来ない", "こない"],
  ["来れば", "くれば"],
  ["来よう", "こよう"],
  ["来られ", "こられ"],
  ["来させ", "こさせ"],
];

function katakanaToHiragana(value) {
  return [...value]
    .map((character) => {
      const codePoint = character.codePointAt(0);
      if (codePoint >= 0x30a1 && codePoint <= 0x30f6) {
        return String.fromCodePoint(codePoint - 0x60);
      }
      return character;
    })
    .join("");
}

function normalizeText(value) {
  return katakanaToHiragana(String(value ?? "").normalize("NFKC"))
    .replace(/[\s、。！？!?・「」『』（）()［］\[\]]/gu, "")
    .trim();
}

function pairedSuffixForms(expression, reading, baseSuffix, suffixes) {
  const expressionStem = expression.slice(0, -baseSuffix.length);
  const readingStem = reading.slice(0, -baseSuffix.length);
  return suffixes.map((suffix) => ({
    surface: `${expressionStem}${suffix}`,
    expectedReading: `${readingStem}${suffix}`,
  }));
}

function buildInflectedForms(expression, reading) {
  if (expression.endsWith("来る") && reading.endsWith("くる")) {
    const expressionStem = expression.slice(0, -2);
    const readingStem = reading.slice(0, -2);
    return KURU_FORMS.map(([surface, expectedReading]) => ({
      surface: `${expressionStem}${surface}`,
      expectedReading: `${readingStem}${expectedReading}`,
    }));
  }

  if (expression.endsWith("くる") && reading.endsWith("くる")) {
    const stem = expression.slice(0, -2);
    const readingStem = reading.slice(0, -2);
    return [
      ["くる", "くる"],
      ["きた", "きた"],
      ["きて", "きて"],
      ["きます", "きます"],
      ["こない", "こない"],
      ["くれば", "くれば"],
      ["こよう", "こよう"],
    ].map(([surface, expectedReading]) => ({
      surface: `${stem}${surface}`,
      expectedReading: `${readingStem}${expectedReading}`,
    }));
  }

  if (expression.endsWith("する") && reading.endsWith("する")) {
    return pairedSuffixForms(expression, reading, "する", SURU_SUFFIXES);
  }

  const lastExpressionCharacter = expression.at(-1);
  const lastReadingCharacter = reading.at(-1);
  if (
    lastExpressionCharacter === lastReadingCharacter &&
    Object.hasOwn(GODAN_SUFFIXES, lastExpressionCharacter)
  ) {
    return pairedSuffixForms(
      expression,
      reading,
      lastExpressionCharacter,
      GODAN_SUFFIXES[lastExpressionCharacter],
    );
  }

  if (lastExpressionCharacter === "い" && lastReadingCharacter === "い") {
    return pairedSuffixForms(expression, reading, "い", I_ADJECTIVE_SUFFIXES);
  }

  return [];
}

function inspectRow(row, rowNumber) {
  const [expressionRaw = "", readingRaw = "", , , guid = "", exampleJpRaw = "", exampleReadingRaw = ""] = row;
  const expression = normalizeText(expressionRaw);
  const reading = normalizeText(readingRaw);
  const exampleJp = normalizeText(exampleJpRaw);
  const exampleReading = normalizeText(exampleReadingRaw);
  const common = {
    row: rowNumber,
    guid,
    expression: expressionRaw,
    reading: readingRaw,
    example_jp: exampleJpRaw,
    example_reading_hiragana: exampleReadingRaw,
  };

  if (!expression || !reading || !exampleJp || !exampleReading) {
    return {
      ...common,
      status: "ambiguous",
      matched_or_expected_form: "",
      detected_surface_form: "",
      reason: "검사에 필요한 표제어, 읽기 또는 예문 필드가 비어 있음",
    };
  }

  if (SPECIAL_NOTATION.test(expressionRaw) || SPECIAL_NOTATION.test(readingRaw)) {
    return {
      ...common,
      status: "ambiguous",
      matched_or_expected_form: reading,
      detected_surface_form: "",
      reason: "접사 기호, 괄호, 슬래시 또는 공백을 포함한 특수 표기",
    };
  }

  const hasExactSurface = exampleJp.includes(expression);
  const hasExactReading = exampleReading.includes(reading);
  if (hasExactSurface && hasExactReading) {
    return {
      ...common,
      status: "pass-exact",
      matched_or_expected_form: reading,
      detected_surface_form: expression,
      reason: "표제어와 지정 읽기가 예문에 그대로 있음",
    };
  }

  const inflectedForms = buildInflectedForms(expression, reading);
  const matchedInflection = inflectedForms.find(
    ({ surface, expectedReading }) =>
      exampleJp.includes(surface) && exampleReading.includes(expectedReading),
  );
  if (matchedInflection) {
    return {
      ...common,
      status: "pass-conjugated",
      matched_or_expected_form: matchedInflection.expectedReading,
      detected_surface_form: matchedInflection.surface,
      reason: "표제어와 지정 읽기에 동일한 활용형이 사용됨",
    };
  }

  const detectedSurface = hasExactSurface
    ? expression
    : inflectedForms.find(({ surface }) => exampleJp.includes(surface))?.surface ?? "";
  if (detectedSurface) {
    const expectedReadings = [
      ...(hasExactSurface ? [reading] : []),
      ...inflectedForms
        .filter(({ surface }) => exampleJp.includes(surface))
        .map(({ expectedReading }) => expectedReading),
    ];
    return {
      ...common,
      status: "mismatch",
      matched_or_expected_form: [...new Set(expectedReadings)].join(" | "),
      detected_surface_form: detectedSurface,
      reason: "예문에서 표제어 표기는 찾았지만 대응하는 지정 읽기를 찾지 못함",
    };
  }

  if (hasExactReading) {
    return {
      ...common,
      status: "ambiguous",
      matched_or_expected_form: reading,
      detected_surface_form: "",
      reason: "지정 읽기는 있으나 대응하는 표제어 표기를 자동으로 찾지 못함",
    };
  }

  return {
    ...common,
    status: "target-not-found",
    matched_or_expected_form: inflectedForms.map(({ expectedReading }) => expectedReading).join(" | "),
    detected_surface_form: "",
    reason: "예문에서 표제어 또는 인식 가능한 활용형을 찾지 못함",
  };
}

function encodeCsvCell(value) {
  const text = String(value ?? "");
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function renderReport(records) {
  const rows = [
    REPORT_HEADER,
    ...records.map((record) => REPORT_HEADER.map((column) => record[column] ?? "")),
  ];
  return `${rows.map((row) => row.map(encodeCsvCell).join(",")).join("\n")}\n`;
}

const args = parseArgs(process.argv.slice(2));
const csvFile = typeof args.csv === "string" ? args.csv : "jlpt/data/translated/n1.csv";
const reportFile =
  typeof args.report === "string" ? args.report : "jlpt/data/n1-reading-audit.csv";
const includePasses = args["include-passes"] === true;

const rows = parseCsv(await readText(csvFile));
const header = rows[0].map((value, index) =>
  index === 0 ? value.replace(/^\uFEFF/, "") : value,
);
if (JSON.stringify(header) !== JSON.stringify(EXPECTED_HEADER)) {
  throw new Error(`N1 CSV header mismatch: ${header.join(",")}`);
}

const results = rows.slice(1).map((row, index) => inspectRow(row, index + 1));
const reportRecords = includePasses
  ? results
  : results.filter(({ status }) => REVIEW_STATUSES.has(status));
await writeText(reportFile, renderReport(reportRecords));

const counts = Object.fromEntries(
  ["pass-exact", "pass-conjugated", "mismatch", "target-not-found", "ambiguous"].map(
    (status) => [status, results.filter((result) => result.status === status).length],
  ),
);
console.log(`[audited] ${results.length} rows`);
for (const [status, count] of Object.entries(counts)) {
  console.log(`  ${status}: ${count}`);
}
console.log(`[report] ${reportRecords.length} rows -> ${reportFile}`);
if (!includePasses) {
  console.log("  pass statuses were summarized only; use --include-passes to include them");
}
