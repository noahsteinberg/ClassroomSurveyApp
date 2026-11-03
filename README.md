# Classroom Survey App

React + TypeScript + Vite project for the CSE 4095 classroom survey assignment.
Instructor login and the dashboard are implemented. Survey creation/editing is implemented with atomic draft saving.
Activation, QR presentation, anonymous student submissions, and duplicate protection
are implemented. Results, historical filtering and CSV export are implemented. Duplication and deployment remain pending.

## Local setup

Use a recent Node.js version compatible with the installed Vite release (setup verified
with Node 25.2.0 and npm 11.6.2).

```sh
npm ci
npm run dev
```

Before starting Vite, copy `.env.example` to `.env.local` and supply
`VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` for the configured project.
Use UTF-8 without a byte-order mark; a Windows BOM can hide the first variable.
Restart Vite after configuration changes. These are browser-safe project settings;
never use a service-role/secret key or database password in Vite variables.
Instructor credentials are entered only in the login form, never in environment files.

```sh
npm run lint
npm run format:check
npm run build
npm run preview
```

`src/pages` holds route pages, `src/components` shared UI, `src/lib` data helpers,
`supabase/migrations` future versioned database changes, and `public` static assets.
Tailwind uses its Vite plugin. React Router serves `/`, `/login`, protected `/dashboard`, `/surveys/new`, and
`/surveys/:id/edit`; unknown/future routes
show an unavailable page.
Supabase, Recharts, and qrcode are installed for later phases.

See the supplied specifications, `TODO.md`, and `development-notes.md` for requirements,
open decisions, verified progress, and remaining work. Production/database setup and
deployment instructions will be added when those phases are implemented.


## Prepared database migrations and tests

Phase 2 migrations have been applied to the verified Supabase project. Hosted
schema/permissions checks and 47 real Auth/PostgREST synthetic-data checks passed. See [supabase/README.md](supabase/README.md) for accepted decisions, the
draft-only editing change, security boundaries, local test prerequisites, and
future hosted setup steps. Run `npm run test:db` to create and remove a disposable
local PostgreSQL container; no Supabase credentials or hosted project are used.


## Login and dashboard

Open `/login` and use your privately provisioned instructor email and app-specific
password. Signed-in users go to `/dashboard`; refreshing restores the session.
Log out signs out this browser session and protected access returns to login.
Backend RLS and RPC permissions remain the actual authorization boundary.

Dashboard surveys load newest first. Search by title and filter by status.
Close is available for active surveys; Archive for closed surveys; Delete for
nonactive surveys. Every action has confirmation; Delete warns that all responses
will be permanently removed. Closing never makes collected content editable.
New Survey, draft-only Edit, and Activate are available. Duplicate remains disabled until its later-phase workflow exists. There are no fake navigation links for those controls.

Focused checks:

```sh
npm run lint
npm run build
npm run format:check
npm run test:ui
```

The five Playwright tests require installed Google Chrome (`channel: chrome`), run
headlessly on port 5174, and mock every Supabase request with synthetic data and a
dummy publishable key. They need no instructor password or real environment file
and do not mutate hosted data. Browser test artifacts are ignored. The regular app
can remain running separately on port 5173. Database/hosted Phase 2 suites need not
be repeated for frontend-only changes without a relevant concern.

Manual focused check: sign in, confirm your email and survey/empty state, refresh,
log out, then revisit `/dashboard` and confirm the login redirect. Real survey-card
rendering and mutation interactions are covered by mock browser tests; live backend
operations were verified in Phase 2. No extra hosted fixtures were created for this
frontend pass.


## Draft editor (Phase 5)

New Survey and draft Edit open the protected editor. Use Move up/Move down for
questions and multiple-choice options. True/False has fixed read-only choices.
Deleting questions/choices or changing type requires confirmation. Navigation away
from unsaved work warns, including browser back and page refresh/tab close.

Save Draft commits metadata, questions, choices, deletions and consecutive ordering
in one database transaction. Existing IDs remain stable. Concurrent edits use the
loaded updated_at version; a conflict keeps local text and offers a confirmed reload.
Retries of an unchanged failed save reuse its request ID and survey ID to avoid
accidental duplicate surveys. Private retry receipts are not exposed to browsers.
All draft content edits update the survey version, including direct child-table edits.

A title and nonblank text for every entered question/choice are required. Incomplete
counts are allowed: drafts may have zero questions or MC options fewer than two.
Fill in or delete blank rows before saving. Activation will enforce complete survey
structure before activation. Save first to enable Activate. Active/closed/archived editor URLs are
blocked, and the save RPC independently rejects non-drafts.

Focused checks: `npm run test:draft-db` uses disposable local PostgreSQL and only
tests draft saving/ordering/conflicts/rollback/retries; `npm run test:ui` includes
four editor tests and affected dashboard/auth tests with mocked Supabase APIs.
Neither command changes hosted data. The applied draft-saving migration is
`supabase/migrations/20261103005809_save_draft.sql`.


