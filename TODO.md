# Classroom Survey Web App — TODO

## Tracking rules

All inherited completion marks were reset on 2026-11-02 because this folder contains only the supplied documents. Check a task only after verifying its acceptance criteria and recording the command, observation, or evidence in `development-notes.md`. Generated code or a successful build alone does not prove a feature works. Existing phases remain the implementation roadmap; Phase 16 is optional and outside assignment completion. Phase 1 setup and local Git initialization/remote connection were authorized on 2026-11-02. The user subsequently authorized dependency review and committing/pushing the verified Phase 1 setup. Phase 2 preparation and application of the two reviewed migrations to the verified Supabase project were authorized. Hosted schema/permission checks are recorded below; Phases 3 and 4 frontend work were subsequently authorized with later features unavailable. Committing/pushing the current frontend work, later feature implementation, and deployment remain on hold.

## Purpose

This roadmap breaks the implementation into small, testable phases ordered from foundational work to advanced features.

---

# Phase 1 — Project Setup

- [x] Create a new React + TypeScript project with Vite.
- [x] Add Tailwind CSS.
- [x] Add React Router.
- [x] Add Supabase JavaScript client.
- [x] Add Recharts.
- [x] Add QR code generation package.
- [x] Create the initial project folder structure.
- [x] Add `.env.example` with Supabase environment variable names.
- [x] Configure ESLint and formatting.
- [x] Create a basic home page.
- [x] Verify the project builds successfully.

---

# Phase 2 — Supabase Project and Database

- [x] Create a Supabase project.
- [x] Create the `surveys` table.
- [x] Create the `questions` table.
- [x] Create the `choices` table.
- [x] Create the `responses` table.
- [x] Create the `answers` table.
- [x] Add foreign-key constraints.
- [x] Add database indexes.
- [x] Add timestamps.
- [x] Add survey-status validation.
- [x] Create Row Level Security policies.
- [x] Verify students cannot read survey results.
- [x] Verify anonymous students can read active surveys.
- [x] Verify anonymous students can submit responses.
- [x] Verify authenticated instructors have full access.

---

# Phase 3 — Instructor Authentication

- [x] Create the instructor login page.
- [x] Connect login to Supabase Auth.
- [x] Add logout.
- [x] Create an authentication context/provider.
- [x] Create a protected-route component.
- [x] Redirect unauthenticated users to login.
- [x] Show the logged-in instructor in the dashboard.

---

# Phase 4 — Instructor Dashboard

- [x] Create the dashboard layout.
- [x] Load surveys from Supabase.
- [x] Display survey title, status, and creation date.
- [x] Add status badges for Draft, Active, Closed, and Archived.
- [x] Add a New Survey button.
- [x] Add Edit action.
- [x] Add Duplicate action.
- [x] Add Delete action.
- [x] Add Archive action.
- [x] Add View Results action.
- [x] Add Activate action.
- [x] Add Close action.
- [x] Add search by survey title.
- [x] Add filtering by status.

---

# Phase 5 — Survey Editor

- [x] Create a survey editor page.
- [x] Add survey title field.
- [x] Add optional description field.
- [x] Add questions dynamically.
- [x] Support Multiple Choice questions.
- [x] Support True / False questions.
- [x] Add answer choices dynamically.
- [x] Reorder questions.
- [x] Reorder choices.
- [x] Delete questions.
- [x] Delete choices.
- [x] Validate required fields.
- [x] Save a survey as Draft.
- [x] Load an existing survey for editing.
- [x] Enforce draft-only editing: active, closed, and archived content stays immutable; duplicate into a new draft for changes (accepted change from the supplied close-then-edit task; see development-notes.md).

---

# Phase 6 — Survey Activation

- [x] Add activation logic.
- [x] Ensure at most one survey is Active.
- [x] Automatically close the previously active survey.
- [x] Generate a public survey slug or identifier.
- [x] Generate the public survey URL.
- [x] Generate a QR code from the public URL.
- [x] Create a Present Survey page.
- [x] Display survey title and QR code.
- [x] Display a readable fallback URL.
- [x] Add a Close Survey button.
- [x] Add a Download QR Code button.

---

# Phase 7 — Student Survey Page

