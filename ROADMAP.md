# TimeNlieu — Product Roadmap

## Context

TimeNlieu is a timesheet and Time in Lieu tracker built for an enterprise
managed-services consultant.  The consultant works across multiple client
sites simultaneously, logs hours per project and task each day, and earns
lieu time for any hours worked above 40 in a week.

The data shape this app must match is defined by the reference screenshot
in `attached_assets/` — a Microsoft Dynamics 365 timesheet grid showing
projects (U-OPS, LVC-IGS-INF…), tasks, roles (Server, Team Member,
Operational Support), entry types (Work, Administration), daily hour
columns, row and column totals, week navigation, and entry statuses
(Approved, Submitted, etc.).  That grid, or something functionally
equivalent, is the core of the product.

---

## Current State

The following work is already shipped and functional:

- **Authentication** — NextAuth.js credentials provider backed by the
  `users` table with bcrypt password hashing.  Sign-in flow working
  end-to-end.  Seed admin account (`test@example.com` / `password`)
  created on first startup via `src/db/seed.ts`.
- **Docker** — multi-stage `Dockerfile`, `docker-compose.yml`, named
  volume for SQLite persistence, auto-migration via
  `src/instrumentation.ts` on container start.
- **Database** — Drizzle ORM on SQLite.  Schema covers `users`,
  `accounts`, `sessions`, `verificationTokens`, `timesheetEntries`,
  `weeklySummaries`, and `notifications`.  WAL mode and foreign keys
  enabled.  Migration tracked in `drizzle/`.
- **Page skeleton** — Dashboard, Entries, Upload, Calendar, Reports,
  Admin pages exist with layout (sidebar + header) but no data or
  interactive logic.
- **UI library** — 47 Shadcn UI components installed.  Recharts,
  react-hook-form, zod, date-fns all available and unused so far.
- **Build** — `next build` passes clean (zero errors, zero warnings).
- **Server Actions** — mutation pattern established: Zod validation in
  `src/lib/schemas.ts`, example Server Action in `src/lib/actions.ts`.
  All future mutations follow this convention.

---

## Phase 1 — Technical Foundations

**Status: complete.**

- Prisma schema, migrations, and generated client deleted.  The dead
  ESLint ignore rule for `src/generated/` removed.
- Credentials provider wired against the `users` table with bcrypt.
  `src/db/seed.ts` creates one admin account on first run; called from
  `src/instrumentation.ts` after migrations.
- Server Action convention documented by example: `src/lib/schemas.ts`
  (Zod) and `src/lib/actions.ts` (`markNotificationRead`).

---

## Phase 2 — Data Model Expansion

**Status: pending.**

The current `timesheetEntries` table is a single row per entry with
`date + hours + description`.  The Dynamics 365 reference shows entries
structured as project → task → role → type → daily hours.  The schema
must expand before any feature work begins.

New tables:

```
projects        — id, name, code, clientName, isActive
projectTasks    — id, projectId, name, code
roles           — id, name  (Server, Team Member, Operational Support, …)
```

`timesheetEntries` gains columns:

```
projectId, taskId, roleId, entryType (Work | Admin),
status (Draft | Submitted | Approved | Recalled)
```

`weeklySummaries` is replaced by `lieuLedger`:

```
lieuLedger — id, userId, weekStartDate, totalHours, overtimeHours,
             lieuEarned, runningBalance
```

`runningBalance` is written on every mutation so it is always
queryable without recalculating history.  The 40-hour weekly threshold
is stored in a `config` table (or env var) — not a magic number.

Generate and apply a Drizzle migration for the new schema before
moving to Phase 3.

---

## Phase 3 — Weekly Timesheet Grid

**Status: pending.  Highest priority after the model is in place.**

This is the daily-use interface.  Everything else in the app is a
different view of the data this grid produces.

The Entries page becomes an interactive weekly grid:

| Project | Task | Role | Type | Sun | Mon | Tue | Wed | Thu | Fri | Sat | Total |
|---------|------|------|------|-----|-----|-----|-----|-----|-----|-----|-------|

Key behaviours:

- **Week navigator** — prev/next arrows with the displayed date range
  (`7/27/2025 – 8/2/2025` style), matching the Dynamics 365 UX.
- **Row management** — add a new project-task row, duplicate an
  existing row (common pattern: same project, different days), delete a
  row.
