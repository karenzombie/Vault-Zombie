import { and, asc, eq, ilike, inArray, or } from "drizzle-orm";
import { Router, type IRouter } from "express";
import {
  applyQuestionBank,
  assertQuestionMetadata,
  db,
  questionOptionsTable,
  questionsTable,
  runSensitiveAdminAction,
  subcategoriesTable,
  validateQuestionBank,
  vaultTypesTable,
  type QuestionBankImport,
} from "@workspace/db";
import { sensitiveAdminGuards } from "../middlewares/auth";

const router: IRouter = Router();
const kinds = ["vault-types", "subcategories", "questions", "options"] as const;
type Kind = (typeof kinds)[number];
const tables = { "vault-types": vaultTypesTable, subcategories: subcategoriesTable, questions: questionsTable, options: questionOptionsTable } as const;
const fields: Record<Kind, readonly string[]> = {
  "vault-types": ["slug", "name", "requiredSubjectTokens", "displayOrder"],
  subcategories: ["vaultTypeId", "sourceKey", "name", "iconKey", "displayOrder"],
  questions: ["subcategoryId", "sourceKey", "prompt", "answerType", "freeTextMode", "numberUnit", "numberMinimum", "numberMaximum", "numberCloseBand", "fitTag", "displayOrder"],
  options: ["questionId", "sourcePosition", "label", "displayOrder"],
};

function kind(value: string): Kind {
  if (!kinds.includes(value as Kind)) throw new Error("Unknown content kind.");
  return value as Kind;
}
function bodyFields(body: Record<string, unknown>, contentKind: Kind) {
  return Object.fromEntries(Object.entries(body).filter(([key]) => fields[contentKind].includes(key)));
}
function requireReason(body: unknown): string {
  const reason = (body as { reason?: unknown })?.reason;
  if (typeof reason !== "string" || !reason.trim() || reason.length > 1000) throw new Error("A typed reason of at most 1000 characters is required.");
  return reason;
}
function importBody(value: unknown): QuestionBankImport {
  if (!value || typeof value !== "object" || !("bank" in value)) throw new Error("A question bank is required.");
  return (value as { bank: QuestionBankImport }).bank;
}
async function action<T>(req: any, targetType: string, targetId: string | ((result: any) => string), task: Parameters<typeof runSensitiveAdminAction<T>>[1], details: Record<string, string | number | boolean | null> = {}) {
  return runSensitiveAdminAction({ actor: req.account!, action: "content_mutation", targetType, targetId, reason: requireReason(req.body), details }, task);
}
function validateQuestion(value: Record<string, any>) {
  assertQuestionMetadata({ ...value, options: value.options ?? [] } as Parameters<typeof assertQuestionMetadata>[0]);
}

router.get("/admin/content", ...sensitiveAdminGuards, async (req, res, next) => {
  try {
    const q = typeof req.query.q === "string" ? req.query.q.trim() : "";
    if (q.length > 100) throw new Error("Search text is too long.");
    const pattern = `%${q}%`;
    const [vaultTypes, subcategories, questions, options] = await Promise.all([
      db.select().from(vaultTypesTable).where(q ? or(ilike(vaultTypesTable.slug, pattern), ilike(vaultTypesTable.name, pattern)) : undefined).orderBy(asc(vaultTypesTable.displayOrder)),
      db.select().from(subcategoriesTable).where(q ? or(ilike(subcategoriesTable.sourceKey, pattern), ilike(subcategoriesTable.name, pattern)) : undefined).orderBy(asc(subcategoriesTable.displayOrder)),
      db.select().from(questionsTable).where(q ? or(ilike(questionsTable.sourceKey, pattern), ilike(questionsTable.prompt, pattern)) : undefined).orderBy(asc(questionsTable.displayOrder)),
      db.select().from(questionOptionsTable).where(q ? ilike(questionOptionsTable.label, pattern) : undefined).orderBy(asc(questionOptionsTable.displayOrder)),
    ]);
    res.json({ vaultTypes, subcategories, questions, options });
  } catch (error) { next(error); }
});

router.post("/admin/content/import/preview", ...sensitiveAdminGuards, async (req, res, next) => {
  try {
    const bank = importBody(req.body);
    const issues = validateQuestionBank(bank);
    res.json({ unresolvedCount: issues.length, issues, canApply: issues.length === 0 });
  } catch (error) { next(error); }
});
router.post("/admin/content/import/validate", ...sensitiveAdminGuards, async (req, res, next) => {
  try {
    const bank = importBody(req.body);
    const issues = validateQuestionBank(bank);
    res.json({ unresolvedCount: issues.length, issues, canApply: issues.length === 0 });
  } catch (error) { next(error); }
});
router.post("/admin/content/import/apply", ...sensitiveAdminGuards, async (req, res, next) => {
  try {
    const bank = importBody(req.body);
    const issues = validateQuestionBank(bank);
    if (issues.length !== 0) throw new Error(`Import has ${issues.length} unresolved validation issue(s).`);
    const result = await action(req, "question_bank", (created) => created.vaultTypeId, (tx) => applyQuestionBank(tx, bank), { unresolvedCount: 0 });
    res.status(201).json(result);
  } catch (error) { next(error); }
});