- [x] Create the public route `/s/:slug` (approved slug naming replaces the original `:surveyId` parameter).
- [x] Load the requested active survey.
- [x] Show an error if the survey does not exist.
- [x] Show a message if the survey is closed.
- [x] Render survey title and description.
- [x] Render Multiple Choice questions.
- [x] Render True / False questions.
- [x] Validate required answers.
- [x] Add Submit button.
- [x] Store response and answers in Supabase.
- [x] Show a submission confirmation page.
- [x] Make the entire experience mobile friendly.

---

# Phase 8 — Duplicate Submission Protection

- [x] Generate an anonymous browser token.
- [x] Store the token in local storage.
- [x] Save the token with each response.
- [x] Prevent the same token from submitting twice to the same survey.
- [x] Show a friendly message if a duplicate submission is attempted.
- [x] Add a database uniqueness constraint if appropriate.

---

# Phase 9 — Results Dashboard

- [x] Create a results page for each survey.
- [x] Show total response count.
- [x] Aggregate answers by question.
- [x] Show counts for each choice.
- [x] Show percentages for each choice.
- [x] Add bar charts using Recharts.
- [x] Clearly label unanswered questions.
- [x] Add Refresh Results button.
- [x] Add link back to the main dashboard.

---

# Phase 10 — Historical Results

- [x] Allow viewing results for Closed surveys.
- [x] Allow viewing results for Archived surveys.
- [x] Add filtering by date.
- [x] Add filtering by survey title.
- [x] Preserve all historical response data.

---

# Phase 11 — CSV Export

- [x] Add Export CSV button.
- [x] Export survey metadata.
- [x] Export one row per response.
- [x] Include submission timestamp.
- [x] Include each question and answer.
- [x] Create safe CSV escaping.
- [x] Test export with spreadsheet applications.

---

# Phase 12 — Survey Duplication

- [x] Duplicate survey title and description.
- [x] Duplicate questions.
- [x] Duplicate answer choices.
- [x] Create the copy in Draft state.
- [x] Add "Copy of ..." naming.
- [x] Redirect to the editor after duplication.

---

# Phase 13 — UI Polish

- [x] Add consistent page layouts.
- [x] Improve mobile responsiveness.
- [x] Add loading states.
- [x] Add empty states.
- [x] Add error messages.
- [x] Add confirmation dialogs for destructive actions.
- [x] Improve QR-code presentation for classroom projection.
- [x] Test accessibility and keyboard navigation.
- [x] Improve color contrast.

---

# Phase 14 — Testing

- [x] Test instructor login.
- [x] Test survey creation.
- [x] Test survey editing.
- [x] Test activation.
- [x] Test closing surveys.
- [x] Test QR-code links on desktop (URL and downloaded PNG verified; actual phone scanning remains pending below).
- [x] Test student submissions.
- [x] Test duplicate-submission prevention.
- [x] Test results calculations.
- [x] Test CSV export.
- [x] Test mobile layout.
- [x] Test with at least two browsers.
- [x] Test unauthorized access attempts.
- [x] Test database Row Level Security.

---

# Phase 15 — Deployment

- [x] Push the project to GitHub.
- [x] Create the Cloudflare Pages site.
- [x] Connect Cloudflare Pages to the GitHub repository.
- [x] Configure production environment variables.
- [x] Deploy the application; user reported success and actual Chrome loaded https://classroomsurveyapp.pages.dev/ over HTTPS.
- [x] Configure SPA routing.
- [x] Verify production login.
- [x] Verify QR codes point to the production URL.
- [x] Test student submissions in production.
- [x] Test instructor results in production.

---

# Phase 16 — Post-MVP Enhancements

- [ ] Add live updating results with Supabase Realtime.
- [ ] Add question bank.
- [ ] Add survey import/export as JSON.
- [ ] Add Markdown import.
- [ ] Add short-answer questions.
- [ ] Add checkbox questions.
- [ ] Add rating-scale questions.
- [ ] Add numeric questions.
- [ ] Add AI-assisted question generation.
- [ ] Add LMS integration.
- [ ] Add multiple instructors.
- [ ] Add course and semester organization.
- [ ] Add analytics across multiple surveys.


---

# Review and decision gates (before Phase 1)

- [ ] Resolve or explicitly adopt the proposed decisions in `development-notes.md`, including lifecycle/editing, required answers, authentication, public closed-state handling, and CSV format.
- [ ] Confirm Supabase project access, hosting account access, and private grader access method without putting credentials in documentation.
- [ ] Establish acceptance criteria and evidence entries for each completed task; retain original specification files.