- **Inline hour entry** — click any day cell to enter hours.  Tab moves
  to the next cell.  Values validate as numeric, 0–24, max two decimal
  places.
- **Totals** — row totals (right column) and column totals (footer row)
  update live as hours are typed.  The footer also shows whether the
  week is over or under the lieu threshold.
- **Status** — each row starts as Draft.  A Submit button on the page
  flips all Draft rows for the displayed week to Submitted in one action.
- **Auto-save** — entries persist on blur.  A subtle visual indicator
  (border colour, opacity) distinguishes a cell that has unsaved state.

---

## Phase 4 — Lieu Time Calculation Engine

**Status: pending.  Paired with Phase 3.**

The business logic that turns a timesheet into a lieu tracker:

- On every entry save, recalculate `totalHours` for that week.  If
  greater than the configured threshold (default 40), compute
  `overtimeHours` and write `lieuEarned` to `lieuLedger`.
- `runningBalance` is the cumulative sum of `lieuEarned` across all
  weeks, minus any lieu taken (column exists from day one; deductions
  are a later feature).
- The weekly grid footer shows the week's status: under threshold,
  at threshold, or X hours of lieu earned.
- Calculation is a single server-side function, called after any entry
  create/update/delete.  Nothing is computed on the client.

---

## Phase 5 — Dashboard

**Status: pending.**

The landing page after sign-in.  Four sections using Recharts (already
a dependency) and Shadcn Card components (already available):

- **Lieu Balance card** — the running balance, large and prominent.
  Green if positive.  A secondary line shows the change vs. last week.
- **This Week card** — total hours logged so far this week.  A progress
  bar toward the 40-hour threshold.  If already over, shows hours of
  lieu earned this week.
- **Hours by Project** — donut chart.  Defaults to the current week;
  a toggle switches to trailing 4 weeks.  Shows where time is actually
  going.
- **Weekly Trend** — line chart, trailing 8–12 weeks.  Total hours per
  week with a horizontal reference line at the threshold.  Weeks that
  earned lieu are visually distinct.

---

## Phase 6 — Calendar View

**Status: pending.**

A monthly grid showing work patterns at a glance:

- Each day cell displays the total hours logged that day.
- Colour-coded: no entry (muted), under 8 hrs (light), 8 hrs (neutral),
  over 8 hrs (amber).  Weekend columns are a different shade.
- Clicking a day opens a side panel showing that day's entries (same
  data as the weekly grid, filtered to one day) with the ability to add
  or edit inline.
- Month navigator (prev / next).

---

## Phase 7 — Reports & Export

**Status: pending.**

The output artefacts — what gets sent to payroll, billed to clients, or
kept for personal records.

- **Weekly report** — a single-page summary: project breakdown, daily
  totals, overtime, lieu earned.  Formatted for printing or PDF export.
- **Monthly report** — same structure rolled up to a month.  Includes
  all weeks and cumulative lieu.
- **Filters** — date range, project, status.  Final reports should
  default to Approved entries only.
- **CSV export** — flat table of all entries in the filtered range.
  Column headers match the weekly grid.
- **PDF export** — the weekly or monthly report rendered to a PDF.  Use
  a library such as `react-pdf` or `jspdf`.

---

## Phase 8 — Screenshot Upload & OCR

**Status: pending.**

The "screenshot-to-entries" workflow from the original spec.  Reduces
manual data entry when the source already exists (e.g. a screenshot of
a Dynamics 365 view or a client portal).

- **Upload UI** — the placeholder on the Upload page becomes a real
  drag-and-drop zone.  Accepts JPEG and PNG.  Shows a preview of the
  uploaded image.
- **OCR** — call an external API (Google Cloud Vision or AWS Textract
  both handle tabular data well).  Extract the grid structure and map
  columns to project, task, role, and daily hours.
- **Review screen** — OCR output is shown as a pre-filled weekly grid,
  fully editable before import.  Clearly mark extracted fields vs.
  fields that need manual correction.  This step is mandatory — OCR on
  timesheet screenshots is imperfect.
- **Import** — on confirmation the reviewed entries are saved as Draft
  for the selected week.
- **Fallback** — if OCR fails or returns unusable output, show the
  uploaded image alongside an empty grid so the user can type from it
  without leaving the page.

---

## Phase 9 — Notifications

**Status: pending.**

