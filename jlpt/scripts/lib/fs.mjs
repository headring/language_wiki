import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

export async function ensureDir(filePath) {
  await mkdir(dirname(filePath), { recursive: true });
}

export async function readText(filePath) {
  return readFile(filePath, "utf8");
}

export async function writeText(filePath, text) {
  await ensureDir(filePath);
  await writeFile(filePath, text, "utf8");
}