# Required additions to Phases 2, 5, 6, 7, and 9

- [ ] Save versioned database migrations/schema, constraints, indexes, triggers, grants, RLS policies, and RPC definitions in the repository; verify a clean database can apply them.
- [ ] Implement and verify transactional submission RPC with active-status, complete-answer, token, question membership, and choice membership validation; reject direct anonymous table writes.
- [ ] Enforce one active survey in the database and serialize activation/closing/submission so concurrent requests preserve the lifecycle rules.
- [ ] Protect every instructor RPC as well as tables; restrict privileged function execution and document grants and authorization.
- [ ] Provision instructor account privately and prevent public registration from granting instructor access.
- [ ] Enforce agreed editing and state-transition rules at the database boundary; preserve historical question/choice meaning.
- [ ] Define public slug resolution and safe closed/not-found responses without exposing inactive survey content or results.
- [x] Add visible presentation response count and refresh behavior; polling behavior verified in focused browser tests (live user workflow recorded separately).
- [ ] Validate at least one question, nonblank title/question/choice text, at least two multiple-choice options, exactly True/False choices, stable ordering, and agreed required-answer rules.
- [x] Make duplication atomic or recover safely from failure; copy no responses or answers and issue a distinct public identifier.
- [x] Define result percentage denominator, rounding, zero-response behavior, and unanswered display.

# Required additions to Phase 14 ? Verification

- [x] Record test environment, steps, expected/actual results, evidence, failures, and fixes in `development-notes.md`; rerun affected checks after fixes.
- [x] Run type checking, linting, automated tests, and production build; record exact commands and outcomes.
- [ ] Verify complete create ? edit ? activate ? phone QR scan ? anonymous submit ? present count ? results ? CSV ? close workflow locally and publicly. Desktop segments verified across prior phases; phone scan and public end-to-end run remain pending.
- [x] Inspect actual Supabase records for survey, ordered questions/choices, response, and answers; refresh/reopen the app to verify persistence.
- [x] Test anonymous direct API access: inactive content, responses, answers, results/export, survey mutations, and instructor RPCs must be inaccessible.
- [x] Test logout, expired sessions, protected-route reloads, incorrect credentials, and public signup restrictions.
- [x] Test malformed/empty submissions, missing/extra/duplicate questions, cross-survey questions, mismatched choices, invalid tokens, and inactive survey submissions; failures must leave no partial records.
- [x] Test duplicate submission after refresh, double-click, concurrent requests, and retry after an uncertain network response; verify exactly one stored response per survey/token.
- [x] Test simultaneous activations and close-versus-submit races; at most one survey remains active and no submission is accepted after closing completes.
- [x] Verify duplication, archive, delete/cascade, confirmation dialogs, date/title/status filtering, reordering, and historical result preservation.
- [x] Verify results against known seeded counts, zero responses, percentages and rounding, and the agreed unanswered behavior.
- [x] Test CSV metadata, timestamps, column ordering, Unicode, quotes, commas, newlines, empty results, and formula-like cells; open in a spreadsheet application.
- [x] Test loading, offline/network failures, retry behavior, missing/closed links, and friendly errors with no raw database exceptions.
- [x] Verify keyboard navigation, labels, focus, contrast, numeric chart alternatives, 44px student touch targets, mobile/tablet layouts, and projector readability.
- [x] Test actual phone QR scanning, downloaded QR PNG, fallback URL, and two browsers; recorded iPhone 17 Pro/iOS 26.6.1/Safari (separate Safari version not reported), Wi-Fi/cellular and Chrome/Edge evidence.
- [ ] Define a reproducible page-load measurement and test the specified average under 2 seconds; record conditions and results. Public 10 cold/10 warm samples per route recorded; cold means passed, but warm results mean 2289ms exceeded target. Local timing not used as a substitute; overall target remains unfulfilled.
- [x] Test 200 overlapping synthetic submission API clients on an isolated test-owned survey: 200 successes, 200 responses/400 answers, p95 1437ms, cleanup passed. This is not 200 full browsers; direct resource telemetry unavailable and limits documented.

# Required additions to Phase 15 ? Repository and deployment

