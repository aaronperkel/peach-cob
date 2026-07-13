# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Peach Cob: a Next.js 15 (App Router) + TypeScript + Tailwind v4 house ledger for the four roommates at 404 Parke Ave (Abby, Ava, Caroline, Brenda). Each utility is on one girl's account — the bill type's **owner** (Wifi → Abby, Electric → Ava, Gas → Caroline, Water → Brenda). She pays the provider; posting a bill splits the total evenly and creates pay-back debts for everyone *except* her. The site tracks bills, who-owes-whom, payments, and sends email reminders.

Adapted July 2026 from `aaronperkel/utilities` (the 77 N Union dashboard). This repo has no shared git history with it; when porting fixes, diff against that repo directly. Key deltas from utilities: owner-based splits (`bill_types.owner_id`, `bills.added_by_id`), no rent/trends/bulk-email/public-API, and a completely different design language.

## Commands

```bash
npm run dev              # dev server
npm run build            # production build + typecheck — the main verification gate
npm run start            # serve the production build
npm run send-reminders   # reminder batch CLI (tsx scripts/send-reminders.ts)
```

There is no test suite; `npm run build` (which typechecks) plus hitting routes against the live DB is the verification path.

## Configuration

Env lives in `.env.local` (see `.env.example` for all keys). Notable beyond the obvious DB/SMTP ones: `SESSION_SECRET` (jose cookie signing), `SITE_PASSPHRASE`/`SITE_OWNER_EMAIL` (fallback passphrase login; that path always fails while `SITE_PASSPHRASE` is unset — the primary email-code login needs only SMTP), `APP_LOCAL_DEV_USER` (set to a `people.email` to bypass login entirely — middleware short-circuits when it is set), `APP_DEMO_MODE=1` (no login, no DB: every read serves the in-memory dataset in `lib/demo.ts` — relative dates, viewer is Abby — and every mutation politely refuses; for showing the site before the real DB exists), `BLOB_READ_WRITE_TOKEN` (Vercel Blob, all PDF storage), `CRON_SECRET` (bearer token for `/api/cron/reminders`; must match the GitHub Actions repo secret of the same name).

The database is TiDB Cloud Serverless (MySQL-compatible, TLS on port 4000). `db/schema.sql` is the DDL; `db/seed.sql` seeds the four residents + their utilities (replace the placeholder emails before running — email is the login identity).

## Architecture

### Auth flow

Per-person email-code login: `middleware.ts` requires a valid session cookie for everything except `/login`, `/cal.ics`, `/api/cron`, `/no-access`, and static/icon assets, redirects to `/login`, and silently re-issues the 30-day jose-signed cookie once it is a week old (sliding renewal — monthly visitors never re-login). `/login` (`app/login/`) is a two-step form: enter a `people.email` address → a 6-digit one-time code is emailed (`lib/login-codes.ts`: sha256-hashed in the `login_codes` table, 10-minute TTL, 5 wrong guesses kill it, 3 codes per person per window, deleted on success) → correct code sets the session cookie with **that person's email** (email is the sole login identity). The code input uses `autocomplete="one-time-code"` so Apple Mail/Safari autofill the code. A fallback passphrase form (`/login?mode=passphrase`, link hidden when unconfigured) checks `SITE_PASSPHRASE` (timing-safe) and logs in as `SITE_OWNER_EMAIL` (default `me@aaronperkel.com`). Middleware only checks cookie validity; **page-level authorization** is `requireUser()` / `requireAdmin()` (`lib/auth.ts`), which check the session email against `people.email` / `is_admin` and redirect to `/no-access`. Server actions use `requireAdminAction()` (throws instead of redirecting; returns the acting `Person`, which `addBill` records as the poster). All four residents are seeded as admins — "admin" effectively means "resident who can use the portal". The root layout's `getCurrentPerson()` returns null without a DB round-trip when logged out, so `/login` renders even if the DB is unreachable.

### Database

Six tables via `mysql2` (`lib/db.ts`, pool with `dateStrings` + `decimalNumbers` so DATEs are `YYYY-MM-DD` strings and DECIMALs are numbers). Current DDL is checked in at `db/schema.sql`:

- `people` (`id`, `name`, `email` = also the login identity (unique), `is_admin`, `splits_bills` — 0 for sign-in-only accounts like Aaron the maintainer: they can run the portal but are excluded from split math, debts, checkbox lists, and new-bill emails via `getSplitters()`)
- `bill_types` (`id`, `name`, `emoji`, `processing_fee`, `owner_id` → `people`) — drives the add-bill dropdown, emoji display, fee math, and **who collects**: the owner fronted the provider, so debts on her bills run to her
- `bills` (`id`, `type_id` → `bill_types`, `bill_date`, `due_date`, `total`, `per_person_cost`, `status` enum `'unpaid'|'paid'`, `pdf_path`, `added_by_id` → `people` = upload attribution)
- `bill_debts` (`bill_id`, `person_id`) — junction: who still owes; **rows are deleted as people pay**, and the bill type's owner never gets a row on her own bill
- `login_codes` (`person_id`, `code_hash`, `attempts`, `created_at`, `expires_at`) — live one-time login codes; see Auth flow
- `reminder_config` — single-row reminder schedule (enabled, ET send hour, heads-up/urgent day offsets) plus cron bookkeeping (`last_run_at`, `last_send_date` once-per-day guard, `last_sent_at`/`last_sent_count`); edited in portal → Household

