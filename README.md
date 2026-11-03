# Classroom Survey App

React + TypeScript + Vite project for the CSE 4095 classroom survey assignment.
Instructor login and the dashboard are implemented. Survey creation/editing is implemented with atomic draft saving.
Activation/presentation, duplication, results/CSV, student pages, and deployment
remain pending; their dashboard controls are explicitly unavailable.

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
New Survey and draft-only Edit are available. Activate, Duplicate, and View Results
remain disabled until their later-phase workflows exist. There are no fake navigation links for those controls.

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
structure later. Activate stays unavailable. Active/closed/archived editor URLs are
blocked, and the save RPC independently rejects non-drafts.

Focused checks: `npm run test:draft-db` uses disposable local PostgreSQL and only
tests draft saving/ordering/conflicts/rollback/retries; `npm run test:ui` includes
four editor tests and affected dashboard/auth tests with mocked Supabase APIs.
Neither command changes hosted data. The applied draft-saving migration is
`supabase/migrations/20261103005809_save_draft.sql`.