- [x] Initialize/connect local Git to https://github.com/noahsteinberg/ClassroomSurveyApp.git after authorization; inspect remote before integrating any contents.
- [x] Add README with architecture/data flow, prerequisites, local setup, environment variable names, schema/RLS/RPC setup, instructor provisioning, tests, deployment, and SPA routing.
- [ ] Add `.gitignore` and safe `.env.example`; inspect staged files and history for passwords, private keys, service-role keys, and real student data before publishing.
- [ ] Verify clean checkout/install/build and fresh schema setup using the README.
- [ ] Verify deployed deep links and reloads, HTTPS, Supabase production auth configuration, QR origin, persistence, duplicate protection, and anonymous/instructor authorization from outside the local network.
- [ ] Record public deployment URL and verified GitHub URL; document free-service configuration and observed limits.

# Assignment submission ? required (not post-MVP)

- [ ] Write approximately 1?2 pages covering specification guidance, AI-generated work, database setup, frontend/database communication, one real problem and resolution, deployment, and learning.
- [x] Export AI conversation history or produce a Markdown interaction summary showing user guidance, implementation, testing, and debugging; use development notes as evidence, without inventing work.
- [x] Capture sanitized screenshots of Supabase tables, a survey with associated questions, stored student responses, and application results.
- [ ] Arrange private instructor test access and include delivery instructions without publishing credentials in the repository.
- [x] Verify repository includes source, all supplied specs, updated verified TODO, migrations/schema, and README.
- [x] Audit assignment checklist and rubric against evidence; clearly disclose any remaining incomplete requirements.
- [ ] Prepare HuskyCT submission with repository URL, public app URL, private test-access instructions, report, AI history, and database evidence.
- [ ] Review final package before using the remaining submission attempt; submit by November 5, 2026 at 11:59 PM EST and verify receipt.

- [ ] Review development-only npm audit findings (13 moderate reports through the minimatch/tooling chain as of Phase 1); choose a compatible patched dependency set and rerun lint/build. Production audit currently reports zero vulnerabilities.

- [x] Review Phase 1 audit findings and attempt compatible remediation without force; document remaining upstream dependency constraints (normal npm audit fix made no changes).


# Phase 2 preparation - local and hosted completion recorded below

- [x] Record accepted instructor, draft-only editing, lifecycle, and submission decisions with security boundaries.
- [x] Prepare versioned five-table schema, RLS/grants, validation triggers, and lifecycle/submission RPC migrations.
- [x] Verify migrations apply to a fresh isolated local PostgreSQL database.
- [x] Prepare and pass local role-based security/integrity regression tests and concurrency checks.
- [x] Document test command, local Auth-model limitations, and future Supabase setup/application steps.
- [x] Apply reviewed migrations to the intended Supabase project after separate authorization; verify real Auth/PostgREST behavior and configuration before marking original Phase 2 tasks complete.


# Hosted Phase 2 application ? November 2, 2026

- [x] Apply both reviewed migrations through MCP to verified project hmrtffcpoyksnwdquyow and confirm their migration-history entries.
- [x] Inspect hosted tables, six relationships, constraints, timestamps, indexes, RLS policies, triggers, and table/column/function grants; save sanitized evidence.
- [x] Check anonymous results denial and missing-identity instructor RPC denial under actual hosted SQL roles (not a browser/JWT test).
- [x] Review hosted security/performance advisors and document remaining warnings without applying extra changes.
- [x] Align local migration filenames with MCP-assigned versions, preserving reviewed SQL bytes.
- [x] Independently verify public signup and anonymous Auth are disabled, instructor account is confirmed, and real instructor password login succeeds without recording credentials.
- [x] Verify active-content reads and inactive-content/results denial through the public Data API with the publishable key.
- [x] Verify valid, malformed, duplicate, cross-survey, and post-close student submissions through hosted RPC/API with synthetic data; inspect durable records and cleanup test data.
- [x] Verify real instructor JWT permits draft CRUD, lifecycle operations, results/export reads, and enforces draft-only editing through the hosted API.
- [x] Repeat critical concurrent submission/activation/close/edit tests against an authorized hosted test dataset; local-only concurrency checks do not establish hosted behavior.
- [x] Review pre-existing public.rls_auto_enable event-trigger EXECUTE grants and leaked-password protection in a separately reviewed hardening/settings step.

# Hosted Phase 2 completion - November 2, 2026

