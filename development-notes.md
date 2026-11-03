# Development notes

## 2026-11-02 — Requirements review and planning only

### Scope and verified baseline

User requested review of the assignment and all five supplied documents, reset of inherited TODO completion marks, missing testing/submission tasks, and an explanation of the plan. Do not implement, commit, or push yet. Only planning documentation changes are authorized in this pass.

Read in full: `assignment.md`, `Classroom_Survey_Web_App_Specification.md`, `TODO.md`, `DATABASE.md`, `API.md`, and `UI.md`, plus the attached assignment paste. The assignment copies describe the same requirements and deadline: November 5, 2026, 11:59 PM EST; the paste shows one remaining submission attempt.

Verified by directory listing: only those six Markdown files existed initially. `git status --short` reported that this folder is not a Git repository. No application, database migrations, tests, or build configuration exist locally. The user describes the remote as empty; remote contents have not been verified. Intended remote: https://github.com/noahsteinberg/ClassroomSurveyApp.git. No external services were configured or changed.

Reset all 123 inherited checked items in TODO.md. None establishes completed work in this project. Preserve the supplied phases and original tasks, append gaps, and leave every implementation/testing/submission item unchecked. Phase 16 remains optional future work. The original assignment and four other specification files remain unchanged.

### Planned architecture

Use the specified React + TypeScript + Vite frontend with Tailwind, React Router, Recharts, and qrcode. Host the static frontend on Cloudflare Pages; use Supabase Auth and PostgreSQL for authentication and persistent data. No separate application server is currently necessary: instructor operations use the Supabase client under RLS, while privileged transitions and anonymous submissions use carefully authorized database RPCs.

The five related tables are surveys → questions → choices and surveys → responses → answers; each answer also references its question and choice. Schema, indexes, constraints, policies, grants, triggers, and functions must be versioned migrations, not dashboard-only changes. Frontend environment configuration contains only browser-appropriate project URL/public key; private administrative credentials never enter the browser or repository.

Instructor routes cover login, dashboard, editor, presentation, and results. Public `/s/:slug` serves an active survey without login. Submission sends a browser token and selected question/choice IDs to a transactional validation RPC; success follows durable insertion. Instructor results aggregate persisted answers, display counts/percentages/charts, and export CSV. Presentation displays production QR URL and response count.

### Unclear requirements and proposed decisions

These are proposals for implementation, not claims that the user has accepted all choices. Resolve them explicitly before dependent implementation; record final decisions here.

| Issue / source conflict | Proposed decision and implication |
| --- | --- |
| TODO uses `/s/:surveyId`, while UI/API specify `/s/:slug`; database allows UUIDs. | Use `/s/:slug` with a unique random stable slug generated on first activation. Document the TODO parameter as a naming discrepancy rather than creating two routes. |
| Assignment says edit drafts; TODO allows editing after closing. Database deletion/choice changes can destroy historical meaning. | Allow editing drafts only; duplicate a closed/archived survey into a new draft for changes. Preserve collected survey content and historical results. This deliberately needs resolution against the original TODO wording. |
| Allowed lifecycle transitions and reactivation are unspecified. | Draft → Active → Closed → Archived; activation closes the previous active survey atomically. Do not reactivate collected surveys in V1; duplicate for another session. Confirm whether closed/archived reactivation is expected. |
| Required-answer errors/unanswered labels appear, but no required flag exists. | Require one answer to every question in V1, enforce server-side, and retain defensive unanswered reporting for inconsistent/legacy data. Optional questions would require a documented schema/API addition. |
| Multiple-choice minimum/maximum and true/false editing rules are unspecified. | Require at least two nonblank MC choices; exactly fixed True/False choices. Do not invent arbitrary maximum lengths/counts without a documented usability/resource decision. |
| Any authenticated user may manage data under the sample RLS; instructor enrollment is unspecified. | Single privately provisioned instructor account, public signup disabled. If registration is needed, introduce an explicit instructor authorization mechanism before allowing it. Never equate arbitrary signup with instructor privileges. |
| DATABASE says anonymous INSERT access; API prefers transactional RPC. | Grant anonymous RPC execution for submission, with no direct INSERT/SELECT access to response/answer tables. A narrowly scoped privileged function validates everything and uses a safe search path/grants. Instructor-only RPCs must also authorize callers. |
| Public RLS exposes only active surveys, but UI requires distinct closed/not-found states. | Add a narrowly scoped slug-status lookup returning only an availability state for inactive known slugs, with no title/questions/results. Confirm acceptability of disclosing link existence; otherwise use a combined unavailable message and document the UI deviation. |
| One-active constraint alone does not specify simultaneous transitions or close/submission ordering. | Use a database uniqueness constraint plus coordinated transactional locking for activation, close, and submission. A response begun concurrently may commit before close; requests ordered after completed close must fail. Verify with concurrent integration tests. |
| Live response count/results are requested, while Realtime is a post-MVP enhancement. | Poll the instructor presentation count at a documented interval (proposed 5 seconds), with manual results refresh for MVP. Stop polling when the page is hidden/unmounted or survey closes. Realtime charts remain optional. |
| Percentages and unanswered denominator are not defined. | Percentage = choice count / total submitted responses × 100, rounded to one decimal; zero responses produce 0%. Display unanswered count explicitly when nonzero. Confirm if per-question answered count should instead be used. |
| TODO requires CSV metadata; API shows response rows and ambiguous question headers. | Propose one row per response with repeated survey ID/title/status, response ID, ISO submission timestamp, and question-text columns in stable order. Escape CSV and neutralize formula-like text. Empty results still produce headers; agree format before coding. |
| Browser token nullable in schema; duplicate protection is only described as reasonable. | Require a nonempty random browser token through submission RPC and uniqueness per survey/token. Keep it across refresh; explain clearing storage/another browser bypasses accidental-duplicate protection. Handle storage failure with a clear message rather than silently claiming protection. |
| Archive/delete and retention overlap. | Archive retains everything. Explicit confirmed deletion cascades as specified, with stronger warning when responses exist; no automatic response deletion. |
| Performance targets lack workload/measurement conditions. | Define page-load timing, dataset, network/device, warm/cold conditions, and a 200-client load profile before measurement. Record actual outcomes and any unmet targets; do not infer performance from a successful build. |
| Open-source goal lacks license choice; provider accounts/access are unknown. | Confirm license and existing Supabase/Cloudflare access before those steps. Preserve the specified stack and free-service constraint; verify actual service capabilities during implementation. |

### Implementation order after user authorizes it

1. Resolve the decision gates above. Follow original TODO Phases 1–3: scaffold and verify toolchain, create reproducible schema/security/RPC migrations, provision instructor authentication. Establish database integration tests early because security and lifecycle correctness govern the UI.
2. Follow Phases 4–8: instructor dashboard/editor, transactional save/activation/close, projection view with QR/count, anonymous student survey, atomic submission and duplicate handling. Verify each vertical workflow before marking tasks complete.
3. Follow Phases 9–13: result aggregation/charts/history, CSV, duplication, responsive/accessibility/error-state polish. Retain all supplied features such as archive/delete/filter/reorder/QR download even when the assignment overview is shorter.
4. Complete expanded Phase 14: automated validation/security/concurrency checks and manual desktop/phone/two-browser/QR/persistence/accessibility tests, plus measured performance. Inspect real test records with Supabase Table/SQL Editor. Log failures and fixes with evidence.
5. Complete Phase 15 only when authorized: README and secret audit, connect local Git to the supplied remote, publish, configure Cloudflare and Supabase production settings, and repeat end-to-end/security/deep-link checks publicly.
6. Prepare every assignment deliverable: repository, deployed URL, private grader access, 1–2 page report, AI history, sanitized database/results screenshots, and HuskyCT package. Review before the remaining submission attempt. Phase 16 is excluded from required completion.

### Verification and progress policy

For every completed task, append date, task/requirement, verification method or exact command, expected/actual result, and evidence path or sanitized observation. Check the TODO item only after its relevant acceptance checks pass. If verification later fails, reopen the item and document why. Distinguish locally tested, production tested, pending external setup, and unverified work. Do not record secrets, private student data, invented test results, or hypothetical debugging as actual history.

Current work performed: document review, baseline inspection, checklist reset, missing-task analysis, and planning documentation. No application tests can run because there is no application. No implementation, Git initialization, commit, push, deployment, or remote inspection was performed.

Planning-document verification: confirm all six source documents remain present, TODO contains zero checked tasks, additions cover testing/deployment/submission, and only TODO.md plus this new notes file have changed. A read-back check is recorded below after it runs.

Verified planning read-back (2026-11-02): Python assertions passed for all six original documents present, seven total Markdown files, zero checked TODO items, and added performance/schema/private-access/submission coverage. No application verification is claimed.

## 2026-11-02 ? Phase 1 setup and local Git

### Authorization and scope

User authorized Phase 1, `.gitignore` before setup, Git initialization and connection to the existing remote, preserving specs, build/lint verification, and progress updates. No commits or pushes. Earlier hold on setup is superseded only for this scope. Later feature decisions remain proposals and do not block this tooling-only phase.

