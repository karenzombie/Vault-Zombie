import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const bankDirectory = path.resolve(
  scriptDirectory,
  "../../Vault_Zombie_Initial_Build_Files",
);
const metadataPath = path.join(bankDirectory, "question-metadata.json");

interface QuestionMetadata {
  sourceKey: string;
  number?: {
    unit: string;
    minimum: number;
    maximum: number;
    closeBand: number;
  };
  freeTextMode?: "scoreable" | "keepsake";
}

type AnswerType =
  | "free_text"
  | "number"
  | "multiple_choice"
  | "name_pick";

interface ParsedQuestion {
  sourceKey: string;
  file: string;
  sourceLine: number;
  subcategoryOrder: number;
  subcategoryName: string;
  localRow: number;
  prompt: string;
  answerType: AnswerType;
  options: string[];
}

const typeMap: Record<string, AnswerType> = {
  "Free text": "free_text",
  Number: "number",
  "Multiple choice": "multiple_choice",
  "Name-pick": "name_pick",
};

function normalizePrompt(vaultSlug: string, value: string): string {
  let result = value;
  if (vaultSlug === "marriage" || vaultSlug === "couple") {
    result = result
      .replace(/\bPartner A\b/g, "[Partner A]")
      .replace(/\bPartner B\b/g, "[Partner B]");
  }
  if (vaultSlug === "baby" || vaultSlug === "child-growth") {
    result = result
      .replace(/\bParent A\b/g, "[Parent A]")
      .replace(/\bParent B\b/g, "[Parent B]");
  }
  if (vaultSlug === "baby") {
    result = result.replace(/\bthe baby\b/gi, "[Baby]");
  }
  return result;
}

function parseRow(line: string): string[] {
  return line
    .slice(1, -1)
    .split(/(?<!\\)\|/)
    .map((cell) => cell.trim().replace(/\\\|/g, "|"));
}

function slugFromFilename(filename: string): string {
  return filename
    .replace(/^vaultzombie-questions-/, "")
    .replace(/\.md$/, "");
}

async function parseBank(filename: string): Promise<ParsedQuestion[]> {
  const vaultSlug = slugFromFilename(filename);
  const content = await readFile(path.join(bankDirectory, filename), "utf8");
  const lines = content.split(/\r?\n/);
  const questions: ParsedQuestion[] = [];
  let subcategoryOrder = 0;
  let subcategoryName = "";

  lines.forEach((line, index) => {
    const heading = line.match(/^##\s+(\d+)\.\s+(.+?)\s*$/);
    if (heading) {
      subcategoryOrder = Number(heading[1]);
      subcategoryName = heading[2].trim();
      return;
    }
    if (!subcategoryOrder || !/^\|\s*\d+\s*\|/.test(line)) return;

    const cells = parseRow(line);
    if (cells.length !== 4) {
      throw new Error(`${filename}:${index + 1}: expected 4 table cells`);
    }
    const localRow = Number(cells[0]);
    const answerType = typeMap[cells[2]];
    if (!answerType) {
      throw new Error(
        `${filename}:${index + 1}: unknown answer type "${cells[2]}"`,
      );
    }

    const prompt = normalizePrompt(vaultSlug, cells[1]);
    const rawOptions =
      cells[3] === "140 char" || cells[3] === "" ? [] : cells[3].split(" / ");
    const options = rawOptions.map((option) => {
      const normalized = normalizePrompt(vaultSlug, option.trim());
      return normalized ===
        "A surprise to everyone (retire if already known)"
        ? "A surprise to everyone"
        : normalized;
    });

    questions.push({
      sourceKey: `${vaultSlug}:${subcategoryOrder}:${localRow}`,
      file: filename,
      sourceLine: index + 1,
      subcategoryOrder,
      subcategoryName,
      localRow,
      prompt,
      answerType,
      options,
    });
  });

  return questions;
}

async function loadMetadata() {
  try {
    const content = await readFile(metadataPath, "utf8");
    const value: unknown = JSON.parse(content);
    if (!Array.isArray(value)) {
      throw new Error("question-metadata.json must contain an array");
    }
    return value.map((item, index): QuestionMetadata => {
      if (
        typeof item !== "object" ||
        item === null ||
        !("sourceKey" in item) ||
        typeof item.sourceKey !== "string" ||
        item.sourceKey.length === 0
      ) {
        throw new Error(`question-metadata.json item ${index + 1} has no sourceKey`);
      }
      const raw = item as Record<string, unknown>;
      const result: QuestionMetadata = { sourceKey: item.sourceKey };
      if (raw.freeTextMode !== undefined) {
        if (
          raw.freeTextMode !== "scoreable" &&
          raw.freeTextMode !== "keepsake"
        ) {
          throw new Error(
            `question-metadata.json item ${index + 1} has invalid freeTextMode`,
          );
        }
        result.freeTextMode = raw.freeTextMode;
      }
      if (raw.number !== undefined) {
        if (typeof raw.number !== "object" || raw.number === null) {
          throw new Error(
            `question-metadata.json item ${index + 1} has invalid number metadata`,
          );
        }
        const number = raw.number as Record<string, unknown>;
        if (
          typeof number.unit !== "string" ||
          number.unit.length === 0 ||
          typeof number.minimum !== "number" ||
          typeof number.maximum !== "number" ||
          typeof number.closeBand !== "number" ||
          number.maximum <= number.minimum ||
          number.closeBand < 0
        ) {
          throw new Error(
            `question-metadata.json item ${index + 1} has incomplete number metadata`,
          );
        }
        result.number = {
          unit: number.unit,
          minimum: number.minimum,
          maximum: number.maximum,
          closeBand: number.closeBand,
        };
      }
      return result;
    });
  } catch (error) {
    if (
      error instanceof Error &&
      "code" in error &&
      error.code === "ENOENT"
    ) {
      return [];
    }
    throw error;
  }
}

async function main() {
  const files = (await readdir(bankDirectory))
    .filter((file) => /^vaultzombie-questions-.+\.md$/.test(file))
    .sort();
  const banks = await Promise.all(files.map(parseBank));
  const questions = banks.flat();
  const metadata = await loadMetadata();
  const metadataByKey = new Map(
    metadata.map((entry) => [entry.sourceKey, entry]),
  );
  const errors: string[] = [];

  for (const question of questions) {
    const entry = metadataByKey.get(question.sourceKey);
    const location = `${question.file}:${question.sourceLine} (${question.sourceKey})`;
    if (question.answerType === "number" && !entry?.number) {
      errors.push(`${location}: missing unit, minimum, maximum, and close band`);
    }
    if (question.answerType === "free_text" && !entry?.freeTextMode) {
      errors.push(`${location}: missing scoreable/keepsake classification`);
    }
    if (
      (question.answerType === "multiple_choice" ||
        question.answerType === "name_pick") &&
      question.options.length < 2
    ) {
      errors.push(`${location}: choice question requires at least two options`);
    }
  }

  const knownKeys = new Set(questions.map((question) => question.sourceKey));
  for (const entry of metadata) {
    if (!knownKeys.has(entry.sourceKey)) {
      errors.push(
        `${path.basename(metadataPath)}: unknown sourceKey ${entry.sourceKey}`,
      );
    }
  }

  if (errors.length > 0) {
    process.stderr.write(
      [
        `Question-bank validation failed with ${errors.length} issue(s).`,
        ...errors,
        "",
      ].join("\n"),
    );
    process.exitCode = 1;
    return;
  }

  process.stdout.write(
    `Validated ${questions.length} questions across ${files.length} banks. Metadata is complete.\n`,
  );
}

await main();