# Classroom Survey App

Classroom surveys for CSE 4095, built with React, TypeScript, Vite, Tailwind CSS,
Supabase, Recharts and qrcode. [GitHub repository](https://github.com/noahsteinberg/ClassroomSurveyApp).

Implemented: instructor login, dashboard/history filters, draft editing,
activation/closure/archive/delete, QR presentation, anonymous submissions,
duplicate protection, results/charts, CSV export and survey duplication. Local
Chrome/Edge workflows are verified. The public app is live at
https://classroomsurveyapp.pages.dev/; the user confirmed the phone workflow on
iPhone/Safari over Wi-Fi and cellular. Performance results and limits are below.

## Architecture and data flow

Cloudflare Pages serves the static `dist` frontend. The browser communicates
directly with Supabase Auth and its HTTPS Data API. No Pages Functions, Workers
backend or D1 database is needed. React Router handles navigation.

- Instructor email/password login creates a Supabase session. RLS, restricted
  grants and instructor RPC guards enforce access; route protection alone does not.
- `save_draft_survey` atomically saves metadata, ordered questions and choices.
  Version checks reject stale overwrites; request receipts recover unchanged retries.
  Lifecycle RPCs enforce one active survey and immutable collected content.
- `/s/:slug` uses a separate anonymous client, never the instructor session.
  Students read active content and call `submit_survey_response`, which validates
  and commits responses/answers together. Direct anonymous writes and results reads are denied.
- Results use instructor-authorized paginated reads, manual Refresh and accessible
  tables alongside charts. CSV uses the same captured response set.

Tables: `surveys`, `questions`, `choices`, `responses`, `answers`. Private draft-save
receipts support retries. See [database/security details](supabase/README.md) and
`supabase/migrations` for the authoritative SQL.

## Local setup and production build

Use Node **22.23.4**, pinned in `.node-version`, with its bundled npm. Git and
internet access are needed for installation. Docker is only needed for database tests.

```sh
git clone https://github.com/noahsteinberg/ClassroomSurveyApp.git
cd ClassroomSurveyApp
npm ci
```

Copy `.env.example` to `.env.local`, then set:

```dotenv
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_your-public-key
```

Use UTF-8 without a BOM; a Windows BOM can hide the first variable. These values
are browser-safe configuration embedded in the build. Never use service-role/secret
keys, database passwords or instructor passwords in Vite variables. Local environment
files are ignored. Restart Vite after changing configuration.

```sh
npm run dev
```

Open the address Vite prints, normally `http://localhost:5173`. Keep the same origin
through duplicate tests: localhost and 127.0.0.1 have separate browser storage.

```sh
npm run build
npm run preview
```

Build runs TypeScript checking and Vite's production build into `dist`. Preview is
for local inspection, not public deployment. Preparation verified a clean Linux install/build with Node 22.23.4
and npm 10.9.9, plus a local production-bundle smoke check. See
[preparation evidence](tests/deployment/phase15-preparation.json). `src/pages` contains route pages,
`src/components` shared UI, `src/lib` data helpers, and `public` static assets.

## Supabase and private instructor access

The existing project already has all three migrations applied. **Do not reapply
or reset it.** For a new empty Supabase project:

1. Create the project and keep its database password private.
2. Apply the files in `supabase/migrations` in order through SQL Editor or an
   authenticated migration workflow, preserving history:
   `20261102195952_schema.sql`, `20261102195955_security_and_rpcs.sql`,
   `20261103005809_save_draft.sql`.
3. Keep Email/password enabled; disable public signup and anonymous Auth sign-ins.
   Manually provision a confirmed instructor in Auth's admin UI with a strong,
   unique app password. Students do not get Auth accounts.
4. Configure the project URL and publishable key for local/production builds.
5. After deployment, set Auth Site URL to the stable HTTPS origin. Configure exact
   redirect destinations if using invitation/reset/email flows. Current app login
   uses `signInWithPassword`, without an OAuth callback.

Every provisioned authenticated user is a trusted instructor in one shared workspace.
This version has no separate instructor ownership. Deliver grader credentials and
instructions privately, outside Git. No signup, password-reset UI or default password
is provided. Never apply `supabase/tests` fixtures or the local Auth bootstrap to
Supabase. See [supabase/README.md](supabase/README.md) for security and test details.

## Routes and behavior

| Route | Access and purpose |
| --- | --- |
| `/` | Public home |
| `/login` | Instructor login |
| `/dashboard` | Protected survey list, title/status/creation-date filters and actions |
| `/surveys/new` | Protected new draft |
| `/surveys/:id/edit` | Protected draft editor |
| `/surveys/:id/present` | Protected QR, URL, count and closure |
| `/surveys/:id/results` | Protected results, refresh and CSV |
| `/s/:slug` | Public form, success/duplicate/closed/missing states |

Drafts support ordered MC or fixed True/False questions. Incomplete counts are
allowed when saving, but entered title/question/choice text cannot be blank.
Activation requires at least one complete question, MC with at least two choices,
and exactly True then False for TF. Unsaved navigation/destructive edits require
confirmation; stale-save errors retain your text.

Lifecycle: **Draft -> Active -> Closed -> Archived**. Activation atomically closes
any previous active survey. Collected content cannot be edited or reactivated.
Duplicate any status into a new `Copy of ...` Draft with fresh content IDs, no public
slug and no responses/answers; the confirmed copy opens in the editor. Duplication
retries retain the same request while the card stays mounted. After leaving/reloading,
inspect for an existing copy before starting another attempt.

Archive preserves results. Delete is available for nonactive surveys and warns
that dependent content/responses are permanently removed. Presentation count polls
every five seconds while visible. Results update with manual Refresh. QR URLs use
the current origin: regenerate localhost QR PNGs from the public site after deployment.
Localhost links cannot reach this laptop from a phone.

Each student question requires one choice. A per-survey UUID token and success
marker in localStorage reduce accidental duplicates; database survey/token uniqueness
is authoritative. Clearing storage or switching browsers/profiles bypasses accidental
protection; it is not identity/attendance verification. Blocked storage prevents
submission with guidance; network failures retain selected answers.

Results percentages use all captured submitted responses, rounded to one decimal;
zero responses yields 0.0%. Unanswered includes missing/unavailable choices. History
uses inclusive survey creation dates in the browser's local timezone. Independent
reads are not a database-wide snapshot; concurrent submissions may require Refresh.

CSV contains one row per response, repeated survey metadata, response ID, UTC
timestamps and numbered question-text columns in saved order. Answers are choice
text, unanswered cells blank, and zero responses exports headers only. Browser tokens
are never exported. Quoting, CRLF, UTF-8 BOM and apostrophe prefixes preserve
spreadsheet compatibility and prevent formula-like text from being executed.

## Tests and evidence

```sh
npm run lint
npm run format:check
npm run build
npm run test:ui -- --workers=2
```

Playwright uses installed Google Chrome by default, a separate Vite server on
127.0.0.1:5174, synthetic API responses and a dummy key. No instructor credentials
or hosted mutations are needed. The normal app may remain on 5173. Installed Edge
can be selected in PowerShell:

```powershell
$env:PLAYWRIGHT_CHANNEL='msedge'
npm run test:ui -- --workers=2
Remove-Item Env:PLAYWRIGHT_CHANNEL
```

Run relevant files rather than repeating unrelated suites. With Docker running:

```sh
npm run test:db
npm run test:draft-db
```

These create/remove isolated PostgreSQL containers with no host ports. The first
checks security/lifecycle/concurrency; the second focuses on draft saving. Hosted
checks require private instructor login and test-owned fixtures; `npm run test:hosted`
is an explicit integration operation, not part of a normal build.

Sanitized reports are in `tests/ui/*verification.json` and `supabase/verification`.
[Development notes](development-notes.md) record exact runs, actual user confirmations,
failures/fixes and performance protocols. Old reports retain their original phase
state; later reports supersede old deferred-feature labels. Full formatting has
known warnings in historical Phase 6-8/9-11 JSON reports; changed-file formatting
is verified. The existing large-chunk build advisory is not measured load-time evidence.

## Cloudflare Pages settings

Sign into Cloudflare, choose Workers & Pages -> Pages -> import an existing Git
repository, and authorize `noahsteinberg/ClassroomSurveyApp`.

| Setting | Value |
| --- | --- |
| Production branch | `main` |
| Framework | React/Vite if offered, otherwise explicit settings below |
| Root directory | Blank/repository root where package.json lives |
| Build command | `npm run build` |
| Output directory | `dist` |
| Node version | `.node-version` pins `22.23.4`; any NODE_VERSION override must agree |
| Production build variables | `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` |

Use the existing project's actual URL/publishable key. Never use passwords or
secret/service-role keys. Install build-time dev dependencies normally: TypeScript
and Vite are needed. Do not use `dev` or `preview` as the build command. Changing a
Vite variable requires a rebuild. Optional preview deployments using the same
Supabase settings share the live database.

**Save and Deploy publishes the first version.** Git integration also enables
automatic deployment on later main pushes. No hosting deployment was performed
during preparation. A custom domain is optional; the assigned HTTPS pages.dev
address is sufficient for initial verification. The database stays on Supabase;
Pages builds do not apply migrations.

Pages supplies SPA fallback when there is no top-level `404.html`. This app has no
such file and needs no speculative rewrite. After deployment, test direct navigation
and refresh on every route; a local preview does not prove Cloudflare behavior.

References: [React build settings](https://developers.cloudflare.com/pages/framework-guides/deploy-a-react-site/),
[Node build configuration](https://developers.cloudflare.com/pages/configuration/build-image/),
[SPA fallback](https://developers.cloudflare.com/pages/configuration/serving-pages/),
[Git deployments](https://developers.cloudflare.com/pages/get-started/git-integration/),
[Supabase Auth URLs](https://supabase.com/docs/guides/auth/redirect-urls).

## Public verification and performance limits

The Cloudflare build log confirmed deployment of commit `3cd5412`, Node
22.23.4/npm 10.9.9 and successful publication. Public browser checks and user
confirmation cover login, phone QR/anonymous submission, duplicate refresh,
count/results/CSV, PNG download, closure and closed-link behavior. The user reports
Safari on iPhone 17 Pro/iOS 26.6.1 over Wi-Fi and cellular. The corrected Supabase
Site URL is user-confirmed; an independent reread was not completed.

An isolated two-question test accepted 200 overlapping anonymous API submissions
with no errors, exactly 200 responses/400 answers, p95 1437ms, and verified cleanup.
This is one workload on one network, not 200 full browser instances or every device
condition. Other survey metadata remained unchanged.

All 60 measured page-load samples are preserved. Cold means were 521ms (student),
554ms (dashboard), and 1472ms (results). Warm student/dashboard means also passed.
Two successful warm-results loads took 5016ms and 8529ms, raising that mean to
2289ms. Their cause is unknown. Thus 58/60 samples were below two seconds, but the
**overall under-two-second target is not fully met**. No samples were discarded,
no performance changes were made, and testing stopped at the user's request.

See [public verification](tests/deployment/phase15-public-verification.json),
[original performance samples](tests/deployment/phase15-performance.json) and the
development notes for conditions, method and limitations. No private credentials
or sessions are stored in those reports.

Original assignment/specification documents are preserved. [TODO.md](TODO.md)
tracks verified progress and remaining deployment, report, screenshots, private
grader access, AI history and final submission work.