- [x] Pass real instructor password login and use its JWT without persisting credentials or session tokens.
- [x] Verify actual public signup and anonymous Auth requests are rejected.
- [x] Pass 47 public-key/PostgREST security, validation, persistence, lifecycle, concurrency, and cleanup checks; save sanitized report.
- [x] Independently verify cleanup through MCP: zero rows in all five application tables, one nonanonymous user, zero anonymous users.
- [x] Review final advisor findings and document recommended actions without changing hosted schema or settings.
- [ ] Optional separate hardening migration: revoke browser EXECUTE grants on the pre-existing rls_auto_enable event-trigger function and verify the event trigger still works.
- [ ] Enable leaked-password protection if already on a qualifying plan; otherwise document the free-plan limitation and use a strong unique password. No paid upgrade without user direction.


# Phases 3-4 verification and later dependencies - November 2, 2026

- [x] Pass focused browser tests for protected access, incorrect login, session restoration/logout, list/search/status filters, confirmation cancel/close/archive/delete, empty/error/retry states, disabled future controls, and a 390px mobile layout.
- [x] User verifies actual instructor login, displayed email, refresh persistence, logout, and protected dashboard redirect against the hosted project.
- [x] Pass lint, TypeScript/production build, and formatting checks for the affected frontend and tests.
- [x] Enable New Survey and draft Edit after the Phase 5 editor exists; verified in Phase 5.
- [x] Enable Activate with Phase 6 activation/presentation flow; confirmed activation opens the protected QR presentation.
- [x] Enable View Results after Phase 9 results page exists.
- [x] Enable Duplicate after Phase 12 copying flow and the editor exist.


# Phase 5 focused verification - November 2, 2026

- [x] Apply save_draft migration to the verified hosted project and align its local filename with migration history.
- [x] Verify authenticated-only save RPC and inaccessible private idempotency receipts with RLS.
- [x] Pass 25 focused local SQL assertions plus concurrent retry/stale-writer checks.
- [x] Pass nine affected browser tests, including four editor scenarios (ordering/reload, validation/TF/deletion, retry IDs, conflicts/navigation/non-draft rejection).
- [x] Verify hosted save/retry/order/conflict/validation/receipt cleanup in a rolled-back synthetic transaction.
- [x] User verifies editor create/edit/reorder/save/refresh/TF and unsaved-change warning in the real browser.


# Phases 6-8 focused verification - November 2, 2026

- [x] Pass seven new browser scenarios for activation/validation, QR URL/PNG/count/close, mobile public submissions, duplicate refresh/retry, closed/missing links, storage/error recovery, and instructor-session isolation.
- [x] Recheck the nine affected dashboard/editor/auth scenarios after enabling activation and adding routes; all covered scenarios passed across focused runs.
- [x] User verifies live activation, anonymous submission, count update, duplicate refresh, PNG download, and closure on the desktop.
- [ ] Verify actual phone QR scanning and submission using a reachable HTTPS address during deployment/device testing; localhost QR cannot reach this computer from a phone.


# Phases 9-11 focused verification - November 2, 2026

- [x] Document all-responses percentage denominator/one-decimal rounding, inclusive local creation-date filtering, and response-row CSV format.
- [x] Pass seven results/history/CSV scenarios plus five affected dashboard scenarios across focused runs, including 1,205-response/complete-answer pagination.
- [x] Pass lint, production build, and formatting checks; reuse existing instructor client/RLS without migrations or extra hosted fixtures.
- [x] User verifies real results, refresh, historical filters and Closed/Archived access.
- [x] User opens the exported CSV in a spreadsheet application and confirms columns, row count, timestamps and answers.

- [x] User verifies active-survey results refresh after another submission while the survey remains open.

## Phase 12 focused verification (2026-11-03)

- [x] Verify content/order, distinct IDs, editor redirect, source-change rejection and identical-payload retry recovery with synthetic browser tests.
- [x] Verify affected dashboard checks, build and lint.
- [x] User verifies hosted duplication of a survey with responses, editable Draft copy with zero responses, and unchanged original title/status/count.

## Phase 13 focused verification (2026-11-03)