**No FK constraints** (experimental on TiDB): integrity is app-level — `removePerson` deletes the person's `bill_debts` rows and nulls any `bill_types.owner_id` pointing at her, `removeBillType` refuses while bills reference the type. `status` is the bill's global state; a bill flips to `'paid'` only when nobody is left in `bill_debts` (see `updateOwes` in `app/portal/actions.ts`, transactional — it also keeps the owner out of rebuilt debts). Bill math: `total = amount + processing_fee`, `per_person_cost = round(total / splitterCount, 2)` (the owner's share is the part she already fronted; splitters = `people.splits_bills = 1`). SQL aliases map snake_case columns to camelCase TS fields (`per_person_cost AS perPersonCost`); bill queries join `bill_types` + owner/poster names so each `Bill` carries `typeName`/`typeEmoji`/`ownerId`/`ownerName`/`addedByName`. `getOwedPairs()` (`lib/bills.ts`) aggregates the debtor → owner ledger shown on the dashboard and portal.

### Bill PDFs

Stored in Vercel Blob (`BLOB_READ_WRITE_TOKEN`; dev and prod share the store) with keys equal to `pdf_path` (`{year}/{type}/{name}.pdf`), served auth-gated by `app/files/[...path]/route.ts`, which `head()`s the key and streams the blob so its public-but-unguessable URL never leaks. `pdf_path` values are store-relative (`2026/Gas/x.pdf`); `billFileHref()` just prepends `/files/`. Uploads use `addRandomSuffix: false` + `allowOverwrite: true` so keys stay deterministic.

### Key surfaces

- `app/page.tsx` — the ledger: summary strip (you owe / next due / bill count), the house ledger (who owes whom, from `getOwedPairs`), bills grouped by year with per-user paid/unpaid tags, Google/Apple calendar subscribe buttons
- `app/portal/` — portal in two tabs (`PortalTabs`): `/portal` = bills (still-owed strip, add-bill disclosure, pay-back checkboxes that exclude the bill's owner, per-bill reminders), `/portal/household` = residents + utilities (name/emoji/fee/owner) + reminder schedule. All mutations are server actions; flash messages travel as `?ok=`/`?err=` query params, and `done()`/`fail()` in `actions.ts` take the destination path so household actions land back on their tab
- `app/cal.ics/route.ts` — public iCal feed generated on demand; the dashboard's Google button uses `calendar.google.com/calendar/render?cid=<webcal url>`, the Apple button links `webcal://`
- `app/api/cron/reminders/route.ts` — reminder scheduler: a GitHub Actions workflow (`.github/workflows/reminders.yml`) pings it hourly with `Authorization: Bearer CRON_SECRET`; the route reads `reminder_config` and sends on the first tick at or after the configured ET hour (GitHub drops delayed scheduled runs, so ticks are not reliably hourly), at most once per NY calendar day. Core logic is shared with the CLI in `lib/reminders.ts` (heads-up at exactly N days before due, urgent at ≤M days including overdue — defaults 7/3 — then a batch confirmation to `APP_CONFIRMATION_EMAIL_TO`)
- `app/opengraph-image.tsx` / `app/apple-icon.tsx` — brand images generated at request time via `next/og` `ImageResponse` (no binary assets in the repo; satori has no system fonts, so they're shape-based)
- `scripts/send-reminders.ts` — manual CLI for the same batch (thin wrapper over `lib/reminders.ts`); running it stamps `last_send_date`, so the cron won't double-send that day

### Email

`lib/mail.ts` (nodemailer, iCloud SMTP/STARTTLS; login is `SMTP_USER` falling back to the from address — iCloud logs in as the primary address even when sending From an alias like noreply@; Reply-To is the human `contactAddress()`) + `lib/emails.ts` (Peach Cob-styled templates — shared `emailShell` with the peach awning-stripe masthead, Georgia serif body, and Courier ledger tables mirroring the site's light tokens; inline styles only, email clients ignore stylesheets; light-theme only on purpose). New-bill and reminder emails are owner-aware: debtors are told who to pay, the owner is told who owes her. All emails (reminder, new bill, login code, batch + inline confirmations) go through here. `sendSmtpMail` returns false on failure (logged, not thrown); callers are responsible for surfacing failures.

### Styling

Tailwind v4 (CSS-first config in `app/globals.css`), "peach awning over a paper ledger" theme: light (cream/espresso/peach) and a warm dark follow the system via `prefers-color-scheme` — raw values live as CSS variables on `:root` and are mapped to utilities in `@theme inline` (so `bg-panel` etc. flip automatically; anything hardcoded won't). Deep peach is the accent, periwinkle (`--peri`) the second voice; sage/rose/butter are reserved for paid/unpaid/due-soon semantics. Three faces via next/font: Fraunces (`--font-fraunces`, display — `.page-title`/`.display`), Karla (`--font-body`, prose), Courier Prime (`--font-ledger`, the typed-ledger voice via `.figure`/`.eyebrow`/table headers on every number, date, and section label). The signature `.awning` class draws the striped cabana band + scalloped hem under the site header (`panel-awning` is the scallop-less panel variant). Shared component classes (`.panel`, `.eyebrow`, `.figure`, `.btn*`, `.tag*`, `.due-*`, `.field-*`, `.data-table`, `.tab*`, `.flash*`) live in `@layer components` — note Tailwind v4 cannot `@apply` a custom class from the same layer.

## Deployment

Vercel, backed by TiDB Cloud Serverless and Vercel Blob — set the `DB_*` env vars, `BLOB_READ_WRITE_TOKEN` (connecting the Blob store to the project sets the token automatically), and `CRON_SECRET` in the Vercel project. Reminders are scheduled by `.github/workflows/reminders.yml` (hourly GitHub Actions ping of `/api/cron/reminders`; GitHub Actions over Vercel Cron because Hobby-plan crons are limited to once daily, which would defeat the portal-configurable send hour). The workflow's URL must match the deployed domain.