### Changes and decisions

- Created `.gitignore` before scaffolding or dependency installation: ignores node_modules, dist, environment files, local overrides, logs, caches, coverage, and editor artifacts; explicitly retains `.env.example`.
- Initialized `main` with `git init -b main`; added origin with `git remote add origin https://github.com/noahsteinberg/ClassroomSurveyApp.git`. `git ls-remote origin` succeeded with no refs. Remote URL confirmed with `git remote -v`. There is no upstream branch yet because there has been no push.
- Scaffolded React/TypeScript/Vite; added Tailwind's Vite plugin and CSS import, BrowserRouter and a home route, plus installed Supabase client, Recharts, qrcode and QR types. These later-phase libraries are installed only; no database client, credentials, charts, survey logic, or authentication is implemented.
- Added `src/components`, `src/pages`, `src/lib`, `supabase/migrations`, and `public`, retaining empty folders with `.gitkeep`. Added safe `.env.example`; home page runs without configuration.
- Replaced template demonstration content with the semantic Classroom Survey landing page. Login is labeled as forthcoming rather than represented by a dead button or an unimplemented route.
- Configured explicit ESLint TypeScript/React rules and Prettier, with scripts for lint, build, formatting, and formatting check. Formatting excludes supplied Markdown to preserve source documents. Added initial README with commands, scope, folder layout, and safe environment guidance.
- Used current Vite scaffold and Tailwind Vite integration guidance: https://vite.dev/guide/ and https://tailwindcss.com/docs/installation/using-vite . Installed versions are locked in package-lock.json; local runtime Node 25.2.0/npm 11.6.2. TypeScript 6.0.3 is compatible with the installed typescript-eslint supported range; the resulting package manifest and npm dependency tree were inspected.

### Problems encountered and resolutions

1. The Vite generator normalized a Windows absolute temporary path into a nested directory name. Copied only scaffold files into the project, excluding README/.gitignore, then removed the verified nested scaffold path. Assignment/spec documents were never overwritten.
2. Initial package installation overlapped the scaffold copy, so npm's manifest write lost the template's direct React/toolchain declarations. The first build correctly failed for missing React types and the Vite React plugin. After the install finished, explicitly installed React/react-dom and all required Vite/TypeScript/type dependencies sequentially. The subsequent lint/build/format checks passed. Avoid overlapping dependency installation with manifest changes.
3. The current Vite template uses Oxlint; the supplied TODO specifically requests ESLint. Removed the Oxlint setup and installed/configured ESLint instead.
4. A one-off route smoke check tried to load CommonJS react-router-dom directly through Vite's SSR evaluator and failed (`module is not defined`). Corrected the verification harness to import MemoryRouter through Node and load only application TSX through Vite; the corrected route render passed. SSR is verification tooling here, not an application feature.

### Verified Phase 1 evidence

| Tasks | Verification and observed result |
| --- | --- |
| React + TypeScript + Vite, initial structure | `npm ls --depth=0` showed declared React/React DOM, Vite/plugin and TypeScript/types; directory inspection confirmed planned folders; TypeScript compilation in build passed. |
| Tailwind | Vite plugin/CSS import configured; production CSS smoke assertion found generated `.min-h-screen` utility and served CSS successfully. |
| React Router and basic home page | One-off Node/Vite ReactDOM server render of App wrapped in MemoryRouter at `/` passed assertions for semantic main, title, and tagline. This verifies route rendering, not browser visual QA. |
| Supabase, Recharts, qrcode | `npm ls --depth=0` confirmed @supabase/supabase-js 2.118.0, recharts 3.10.1, qrcode 1.5.4; no external configuration or functionality claimed. |
| Environment example and ignore rules | `.env.example` contains placeholder URL/public anon key only. `git check-ignore` verified node_modules and .env/.env.local/.env.production are ignored; `.env.example` is visible as untracked, so it is not ignored. |
| ESLint and formatting | `npm run lint` exited 0 with no findings. `npm run format:check` exited 0, all matched files formatted. |
| Production build | `npm run build` exited 0; TypeScript passed and Vite built 24 modules and emitted HTML, CSS, and JavaScript. |
| Production serving | One-off Vite preview on 127.0.0.1:4173 returned HTTP 200, expected title, and successful JS/CSS asset responses; server closed after check. |
| Source preservation | SHA-256 comparison against pre-setup hashes passed for assignment.md, API.md, DATABASE.md, UI.md, Classroom_Survey_Web_App_Specification.md. TODO changes are intentional progress edits. |
| Git connection | Local main/origin verified; remote read returned no refs. No files staged, no commit created, no push performed. |

`npm audit --omit=dev` reports zero vulnerabilities. Full audit reports 13 moderate findings propagated through the development-tooling minimatch dependency chain (GHSA-g3hv-75wg-m249). npm suggested breaking downgrades and reports no fix for part of the chain; no forced audit fix applied. Added an unchecked follow-up task; build/lint success does not resolve these findings.

All 11 original Phase 1 tasks and the separately verified Git connection task are checked. No database/authentication/feature/testing-phase/deployment/submission tasks are checked. Broad lifecycle, schema, authorization, CSV, and performance questions remain open for later phases. Browser/device visual QA is not claimed in this phase.

Final Phase 1 verification: `npm ci` succeeded from the lockfile (255 packages), then lint, build, and format:check all exited 0 again. Final Python assertions confirmed five unchanged source hashes, exactly 12 verified checkmarks (11 Phase 1 plus Git connection), main/origin configuration, ignored dependency/build/environment paths, visible .env.example, empty staging area, and no HEAD commit. No commit or push was made.

## 2026-11-02 ? Dependency review and authorized publication

User authorized compatible dependency fixes without forced upgrades, affected verification, secret review, and committing/pushing the verified Phase 1 setup. Deployment and later feature implementation remain out of scope.

Reviewed full `npm audit --json`, `npm outdated --json`, `npm ls minimatch`, npm registry dependency metadata, and https://github.com/advisories/GHSA-g3hv-75wg-m249 . The 13 moderate reports propagate from a single minimatch glob-pattern amplification advisory; installed minimatch is 10.2.6. The advisory patches >=11.0.1 (latest registry version 11.0.4), whereas installed ESLint 10.14.0 and typescript-estree 8.72.1 require ^10.2.6 and ^10.2.2 respectively. No compatible patched 10.x version is available according to the advisory. `npm outdated` showed only TypeScript 7 as a major update outside the existing range; it was not installed.

`npm audit fix --dry-run --json` proposed no compatible package changes; `npm audit fix` without force confirmed the tree is up to date and retained the 13 findings. No overrides, forced upgrades, or breaking downgrades were introduced. Remaining audit follow-up stays unchecked; review itself is checked separately. This is development-tooling exposure, with no production dependency findings; it is not claimed resolved.

Verification after the normal audit fix: reran lint, production build (includes TypeScript), format:check, and production dependency audit. Publication checks and actual commit/push outcome are recorded separately below.

Pre-publication verification completed: lint, TypeScript/production build, and format:check all exited 0 after audit review and again after removal of two unused scaffold assets. Production audit reports zero vulnerabilities; full audit remains 13 moderate development findings. The audit fix introduced no dependency version changes. A custom pattern scan of all 29 staged text files checked private-key blocks, GitHub/AWS/Supabase credentials, JWTs, credential-bearing URLs, and secret-like assignments. Only three reviewed placeholders matched: the `.env.example` anon-key placeholder and two anonymous browser-token examples in API.md. No actual credentials were identified by this scan; it is a pattern-based review, not a guarantee against all possible secrets. Staged paths exclude private environment files, node_modules, and dist. All five unchanged assignment/spec source SHA-256 hashes still match pre-setup values. `git diff --cached --check` passed. No existing commits/history were present to scan. Ready to create and push the authorized Phase 1 commit; outcome will be verified against the remote.

Publication verified: Phase 1 commit `afdba5689d2000bf674d79b49d68dd0d64ddff5d` was pushed successfully with `git push -u origin main`. `git ls-remote origin refs/heads/main` matched local HEAD; working tree was clean and main tracks origin/main. Checked only the original Push the project to GitHub task after this verification; hosting/deployment and other submission tasks remain unchecked. This follow-up documentation change records the verified publication outcome.

## 2026-11-02 ? Accepted decisions and Phase 2 preparation

### Authorization and accepted decisions

User accepted the recommendations from the Phase 2 review and requested local migrations/security tests, with no application to Supabase and no commit. Prior permission to publish Phase 1 does not authorize publishing this work. Only disposable, isolated local PostgreSQL was used for database verification; no hosted project was configured, linked, queried, or changed.

The following earlier proposals are now accepted:

