/**
 * Email-safe HTML layout system (spec section 3) plus a matching plain-text
 * renderer, built from the same block list so both versions carry identical
 * content in identical order (spec 1.7).
 */

export const COLOR = {
  parchment: "#F6F4F0",
  white: "#FFFFFF",
  hairline: "#E4DED4",
  brassLight: "#E7D6B4",
  bronze: "#8A6D3B",
  ink: "#1C1B19",
  text2: "#55514A",
  brass: "#C9A96A",
  bronzeWash: "#F0E9DC",
  green: "#4E7A46",
  greenBg: "#E7EFE4",
  rust: "#A24B3A",
  rustBg: "#F2E3DF",
  gray: "#8A857C",
};

const FONT = "'Afacad Flux', Helvetica, Arial, sans-serif";

function appUrl() {
  const value = process.env.VAULT_ZOMBIE_APP_URL;
  if (!value) throw new Error("VAULT_ZOMBIE_APP_URL must be configured before email links can be created.");
  return value.replace(/\/$/, "");
}

export function escapeHtml(value: unknown) {
  return String(value ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

export type IconName = "lock" | "open-lock" | "hourglass" | "calendar" | "gift-box" | "key" | "qr-code" | "group" | "trophy" | "pencil" | "receipt";

function iconImg(name: IconName, variant: "bronze" | "brass") {
  const src = `${appUrl()}/email-icons/${name}-${variant}.png`;
  return `<img src="${src}" width="18" height="18" style="height:18px;width:18px;max-height:18px;vertical-align:middle;margin-right:8px;display:inline-block;border:0" alt="" />`;
}

export type ResultKind = "full" | "half" | "zero" | "keepsake";
const RESULT_LABEL: Record<ResultKind, string> = { full: "Came true", half: "Sort of", zero: "Nope", keepsake: "Keepsake" };
const RESULT_COLOR: Record<ResultKind, { text: string; bg: string }> = {
  full: { text: COLOR.green, bg: COLOR.greenBg },
  half: { text: COLOR.bronze, bg: COLOR.bronzeWash },
  zero: { text: COLOR.rust, bg: COLOR.rustBg },
  keepsake: { text: COLOR.text2, bg: COLOR.parchment },
};
export function resultLabel(kind: ResultKind) { return RESULT_LABEL[kind]; }

export type Block =
  | { kind: "paragraph"; text: string }
  | { kind: "greeting"; text: string }
  | { kind: "sectionHeading"; icon?: IconName; text: string; dark?: boolean }
  | { kind: "highlightBand"; children: Block[] }
  | { kind: "codeBox"; code: string; note?: string }
  | { kind: "linkBox"; url: string; note?: string }
  | { kind: "darkBand"; children: Block[] }
  | { kind: "statTiles"; tiles: Array<{ number: string; label: string }> }
  | { kind: "button"; url: string; label: string }
  | { kind: "numberedSteps"; steps: string[] }
  | { kind: "bulletList"; items: string[] }
  | { kind: "receiptTable"; rows: Array<{ label: string; value: string }>; total: { label: string; value: string } }
  | { kind: "checklist"; items: Array<{ done: boolean; label: string }> }
  | { kind: "resultScoreTiles"; tiles: Array<{ kind: ResultKind; count: string; label: string } | { rank: string; of: string }> }
  | { kind: "predictionsTable"; rows: Array<{ prompt: string; said: string; note?: string | null; result: ResultKind }> };

function td(content: string, style = "") { return `<td style="${style}">${content}</td>`; }
function tableWrap(inner: string, style = "width:100%;border-collapse:collapse;") { return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="${style}"><tr>${inner}</tr></table>`; }

function blockHtml(block: Block, ctx: { dark?: boolean } = {}): string {
  switch (block.kind) {
    case "paragraph": {
      const color = ctx.dark ? COLOR.parchment : COLOR.ink;
      return `<p style="font-family:${FONT};font-size:16px;line-height:1.5;color:${color};margin:0 0 16px">${block.text}</p>`;
    }
    case "greeting": {
      const color = ctx.dark ? COLOR.parchment : COLOR.ink;
      return `<p style="font-family:${FONT};font-size:16px;line-height:1.5;color:${color};margin:0 0 16px">${block.text}</p>`;
    }
    case "sectionHeading": {
      const dark = ctx.dark || block.dark;
      const iconHtml = block.icon ? iconImg(block.icon, dark ? "brass" : "bronze") : "";
      const color = dark ? COLOR.parchment : COLOR.ink;
      return `<h2 style="font-family:${FONT};font-size:17px;font-weight:600;color:${color};margin:0 0 12px">${iconHtml}${block.text}</h2>`;
    }
    case "highlightBand":
      // Spans the full card width, like the header band (spec 3.3). It bleeds out of the
      // body's 32px side padding via negative margins instead of sitting inset.
      return `<div style="background:${COLOR.bronzeWash};padding:20px 32px;margin:0 -32px 20px">${block.children.map((child) => blockHtml(child, ctx)).join("")}</div>`;
    case "codeBox":
      return `<div style="background:${COLOR.white};border:2px dashed ${COLOR.brass};border-radius:8px;padding:16px;text-align:center;margin:0 0 12px">` +
        `<span style="font-family:${FONT};font-size:24px;font-weight:700;letter-spacing:0.14em;color:${COLOR.ink}">${escapeHtml(block.code)}</span>` +
        (block.note ? `<div style="font-family:${FONT};font-size:13px;color:${COLOR.text2};margin-top:8px">${block.note}</div>` : "") + `</div>`;
    case "linkBox":
      return `<div style="background:${COLOR.white};border:2px dashed ${COLOR.brass};border-radius:8px;padding:16px;text-align:center;margin:0 0 12px">` +
        `<a href="${block.url}" style="font-family:${FONT};font-size:16px;color:${COLOR.bronze};text-decoration:underline;word-break:break-all">${block.url}</a>` +
        (block.note ? `<div style="font-family:${FONT};font-size:14px;color:${COLOR.ink};margin-top:8px">${block.note}</div>` : "") + `</div>`;
    case "darkBand":
      // Same full-bleed treatment as highlightBand; children render with dark-context colors.
      return `<div style="background:${COLOR.ink};padding:20px 32px;margin:0 -32px 20px">${block.children.map((child) => blockHtml(child, { dark: true })).join("")}</div>`;
    case "statTiles": {
      const cells = block.tiles.map((tile) => td(
        `<div style="background:${COLOR.ink};border:1px solid ${COLOR.text2};border-radius:8px;padding:14px 8px;text-align:center">` +
        `<div style="font-family:${FONT};font-size:24px;font-weight:700;color:${COLOR.brass}">${escapeHtml(tile.number)}</div>` +
        `<div style="font-family:${FONT};font-size:13px;color:${COLOR.parchment};margin-top:4px">${escapeHtml(tile.label)}</div></div>`,
        "padding:4px;width:" + Math.floor(100 / block.tiles.length) + "%",
      )).join("");
      return tableWrap(cells);
    }
    case "button": {
      const cell = `<td style="background:${COLOR.ink};border-radius:8px;padding:14px 28px;text-align:center"><a href="${block.url}" style="font-family:${FONT};font-size:16px;font-weight:600;color:${COLOR.brassLight};text-decoration:none">${escapeHtml(block.label)}</a></td>`;
      return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto 20px"><tr>${cell}</tr></table>`;
    }
    case "numberedSteps": {
      const circleBg = ctx.dark ? COLOR.parchment : COLOR.ink;
      const circleColor = ctx.dark ? COLOR.ink : COLOR.brassLight;
      const textColor = ctx.dark ? COLOR.parchment : COLOR.ink;
      return `<div style="margin:0 0 16px">${block.steps.map((step, index) => (
        `<table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;margin-bottom:10px"><tr>` +
        `<td style="width:26px;vertical-align:top"><div style="width:26px;height:26px;border-radius:50%;background:${circleBg};color:${circleColor};font-family:${FONT};font-size:13px;font-weight:700;text-align:center;line-height:26px">${index + 1}</div></td>` +
        `<td style="padding-left:10px;font-family:${FONT};font-size:16px;line-height:1.5;color:${textColor}">${step}</td>` +
        `</tr></table>`
      )).join("")}</div>`;
    }
    case "bulletList": {
      const color = ctx.dark ? COLOR.parchment : COLOR.ink;
      return `<ul style="font-family:${FONT};font-size:16px;line-height:1.5;color:${color};margin:0 0 16px;padding-left:20px">${block.items.map((item) => `<li style="margin-bottom:6px">${item}</li>`).join("")}</ul>`;
    }
    case "receiptTable": {
      const color = ctx.dark ? COLOR.parchment : COLOR.ink;
      const ruleColor = ctx.dark ? COLOR.parchment : COLOR.ink;
      const rows = block.rows.map((row) => (
        `<tr><td style="padding:8px 0;border-bottom:1px solid ${COLOR.hairline};font-family:${FONT};font-size:16px;color:${color}">${row.label}</td>` +
        `<td style="padding:8px 0;border-bottom:1px solid ${COLOR.hairline};font-family:${FONT};font-size:16px;color:${color};text-align:right">${row.value}</td></tr>`
      )).join("");
      const total = `<tr><td style="padding:10px 0;border-top:2px solid ${ruleColor};border-bottom:2px solid ${ruleColor};font-family:${FONT};font-size:16px;font-weight:700;color:${color}">${block.total.label}</td>` +
        `<td style="padding:10px 0;border-top:2px solid ${ruleColor};border-bottom:2px solid ${ruleColor};font-family:${FONT};font-size:16px;font-weight:700;color:${color};text-align:right">${block.total.value}</td></tr>`;
      return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="width:100%;margin:0 0 16px">${rows}${total}</table>`;
    }
    case "checklist": {
      const color = ctx.dark ? COLOR.parchment : COLOR.ink;
      return `<div style="margin:0 0 8px">${block.items.map((item) => (
        `<div style="font-family:${FONT};font-size:16px;color:${color};margin-bottom:8px">` +
        `<span style="color:${item.done ? COLOR.bronze : (ctx.dark ? COLOR.parchment : COLOR.text2)};display:inline-block;width:20px">${item.done ? "✓" : "☐"}</span>${escapeHtml(item.label)}</div>`
      )).join("")}</div>`;
    }
    case "resultScoreTiles": {
      const cells = block.tiles.map((tile) => {
        if ("rank" in tile) {
          return td(`<div style="background:${COLOR.ink};border-radius:8px;padding:14px 8px;text-align:center">` +
            `<div style="font-family:${FONT};font-size:24px;font-weight:700;color:${COLOR.brass}">${escapeHtml(tile.rank)}</div>` +
            `<div style="font-family:${FONT};font-size:13px;color:${COLOR.parchment};margin-top:4px">${escapeHtml(tile.of)}</div></div>`, "padding:4px");
        }
        const colors = RESULT_COLOR[tile.kind];
        return td(`<div style="background:${colors.bg};border:1px solid ${COLOR.hairline};border-radius:8px;padding:14px 8px;text-align:center">` +
          `<div style="font-family:${FONT};font-size:24px;font-weight:700;color:${colors.text}">${escapeHtml(tile.count)}</div>` +
          `<div style="font-family:${FONT};font-size:13px;color:${colors.text};margin-top:4px">${escapeHtml(tile.label)}</div></div>`, "padding:4px");
      }).join("");
      return tableWrap(cells);
    }
    case "predictionsTable":
      return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="width:100%;margin:0 0 16px">${block.rows.map((row) => {
        const colors = RESULT_COLOR[row.result];
        const promptColor = ctx.dark ? COLOR.parchment : COLOR.ink;
        return `<tr><td style="padding:10px 0;border-bottom:1px solid ${COLOR.hairline};vertical-align:top">` +
          `<div style="font-family:${FONT};font-size:15px;font-weight:600;color:${promptColor}">${escapeHtml(row.prompt)}</div>` +
          `<div style="font-family:${FONT};font-size:14px;color:${COLOR.text2}">You said: ${escapeHtml(row.said)}</div>` +
          (row.note ? `<div style="font-family:${FONT};font-size:13px;color:${COLOR.gray}">Host's note: ${escapeHtml(row.note)}</div>` : "") +
          `</td><td style="padding:10px 0;border-bottom:1px solid ${COLOR.hairline};text-align:right;vertical-align:top;white-space:nowrap">` +
          `<span style="display:inline-block;font-family:${FONT};font-size:13px;font-weight:600;color:${colors.text};background:${colors.bg};border-radius:6px;padding:4px 10px">${resultLabel(row.result)}</span></td></tr>`;
      }).join("")}</table>`;
  }
}

function stripHtml(value: string) {
  return value.replace(/<br\s*\/?>/g, "\n").replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'").trim();
}

function blockText(block: Block): string {
  switch (block.kind) {
    case "paragraph": case "greeting": return stripHtml(block.text);
    case "sectionHeading": return stripHtml(block.text).toUpperCase();
    case "highlightBand": case "darkBand": return block.children.map(blockText).filter(Boolean).join("\n");
    case "codeBox": return [block.code, block.note ? stripHtml(block.note) : null].filter(Boolean).join("\n");
    case "linkBox": return [block.url, block.note ? stripHtml(block.note) : null].filter(Boolean).join("\n");
    case "statTiles": return block.tiles.map((t) => `${t.number} ${t.label}`).join(" · ");
    case "button": return `${stripHtml(block.label)}: ${block.url}`;
    case "numberedSteps": return block.steps.map((step, index) => `${index + 1}. ${stripHtml(step)}`).join("\n");
    case "bulletList": return block.items.map((item) => `- ${stripHtml(item)}`).join("\n");
    case "receiptTable": return [...block.rows.map((row) => `${row.label}: ${row.value}`), `${block.total.label}: ${block.total.value}`].join("\n");
    case "checklist": return block.items.map((item) => `${item.done ? "[x]" : "[ ]"} ${item.label}`).join("\n");
    case "resultScoreTiles": return block.tiles.map((t) => "rank" in t ? `${t.rank} ${t.of}` : `${t.count} ${t.label}`).join(" · ");
    case "predictionsTable": return block.rows.map((row) => [
      row.prompt, `You said: ${row.said}`, row.note ? `Host's note: ${row.note}` : null, `Result: ${resultLabel(row.result)}`,
    ].filter(Boolean).join("\n")).join("\n\n");
  }
}

