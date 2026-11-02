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