- Single-instructor/shared workspace: manually provisioned email/password Auth users are trusted instructors. Disable public signup, anonymous Auth sign-ins, and unused providers; students never receive Auth accounts. No instructor ownership columns or multi-tenant behavior in V1. A separate privately provisioned grader account would receive the same instructor rights. Hosted configuration remains a required external step, not a database test result.
- **Draft-only editing**: title, description, questions, and choices become immutable after activation, including after closing/archiving. Duplicate a collected survey into a new draft for changes. This deliberately supersedes the supplied TODO task ?Prevent editing an active survey unless it is first closed.? Updated that task to reflect the accepted rule while leaving DATABASE.md/API.md/UI.md/overall specification/assignment source files untouched. The assignment's draft-editing requirement and historical result integrity motivate the change.
- Lifecycle is draft -> active -> closed -> archived, with no reactivation. Activation atomically closes the prior active survey. Explicit deletion is allowed for nonactive surveys, cascades all related records, and must later have the specified UI confirmation; an active survey must be closed first. Archiving retains records.
- At least one question per activated survey; all questions require exactly one choice. MC needs at least two nonblank choices; TF uses True/False at fixed positions 1/2. Incomplete drafts may exist, but cannot activate. Reordering uses positive positions and deferred parent/position uniqueness constraints.
- Anonymous submissions use one transactional RPC and a lowercase random UUID browser token. Require that token and database uniqueness per survey/token. No direct response/answer insertion or mutation privileges for browser roles. Instructor result data is read-only through the browser; deleting a survey intentionally removes it by cascade. Clearing storage/another browser still bypasses accidental-duplicate protection.
- Public URL is `/s/:slug`, with a random UUID string generated on first activation (an option explicitly allowed in DATABASE.md). The availability lookup returns only active/closed/not_found; archived counts as closed and inactive content remains private.

Earlier result-percentage/CSV/polling/performance-measurement proposals are not settled by this database-only implementation. Their checklist tasks remain open. No frontend Auth/database integration, login UI, survey editor, or duplication UI/RPC was added.

### Prepared files and security implementation

- `supabase/migrations/20261102000100_schema.sql`: five tables, primary/foreign keys, cascading relationships, indexes, timestamps, status/type/text/position validation, required UUID browser tokens, duplicate uniqueness, one-active index, immutable content/lifecycle triggers, and inserted-answer relationship validation. Retains the supplied nullable choice/on-delete-set-null shape; the student RPC always requires a valid choice. V1 text_answer is constrained to null.
- `supabase/migrations/20261102000200_security_and_rpcs.sql`: enables RLS for all tables, explicitly resets browser table grants, permits anonymous active-content SELECT only, grants instructor column-limited draft CRUD and read-only result SELECT, and adds activate/close/archive/submission/availability functions. Direct status/slug/identity updates are denied by column privileges. Private helpers have no browser schema access or execution privileges. Privileged functions use an empty search_path, qualified references, restricted EXECUTE grants, and explicit instructor checks where needed.
- Transactions coordinate lifecycle through an advisory lock, edits through parent survey locks, and submissions through shared survey-row locks. Concurrent submissions need not serialize globally. Closing waits for previously accepted submissions; requests behind a completed close fail. Activate validates the full structure under its lock; historical content cannot be reopened for editing.
- `supabase/tests/local/bootstrap.sql` and `fixtures.sql`: synthetic fixtures and minimal Supabase-compatible role/auth.uid interface exclusively for an isolated test database. Not production migrations. Bootstrap requires the exact test database name.
- `supabase/tests/database/security.sql`: plain SQL regression assertions, not pgTAP. Fails on wrong grants, wrong/missing errors, integrity mistakes, partial writes, or changed visibility. Transaction rolls back test mutations.
- `scripts/test-database.mjs` and `npm run test:db`: starts a disposable postgres:17-alpine container with no network/host ports, applies the migrations to a fresh local database, executes SQL tests and concurrent sessions, then removes the exact container in finally. Reads no Supabase environment variables or credentials and contains no hosted apply/reset commands. Docker may download the public image when needed. No new npm dependencies were introduced; ESLint's Node globals and formatting scripts now include this runner.
- `supabase/README.md` and main README: document accepted behavior, security boundaries, RPC contracts, test instructions/limitations, and future Supabase setup. Hosted integration will use the recommended publishable key, with a future rename of the existing anon-key placeholder; no environment configuration was changed now.

### Verification performed

Docker engine was available (29.1.5). `npm run test:db` applied both migrations to a fresh isolated PostgreSQL 17 database successfully. Final expanded run passed **73 SQL assertions** plus these **five real concurrent-session scenarios**:

1. Two same-token submissions yield exactly one complete response and two answers.
2. A submission waiting behind an uncommitted close fails after close commits, without inserting data.
3. Close waits for an earlier accepted submission to commit; that response remains stored.
4. Activation waits for a draft edit to commit and subsequently rejects content edits.
5. Concurrent activation requests both finish, automatically close the prior active survey, and leave exactly one survey active.

SQL coverage includes anonymous active-only content, denied results/table mutation/instructor/private RPC calls, instructor identity checks and draft CRUD, denial of direct status/slug changes, required fields and activation validity, malformed/missing/duplicate/cross-survey answers, invalid tokens, duplicate submissions, an intentionally forced answer-storage failure that rolls back its response, immutable active/closed/archived content, retention on close/archive, explicit delete cascades, privileged search_path settings, and the one-active unique index.

After adding the runner, `npm run lint`, `npm run build` (TypeScript + Vite), and `npm run format:check` each exited 0. `git diff --check` passed. Test containers were removed; no matching container remained. Only local preparation tasks are eligible for completion; original Phase 2 Supabase creation/application/security-verification items remain unchecked.

### Problems found and corrected during verification

- Initial container readiness checked the Unix socket, which briefly accepts connections during PostgreSQL initialization before restart. The first run failed with ?database system is shutting down.? Changed readiness to the container's loopback TCP endpoint, which becomes available only for the final server; fresh-database reruns passed. No host port was opened.
- ESLint flagged an assertion-count regex containing literal repeated spaces. Replaced it with a whitespace expression and reran lint/build/format/database tests successfully.

### Practical limits / remaining work

Local auth.uid/roles are a test interface, not a real Supabase Auth/JWT service. Hosted Auth settings, public signup rejection, actual instructor login, PostgREST grants/exposure, publishable-key configuration, real database records/screenshots, refresh/browser behavior, and classroom performance remain unverified. Read Committed transactions are the intended runtime isolation; unexpected transient concurrency errors should be retried appropriately in later frontend integration. The earlier 13 moderate development dependency findings are unchanged by this SQL/test-only work. No secrets or real student data are needed for this test suite.

The next hosted step requires separate authorization to apply reviewed migrations to the intended project. No commit, push, Supabase application, or deployment was performed in this preparation pass.

Final preparation audit passed: all five supplied source-document SHA-256 hashes match the saved pre-setup values, git reports no spec changes, new SQL/runner files have no trailing whitespace or merge markers, original hosted Phase 2 tasks remain unchecked, staging is empty, and HEAD remains c8d5aee. A direct working-file-versus-Git-blob comparison initially differed because Git normalizes CRLF; the saved byte hashes confirmed the working source files are unchanged.

## 2026-11-02 ? Supabase connection readiness; no hosted changes

User reports project hmrtffcpoyksnwdquyow is ready and supplied the project-scoped MCP setup command. Authorized configuring/authenticating the connection and checking MCP/CLI readiness, explicitly not applying migrations. Provided dashboard walkthrough for disabling public signup and anonymous Auth sign-ins, retaining email/password login, and manually creating/confirming the instructor account. Those settings and the user account have not been independently inspected or verified; no associated task was checked.

Ran `codex mcp add supabase --url` with the exact supplied project-scoped URL/features. This created the global Codex server entry and automatically initiated browser OAuth; the command completed with ?Successfully logged in.? A separate login was unnecessary. `codex mcp get supabase` confirmed enabled streamable HTTP and the intended project_ref; `codex mcp list --json` reported auth_status o_auth. No tokens/passwords were copied into the repository or notes. The currently running chat still exposes no Supabase tool names, so live project access or migration execution permissions cannot yet be asserted. Refresh/restart the Codex session to load the new server; then use only read-only metadata checks until migration application is separately authorized. Supabase's documented database feature includes list_migrations/list_tables/apply_migration; presence in the documentation is not proof of runtime access.

The Supabase executable was absent from PATH, but `npm exec --yes --package=supabase -- supabase --version` works and reports 3.0.0. The read-only `supabase projects list` failed with AccessTokenRequiredError: CLI login or SUPABASE_ACCESS_TOKEN is required. MCP OAuth is separate from CLI authentication. Inspected only `supabase db push --help`; did not run db push, link, init, migration application, or hosted SQL. No optional agent skills were installed. No Auth settings/users were changed, and no commit or push was made. Existing Phase 2 preparation remains uncommitted.

