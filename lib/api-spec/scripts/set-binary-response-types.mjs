import { readFile, writeFile } from "node:fs/promises";

const path = new URL("../../api-client-react/src/generated/api.ts", import.meta.url);
let source = await readFile(path, "utf8");
for (const operation of ["downloadAdminFullExport", "downloadAdminVaultUnlockedExport"]) {
  const start = source.indexOf(`export const ${operation} =`);
  if (start < 0) throw new Error(`Generated binary operation ${operation} was not found.`);
  const end = source.indexOf("\nexport const ", start + 1);
  const block = source.slice(start, end < 0 ? source.length : end);
  const updated = block.replace("    ...options,\n    method:", "    ...options,\n    responseType: 'blob',\n    method:");
  if (updated === block) throw new Error(`Could not set Blob response type for ${operation}.`);
  source = source.slice(0, start) + updated + source.slice(end < 0 ? source.length : end);
}
await writeFile(path, source);