# Classroom Survey Web App — TODO

## Tracking rules

All inherited completion marks were reset on 2026-11-02 because this folder contains only the supplied documents. Check a task only after verifying its acceptance criteria and recording the command, observation, or evidence in `development-notes.md`. Generated code or a successful build alone does not prove a feature works. Existing phases remain the implementation roadmap; Phase 16 is optional and outside assignment completion. Phase 1 setup and local Git initialization/remote connection were authorized on 2026-11-02. The user subsequently authorized dependency review and committing/pushing the verified Phase 1 setup. Phase 2 preparation and application of the two reviewed migrations to the verified Supabase project were authorized. Hosted schema/permission checks are recorded below; committing/pushing this work, later frontend features, and deployment remain on hold.

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

- [ ] Create the instructor login page.
- [ ] Connect login to Supabase Auth.
- [ ] Add logout.
- [ ] Create an authentication context/provider.
- [ ] Create a protected-route component.
- [ ] Redirect unauthenticated users to login.
- [ ] Show the logged-in instructor in the dashboard.

---

# Phase 4 — Instructor Dashboard

- [ ] Create the dashboard layout.
- [ ] Load surveys from Supabase.
- [ ] Display survey title, status, and creation date.
- [ ] Add status badges for Draft, Active, Closed, and Archived.
- [ ] Add a New Survey button.
- [ ] Add Edit action.
- [ ] Add Duplicate action.
- [ ] Add Delete action.
- [ ] Add Archive action.
- [ ] Add View Results action.
- [ ] Add Activate action.
- [ ] Add Close action.
- [ ] Add search by survey title.
- [ ] Add filtering by status.

---

# Phase 5 — Survey Editor

- [ ] Create a survey editor page.
- [ ] Add survey title field.
- [ ] Add optional description field.
- [ ] Add questions dynamically.
- [ ] Support Multiple Choice questions.
- [ ] Support True / False questions.
- [ ] Add answer choices dynamically.
- [ ] Reorder questions.
- [ ] Reorder choices.
- [ ] Delete questions.
- [ ] Delete choices.
- [ ] Validate required fields.
- [ ] Save a survey as Draft.
- [ ] Load an existing survey for editing.
- [ ] Enforce draft-only editing: active, closed, and archived content stays immutable; duplicate into a new draft for changes (accepted change from the supplied close-then-edit task; see development-notes.md).

---

# Phase 6 — Survey Activation

- [ ] Add activation logic.
- [ ] Ensure at most one survey is Active.
- [ ] Automatically close the previously active survey.
- [ ] Generate a public survey slug or identifier.
- [ ] Generate the public survey URL.
- [ ] Generate a QR code from the public URL.
- [ ] Create a Present Survey page.
- [ ] Display survey title and QR code.
- [ ] Display a readable fallback URL.
- [ ] Add a Close Survey button.
- [ ] Add a Download QR Code button.

---

# Phase 7 — Student Survey Page

- [ ] Create the public route `/s/:surveyId`.
- [ ] Load the requested active survey.
- [ ] Show an error if the survey does not exist.
- [ ] Show a message if the survey is closed.
- [ ] Render survey title and description.
- [ ] Render Multiple Choice questions.
- [ ] Render True / False questions.
- [ ] Validate required answers.
- [ ] Add Submit button.
- [ ] Store response and answers in Supabase.
- [ ] Show a submission confirmation page.
- [ ] Make the entire experience mobile friendly.

---

# Phase 8 — Duplicate Submission Protection

- [ ] Generate an anonymous browser token.
- [ ] Store the token in local storage.
- [ ] Save the token with each response.
- [ ] Prevent the same token from submitting twice to the same survey.
- [ ] Show a friendly message if a duplicate submission is attempted.
- [ ] Add a database uniqueness constraint if appropriate.

---

# Phase 9 — Results Dashboard

- [ ] Create a results page for each survey.
- [ ] Show total response count.
- [ ] Aggregate answers by question.
- [ ] Show counts for each choice.
- [ ] Show percentages for each choice.
- [ ] Add bar charts using Recharts.
- [ ] Clearly label unanswered questions.
- [ ] Add Refresh Results button.
- [ ] Add link back to the main dashboard.

---

# Phase 10 — Historical Results

- [ ] Allow viewing results for Closed surveys.
- [ ] Allow viewing results for Archived surveys.
- [ ] Add filtering by date.
- [ ] Add filtering by survey title.
- [ ] Preserve all historical response data.

---

# Phase 11 — CSV Export

- [ ] Add Export CSV button.
- [ ] Export survey metadata.
- [ ] Export one row per response.
- [ ] Include submission timestamp.
- [ ] Include each question and answer.
- [ ] Create safe CSV escaping.
- [ ] Test export with spreadsheet applications.

---

# Phase 12 — Survey Duplication

- [ ] Duplicate survey title and description.
- [ ] Duplicate questions.
- [ ] Duplicate answer choices.
- [ ] Create the copy in Draft state.
- [ ] Add "Copy of ..." naming.
- [ ] Redirect to the editor after duplication.

---

# Phase 13 — UI Polish

- [ ] Add consistent page layouts.
- [ ] Improve mobile responsiveness.
- [ ] Add loading states.
- [ ] Add empty states.
- [ ] Add error messages.
- [ ] Add confirmation dialogs for destructive actions.
- [ ] Improve QR-code presentation for classroom projection.
- [ ] Test accessibility and keyboard navigation.
- [ ] Improve color contrast.

