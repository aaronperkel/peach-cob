// HTML email templates in Peach Cob's design language: warm cream paper,
// peach accents, serif body, and Courier for the typed-ledger labels and
// figures (Courier ships with every mail client, so the emails share the
// site's ledger voice for real). Everything is inline-styled tables — email
// clients ignore stylesheets — and light-theme only, since dark-mode support
// across clients is unreliable. Colors mirror the light tokens in
// app/globals.css.

const PAGE = "#faf3e7";
const PANEL = "#fffcf7";
const INK = "#43302b";
const INK_MUTED = "#8a7468";
const LINE = "#dcc9b4";
const LINE_SOFT = "#efe3d2";
const PEACH = "#e78a68";
const PEACH_SOFT = "#f8ddce";
const ACCENT = "#b95536"; // deep peach: links, buttons
const UNPAID = "#b1443d";

const SERIF = "Georgia,'Times New Roman',serif";
const MONO = "'Courier New',Courier,monospace";

function esc(s: string): string {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function money(n: number): string {
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function formatLongDate(ymd: string): string {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

/** "Abby, Ava & Brenda" from a list of names. */
export function nameList(names: string[]): string {
  if (names.length <= 1) return names[0] ?? "";
  return `${names.slice(0, -1).join(", ")} & ${names[names.length - 1]}`;
}

export interface EmailIdentity {
  fromName: string;
  fromAddress: string;
  baseUrl: string;
  contactAddress: string; // human-reachable address for footers/Reply-To
}

/** Where replies and "contact" links should go (the From may be a noreply@). */
export function contactAddress(): string {
  return process.env.APP_EMAIL_CONTACT_ADDRESS ?? "me@aaronperkel.com";
}

export function emailIdentity(): EmailIdentity {
  return {
    fromName: process.env.APP_EMAIL_FROM_NAME ?? "Peach Cob",
    fromAddress: process.env.APP_EMAIL_FROM_ADDRESS ?? "",
    baseUrl: (process.env.APP_BASE_URL ?? "").replace(/\/+$/, ""),
    contactAddress: contactAddress(),
  };
}

// ---------------------------------------------------------------------------
// Building blocks
// ---------------------------------------------------------------------------

/** Typed uppercase section label — the email cousin of the site's .eyebrow. */
function eyebrow(text: string, color = INK_MUTED): string {
  return (
    `<div style="font-family:${MONO};font-size:11px;font-weight:700;letter-spacing:0.16em;` +
    `text-transform:uppercase;color:${color};margin:0 0 10px;">${esc(text)}</div>`
  );
}

function heading(text: string): string {
  return (
    `<h1 style="margin:0 0 14px;font-family:${SERIF};font-size:22px;font-weight:600;` +
    `letter-spacing:-0.01em;color:${INK};">${esc(text)}</h1>`
  );
}

function paragraph(html: string): string {
  return (
    `<p style="margin:0 0 14px;font-family:${SERIF};font-size:15px;line-height:1.6;` +
    `color:${INK};">${html}</p>`
  );
}

interface StatementRow {
  label: string;
  value: string; // pre-escaped by callers when needed
  strong?: boolean;
  color?: string;
}

/** Ruled label/value table — the email cousin of the site's .data-table. */
function statementTable(rows: StatementRow[]): string {
  const trs = rows
    .map((r, i) => {
      const border = i === 0 ? "" : `border-top:1px solid ${LINE_SOFT};`;
      const weight = r.strong ? 700 : 400;
      const size = r.strong ? "15px" : "13px";
      const color = r.color ?? INK;
      return (
        `<tr>` +
        `<td style="${border}padding:9px 2px;font-family:${MONO};font-size:11px;` +
        `letter-spacing:0.14em;text-transform:uppercase;color:${INK_MUTED};">${esc(r.label)}</td>` +
        `<td align="right" style="${border}padding:9px 2px;font-family:${MONO};` +
        `font-size:${size};font-weight:${weight};color:${color};">${r.value}</td>` +
        `</tr>`
      );
    })
    .join("");
  return (
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" ` +
    `style="margin:4px 0 18px;border-top:1px solid ${LINE};border-bottom:1px solid ${LINE};">` +
    `${trs}</table>`
  );
}

function button(href: string, label: string, variant: "primary" | "subtle" = "primary"): string {
  const styles =
    variant === "primary"
      ? `background:${ACCENT};color:#fffcf7;border:1px solid ${ACCENT};`
      : `background:${PANEL};color:${INK};border:1px solid ${LINE};`;
  return (
    `<a href="${esc(href)}" style="display:inline-block;padding:9px 16px;margin:0 8px 8px 0;` +
    `${styles}border-radius:8px;font-family:${SERIF};font-size:14px;font-weight:600;` +
    `text-decoration:none;">${esc(label)}</a>`
  );
}

/**
 * Statement-card wrapper: cream backdrop, peach awning stripe, typed
 * masthead, paper panel, and the shared footer (contact address, not the
 * noreply From).
 */
function emailShell(bodyHtml: string, id: EmailIdentity, preheader?: string): string {
  const hidden = preheader
    ? `<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">${esc(preheader)}</div>`
    : "";
  // The awning: peach cabana stripes with a solid-color fallback for clients
  // that drop background-image.
  const awning =
    `<tr><td style="height:8px;border-radius:10px 10px 0 0;background-color:${PEACH};` +
    `background-image:repeating-linear-gradient(90deg,${PEACH} 0,${PEACH} 12px,${PEACH_SOFT} 12px,${PEACH_SOFT} 24px);">` +
    `</td></tr>`;
  return (
    `<div style="margin:0;padding:28px 16px;background:${PAGE};">` +
    hidden +
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">` +
    `<table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;max-width:560px;">` +
    `<tr><td style="padding:0 6px 10px;font-family:${MONO};font-size:11px;font-weight:700;` +
    `letter-spacing:0.16em;text-transform:uppercase;color:${INK_MUTED};">` +
    `Peach Cob&nbsp;&middot;&nbsp;404 Parke Ave</td></tr>` +
    awning +
    `<tr><td style="background:${PANEL};border:1px solid ${LINE};border-top:0;` +
    `border-radius:0 0 10px 10px;padding:26px 28px;">${bodyHtml}</td></tr>` +
    `<tr><td style="padding:14px 6px 0;">` +
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>` +
    `<td style="font-family:${MONO};font-size:11px;letter-spacing:0.1em;` +
    `text-transform:uppercase;color:${INK_MUTED};">Peach Cob&nbsp;&middot;&nbsp;the house ledger</td>` +
    `<td align="right" style="font-family:${SERIF};font-size:12px;">` +
    `<a href="mailto:${esc(id.contactAddress)}" style="color:${ACCENT};text-decoration:none;">` +
    `${esc(id.contactAddress)}</a></td>` +
    `</tr></table></td></tr>` +
    `</table></td></tr></table></div>`
  );
}

// ---------------------------------------------------------------------------
// Templates
// ---------------------------------------------------------------------------

export function reminderEmailHtml(
  p: {
    personName: string;
    item: string;
    total: number;
    cost: number;
    dueDate: string; // YYYY-MM-DD
    ownerName: string | null; // who to pay back
    urgent?: boolean;
  },
  id: EmailIdentity,
): string {
  const due = formatLongDate(p.dueDate);
  const payLine = p.ownerName
    ? `your share of the <strong>${esc(p.item)}</strong> bill is coming due — ` +
      `send it to <strong>${esc(p.ownerName)}</strong>, she already covered the provider.`
    : `your share of the <strong>${esc(p.item)}</strong> bill is coming due.`;
  const body =
    eyebrow(p.urgent ? "Urgent — due soon" : "Payment reminder", p.urgent ? UNPAID : INK_MUTED) +
    heading(`${p.item} bill due ${due}`) +
    paragraph(`Hi ${esc(p.personName)}, ${payLine}`) +
    statementTable([
      { label: "Bill", value: esc(p.item) },
      { label: "Statement total", value: `$${money(p.total)}` },
      { label: "Your share", value: `$${money(p.cost)}`, strong: true },
      ...(p.ownerName ? [{ label: "Pay to", value: esc(p.ownerName) }] : []),
      { label: "Due", value: esc(due), color: p.urgent ? UNPAID : INK },
    ]) +
    button(`${id.baseUrl}/`, "Open the ledger");
  return emailShell(
    body,
    id,
    `${p.item} — your share $${money(p.cost)}${p.ownerName ? ` to ${p.ownerName}` : ""}, due ${due}.`,
  );
}

/** One-time login code (app/login). The code leads the subject so it shows
 *  in notification previews and Apple Mail's code autofill. */
export function loginCodeEmailHtml(
  p: { personName: string; code: string },
  id: EmailIdentity,
): string {
  const body =
    eyebrow("Sign-in code") +
    heading("Your one-time sign-in code") +
    paragraph(
      `Hi ${esc(p.personName)}, enter this code on the sign-in page. ` +
        `It expires in 10 minutes.`,
    ) +
    `<div style="margin:4px 0 18px;padding:18px 2px;border-top:1px solid ${LINE};` +
    `border-bottom:1px solid ${LINE};text-align:center;font-family:${MONO};` +
    `font-size:30px;font-weight:700;letter-spacing:0.35em;text-indent:0.35em;` +
    `color:${INK};">${esc(p.code)}</div>` +
    paragraph(
      `<span style="color:${INK_MUTED};font-size:13px;">Didn't try to sign in? ` +
        `You can safely ignore this email.</span>`,
    );
  return emailShell(body, id, `${p.code} is your sign-in code.`);
}

/** Plain-text alternative to loginCodeEmailHtml (same wording, no markup). */
export function loginCodeEmailText(p: { personName: string; code: string }): string {
  return (
    `Hi ${p.personName}, enter this code on the sign-in page. ` +
    `It expires in 10 minutes.\n\n` +
    `${p.code}\n\n` +
    `Didn't try to sign in? You can safely ignore this email.`
  );
}

export function newBillEmailHtml(
  p: {
    personName: string;
    item: string;
    total: number;
    cost: number;
    dueDate: string;
    billViewLink: string;
    ownerName: string | null; // who the debtors pay back
    postedByName: string | null; // who uploaded the bill
    isOwner: boolean; // recipient is the owner (owes nothing, collects)
    debtorNames: string[]; // everyone who owes on this bill
  },
  id: EmailIdentity,
): string {
  const due = formatLongDate(p.dueDate);
  const postedBy = p.postedByName ? ` ${esc(p.postedByName)} just posted it.` : "";
  const intro = p.isOwner
    ? `Hi ${esc(p.personName)}, a new <strong>${esc(p.item)}</strong> bill is on the ledger.${postedBy} ` +
      `${esc(nameList(p.debtorNames))} each owe <strong>you</strong> $${money(p.cost)}.`
    : `Hi ${esc(p.personName)}, a new <strong>${esc(p.item)}</strong> bill is on the ledger.${postedBy} ` +
      `Your share is <strong>$${money(p.cost)}</strong>` +
      (p.ownerName ? ` — send it to <strong>${esc(p.ownerName)}</strong>.` : `.`);
  const body =
    eyebrow("New bill posted") +
    heading(`${p.item} — ${due}`) +
    paragraph(intro) +
    statementTable([
      { label: "Bill", value: esc(p.item) },
      { label: "Statement total", value: `$${money(p.total)}` },
      {
        label: p.isOwner ? "Each owes you" : "Your share",
        value: `$${money(p.cost)}`,
        strong: true,
      },
      ...(p.ownerName && !p.isOwner ? [{ label: "Pay to", value: esc(p.ownerName) }] : []),
      { label: "Due", value: esc(due) },
    ]) +
    button(p.billViewLink, "View bill PDF") +
    button(`${id.baseUrl}/`, "Open the ledger", "subtle");
  return emailShell(
    body,
    id,
    p.isOwner
      ? `${p.item} — ${nameList(p.debtorNames)} each owe you $${money(p.cost)}, due ${due}.`
      : `${p.item} — your share $${money(p.cost)}, due ${due}.`,
  );
}

/** Cron batch summary sent to APP_CONFIRMATION_EMAIL_TO. */
export function batchConfirmationEmailHtml(
  sent: { person: string; email: string; item: string }[],
  id: EmailIdentity,
): string {
  const rows = sent
    .map(
      (r, i) =>
        `<tr>` +
        `<td style="${i === 0 ? "" : `border-top:1px solid ${LINE_SOFT};`}padding:8px 2px;` +
        `font-family:${SERIF};font-size:13px;color:${INK};">${esc(r.person)}</td>` +
        `<td style="${i === 0 ? "" : `border-top:1px solid ${LINE_SOFT};`}padding:8px 2px;` +
        `font-family:${SERIF};font-size:13px;color:${INK_MUTED};">${esc(r.email)}</td>` +
        `<td align="right" style="${i === 0 ? "" : `border-top:1px solid ${LINE_SOFT};`}` +
        `padding:8px 2px;font-family:${MONO};font-size:13px;color:${INK};">${esc(r.item)}</td>` +
        `</tr>`,
    )
    .join("");
  const body =
    eyebrow("Reminder batch") +
    heading(`${sent.length} reminder${sent.length === 1 ? "" : "s"} sent`) +
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" ` +
    `style="margin:4px 0 6px;border-top:1px solid ${LINE};border-bottom:1px solid ${LINE};">` +
    `${rows}</table>`;
  return emailShell(body, id, `Reminder batch: ${sent.length} sent.`);
}
