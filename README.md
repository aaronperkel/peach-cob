# Peach Cob 🍑

The house ledger for 404 Parke Ave — shared utility bills split, tracked, and settled among four roommates. Each utility is on one girl's account (Wifi → Abby, Electric → Ava, Gas → Caroline, Water → Brenda); when she posts the bill, the other three each owe her their quarter, and the site keeps score until everyone's square.

Adapted from the [utilities](https://github.com/aaronperkel/utilities) dashboard, re-imagined with its own design language.

## Features

- 🍑 **The ledger** — every bill with per-person shares, due dates, who-owes-whom at a glance, PDF view/download, and a personal "you owe" summary
- 🔐 **Email-code sign-in** — each resident logs in with a 6-digit code sent to her email; no passwords to remember
- 🧾 **Owner-based splits** — bill types know whose account they're on; posting a bill splits it evenly and tracks the pay-backs to the owner, with each upload attributed to who posted it
- 📧 **Automated reminders** — emails when a bill is posted, a heads-up 7 days before due, and urgent nudges within 3 days (including overdue); schedule editable in the portal
- 📅 **Calendar feed** — `/cal.ics` generated on demand; one-tap subscribe buttons for Google Calendar and Apple Calendar

## Technology Stack

- **Next.js 15** (App Router) + **TypeScript** + **Tailwind v4** (light/dark via system preference)
- **MySQL** via `mysql2` (TiDB Cloud Serverless)
- **nodemailer** (iCloud SMTP) for email, **jose** for signed session cookies, **Vercel Blob** for bill PDFs

## Setup

```bash
npm install
cp .env.example .env.local   # then fill in credentials
npm run dev                  # local dev server
npm run build                # production build + typecheck
npm run send-reminders       # run the reminder batch once, from the CLI
```

First run: apply `db/schema.sql` to a fresh database, then `db/seed.sql` (fill in the girls' real emails first — email is the login identity). The seed includes a few demo bills for showing the site around; the cleanup SQL to remove them is noted in the file.

For local development set `APP_LOCAL_DEV_USER` to a `people.email` to bypass the login gate. Uploaded bill PDFs live in Vercel Blob and are served through an auth-gated route.

## Deployment

Vercel + TiDB Cloud Serverless (database) + Vercel Blob (bill PDFs). Reminders are triggered by an hourly GitHub Actions ping of `/api/cron/reminders` (`CRON_SECRET` set both as a repo secret and in the Vercel env).