## Activation, presentation and student surveys (Phases 6-8)

Activate a complete saved draft from the dashboard or editor. Unsaved editor changes
must be saved first. Confirming activation closes the prior active survey atomically;
server validation rejects incomplete surveys with a friendly message. Activation
opens protected `/surveys/:id/present`; active dashboard cards also offer Present QR.
The presentation shows title, large QR code, readable/copyable URL, downloadable PNG,
response count, and confirmed Close Survey. Count polling is every five seconds while
visible, stops on closed surveys, and is cleaned up on navigation. View Results opens the protected results page. Count queries are instructor-only and request counts rather than answers.

Public `/s/:slug` needs no login. It uses a separate nonpersistent Supabase client so
a student preview never inherits a signed-in instructor's database permissions.
Questions/choices load in saved order and use labeled mobile radio controls. Every
question requires an answer. Submit calls only submit_survey_response; success is
shown after the RPC confirms, and network failure preserves selected answers.
Closed, missing, already-submitted, loading and retry states have friendly messages.

Each survey gets a random browser UUID token stored in localStorage. A per-survey
success marker handles refresh/revisits; database survey/token uniqueness is the
source of truth. Retries reuse the token, including after an uncertain response.
The token is reread before submitting to reduce accidental multi-tab token races.
Blocked/corrupt storage prevents submission and explains how to enable storage and
reload. Clearing storage, using another browser/profile, or closing an incognito
session can bypass accidental-duplicate protection; this is not student identity
verification or attendance tracking. No student Auth accounts are created.

Desktop manual workflow: create a complete fresh draft, Save Draft, Activate, open
the presentation URL in an incognito window, submit, refresh for Already submitted,
return to verify the increased count, download the QR PNG, close, and reload the
student URL to see Survey closed. Use the same origin for duplicate tests.
The localhost URL works only on this computer; actual phone QR scanning needs a
reachable HTTPS site (normally the later deployment). A local-link notice is shown
on the projection page. Do not claim device/production verification until performed.

Focused browser tests are in `tests/ui/student-presentation.spec.ts`. They mock APIs
and create no hosted data; prior Phase 2 database transaction/permission tests remain
applicable because no database migration or backend function changed in this pass.


## Results, historical filtering and CSV (Phases 9-11)

View Results opens protected `/surveys/:id/results` for Draft, Active, Closed or
Archived surveys. The instructor client reads existing RLS-protected tables;
no new database function/migration is needed. Charts load on demand rather than
adding Recharts to the student page's initial bundle. Refresh captures another set
of results; no automatic live charts are implemented.

All questions, choices, responses, and answers use explicit 500-row pages with
stable ordering; response-ID batches of 100 keep answer requests bounded. The
response IDs captured for a successful load are shared by counts/tables/charts/CSV.
New responses arriving during/after a load can require Refresh; this is not a
single database-wide transaction snapshot. Draft content changing during the load
is detected using the existing version and rejected rather than mixing revisions.
Any page failure prevents replacing results with a partial dataset, and export is
disabled until a successful load/refresh. Zero responses show a clear empty state.

Percentages use **all submitted responses**, rounded to one decimal. Unanswered is
the number of captured responses without a valid selected choice for that question,
including historical missing/deleted choices. Zero responses yields 0.0%. Each
question has visible numeric counts/percentages and an unanswered label alongside
a Recharts bar chart; meaning does not depend on color alone.

Dashboard history uses existing title/status filters plus **inclusive survey creation
dates in the browser's local timezone**. It does not filter submission timestamps.
An invalid date interval has a clear message; Clear filters resets every filter.
Filtering/read operations never change or delete history. Closed and Archived
surveys remain readable through View Results; activation/editing rules are unchanged.

Export CSV uses the currently loaded response set, one row per response. Metadata
columns: survey_id, survey_title, survey_description, survey_status, survey_created_at,
response_id and submitted_at. Question columns follow saved order and include their
number and full question text so duplicate texts have distinct headers. Answers are
choice text; unanswered cells are blank. Timestamps are ISO UTC. Anonymous browser
tokens are never queried for results or exported. Zero responses exports headers only.

Every cell is quoted with escaped quotes, CRLF row separators and UTF-8 BOM for
spreadsheet compatibility. Text starting with formula characters (including after
whitespace), tab or newlines is prefixed with an apostrophe. This intentionally
preserves data as text instead of executing spreadsheet formulas. Commas, embedded
newlines, quotes and Unicode are retained. No server endpoint or schema changes.

Focused tests: `npm run test:ui -- tests/ui/results.spec.ts tests/ui/dashboard.spec.ts --workers=2`.
They cover known calculations/zero/unanswered, API page errors, 1,205 responses and
answer pagination, date boundaries, protected access, and CSV escaping/downloads.
No hosted data is created or changed by these mocked browser checks. Manual check:
open real survey results, verify counts, Refresh, exercise history filters, export,
and open the file in Excel or another spreadsheet app to confirm columns/row counts.