---

# Phase 14 — Testing

- [ ] Test instructor login.
- [ ] Test survey creation.
- [ ] Test survey editing.
- [ ] Test activation.
- [ ] Test closing surveys.
- [ ] Test QR-code links.
- [ ] Test student submissions.
- [ ] Test duplicate-submission prevention.
- [ ] Test results calculations.
- [ ] Test CSV export.
- [ ] Test mobile layout.
- [ ] Test with at least two browsers.
- [ ] Test unauthorized access attempts.
- [ ] Test database Row Level Security.

---

# Phase 15 — Deployment

- [x] Push the project to GitHub.
- [ ] Create the Cloudflare Pages site.
- [ ] Connect Cloudflare Pages to the GitHub repository.
- [ ] Configure production environment variables.
- [ ] Deploy the application.
- [ ] Configure SPA routing.
- [ ] Verify production login.
- [ ] Verify QR codes point to the production URL.
- [ ] Test student submissions in production.
- [ ] Test instructor results in production.

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
- [ ] Add visible presentation response count and refresh behavior; verify count updates after a student submits.
- [ ] Validate at least one question, nonblank title/question/choice text, at least two multiple-choice options, exactly True/False choices, stable ordering, and agreed required-answer rules.
- [ ] Make duplication atomic or recover safely from failure; copy no responses or answers and issue a distinct public identifier.
- [ ] Define result percentage denominator, rounding, zero-response behavior, and unanswered display.

# Required additions to Phase 14 ? Verification

- [ ] Record test environment, steps, expected/actual results, evidence, failures, and fixes in `development-notes.md`; rerun affected checks after fixes.
- [ ] Run type checking, linting, automated tests, and production build; record exact commands and outcomes.
- [ ] Verify complete create ? edit ? activate ? phone QR scan ? anonymous submit ? present count ? results ? CSV ? close workflow locally and publicly.
- [ ] Inspect actual Supabase records for survey, ordered questions/choices, response, and answers; refresh/reopen the app to verify persistence.
- [ ] Test anonymous direct API access: inactive content, responses, answers, results/export, survey mutations, and instructor RPCs must be inaccessible.
- [ ] Test logout, expired sessions, protected-route reloads, incorrect credentials, and public signup restrictions.
- [ ] Test malformed/empty submissions, missing/extra/duplicate questions, cross-survey questions, mismatched choices, invalid tokens, and inactive survey submissions; failures must leave no partial records.
- [ ] Test duplicate submission after refresh, double-click, concurrent requests, and retry after an uncertain network response; verify exactly one stored response per survey/token.
- [ ] Test simultaneous activations and close-versus-submit races; at most one survey remains active and no submission is accepted after closing completes.
- [ ] Verify duplication, archive, delete/cascade, confirmation dialogs, date/title/status filtering, reordering, and historical result preservation.
- [ ] Verify results against known seeded counts, zero responses, percentages and rounding, and the agreed unanswered behavior.
- [ ] Test CSV metadata, timestamps, column ordering, Unicode, quotes, commas, newlines, empty results, and formula-like cells; open in a spreadsheet application.
- [ ] Test loading, offline/network failures, retry behavior, missing/closed links, and friendly errors with no raw database exceptions.
- [ ] Verify keyboard navigation, labels, focus, contrast, numeric chart alternatives, 44px student touch targets, mobile/tablet layouts, and projector readability.
- [ ] Test actual phone QR scanning, downloaded QR PNG, fallback URL, and two browsers; record device/browser versions.
- [ ] Define a reproducible page-load measurement and test the specified average under 2 seconds; record conditions and results.
- [ ] Test at least 200 simultaneous students using synthetic tokens in an isolated test dataset; verify latency, errors, exact stored counts, and resource limits. Document any unmet target honestly.

# Required additions to Phase 15 ? Repository and deployment

- [x] Initialize/connect local Git to https://github.com/noahsteinberg/ClassroomSurveyApp.git after authorization; inspect remote before integrating any contents.
- [ ] Add README with architecture/data flow, prerequisites, local setup, environment variable names, schema/RLS/RPC setup, instructor provisioning, tests, deployment, and SPA routing.
- [ ] Add `.gitignore` and safe `.env.example`; inspect staged files and history for passwords, private keys, service-role keys, and real student data before publishing.
- [ ] Verify clean checkout/install/build and fresh schema setup using the README.
- [ ] Verify deployed deep links and reloads, HTTPS, Supabase production auth configuration, QR origin, persistence, duplicate protection, and anonymous/instructor authorization from outside the local network.
- [ ] Record public deployment URL and verified GitHub URL; document free-service configuration and observed limits.

# Assignment submission ? required (not post-MVP)

- [ ] Write approximately 1?2 pages covering specification guidance, AI-generated work, database setup, frontend/database communication, one real problem and resolution, deployment, and learning.
- [ ] Export AI conversation history or produce a Markdown interaction summary showing user guidance, implementation, testing, and debugging; use development notes as evidence, without inventing work.
- [ ] Capture sanitized screenshots of Supabase tables, a survey with associated questions, stored student responses, and application results.
- [ ] Arrange private instructor test access and include delivery instructions without publishing credentials in the repository.
- [ ] Verify repository includes source, all supplied specs, updated verified TODO, migrations/schema, and README.
- [ ] Audit assignment checklist and rubric against evidence; clearly disclose any remaining incomplete requirements.
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