export type FooterOptions = {
  questionsLine?: "default" | "purchase";
  guestUnsubscribe?: { vaultName: string; url: string };
};

function footerHtml(options: FooterOptions) {
  const questions = options.questionsLine === "purchase" ? "Questions about your purchase?" : "Questions?";
  const base = `<p style="font-family:${FONT};font-size:13px;color:${COLOR.text2};margin:0 0 4px">Zombie Platforms LLC</p>` +
    `<p style="font-family:${FONT};font-size:13px;color:${COLOR.text2};margin:0">${questions} <a href="mailto:info@zombieplatforms.com" style="color:${COLOR.bronze};text-decoration:underline">info@zombieplatforms.com</a>. This mailbox isn't monitored, so please don't reply to this email.</p>`;
  const unsubscribe = options.guestUnsubscribe
    ? `<p style="font-family:${FONT};font-size:13px;color:${COLOR.text2};margin:12px 0 0">Don't want emails about ${escapeHtml(options.guestUnsubscribe.vaultName)}? <a href="${options.guestUnsubscribe.url}" style="color:${COLOR.bronze};text-decoration:underline">Unsubscribe from this vault</a>. If you do, you won't hear when your predictions for ${escapeHtml(options.guestUnsubscribe.vaultName)} unlock or how they turned out. Emails from any other vault you're part of won't change.</p>`
    : "";
  return `<div style="max-width:600px;margin:20px auto 0;text-align:center;padding:0 20px">${base}${unsubscribe}</div>`;
}