for (const rawKind of kinds) {
  router.post(`/admin/content/${rawKind}`, ...sensitiveAdminGuards, async (req, res, next) => {
    try {
      const contentKind = kind(rawKind);
      const values = bodyFields(req.body ?? {}, contentKind);
      const optionLabels = contentKind === "questions" && Array.isArray(req.body?.options) ? req.body.options : [];
      if (contentKind === "questions") validateQuestion({ ...(req.body ?? {}), options: optionLabels });
      const row = await action(req, contentKind, (created) => created.id, async (tx) => {
        const rows = await (tx.insert(tables[contentKind] as any).values(values).returning() as unknown as Promise<any[]>);
        const [created] = await rows;
        if (contentKind === "questions") {
          for (const [sourcePosition, label] of optionLabels.entries()) {
            if (typeof label !== "string" || !label.trim()) throw new Error("Question options must be non-empty strings.");
            await tx.insert(questionOptionsTable).values({ questionId: created.id, sourcePosition, displayOrder: sourcePosition, label });
          }
        }
        return created;
      });
      res.status(201).json(row);
    } catch (error) { next(error); }
  });
  router.patch(`/admin/content/${rawKind}/:id`, ...sensitiveAdminGuards, async (req, res, next) => {
    try {
      const contentKind = kind(rawKind); const id = String(req.params.id);
      const patch = bodyFields(req.body ?? {}, contentKind);
      delete (patch as Record<string, unknown>).sourceKey;
      if (!Object.keys(patch).length) throw new Error("No mutable fields supplied.");
      const row = await action(req, contentKind, id, async (tx) => {
        if (contentKind === "questions") {
          const [existing] = await tx.select().from(questionsTable).where(eq(questionsTable.id, id)).limit(1);
          if (!existing) throw new Error("Content item not found.");
          const options = await tx.select({ label: questionOptionsTable.label }).from(questionOptionsTable).where(and(eq(questionOptionsTable.questionId, id), eq(questionOptionsTable.isRetired, false)));
          validateQuestion({ ...existing, ...patch, options: options.map((option) => option.label) });
        }
        const [updated] = await tx.update(tables[contentKind] as any).set(patch).where(eq((tables[contentKind] as any).id, id)).returning();
        if (!updated) throw new Error("Content item not found.");
        return updated;
      });
      res.json(row);
    } catch (error) { next(error); }
  });
  router.post(`/admin/content/${rawKind}/:id/:state`, ...sensitiveAdminGuards, async (req, res, next) => {
    try {
      const contentKind = kind(rawKind); const id = String(req.params.id);
      if (req.params.state !== "retire" && req.params.state !== "reactivate") throw new Error("State must be retire or reactivate.");
      const retired = req.params.state === "retire";
      const row = await action(req, contentKind, id, async (tx) => {
        const [updated] = await tx.update(tables[contentKind] as any).set({ isRetired: retired }).where(eq((tables[contentKind] as any).id, id)).returning();
        if (!updated) throw new Error("Content item not found.");
        return updated;
      }, { retired });
      res.json(row);
    } catch (error) { next(error); }
  });
  router.post(`/admin/content/${rawKind}/reorder`, ...sensitiveAdminGuards, async (req, res, next) => {
    try {
      const contentKind = kind(rawKind); const ids = req.body?.ids;
      if (!Array.isArray(ids) || !ids.length || ids.some((id) => typeof id !== "string") || new Set(ids).size !== ids.length) throw new Error("A unique ordered ID list is required.");
      const result = await action(req, `${contentKind}_reorder`, () => ids[0], async (tx) => {
        const table = tables[contentKind] as any;
        const rows = await tx.select().from(table).where(inArray(table.id, ids));
        if (rows.length !== ids.length) throw new Error("Every ordered ID must exist.");
        const parent = contentKind === "subcategories" ? "vaultTypeId" : contentKind === "questions" ? "subcategoryId" : contentKind === "options" ? "questionId" : null;
        if (parent && new Set(rows.map((row: any) => row[parent])).size !== 1) throw new Error("Only siblings may be reordered together.");
        const siblings = parent ? await tx.select({ id: table.id }).from(table).where(eq(table[parent], rows[0][parent])) : await tx.select({ id: table.id }).from(table);
        if (siblings.length !== ids.length) throw new Error("The complete sibling order is required.");
        for (const [index, id] of ids.entries()) await tx.update(table).set({ displayOrder: -index - 1 }).where(eq(table.id, id));
        for (const [index, id] of ids.entries()) await tx.update(table).set({ displayOrder: index }).where(eq(table.id, id));
        return { ids };
      }, { itemCount: ids.length });
      res.json(result);
    } catch (error) { next(error); }
  });
}

export default router;