References checked: official OpenAI Docs MCP setup (https://developers.openai.com/learn/docs-mcp), Supabase MCP (https://supabase.com/docs/guides/ai-tools/mcp), Auth general configuration (https://supabase.com/docs/guides/auth/general-configuration), and Auth users (https://supabase.com/docs/guides/auth/users).

## 2026-11-02 ? Live MCP target and empty application schema verified

User reports completing Auth setup and requested read-only MCP verification, explicitly no migration application. The live Supabase tools are now available. `get_project_url` returned https://hmrtffcpoyksnwdquyow.supabase.co, matching the intended project reference. `list_tables` for public/private returned no tables. `list_migrations` returned an empty migration history. A read-only pg_catalog.pg_tables summary found only built-in schemas: auth (27 tables), realtime (3), storage (8), and vault (1); no application tables exist. No table rows, passwords, keys, or private account details were retrieved.

MCP connection and read access are confirmed. The apply_migration tool is available, but actual write permissions are not proven by these read-only checks. Both reviewed local Phase 2 migration files remain unapplied. User-reported Auth configuration/account completion has not been independently validated by this metadata inspection. No hosted SQL writes, configuration changes, commits, or pushes were performed. Original hosted Phase 2 tasks remain pending except that project existence is now confirmed by live access.

## 2026-11-02 ? Two reviewed migrations applied to hosted Supabase

### Scope, target, and exact application

User explicitly authorized applying the two reviewed migrations through MCP, verifying hosted tables/relationships/RLS/permissions, and updating notes/TODO; no commit or push. Rechecked `get_project_url` immediately before application: https://hmrtffcpoyksnwdquyow.supabase.co. `list_tables(public,private)` and `list_migrations` were still empty, so no application tables or existing migration history would conflict.

Read the reviewed local SQL files without modifying their contents, then called `apply_migration` sequentially: schema first, security_and_rpcs second. Both returned success=true. Hosted `list_migrations` confirms:

| Reviewed local file | MCP-recorded version/name | Current local filename |
| --- | --- | --- |
| 20261102000100_schema.sql | 20261102195952 / schema | 20261102195952_schema.sql |
| 20261102000200_security_and_rpcs.sql | 20261102195955 / security_and_rpcs | 20261102195955_security_and_rpcs.sql |

MCP assigns migration timestamps. Renamed the two uncommitted local files to match hosted history so a future CLI push does not mistake them for unapplied migrations. SQL bytes are unchanged: schema SHA256 bd2180497d5289477be0787b6753d858322ad5455260d142e799ac27df08dd87; security/RPC SHA256 8933a681dc3b14303c7ae96ece229b86f84511dcd10bf14a43c0bef821e174a6. Updated current README references; earlier notes retain their historical filenames. No test bootstrap/fixture SQL was applied to Supabase and no third migration was added.

### Verified hosted structure and permissions

Read-only pg_catalog/information_schema inspection and explicit assertions confirmed:

- Five public tables: surveys, questions, choices, responses, answers; RLS enabled on every one. All five remain empty after verification; no synthetic or real survey records were inserted.
- Six foreign keys: questions -> surveys, choices -> questions, responses -> surveys, answers -> responses/questions/choices. Deletes cascade for the first five; answers.choice_id uses ON DELETE SET NULL as specified.
- 19 indexes including primary/unique constraint indexes. One-active partial unique index, survey/token response uniqueness, answer-per-response/question uniqueness, and deferred parent/position uniqueness are present. Nonblank fields, valid survey/question types, required UUID token and other schema checks are installed.
- Required timestamptz fields have nonnull now() defaults. The survey trigger sets updated_at on updates. Four application triggers are enabled, covering survey lifecycle/timestamps, draft-only question and choice editing, and answer membership.
- Eight policies: three anonymous active-content read policies, three authenticated instructor content-management policies, and two authenticated results-read policies. Instructor policy identity checks use auth.uid().
- Anonymous role has SELECT only on surveys/questions/choices under RLS; no results SELECT and no INSERT/UPDATE/DELETE/TRUNCATE access to any of the five tables. Authenticated role can SELECT all five, insert/update only allowed content columns and delete nonactive surveys/content subject to triggers/RLS. Responses and answers are read-only for browser roles. Direct status/slug/identity updates are not granted.
- All ten application functions are SECURITY DEFINER with empty search_path and reviewed definitions. Only authenticated can execute activate/close/archive, whose bodies explicitly require instructor identity. Anon/authenticated can execute submission and availability intentionally. The five private helpers deny both browser roles EXECUTE and schema USAGE.

Sanitized catalog/advisor evidence is saved at `supabase/verification/2026-11-02-hosted-audit.json`. No passwords, keys, user rows, or response data were retrieved for this audit.

### Effective hosted SQL-role checks

Used transactions with READ ONLY and SET LOCAL ROLE, then ROLLBACK; no fixture creation or persistent data writes:

- As anon, survey/question/choice SELECT ran and returned zero visible rows (database is empty). Direct SELECT on responses and answers each raised insufficient_privilege, as expected. Mutation privilege checks were false. Checked the original ?students cannot read survey results? task based on this actual database-role denial; public Data API denial is still a separate pending check.
- As authenticated with empty JWT claims/no auth.uid(), survey SELECT returned zero visible rows and close_survey rejected the caller with AUTHENTICATION_REQUIRED. This proves the identity guard works in hosted PostgreSQL, not that the real instructor login/JWT flow works.

### Advisor findings and disposition

Security advisors returned WARN groups, not a clean report:

1. Anonymous/signed-in execution of SECURITY DEFINER functions: submission/availability and instructor lifecycle functions are intentionally exposed with validation, explicit identity checks, and execution grants. Preserve those grants; future real API tests must verify them. References: https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable and https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable .
2. Pre-existing Supabase `public.rls_auto_enable()` is an event-trigger function with browser EXECUTE grants and search_path=pg_catalog. It was not defined or modified by our migrations; pg_get_functiondef identifies its event-trigger purpose. Generic advisor text describes it as an RPC, but PostgreSQL event-trigger functions are not ordinary callable functions. Record a separate hardening review of unnecessary grants rather than silently changing platform-owned behavior now.
3. Leaked-password protection is disabled. No Auth setting was changed. Consider enabling it if available for the project's plan; this is separate from signup/anonymous-sign-in controls. Reference: https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection .

Performance advisors report eight never-used indexes on the new empty tables. Retained the specified indexes; absence of workload is not evidence to remove them. Reference: https://supabase.com/docs/guides/database/database-linter?lint=0005_unused_index .

### Tracking and remaining hosted work

Checked only verified Phase 2 project/table/foreign-key/index/timestamp/status/RLS creation and database-role results denial tasks, plus the explicit hosted catalog/application checklist. The three original checks for anonymous active reads, successful anonymous submission, and authenticated instructor access remain unchecked because they require real data/API identity workflows. Also still pending: independently verify signup/anonymous Auth settings and confirmed instructor account/login; publishable-key/PostgREST/JWT behavior; valid/invalid/duplicate/post-close submissions and persistence; draft-only editing through the API; hosted lifecycle/concurrency tests; actual records/screenshots; and later browser/mobile/QR/performance checks.

Updated READMEs to stop claiming migrations are unapplied. Added Supabase CLI .temp/.branches cache paths to .gitignore after noticing its generated cli-latest cache; no generated runtime state should enter a future commit. No npm dependencies or application source changed in this pass. No commit, push, frontend implementation, deployment, Auth change, or unreviewed schema hardening was performed.

## 2026-11-02 — Hosted Phase 2 complete; testing stopped

User authorized hosted synthetic-data checks, private instructor login guidance, advisor review, and documentation only. Then explicitly requested finishing the record and stopping Phase 2 tests. From now on, keep checks focused on assignment requirements and affected features; do not repeat or broaden passed checks without a relevant change or failure. No commits or pushes are authorized.

### Verified results

Real instructor password login succeeded through a temporary loopback-only form. The confirmed, nonanonymous user's JWT stayed in memory. Passwords, email, access tokens and refresh tokens were not written to the repository or reports. The temporary session was signed out. The ignored URL/publishable-key configuration was removed; the completed helper process no longer runs. This helper is test infrastructure, not the Phase 3 login UI.

All **47 hosted API checks passed** using the publishable key and real instructor JWT. Four uniquely labeled synthetic surveys were used. Evidence: `supabase/verification/2026-11-02-hosted-api-tests.json`.

- Public Auth settings independently confirmed signup disabled, anonymous Auth disabled, email enabled, and other listed providers disabled. Actual synthetic signup and anonymous-Auth requests were rejected.
- Instructor draft CRUD, MC/TF question/choice creation, subsequent-request persistence, and result-data reads succeeded. These verify the database interfaces needed for export, not CSV generation or charts.
- Anonymous active-content reads succeeded; draft/closed content was hidden. Results/answers, direct writes, and instructor RPCs were denied. Direct instructor status changes were denied.
- Missing/malformed/duplicate/cross-survey answers, mismatched choices, invalid tokens, and inactive submissions were rejected without partial responses. Valid submissions persisted complete answers and timestamps. Same-token retries were rejected.
- Active/closed content remained immutable; reactivation was rejected. Archive preserved collected responses and questions. Previous active surveys closed automatically.
- Concurrent same-token submissions produced one complete response. Concurrent close/submission and edit/activation respected valid lifecycle ordering; requests after completed close/activation were rejected. Concurrent activation left exactly one active survey. This small race suite is not a classroom load test.
- The pre-existing rls_auto_enable event-trigger function rejected ordinary public RPC invocation with HTTP 400 / SQLSTATE 0A000.

Cleanup deleted only the four test-owned surveys and dependent records. An independent MCP query confirmed surveys=0, questions=0, choices=0, responses=0, answers=0; one nonanonymous Auth user and zero anonymous Auth users remain. No fixtures or new Auth users remain. Reports use UTC timestamps; the local work date was November 2 in America/New_York.

`npm run lint`, `npm run build` (TypeScript + Vite), and `npm run format:check` passed after adding the hosted test scripts. The helper retained runtime handles briefly after signout; added explicit termination after completed cleanup/signout, then lint and formatting checks passed again. The successful test assertions were unchanged; no repeated hosted run is required.

### Advisor disposition and actual blockers

There are **no actual Phase 2 blockers**. All original Phase 2 tasks and the specific hosted configuration/API tasks are now checked using the evidence above. Earlier pending-check lists in these notes are historical and superseded by this entry.

- App SECURITY DEFINER RPC exposure is intentional. Safe search paths, execution grants, authorization and validation were inspected and exercised through the real API. Retain required grants; no change is needed merely to suppress generic warnings. [Anonymous-function warning](https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable), [signed-in-function warning](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable).
- Pre-existing rls_auto_enable is an event-trigger helper, not an ordinary callable RPC; the actual API rejected invocation. Optional least-privilege cleanup would revoke PUBLIC/anon/authenticated EXECUTE while retaining and verifying its event trigger, in a separately reviewed migration. No third migration or grant change was applied. [Event trigger guidance](https://supabase.com/docs/guides/database/postgres/event-triggers).
- Leaked-password protection is disabled and requires Pro or above according to Supabase documentation. Enable it if already available; otherwise document the free-plan limitation and use a strong unique instructor password. No paid upgrade or Auth-setting change was made. [Password protection](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).
- Unused-index notices dropped from eight to two after the tests: surveys_status_idx and responses_submitted_at_idx. Retain them until representative queries justify removal. [Index advisory](https://supabase.com/docs/guides/database/database-linter?lint=0005_unused_index).

Final advisor evidence: `supabase/verification/2026-11-02-advisor-review.json`. Optional hardening/settings actions remain unchecked and do not block the assignment's next phase. Frontend login, survey workflows, CSV/charts, mobile/QR, required classroom performance, deployment, and submission screenshots are later assignment work, not outstanding Phase 2 failures.

Testing is stopped. No additional database/schema/settings changes, commits, or pushes were made during this verification pass.

## 2026-11-02 ? Phase 2 publication authorized

User authorized committing and pushing the completed Phase 2 work. This supersedes the earlier no-commit/no-push hold for the recorded migrations, tests, evidence, and documentation. Hosted testing remains stopped; publication checks are limited to staged-file review, secret-pattern scanning, whitespace, and repository state. Prior passing build/lint/format and hosted test results remain the verification evidence; no database tests or hosted changes are repeated for publication.

## 2026-11-02 ? Phases 3 and 4 frontend implementation

User authorized login/dashboard implementation according to the reviewed plan, later features explicitly unavailable, focused checks, user testing guidance, and TODO/notes updates. No commit or push. Phase 2 testing remained stopped; no hosted surveys, schema, Auth settings, or user accounts were changed.

### Implemented scope and decisions

- Added configured Supabase browser client using VITE_SUPABASE_URL/VITE_SUPABASE_PUBLISHABLE_KEY. Updated .env.example and README; local .env.local contains only the verified URL and publishable key and is ignored. No password, private key, or service-role key is stored. Missing configuration shows a clear setup message.
- Added Auth provider/context: restore session with getSession, subscribe synchronously to onAuthStateChange (no awaited Supabase operations in the callback), unsubscribe on unmount, and avoid stale initial-state overwrites. Auth state is for interface routing; actual authorization remains hosted RLS/RPC checks.
- Added /login with labeled email/password inputs, browser autocomplete, required validation, disabled in-flight controls, friendly incorrect-credential/confirmation/network feedback, and redirect of signed-in users to dashboard. Added landing-page Instructor Login link.
- Protected /dashboard waits for session initialization, redirects signed-out users to login, shows instructor email, and offers local-session logout. Unknown/future routes show an unavailable page rather than a broken screen.
- Dashboard loads survey metadata newest first, displays title/description/status/creation date, supports case-insensitive title search and status filtering, loading/error/retry/empty/no-match states, responsive cards and visible keyboard focus. Refresh reloads the authoritative data.
- Close (active only), Archive (closed only), and Delete (nonactive only) use existing backend operations. Native modal dialogs confirm each action and focus Cancel initially; Escape cancels unless a request is in flight. Delete warns of irreversible removal of all responses and recommends archiving. Buttons disable during mutation, errors stay friendly, success reloads data. Closed content stays immutable.
- New Survey, draft Edit, Activate, Duplicate and View Results are disabled with a visible coming-next explanation. These original Phase 4 tasks remain unchecked because editor/activation/results/copy workflows belong to Phases 5/6/9/12. No placeholder editor/result pages or fake actions were created. Phase 4 is intentionally partial at these documented dependencies.

### Focused verification

Added @playwright/test as a development dependency, playwright.config.ts, and five browser tests in tests/ui/dashboard.spec.ts. Tests launch installed Chrome headlessly, use an isolated dev server at 127.0.0.1:5174, inject dummy environment configuration, and intercept every request to the Supabase host. No live Auth credentials or database fixtures are used. Trace/screenshots are off and test artifacts are ignored. No additional database suite was run.

Final `npm run test:ui`: **5 passed** (14.6 seconds):

1. Signed-out protected redirect; friendly invalid login; successful login/email display; session restoration after reload; logout and blocked return to dashboard.
2. Four survey statuses, survey list, case-insensitive search/status intersection and no-match state; later-feature controls disabled.
3. Confirmation cancellation sends no mutation; Close/Archive/Delete call the intended API and update the displayed list; active surveys have no Delete action; irreversible-delete warning is present.
4. Empty dashboard and disabled creation; future route renders unavailable page.
5. API load failure/Refresh recovery and 390px mobile layout without horizontal overflow.

`npm run lint`, `npm run build` (TypeScript + Vite, 74 modules), and `npm run format:check` all exited 0 after final frontend changes. Installed development dependency audit still reports the same 13 moderate toolchain findings; no force upgrades or unrelated dependency fixes were performed.

The user independently tested the actual app at http://127.0.0.1:5173/login using their real account and replied ?All checks passed? for instructor login/email display, dashboard refresh persistence, logout, and signed-out /dashboard redirection. This validates live authentication and empty-dashboard behavior. Survey-card actions are browser-tested against mocks; their backend endpoints were already verified in Phase 2. No extra hosted mutation test was needed for this frontend pass.

### Issues found and corrected

- Windows Set-Content introduced a BOM in the ignored .env.local. Vite could read the key but not the first URL variable, causing the setup-required screen in both the first UI run and the user's first attempt. Rewrote the file as UTF-8 without BOM and confirmed loadEnv reads the URL. User then confirmed all real-login checks passed. Mock UI tests now provide explicit dummy env values and do not depend on private/local configuration.
- A test locator ambiguously matched success and loading status announcements together. Scoped it to the specific success message. A synthetic HTTP 503 activated SDK retries and exceeded the short alert assertion window; changed the focused UI-error fixture to a nonretrying HTTP 400. These were harness issues, not reasons to alter application behavior.
- Prevented the initial empty-state message from appearing alongside a failed load and ensured card titles can shrink/wrap on narrow screens.

### Progress and remaining work

Checked all Phase 3 tasks and nine independent Phase 4 tasks only after the checks above. Five dependent Phase 4 tasks remain open. Real student pages, QR/presentation, survey editor, copying, results/CSV UI, deployment and performance requirements are unchanged later work. Browser tests use synthetic sessions; the user's manual confirmation supplies actual password-auth evidence. No claim of full mobile/accessibility audit or classroom load testing is made.

Local dev server remains available at http://127.0.0.1:5173/ for the user. No commits or pushes were made. Future checks should remain limited to assignment requirements and affected features, as requested.

## 2026-11-02 ? Phases 3-4 publication authorized

User authorized committing/pushing the verified login and independent dashboard work, excluding local credentials and temporary files. This supersedes the previous publication hold for these changes. Publication review checks staged paths, secret patterns, whitespace, and repository state; prior passing focused browser/build/lint/format and user login checks remain the evidence. No completed test suite or hosted database operation is repeated. Dependent later-phase controls remain disabled and their tasks unchecked.

## 2026-11-02 ? Phase 5 survey editor and atomic draft saving

### Authorization and accepted implementation choices

User authorized Phase 5 implementation, addition/application of the draft-saving migration, focused checks, editor testing guidance, and TODO/notes updates. No commit or push. Later activation/presentation, duplication, results, and student UI remain unavailable.

New Survey and draft Edit are enabled on the dashboard. Protected editor routes are /surveys/new and /surveys/:id/edit. The editor supports title, optional description, dynamic MC/TF questions, dynamic MC choices, confirmed deletion/type replacement, and accessible Move up/down controls. Stable UUID keys preserve entered text during reordering. TF choices remain fixed True/False in positions 1/2. Incomplete counts are allowed in drafts, but entered title/question/choice text must be nonblank; the UI explains that blank records must be filled or removed. This retains Phase 2's accepted distinction between draft validity and stricter activation completeness.

Unsaved work is protected using React Router's data-router useBlocker for in-app/back navigation and beforeunload for refresh/tab close. Converted the top-level BrowserRouter wrapper to createBrowserRouter/RouterProvider; the existing route protection and login checks passed afterward. Cancel preserves edits, successful save clears dirty state, and discard/type/deletion actions require explicit confirmation. The save button and editor fields disable during a request; a synchronous ref prevents duplicate submissions before rerender. Conflicts preserve local text and offer a confirmed reload; other failures preserve the complete form for retry. No autosave or local draft-content persistence was added.

### Applied migration and safety properties

`supabase/migrations/20261103005809_save_draft.sql` was first verified in disposable local PostgreSQL, then applied through MCP to the reverified project hmrtffcpoyksnwdquyow. Preflight confirmed the intended URL, five existing public tables and the original two migration-history entries. apply_migration(save_draft) returned success. Hosted history assigned version 20261103005809; renamed the local migration to match without changing SQL bytes. UTC version date is November 3; local work date remains November 2.

The authenticated-only SECURITY DEFINER save_draft_survey function has an empty search_path and uses the existing explicit instructor guard. It atomically saves metadata, questions, choices, deletions and consecutive positions while preserving IDs. It validates UUID uniqueness/parent membership, types/text/TF structure before writes, uses deferred ordering constraints for swaps, and locks the parent survey against activation or concurrent saves. It rejects active/closed/archived content and missing/deleted survey versions.

Optimistic concurrency compares expected_updated_at to the locked survey version. Two new private after-triggers touch the survey timestamp on question/choice changes, so direct child edits also invalidate stale tabs. The save returns the final version after all child changes, not the earlier metadata-only version.

A private operational table, draft_save_receipts, records request UUID, survey UUID, instructor UUID, exact request payload and result. It has RLS enabled and no browser table access; it is not an additional public application entity. New survey UUID is generated once in the editor. Unchanged uncertain retries reuse request/survey IDs; an exact retry returns the same result without inserting a duplicate survey. Changed payload under the same request ID is rejected; retrying an old request after a newer save is also a conflict. Receipts cascade when the survey is explicitly deleted. They persist with the draft otherwise; no unrequested cleanup/retention job was added.

### Focused verification and evidence

- `node scripts/test-database.mjs --draft-only`: all three migrations applied to fresh isolated PostgreSQL; **25 draft-save SQL assertions passed**. Coverage: anonymous/missing-identity denial, complete atomic creation, exact retry, request reuse rejection, stable question/choice ordering, returned final version, stale-writer rejection, validation preservation, private-receipt denial, injected late choice-write failure rolling back metadata/version/choices, omitted-question/choice deletion, direct child edit invalidating versions, incomplete draft save/activation rejection, cross-survey IDs, active/closed save rejection, receipt cleanup.
- Added two local concurrent-session checks: simultaneous same-request creation yields one survey/one receipt; two saves with the same expected version yield one winner and one DRAFT_CONFLICT. Both passed. The script's draft-only option avoids repeating unrelated Phase 2 suites. Added npm run test:draft-db.
- Hosted catalog check: anon RPC execute=false; authenticated execute=true; receipt RLS=true; authenticated receipt read=false; both version-touch triggers enabled.
- Hosted synthetic transaction under authenticated SQL role with the actual instructor's claim interface passed create, exact retry, reorder, conflict, validation-preservation and receipt-cleanup assertions, then ROLLBACK. This verifies hosted function behavior, not password/JWT validation. No persistent synthetic rows were created by this agent check, and no user-owned draft was deleted. Real browser save/reload guidance was sent separately.
- **Nine affected Playwright tests passed (16.1 seconds)**: four new editor scenarios cover reorder/save/reload/text/ID preservation, field validation/TF/deletion, uncertain retry ID reuse, conflict retention/unsaved navigation/non-draft rejection. Five existing auth/dashboard tests were updated only where New Survey/Edit availability and route wiring changed. Shared mocks live in tests/ui/helpers.ts; they intercept Supabase requests and do not mutate hosted data.
- npm run lint, npm run build (TypeScript + Vite, 77 modules), and npm run format:check exited 0. Vite reports a nonfatal >500 kB main-chunk warning (~553 kB minified/~160 kB gzip). No unrelated performance tuning was attempted; measure the assignment's load target with later deployment checks before deciding on code splitting.

Evidence summary is `supabase/verification/2026-11-02-phase5-draft-save.json`. The private receipt permissions and migration history were independently inspected after application. Supplied assignment/spec files and original applied migrations were preserved.

### User test guidance and progress

Asked the user to create ?Phase 5 editor check,? add/reorder questions and choices, save/reload, reopen through dashboard Edit, try fixed TF choices, save again, and test unsaved-navigation Cancel. The dev server remains at http://127.0.0.1:5173/dashboard. User confirmation is currently pending and has its own unchecked task; no manual result is invented. Any test draft the user creates is theirs to keep/delete through the UI.

Checked Phase 5 implementation tasks based on automated/local/hosted verification, and the previously deferred New Survey/Edit tasks in Phase 4. Activate, Duplicate and Results remain disabled and unchecked. No login/password/account changes or credentials in reports. No commits or pushes.

User subsequently replied ?All editor checks passed? to the guided real-browser create/edit/order/save/refresh/TF/unsaved-navigation test. Checked that task and updated the evidence summary. This supersedes the pending-manual-check statement above. Phase 5 verification is complete; testing stopped. No commit or push was made.

## 2026-11-02 ? Phase 5 publication authorized

User authorized committing/pushing verified Phase 5 work, excluding credentials and temporary files. This supersedes the earlier publication hold for the editor, applied migration, focused tests, evidence, and notes. Publication review is limited to staged-file/secret-pattern/whitespace checks and repository state; no completed tests or hosted operations are repeated.

## 2026-11-02 ? Phases 6-8 activation, QR presentation and public submissions

### Scope and implementation

User authorized implementation according to the reviewed plan, focused checks, real workflow guidance, and TODO/notes updates; no commit or push. Reused the already applied/verified activation, close, availability, and transactional submission RPCs and uniqueness constraints. No schema/function/permission/Auth-setting changes or new migrations were needed. No agent-created hosted test fixtures or backend test-suite reruns in this pass.

- Added reusable ActivateSurvey confirmation/action with friendly validation errors. Activation on dashboard is enabled for drafts, closes any previous active survey via the existing atomic RPC, and navigates to protected /surveys/:id/present. The confirmation explains automatic closing and immutable collected content. Editor activation requires a saved clean draft; unsaved changes must be saved first. Invalid/incomplete drafts stay put with actionable feedback.
- Presentation shows the title, large 640px PNG QR rendered responsively, readable/clickable public URL, Copy URL, downloadable PNG, response count, confirmed Close Survey and dashboard return. Current window origin forms the public URL, so a deployed site's QR uses that site's origin. A localhost notice explains the phone limitation. View Results remains disabled.
- Presentation reads instructor-authorized survey metadata plus HEAD/exact-count responses; it does not fetch student answer rows. It polls every five seconds while visible, avoids overlapping polls, refreshes on visibility/manual refresh, cancels requests/timers on unmount, and stops active polling once closed. Close removes QR and shows a no-longer-accepting message. Poll/copy/QR/close failures have helpful messages.
- Public /s/:slug is enabled with no login, navigation menu or instructor controls. It loads active survey/question/choice data and sorts saved positions. The separate publicSupabase client uses a unique storage key, persistSession=false, autoRefreshToken=false and detectSessionInUrl=false; it never inherits an instructor's stored session, even when previewed in the same browser. The instructor client and backend authorization are unchanged.
- Public UI renders MC/TF as labeled radio groups with large touch targets, required-answer validation per question, disabled in-flight controls, and friendly loading/error/retry, missing, closed, success and duplicate states. It calls submit_survey_response only. Success follows server confirmation; network/uncertain failures retain selections and allow retry, and raw database exceptions never appear to students. Closing after the form loads is enforced by RPC on submission.
- Random UUID token is persisted per survey in localStorage, with a separate per-survey successful-submission marker. Marker is written only after confirmed success/server duplicate; token/database uniqueness remain authoritative if marker writes fail. Before each submission, reread marker/token to reduce accidental cross-tab initial-token races. A synchronous pending ref prevents UI double submits. Blocked/corrupt storage prevents submission rather than silently losing duplicate protection. Clearing storage/changing browser/profile/incognito session bypasses this accidental-repeat protection by design; no student identity/account is claimed.
- Duplicate and View Results remain clearly unavailable. Presentation/student routes follow the agreed /s/:slug naming; updated the original TODO's :surveyId parameter wording with the approved naming clarification.

### Focused checks

Added seven browser scenarios in tests/ui/student-presentation.spec.ts using mocked Supabase requests and no real credentials. Updated dashboard tests only for the now-enabled Activate control. Editor's dirty-draft Activate remains disabled as expected. Initial affected-suite run: 14 passed and two fixture failures; corrected only those fixtures, then reran those two and both passed. In total **all 16 affected scenarios passed**, including nine existing auth/dashboard/editor scenarios and these seven new ones:

1. Activation confirmation/handoff, correct public URL, generated QR image, downloaded PNG filename, foreground count polling, confirmed closing and QR removal.
2. Friendly incomplete-draft validation without navigation.
3. Anonymous 390px mobile required-answer flow, ordered answer payload, successful submission, persistent UUID, and refresh showing Already submitted without another request.
4. Uncertain accepted response preserves selections; a retry uses the same token and server duplicate handling shows Already submitted.
5. Close-before-submit rejection, closed-link reload and missing-link state.
6. Public read error retry and blocked-storage denial of Submit.
7. Protected presentation route plus anonymous student submission while the same browser has an instructor session. Assertions confirm no instructor token on student submission.

Fixture corrections: mocked HEAD count responses needed Access-Control-Expose-Headers for content-range to model Supabase's real CORS response; without it the SDK could not read the synthetic count. The storage/error test attempted a retry button after reload had already recovered the page; changed the test to retry first, then block storage/reload. Neither issue required changing production behavior.

Final npm run lint, npm run build (TypeScript + Vite, 110 modules), and npm run format:check passed. The existing nonfatal large-chunk advisory remains (~589 kB minified/~173 kB gzip); production load-target measurement is still later assignment work, not inferred from build time. No unrelated performance tuning or repeated Phase 2/5 database suites were run.

Prior Phase 2 actual hosted tests already established the single-active invariant, automatic handoff, submission validation/atomic storage, and unique survey/token behavior. This pass wires those interfaces to the product UI; no backend rewrite was introduced. Evidence summary: tests/ui/phases6-8-verification.json.

### Manual workflow and outstanding device check

Guided the user at http://127.0.0.1:5173/dashboard to create a complete ?Phase 6?8 check? draft, save, activate, open the public link in an incognito window without login, submit, refresh for Already submitted, return for the increased count, download PNG, close, and reload the student link for closed state. User confirmation is currently pending and is separately unchecked; no manual pass is invented. Any user-created test survey/responses are theirs to retain/delete; the agent did not delete or alter their existing surveys outside normal UI instructions.

Actual phone QR scanning is **not verified**: localhost on a phone targets the phone, not this computer. It requires a reachable HTTPS deployment/shared address and remains an explicit later device/deployment test. This is a test-environment dependency, not a claim of broken QR generation. The 200-student load requirement, results/charts/CSV, duplication, deployment and submission evidence remain later work.

Checked implemented Phase 6/7/8 tasks using the focused UI checks plus existing backend evidence, enabled Phase 4 Activate, and left live manual confirmation/device verification separate. No commits or pushes were made. Keep further checks focused on assignment requirements and affected features.

User reported question headings straddling the student-card top borders on the laptop. Moved panel styling from the semantic fieldset to an outer wrapper, keeping accessible legends inside with aligned padding and spacing. The focused mobile required-answer/submission/duplicate browser scenario passed after this layout-only fix (1 test, 5.7 seconds). Live manual workflow remains pending; no broader suites rerun or commit/push made.

User subsequently confirmed ?Layout and workflow passed? for corrected student-card headings and the guided live desktop activation, anonymous submission, duplicate refresh, presentation count, QR download, close and closed-link checks. Checked the live desktop task and updated its evidence report. This supersedes the earlier pending-manual statements. Actual phone QR scanning remains unchecked until a reachable HTTPS URL is available. Phases 6-8 desktop verification is complete; testing stopped. No commit or push was made.

## 2026-11-02 ? Phases 6-8 publication authorized

User authorized committing/pushing the verified activation, QR presentation, public submission and duplicate-protection work. The laptop layout issue is recorded above: native fieldset legends overlapped card borders; moving the visual panel to an outer wrapper placed headings inside with consistent alignment while preserving semantic radio-group labels. The focused layout/submission check and user confirmation passed. Publication excludes local credentials and temporary artifacts. No completed tests or hosted operations are repeated. Phone QR scanning remains pending a reachable HTTPS URL.

## 2026-11-02 ? Phases 9-11 results, history and CSV completed in order

User authorized implementation in the reviewed order, documented decisions, focused checks, manual guidance, and notes/TODO updates; no commit or push. Built the protected results page first, then historical creation-date filtering, then CSV export. Reused the existing instructor Supabase client and RLS-protected tables; no new migration, RPC, permission change, hosted fixture, or backend test-suite repetition was needed.

### Decisions and resulting behavior

1. Results percentages use all captured submitted responses as the denominator, rounded to one decimal; zero responses gives 0.0%. Unanswered counts captured responses without a valid choice for that question, including missing/unavailable historical choices. Tables display every count/percentage and unanswered count, with Recharts bars as a complementary visual; meaning does not depend on color. No live/realtime results were added; Refresh Results reloads.
2. Historical date filtering means inclusive **survey creation dates in the browser's local timezone**, not submission timestamps. It combines with existing title/status filters; invalid intervals have a clear message and Clear filters resets all controls. View Results works for Closed and Archived surveys. Filtering/reading never alters history.
3. CSV contains one row per response. Repeated metadata columns: survey_id, survey_title, survey_description, survey_status, survey_created_at; then response_id, submitted_at, and numbered question-text columns in saved order. Numbering disambiguates duplicate question texts. Answer cells contain choice text, unanswered cells are blank, timestamps use ISO UTC, and zero responses yields headers only. Anonymous browser tokens are neither queried nor exported. Every cell is quoted/escaped; CRLF rows and UTF-8 BOM support spreadsheets. Formula-like text (including after leading whitespace) and leading tab/newlines are prefixed with an apostrophe so the export treats them as text.

### Data access, consistency and interface

Added src/lib/results.ts to load explicit ordered 500-row pages for questions/responses and batches of 100 IDs with 500-row pages for choices/answers. This prevents silent truncation at the Data API's default cap. Response IDs are captured/deduplicated once; counts, tables, charts and CSV all use that set. A draft revision change during loading is detected using updated_at. Page failures do not replace displayed data with a partial result; exports stay disabled during loading or after a failed refresh. Metadata, zero/empty states, manual refresh, dashboard return and active-only Present QR are provided. Results/CSV remain protected routes and queries under the existing instructor authorization.

Independent REST requests are not a database-wide transaction snapshot. Concurrent submissions during/after loading can require another Refresh; this limitation is explicit in README. Existing captured response IDs keep related answer/export calculations consistent. Draft content can change only under the prior version controls and is checked again before committing the loaded dataset to the UI.

Added pure result-summary.ts, history.ts and csv.ts helpers plus a lazy-loaded ResultsPage. Recharts is fetched on entering results instead of added to the student page's initial bundle. Enabled View Results on dashboard and presentation; Duplicate remains disabled. Dashboard survey loading now uses the same pagination helper so historical filters are not limited to the first default page.

### Focused checks and problems resolved

Added tests/ui/results.spec.ts with six browser scenarios plus one pure calculation/CSV scenario, and updated the five affected dashboard scenarios only where labels/availability changed. Initial run: eight passed, four failed in the test harness. The mock parser omitted the dot in PostgREST's in.(...) syntax, dropping the first question/response ID and producing incomplete synthetic answer data. Corrected that parser. Cold lazy Recharts loading under eight parallel dev-server workers exhausted short route assertions; added explicit route-readiness waits and reran only the four affected tests with two workers. All four passed (12.2 seconds). No production behavior was changed to conceal the fixture failures.

All **12 affected scenarios passed across focused runs**:

- Known 2/3 and 1/3 counts show 66.7%/33.3%, unanswered historical data is labeled, manual refresh updates totals, and archived results remain accessible.
- Zero-response empty state and header-only CSV; page failure blocks partial export and successful Refresh recovers.
- 1,205 synthetic responses with six questions/7,230 answers load through response offsets 0/500/1000 and answer pages beyond 500; final counts are complete.
- Inclusive local creation-date boundary (UTC timestamp falling on the prior New York date), combined title/status filters, invalid interval and Clear filters.
- Downloaded CSV filename, metadata, UTC timestamps, question order, quotes/commas/embedded newlines/Unicode, formula prefixes, one row per response, and no anonymous tokens.
- Protected results route; five affected auth/dashboard/filter/mutation scenarios remain passing.

npm run lint, npm run build (TypeScript + Vite, 692 modules), and npm run format:check exited 0 after the final code changes. Results has its own lazy chunk (~362 kB minified/~105 kB gzip). The previously known main-chunk advisory remains (~593 kB/~175 kB gzip); no broad performance tuning or unmeasured page-load claim was added. No unrelated database/editor/student suites were repeated.

### Actual user verification and completion

Guided the user through existing real survey results/counts/percentages/Refresh, dashboard title/status/date filters and Clear filters, Closed/Archived access, exporting and opening CSV in a spreadsheet to check metadata, row count, timestamps and answers. User replied **?Results/filtering and spreadsheet CSV passed.?** Recorded the spreadsheet application as unspecified rather than inventing Excel usage. This supplies the manual spreadsheet-open evidence beyond string/download checks. No credentials or real response content were copied into repository files.

All original Phase 9, 10 and 11 tasks, the Phase 4 View Results action, and their focused verification tasks are now checked. Evidence: tests/ui/phases9-11-verification.json. Testing is stopped. Later duplication, actual phone QR/deployment, classroom performance and final submission tasks remain outside this pass. No commits or pushes were made.

## 2026-11-02 ? Active results confirmation and Phases 9-11 publication

User supplied a spreadsheet screenshot showing the expected metadata/timestamp/question columns and one row per response, then explicitly confirmed that results refresh worked while the survey remained active. Recorded both confirmations in the verification report and checked the active-refresh task. User authorized committing/pushing the verified Phases 9-11 work, excluding credentials and temporary files. Publication review checks staged paths, secret patterns, whitespace and repository state only; completed suites and hosted operations are not repeated. Excluded an incidental formatting-only change to the prior phase evidence.


## 2026-11-03 ? Phase 12 survey duplication

Implemented Duplicate on every dashboard survey status. Reads title/description and explicitly ordered question/choice pages under existing instructor access, checks source updated_at again, then assigns fresh survey/question/choice UUIDs and saves ?Copy of [title]? through the existing save_draft_survey RPC. No migration or new permissions are needed. That RPC creates an atomic Draft with null public_slug; only activation later creates a public identifier. The duplication reader never queries responses, answers or browser tokens, and the saving operation only writes draft content. The source is never updated.

Decisions: preserve question type, text, choice order and description; allow the existing incomplete-draft rules; redirect the confirmed copy to its editor. A source revision change during loading fails before saving and asks for another attempt. A synchronous pending guard prevents repeated clicks. Once content is loaded, retain the new IDs, request ID and exact payload for Retry duplication after an uncertain response, so the database receipt recovers the same copy. Retry recovery applies while this card remains mounted; navigating away or reloading discards that in-memory attempt. If unsure after leaving the page, inspect the dashboard for the copy before starting another duplication.

Focused verification: tests/ui/duplication.spec.ts covers content/types/order/description, unique fresh IDs, null expected version, Draft/public-slug contract, editor redirect, no response/answer reads, unchanged source fixtures, a lost save response with byte-equivalent retry payload, and changed-source rejection without a save. All three passed alongside five affected dashboard scenarios (8 total, 13.9 seconds). These browser mocks verify the client contract; hosted zero-response/source-preservation evidence remains the manual check below. Existing transactional draft-save SQL checks already cover the unchanged RPC; no unrelated hosted test suites or new database mutations were run.

Initial lint overlapped Playwright cleanup of its temporary output directory and encountered a missing-directory traversal error; reran after browser completion. Lint then identified a render-time ref read and loose test types, both corrected with state and explicit types. Final lint passed. Build passed (694 modules); the existing main chunk size advisory remains (~595 kB minified). No credentials, dependencies or original specification files changed. User screenshot files remain untouched and untracked.

Requested one manual test: duplicate a Closed survey with responses, confirm Copy of naming/content/order, rename/save the copy, verify Draft and zero results, then verify the original title/status/response count. Awaiting user confirmation; that TODO stays unchecked. No commit or push performed.

Final rerun after lint fixes: three duplication scenarios passed (10.2 seconds), build and changed-file formatting passed; git diff --check passed. Full format:check still reports pre-existing formatting warnings in tests/ui/phases6-8-verification.json and phases9-11-verification.json, which this phase does not change. Evidence: tests/ui/phase12-verification.json. Local dashboard returned HTTP 200 for the guided manual check.

### Phase 12 manual verification completed

User confirmed ?All duplication checks passed? for the guided hosted test: duplicate a Closed survey with responses, verify copied title/description/questions/types/choice order, rename and save the editable Draft, confirm zero responses on the copy, and confirm the original title/status/response count remain unchanged. Checked the remaining manual verification task and updated tests/ui/phase12-verification.json. Phase 12 verification is complete; no additional tests, commits or pushes performed.

### Phase 12 publication

User authorized committing and pushing the verified Phase 12 work. Publication includes only duplication code, affected dashboard tests, TODO, development notes and the verification report. Local environment credentials, temporary browser/build artifacts and the four user screenshot files are excluded. Reviewed staged paths, whitespace and credential patterns; existing focused automated and user verification results are retained without rerunning unrelated tests.


## 2026-11-03 ? Phase 13 usability and accessibility review

Reviewed the nine Phase 13 tasks against current pages. Shared page/panel/button/input styles, loading indicators, empty states, friendly error messages, destructive confirmations, readable URL/response count, 640px QR image rendered up to 480px and QR PNG export already exist. Retained those working layouts and behavior. No redesign, dependency changes, database migrations or hosted test-data operations.

Remaining gaps fixed:

- Added a keyboard-visible Skip to main content link and focusable main landmarks. Navigation waits for asynchronous page headings, sets a descriptive document title, and focuses the heading when focus is on the body. It avoids stealing focus from a user who already began interacting while a page loaded. Corrected the lazy-results loading punctuation.
- Student missing-answer validation focuses the first unanswered radio and associates each invalid radio with its error text. Terminal submission states focus their heading and update the title. Draft validation similarly focuses the first invalid title/question/choice field; existing field error associations remain.
- Editor dialogs now associate their descriptive warning. Both dialog components explicitly restore focus to the triggering control after cancellation, or to main if the trigger was removed. Existing Cancel-first focus, native modal semantics and Escape behavior remain.
- Nested fieldsets have min-width: 0; question move controls wrap; long panel/dialog text wraps anywhere; dialogs scroll within 90dvh. These prevent narrow-screen overflow without rearranging page designs.
- Shared input borders changed from slate-300 to slate-500; explicit slate-500 placeholders remain readable. A computed sRGB luminance check confirms the input boundary exceeds 3:1 against its white background. Existing dark text, badges, error colors and blue focus outlines retained.
- Disabled Recharts' keyboard accessibility layer inside already aria-hidden duplicate charts, so hidden graphs do not create keyboard stops. The visible captioned tables retain all counts and percentages.

### Focused evidence and corrections

Added four tests in tests/ui/accessibility.spec.ts: keyboard login/route heading/title/skip link; 320px editor validation/dialog description/Tab/Shift+Tab/Escape/focus restoration; 320px student long-text/required-error/radio arrow keys/keyboard submission/completion; and projected QR size plus 320px long-title dialog, survey-action focus restoration and computed input contrast. Extended the existing results-count test to verify no hidden chart keyboard stops and that results fit at 320px after ResizeObserver completes.

Initial keyboard test assumed reverse Tab from the first control would directly wrap to the last control; adjusted the assertion to exercise forward/backward movement within the native dialog. The subsequent Escape assertion exposed the actual lost-trigger-focus issue, fixed in both dialog components. Results' first immediate post-resize measurement observed the chart before ResizeObserver resized it; changed that assertion to wait for the resulting layout, which passes without changing chart behavior.

All 18 distinct affected scenarios passed across focused runs: four new accessibility scenarios, four existing editor scenarios, seven existing student/presentation scenarios, two dashboard mobile/error/mutation scenarios and one results/counts/refresh scenario. Reran only failures or checks affected by final changes. Final build passed (695 modules), lint passed, changed source/test formatting passed and whitespace review passed. Existing Vite main-chunk advisory remains (~597 kB minified/~175 kB gzip); pre-existing formatting warnings in historical phases6-8/phases9-11 JSON reports remain outside this change.

Evidence: tests/ui/phase13-verification.json. Checked Phase 13 tasks only after review and relevant verification. These are automated Chrome keyboard/layout checks, not a claim of a complete screen-reader or WCAG audit. Actual phone QR scanning, a second browser, deployment/deep links and performance/submission tasks remain in later phases. User screenshots and local credentials remain untouched. No commits or pushes performed.

### Phase 13 publication

User authorized committing and pushing the verified Phase 13 work. Publication includes usability/accessibility changes, affected tests, TODO, notes and the verification report. Explicitly excluded environment credentials, temporary browser/build artifacts and the four user screenshot files. Reviewed staged paths, whitespace and credential patterns; retained completed focused verification without repeating unrelated tests.
