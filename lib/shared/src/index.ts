/**
 * Substitutes subject-name and [Year] tokens into prompt/option text wherever it is
 * shown to a host or guest. Stored text (promptSnapshot, question option labels) always
 * keeps the raw bracketed tokens; substitution happens only at render time, in this one
 * shared function, so every read path stays consistent.
 *
 * Token resolution rules:
 * - Any `[Token]` with a matching entry in subjectValues is replaced with that value
 *   exactly as the host entered it (no trimming or altering). Possessives are written
 *   in the stored text as `[Token]'s`, so only the bracketed part is ever replaced.
 * - `[Baby]` is the only token with a defined blank form: when its subjectValues entry
 *   is missing or blank, it renders as the literal lowercase "the baby". Every other
 *   token is required before a vault can be sealed, so a missing/blank value for any
 *   other token is left as the literal bracketed text rather than guessing a fallback.
 * - `[Year]` does not come from subjectValues. It resolves against a specific reveal
 *   date: a reveal landing on January 1 shows the year that just ended, any other date
 *   shows the year it falls in. Without a revealDate in context (an aggregate view that
 *   spans multiple reveal dates), `[Year]` is left as the literal token.
 */

export type SubstituteTokensContext = {
  subjectValues?: Record<string, string> | null;
  /** ISO date string (YYYY-MM-DD) for the single reveal this text is scoped to, if any. */
  revealDate?: string | null;
};

const TOKEN_PATTERN = /\[[^[\]]+\]/g;

/**
 * Resolves the display year for a reveal date. Parses the ISO date string's
 * components directly rather than via the Date constructor, matching the UTC-noon
 * anchoring convention used elsewhere in the schedule code, so this never drifts a
 * day across timezones.
 */
function resolveYear(revealDate: string): string {
  const [yearStr, monthStr, dayStr] = revealDate.split("-");
  const year = Number(yearStr);
  const month = Number(monthStr);
  const day = Number(dayStr);
  if (month === 1 && day === 1) return String(year - 1);
  return String(year);
}

export function substituteTokens(text: string, context: SubstituteTokensContext): string {
  const subjectValues = context.subjectValues ?? {};
  return text.replace(TOKEN_PATTERN, (token) => {
    if (token === "[Year]") {
      return context.revealDate ? resolveYear(context.revealDate) : token;
    }
    const value = subjectValues[token];
    if (token === "[Baby]") {
      return value?.trim() ? value : "the baby";
    }
    return value?.trim() ? value : token;
  });
}
