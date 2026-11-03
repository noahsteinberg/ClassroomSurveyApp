# AI development history

Prepared November 3, 2026 for the CSE 4095 Classroom Survey App assignment.
This is an AI-assisted summary of the actual development notes, recorded test
evidence, Git history and student-agent interactions. It is not a verbatim chat
export or the student's separate 1-2 page development report. It does not invent
personal learning reflections or unperformed work.

Repository: https://github.com/noahsteinberg/ClassroomSurveyApp

Public app: https://classroomsurveyapp.pages.dev/

## How the student directed the agent

The student began with an empty repository and the assignment plus five supplied
Markdown specifications. The initial request was to read every document, follow
the supplied TODO, reset inherited checkmarks, identify unclear requirements and
add missing testing/submission tasks before implementing anything. The agent
recorded decisions and verification in [development-notes.md](development-notes.md).

Development proceeded in reviewed phases. The student repeatedly requested a plan
before code, then separately authorized implementation, focused checks and later
commits/pushes. The student asked the agent to preserve specifications, exclude
credentials/temporary files, verify tasks before checking them off, reuse existing
database access and stop repeating unrelated tests. Later features stayed visibly
unavailable until implemented. The student performed private account setup, real
browser/device tests and deployment actions rather than relying only on generated code.

## Specification review and accepted decisions

The agent identified conflicts and missing details; the student authorized the
documented implementation choices before dependent work:

- Use React/TypeScript/Vite/Tailwind for the frontend and Supabase Auth/PostgreSQL
  for persistent data. Cloudflare Pages hosts the static frontend; the browser
  calls Supabase APIs directly under database access controls.
- Provision instructor accounts privately, disable public signup and anonymous
  Auth, and use one trusted shared instructor workspace. Students do not log in.
- Edit drafts only. This follows the assignment's draft-editing requirement and
  deliberately changes the original TODO's suggestion of editing after closure.
  Duplicate collected surveys into new drafts to preserve historical meaning.
- Allow Draft -> Active -> Closed -> Archived, with one active survey. Activation
  closes any previous active survey atomically. Do not reactivate collected surveys.
- Use `/s/:slug`, require an answer to each question, and validate MC/TF choices in
  the database. Use browser UUID tokens plus database uniqueness for accidental
  duplicates; clearing storage or changing browsers can bypass that protection.
- Poll the presentation count every five seconds while visible; refresh results
  manually. Calculate percentages against all captured submitted responses, with
  one-decimal rounding and explicit unanswered/zero behavior.
- Export one CSV row per response with repeated survey metadata, UTC timestamps
  and ordered numbered question columns; exclude browser tokens and protect
  formula-like text. Filter history by local survey-creation dates.

## Implementation and interaction history

| Work | Student guidance/actions | Agent implementation and verification |
| --- | --- | --- |
| Phase 1: setup | Supplied the empty GitHub repository; requested `.gitignore` before setup, preservation of specs and dependency review without forced upgrades. | Created the frontend/toolchain, connected Git, ran build/lint and reviewed audit findings. Documented the existing development-tooling advisory instead of forcing incompatible changes. |
| Phase 2: database/security | Reviewed instructor access/editing/submission decisions; created the Supabase project and instructor privately; initially prohibited applying migrations, then explicitly authorized them. | Prepared/applied schema and security/RPC migrations, relationships, RLS, grants and transactional validation. Ran isolated SQL/concurrency checks and 47 hosted Auth/PostgREST checks with synthetic fixtures and cleanup. Reviewed advisor warnings. |
| Phases 3-4: login/dashboard | Tested real login, displayed identity, refresh persistence, logout and signed-out dashboard redirect; reported a connection-setup problem. | Implemented auth/protected routes, dashboard filters/actions and friendly states. Fixed environment configuration; confirmed the student subsequently reported all guided checks passed. |
| Phase 5: draft editor | Requested question/choice ordering and safe saving, authorized the draft-save migration, and confirmed editor/reorder/save/reload/TF/unsaved-warning checks. | Built the editor and atomic draft-save RPC with stable IDs, optimistic version checks, retry receipts, validation and rollback/concurrency tests. |
| Phases 6-8: activation/student flow | Tested activation, anonymous submission, duplicate refresh, count, PNG download and closure. Reported that question text was positioned incorrectly on laptop cards. | Reused existing lifecycle/submission RPCs, added QR presentation and student UI. Moved visual card styling outside fieldsets so legends sat inside cards, preserving semantic radio groups. Student confirmed layout and workflow passed. |
| Phases 9-11: results/history/CSV | Requested implementation in order using existing database access; confirmed results/filtering, spreadsheet CSV opening and active-results refresh. | Added paginated results, counts/percentages/charts, local-date filters and escaped CSV. Used known synthetic counts, zero/unanswered data and a 1,205-response pagination fixture. |
| Phase 12: duplication | Requested a new draft with copied questions/choices and no responses; confirmed the copy was editable with zero responses and the original unchanged. | Enabled duplication with new IDs and existing atomic draft-save RPC; tested ordering, redirect, source-change rejection and identical-request retry recovery. |
| Phase 13: usability/accessibility | Requested only remaining gaps, no redesign, with focused checks. | Added skip navigation, route titles/focus, validation focus, dialog descriptions/focus restoration, narrow-layout fixes and stronger input borders; removed hidden chart keyboard stops. Recorded 18 affected scenarios passing across focused runs. |
| Phase 14: evidence review | Requested missing checks only, leaving deployment/phone work pending; performed a real Edge login/results/CSV/logout check. | Reused prior evidence; added expired/revoked-session, rapid-submit and tablet checks. Four new Chrome scenarios and twelve targeted Edge scenarios passed. |
| Phase 15: deployment | Requested preparation before deployment, asked which Cloudflare screen/settings to use, then authorized publication of preparation and personally deployed. | Updated README, pinned Node 22.23.4, verified clean Linux install/build and production-bundle smoke checks. Guided the student from Workers setup to Pages and checked the public app/build log. |
| Public/device verification | Confirmed the full public workflow and physical QR test on iPhone 17 Pro, iOS 26.6.1, Safari, over Wi-Fi and cellular. Confirmed saving the corrected Supabase Site URL. | Recorded observed checks separately from user confirmations. Cloudflare log showed deployment of `3cd5412`. An independent Auth URL reread was stopped with Escape, so the correction remains user-confirmed. |
| Performance review | Authorized isolated synthetic checks, then requested retention of original measurements, no performance changes and an end to testing. | Ran 200 overlapping anonymous API submissions and 60 public page-load samples, verified durable counts/cleanup, disclosed the two slow outliers and made no proposed optimization. |