function footerText(options: FooterOptions) {
  const questions = options.questionsLine === "purchase" ? "Questions about your purchase?" : "Questions?";
  const lines = ["Zombie Platforms LLC", `${questions} info@zombieplatforms.com. This mailbox isn't monitored, so please don't reply to this email.`];
  if (options.guestUnsubscribe) {
    lines.push(`Don't want emails about ${options.guestUnsubscribe.vaultName}? Unsubscribe from this vault: ${options.guestUnsubscribe.url}. If you do, you won't hear when your predictions for ${options.guestUnsubscribe.vaultName} unlock or how they turned out. Emails from any other vault you're part of won't change.`);
  }
  return lines.join("\n");
}

export function renderDoc(input: { eyebrow: string; heading: string; blocks: Block[]; footer: FooterOptions }) {
  const logo1 = `${appUrl()}/vault_zombie_png.png`;
  const logo2 = `${appUrl()}/vaultzombie_text.png`;
  const header = `<tr><td style="background:${COLOR.brassLight};padding:24px;text-align:center;border-radius:12px 12px 0 0">` +
    `<img src="${logo1}" alt="Vault Zombie" height="40" style="height:40px;vertical-align:middle;display:inline-block;border:0" />` +
    `<img src="${logo2}" alt="Vault Zombie" height="28" style="height:28px;vertical-align:middle;display:inline-block;border:0;margin-left:10px" /></td></tr>`;
  const heading = `<tr><td style="padding:28px 32px 4px;text-align:center">` +
    `<div style="font-family:${FONT};font-size:13px;font-weight:600;color:${COLOR.bronze};margin:0 0 6px">${escapeHtml(input.eyebrow)}</div>` +
    `<div style="font-family:${FONT};font-size:28px;font-weight:700;color:${COLOR.ink};margin:0 0 20px">${escapeHtml(input.heading)}</div></td></tr>`;
  const body = `<tr><td style="padding:0 32px 28px">${input.blocks.map((block) => blockHtml(block)).join("")}</td></tr>`;
  const html = `<!doctype html><html><body style="margin:0;padding:24px 12px;background:${COLOR.parchment}">` +
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;background:${COLOR.white};border:1px solid ${COLOR.hairline};border-radius:12px">` +
    `${header}${heading}${body}</table>${footerHtml(input.footer)}</body></html>`;
  const text = [
    input.eyebrow, input.heading, "",
    input.blocks.map(blockText).filter(Boolean).join("\n\n"),
    "", footerText(input.footer),
  ].join("\n");
  return { html, text };
}