The `notifications` table already exists.  Wire it up:

- **Lieu milestones** — "You have earned 10 hours of lieu this month."
- **Weekly submission reminder** — fires end-of-week (configurable day)
  if the current week has Draft entries or no entries at all.
- **Anomaly alerts** — a single day logged above 12 hours, or a full
  week with zero hours after the week has passed.
- **Notification centre** — bell icon in the header with an unread
  badge.  Click expands a panel listing notifications with timestamps
  and read / unread state.
- **Delivery** — in-app only at this stage.  Email and webhook delivery
  are a Phase 11 addition.

---

## Phase 10 — Admin Panel & Multi-User Management

**Status: pending.**

Operational maturity — the ability to manage reference data and,
eventually, other people's timesheets.

- **Project & Task CRUD** — admins add, edit, or deactivate projects
  and tasks.  This is the master data that populates the dropdowns in
  the weekly grid.  Deactivated entries stop appearing in new rows but
  remain visible on historical data.
- **Role management** — add or edit the roles list.
- **User management** — list all users, activate or deactivate accounts,
  assign the admin flag.
- **Manager view** — an admin or designated manager can view any user's
  weekly grid and reports, filtered by user.
- **Approval workflow** — managers can Approve or Reject Submitted
  entries.  Rejected entries return to Draft with an attached note.
  This maps directly to the Entry Status column in the Dynamics 365
  reference.

---

## Phase 11 — Enterprise Hardening

**Status: pending.**

Production-readiness: security, auditability, and the auth model an
enterprise environment actually requires.

- **SSO via Microsoft Entra ID.**  The reference screenshot is Dynamics
  365, which means the organisation already uses Microsoft 365.  NextAuth
  supports the Microsoft provider out of the box.  This becomes the
  primary sign-in method for production.  Credentials provider stays as
  a fallback for local development.
- **Role-based access control.**  Three roles: Consultant (own data
  only), Manager (own data + direct reports), Admin (everything).
  Enforced server-side on every data access, not just in the UI.
- **Audit trail.**  An append-only `auditLog` table records who did
  what and when — entry creates, edits, status changes, approvals.
  Non-negotiable for anything that touches time and pay data.
- **Database migration to PostgreSQL.**  SQLite is appropriate for
  development and single-user Docker deployments.  For a shared
  production instance, switch to PostgreSQL.  Drizzle supports both
  dialects — the change is the dialect setting in `drizzle.config.ts`
  and the connection string.  Add connection pooling (PgBouncer or
  similar).
- **Rate limiting** on the sign-in endpoint.

---

## Phase 12 — System Integrations

**Status: pending.**

TimeNlieu becomes part of the existing toolchain rather than a
standalone tool.

- **Dynamics 365 import.**  The reference screenshot IS a Dynamics 365
  timesheet view.  An import pathway — via the Dynamics 365 REST API or
  an exported CSV/Excel file — pulls entries into TimeNlieu for lieu
  tracking.  The source of truth for project billing may remain in
  Dynamics 365; TimeNlieu's job is the lieu calculation and personal
  tracking layer on top.
- **Outlook calendar sync.**  Log an entry in TimeNlieu and it creates
  a calendar event (or vice versa).  Uses the Microsoft Graph API — the
  same auth token obtained during Entra ID sign-in.
- **Teams / Slack webhooks.**  Route the notification alerts (weekly
  reminders, lieu milestones) to a Teams or Slack channel alongside
  in-app delivery.

---

## Execution Order

```
Phase 1   Technical Foundations          ← complete
Phase 2   Data Model Expansion          ← schema before any feature work
Phase 3   Weekly Timesheet Grid         ← the core product
Phase 4   Lieu Calculation Engine       ← the core business logic
Phase 5   Dashboard                     ← first polished view; needs 3 + 4
Phase 6   Calendar View                 ← alternate view of the same data
Phase 7   Reports & Export              ← output artefacts
Phase 8   Screenshot Upload & OCR       ← input shortcut; high effort
Phase 9   Notifications                 ← supporting feature
Phase 10  Admin & Multi-User            ← operational maturity
Phase 11  Enterprise Hardening          ← production readiness
Phase 12  System Integrations           ← ecosystem fit
```

Phases 3 and 4 are the line between "skeleton app" and "actually usable
tool."  Everything before that is plumbing; everything after is polish
and scale.
