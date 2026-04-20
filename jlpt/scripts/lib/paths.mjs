import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const SCRIPTS_ROOT = resolve(SCRIPT_DIR, "..");
const JLPT_ROOT = resolve(SCRIPTS_ROOT, "..");

export const PATHS = {
  jlptRoot: JLPT_ROOT,
  dataRoot: resolve(JLPT_ROOT, "data"),
  docsRoot: resolve(JLPT_ROOT, "docs")
};

export function levelFileName(level, extension) {
  return `${level.toLowerCase()}.${extension}`;
}

export function rawCsvUrl(level, branch = "main") {
  return `https://raw.githubusercontent.com/jamsinclair/open-anki-jlpt-decks/refs/heads/${branch}/src/${level.toLowerCase()}.csv`;
}