## Actual debugging and verification limits

The configuration problem during login was resolved before the student repeated
the test. The notes document a UTF-8 BOM issue that could hide the first Vite
environment variable. The student-reported fieldset/card heading issue was fixed
and explicitly confirmed by the student after refreshing and finishing the workflow.

Some failures were test-harness issues, not production bugs: result fixtures parsed
PostgREST `in.(...)` incorrectly, and cold lazy-loading assertions needed route-ready
waits. The agent corrected the harness and reran affected checks. Accessibility
testing also exposed actual missing dialog-trigger focus restoration, which was
fixed in both dialog components. These distinctions were retained in the notes.

The student configured external services, privately supplied instructor login when
needed, tested the generated features, identified visible problems, captured the
screenshots and operated the Cloudflare deployment UI. The agent generated the
application code, SQL migrations, test helpers and documentation, while the student
controlled scope, decisions, publication and acceptance checks. This history does
not claim the student manually wrote the generated application code.

## Measured outcomes and retained limitations

- Hosted security evidence includes restricted student access, rejected invalid
  submissions, durable records, one-active/concurrent lifecycle behavior and cleanup.
  Browser mocks are identified as mocks rather than substituted for hosted evidence.
- The capacity test used one isolated test-owned two-question survey in the existing
  Supabase project, not a separate project or 200 physical browsers. All 200
  overlapping API clients succeeded; reads confirmed 200 responses/400 answers,
  p95 submission latency 1437ms and removal of the owned data afterward. Other
  survey metadata stayed unchanged.
- All cold page-load means were below two seconds: student 521ms, dashboard 554ms,
  results 1472ms. Two successful warm-results samples took 5016ms and 8529ms,
  producing a 2289ms warm-results mean. Their cause is unknown. All original
  samples remain; 58/60 were below two seconds, but the overall target is not fully
  met. The student requested no performance changes and stopped testing.
- The corrected Auth Site URL is user-confirmed, not independently reread. The
  last dashboard-confirmed deployment revision is `3cd5412`; subsequent Git pushes
  may trigger Pages builds, and a newer deployment was not independently inspected.
- Existing development-tooling audit and bundle-size advisories are documented.
  No forced dependency upgrade or redesign was performed to conceal them.

## Evidence and publication checkpoints

Detailed evidence is in [development-notes.md](development-notes.md), `tests/ui`,
`supabase/verification`, `supabase/tests` and `tests/deployment`.

Representative commits connect the implementation history to the repository:

| Commit | Checkpoint |
| --- | --- |
| `b8aa3ff` | Database/security work |
| `68071d1` | Login/dashboard |
| `87dd5f1` | Draft editor and atomic saving |
| `d08bf23` | Activation/QR/student workflow |
| `8389d2c` | Results/history/CSV |
| `7a4b3a3` | Duplication |
| `cb49e20` | Usability/accessibility |
| `8586822` | Phase 14 evidence and cross-browser checks |
| `3cd5412` | Verified deployment preparation |
| `630069e` | Public deployment evidence and original performance measurements |

Commits and pushes were made after explicit student authorization. Credentials,
session tokens and temporary artifacts were excluded. The four screenshots were
reviewed locally and remain separate submission evidence; they were not included
in those publication checkpoints. The student's report and final HuskyCT submission
are separate tasks and were not written or submitted by this history summary.