- [x] Review existing shared layouts, loading/empty/error states and destructive confirmations; retain working designs.
- [x] Verify route titles/heading focus, skip navigation, keyboard login, required-answer focus and completion focus.
- [x] Verify editor dialog description, keyboard cancellation and trigger-focus restoration; verify survey-action focus restoration.
- [x] Verify narrow editor/student/results layouts and long text, classroom QR size and shared input boundary contrast.
- [x] Pass affected editor/student/presentation/dashboard/results checks, build, lint and changed-file formatting.

## Phase 14 evidence reconciliation (2026-11-03)

- [x] Map completed functional/security/persistence checks to prior phase reports without rerunning covered suites.
- [x] Verify expired access-token refresh success and revoked-refresh rejection on protected reloads.
- [x] Verify rapid repeated Submit events issue one RPC while pending.
- [x] Verify tablet portrait/landscape layouts and student controls at least 44px tall.
- [x] Pass four missing Chrome scenarios and twelve targeted second-browser Edge scenarios; record browser versions.
- [x] User verifies actual Edge instructor login, dashboard refresh, Closed-survey results, CSV download, logout and protected redirect.
- [x] Verify actual phone scan and guided public deployment workflow; user confirmed, device/network details recorded.
- [x] Measure public page loads and 200-client API capacity with isolated synthetic data; see phase15-performance.json.
- [ ] Fulfill the <2-second target across tested profiles: warm results mean was 2.289s, so do not claim a complete pass.

## Phase 15 preparation (2026-11-03; not deployed)

- [x] Refresh README for completed features, architecture, all three migrations, private instructor setup, test commands and Pages settings.
- [x] Pin deployment Node 22.23.4 in .node-version and verify package engine compatibility.
- [x] Install from the unchanged lockfile in a clean tracked-source snapshot with fresh Linux dependencies; pass TypeScript and production build under Node 22.23.4/npm 10.9.9.
- [x] Smoke-test emitted production assets, ten local direct routes/redirects, public form/closed state, 320px layout and focus styling without hosted mutations.
- [x] Verify repository-root/main/build/dist settings, safe environment variable names, README local links, ignored credentials/artifacts and absence of a top-level 404 override.
- [x] Create/connect the actual Cloudflare Pages project, enter production build settings/variables and deploy; observed dashboard/build log and public site verify completion.
- [ ] Verify the published repository from a fresh clone after publication, then actual Cloudflare/public/phone/performance acceptance checks.

## Initial public verification (2026-11-03)

- [x] Verify HTTPS home/login, signed-out dashboard redirect and missing public-survey deep link in actual Chrome without API mocks.
- [x] User verifies production instructor session and physical phone QR/submission/results/CSV/close workflow.
- [x] Record phone model/OS and test networks: user reports iPhone 17 Pro, iOS 26.6.1; Wi-Fi and cellular both worked.
- [x] Record phone browser: Safari on reported iOS 26.6.1; exact Safari version not separately reported.

## Phase 15 deployment/performance evidence (2026-11-03)

- [x] Read Cloudflare build log and confirm deployed commit 3cd541211a17f51274196cdea0f0b7390cc358b6, Node 22.23.4/npm 10.9.9, build/dist settings and successful publication.
- [x] Inspect Auth URL configuration; report initial localhost Site URL/empty redirect list and record user's confirmation of saving the public Site URL.
- [x] Run actual public page-load measurements (60 retained samples) and 200 concurrent API submissions; verify exact synthetic counts and cleanup.
- [x] Verify other survey metadata unchanged and sign out the temporary instructor session; save no credentials.
- [x] Disclose warm-results load target miss (mean 2.289s, p95 8.529s); retain all samples and note unknown cause. User requested no performance changes and stopped testing.
- [x] Record corrected Auth Site URL as user-confirmed; independent reread not performed after Escape, and no further testing planned.

## Submission-document preparation (2026-11-03)

- [x] Prepare ai-development-history.md from actual interactions/notes, separating student actions, AI work, observed checks and limitations.
- [x] Review all four existing PNGs visually and map them to the assignment's four required screenshot categories in submission-checklist.md.
- [x] Verify required source/specs/TODO/migrations/README are tracked and record missing deliverables without restarting application testing.
- [ ] Student reviews the new AI history and includes it plus screenshots in the final submission; local files are not yet submitted.
- [x] Review report content read-only: approximately 524 words cover all seven assignment prompts; no edits made.
- [ ] Confirm final report pagination, include report/history/screenshots and privately deliver grader access; HuskyCT submission/receipt remain unverified.
