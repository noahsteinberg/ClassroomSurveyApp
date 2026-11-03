# Phase 2 database preparation

Both reviewed migrations were applied through MCP to project
`hmrtffcpoyksnwdquyow` on November 2, 2026. Hosted schema, RLS, and permissions
were inspected; 47 real Auth/PostgREST synthetic-data checks subsequently passed.
No credentials are needed for the isolated local database tests.

## Accepted rules

- Every manually provisioned Supabase Auth user is a trusted instructor. Use
  email/password, disable public signup and anonymous Auth sign-ins, and do not
  create student Auth accounts. This is a single-instructor/shared-workspace model,
  not separate instructor ownership or tenant isolation.
- Edit drafts only. Closing a survey does **not** make its title, description,
  questions, or choices editable. Duplicate it into a new draft to change it.
  This deliberately replaces TODO's original close-then-edit instruction, following
  the assignment's draft-editing requirement and preserving historical results.
- Lifecycle: draft -> active -> closed -> archived. No reactivation. Activating a
  draft closes the previous active survey in the same transaction. Close before
  explicitly deleting an active survey; archive preserves data, delete cascades.
- Every question requires exactly one choice. A valid survey has at least one
  question, MC questions have at least two choices, and TF choices are exactly
  `True` at position 1 and `False` at position 2. Incomplete drafts may be saved;
  activation validates the completed structure. Positive question/choice positions
  are unique within their parent; deferred constraints allow transactional swaps.
- `/s/:slug` uses a random UUID string generated on activation. This is allowed by
  DATABASE.md and avoids a separate short-slug collision/retry mechanism.
- Students submit a lowercase UUID browser token (`crypto.randomUUID()`) and an
  array of `{question_id, choice_id}` objects. One response per survey/token;
  storage clearing or a different browser bypasses accidental-duplicate protection.

## Files and security boundaries

1. `migrations/20261102195952_schema.sql`: the five tables, keys, indexes, timestamps,
   one-active constraint, immutable-content/lifecycle triggers, and answer membership
   validation. The token is required rather than nullable; text answers are disabled
   for V1. Nullable choice_id preserves the supplied deletion behavior, but the only
   student insertion path requires a valid choice.
2. `migrations/20261102195955_security_and_rpcs.sql`: RLS and explicit table/column
   grants, instructor lifecycle RPCs, student transactional submission RPC, and
   minimal public availability lookup. All privileged functions have an empty
   search_path and qualified table/function names; private helpers are inaccessible
   to browser roles. There are no response/answer mutation grants for instructors.

Anonymous users can SELECT active survey content only. They cannot read responses
or answers and have no direct table mutation privileges. Signed-in instructors can
read every survey/result, write draft content, and explicitly delete nonactive
surveys; column grants prevent direct status/slug manipulation. All instructor RPCs
check auth.uid() as well as limiting execution to authenticated. Lifecycle rules
also apply to direct table requests, not just UI buttons. Results/export will use
instructor-authorized SELECT operations in later phases; no public results view is
created. Supabase service/admin roles are privileged operators, outside browser-role
permissions.

`activate_survey(uuid)` returns id/status/public_slug; `close_survey(uuid)` and
`archive_survey(uuid)` return void. `survey_availability(text)` returns only active,
closed (including archived), or not_found, without inactive content. Student
`submit_survey_response(uuid,text,jsonb)` returns success/response_id or a controlled
error: SURVEY_NOT_ACTIVE, INVALID_TOKEN, INVALID_PAYLOAD, MISSING_REQUIRED_ANSWER,
INVALID_QUESTION, INVALID_CHOICE, DUPLICATE_QUESTION, or DUPLICATE_RESPONSE.

Activation/close/archive take the same transaction advisory lock. Content edits
lock their parent survey; activation locks/validates that survey. Submissions hold
shared survey-row locks, so concurrent students can submit while close/delete must
wait. A submission ordered before close may finish; once close commits, subsequent
submissions fail. Both the response and all answers commit or roll back together.
Use the normal READ COMMITTED isolation for these operations; callers should retry
transient serialization/deadlock errors rather than showing raw database errors.

## Run isolated local security tests

Prerequisites: Node/npm and a running Docker engine that can pull `postgres:17-alpine`.

```sh
npm run test:db
```

The runner creates an automatically removed PostgreSQL container with no host ports
and no network, creates minimal test-only anon/authenticated roles and auth.uid(),
applies the two migrations to a fresh test database, loads synthetic fixtures, then
runs SQL assertions and real concurrent sessions. It removes that exact container
in a finally block. It does not read environment files, use Supabase credentials,
call Supabase CLI, link a project, reset a hosted database, or contact Supabase.
The Docker daemon may download the public PostgreSQL image if it is not cached.

`tests/local/bootstrap.sql` is a test-only Auth interface substitute, not a full
Supabase Auth implementation. It must never be applied to Supabase. Likewise,
`tests/local/fixtures.sql` and `tests/database/security.sql` are test-only fixtures
and plain SQL assertions, not production migrations or pgTAP files. Do not run
`supabase test db` on these files; use the supplied npm runner.

Coverage includes RLS visibility, direct table/RPC denial, unauthenticated instructor
calls, instructor draft operations, immutable collected content, invalid survey
activation, malformed/missing/duplicate/cross-survey answers, duplicate tokens,
rollback after an answer-write failure, close/archive retention, explicit delete
cascades, the unique active index, simultaneous duplicate submission, both
close/submission orderings, draft-edit/activation ordering, and concurrent activation.
This does not verify hosted Auth/signup settings, PostgREST/JWT validation, browser
persistence, QR links, or the 200-student performance target.

## Supabase setup and remaining hosted checks

1. Create a dedicated project and save its database password privately.
2. Keep email/password enabled; disable public signup, anonymous Auth sign-ins, and
   unused login providers. Manually provision the trusted instructor user. Verify
   signup is actually rejected; a hidden signup page does not enforce this setting.
3. Obtain the project URL and **publishable** key. During integration, rename the
   Phase 1 `VITE_SUPABASE_ANON_KEY` placeholder to `VITE_SUPABASE_PUBLISHABLE_KEY`.
   No private secret/service-role key or database password belongs in Vite variables.
4. Configure local and eventual production Auth URLs for invitation/reset flows.
5. Completed: both migrations applied in order through MCP. Local filenames now
   match the versions MCP assigned in hosted migration history. Do not reapply them
   or copy test files into the hosted project. Preserve migration history.
6. Inspect the five tables, policies, grants, and function definitions. Verify
   anonymous and actual signed-in instructor API calls using the public key, and
   confirm nonactive content/results cannot be read by anonymous users. Do not
   infer RLS correctness from owner-level SQL Editor queries.
7. Record hosted verification evidence before checking original Phase 2 tasks.

References: [Supabase RLS](https://supabase.com/docs/guides/database/postgres/row-level-security),
[database functions](https://supabase.com/docs/guides/database/functions),
[Auth configuration](https://supabase.com/docs/guides/auth/general-configuration),
[API keys](https://supabase.com/docs/guides/getting-started/api-keys), and
[PostgreSQL locking](https://www.postgresql.org/docs/17/explicit-locking.html).


## Hosted verification ? November 2, 2026

Confirmed five empty application tables with RLS enabled, six foreign keys, 19
indexes (including constraint indexes), eight policies, four enabled application
triggers, and ten application functions with safe search paths. Anonymous result
SELECT is denied in real hosted SQL-role checks. Instructors have content-column
writes and read-only result access; status/slug writes and private helper access
are denied. No test rows were inserted. Full sanitized metadata evidence is in
`verification/2026-11-02-hosted-audit.json`; decisions and limitations are recorded
in development-notes.md.

Security advisor warnings remain: the intentionally exposed SECURITY DEFINER RPCs,
a pre-existing `public.rls_auto_enable()` event-trigger helper with browser EXECUTE
grants, and disabled leaked-password protection. Review the helper's grants in a
separate hardening change; it was not created or changed by these two migrations.
An event-trigger function is not an ordinary callable RPC despite the generic
advisor wording. Do not describe the project as having zero security advisories.
Performance advisor reports eight unused indexes on the new empty tables; retain
them pending actual workload evidence. No extra migration or Auth-setting changes
were made during this application pass.

## Hosted Phase 2 completion - November 2, 2026

The previously pending Auth/API checks are complete. Real instructor password login
and all 47 hosted checks passed: signup restrictions, active-only reads, denied
anonymous results/direct writes, submission validation/duplicates/persistence,
draft-only editing, archive retention, and concurrent lifecycle operations.
Four synthetic surveys were deleted afterward; independent MCP counts confirmed
all five application tables empty, one instructor user, and no anonymous Auth users.
See `verification/2026-11-02-hosted-api-tests.json` and
`verification/2026-11-02-advisor-review.json` for sanitized results.

No actual Phase 2 blockers remain. Intentional privileged RPC warnings require no
grant changes. Optional platform event-trigger grant hardening and paid
leaked-password protection are documented follow-ups; no extra migration, settings
change, or upgrade was made. Two unused-index notices remain; retain the indexes.
Testing is stopped. Future checks should cover assignment requirements and affected
features, without repeating passed suites absent a relevant change or failure.

The hosted test helper is separate from the product login UI. To rerun only when
needed and authorized, create ignored `.env.hosted-test.local` containing JSON with
`url` (the verified project URL) and `key` (its publishable key), then run
`npm run test:hosted`. Enter credentials only in the printed loopback login form;
they stay in memory, the session is signed out, and the helper terminates afterward.
Remove the ignored configuration when finished. The suite refuses to disturb an
existing active survey and deletes only its own synthetic surveys. An interrupted
run may require cleanup scoped to its unique test title marker. Never bulk-delete
unrelated data. No private service key is needed.


## Phase 5 atomic draft save

Migration `20261103005809_save_draft.sql` is applied to the same verified project.
It adds authenticated-only `save_draft_survey`, private RLS-protected retry receipts,
and child-change version triggers. Requests include survey/request UUIDs, expected
updated_at, title/description and ordered question/choice arrays. One transaction
validates ownership and saves/deletes/reorders records. Exact retries are safe;
stale versions and non-drafts are rejected. The frontend retains unsaved content
on failure/conflict. Receipts are operational metadata, inaccessible to browser
roles, and cascade on explicit survey deletion.

Use `npm run test:draft-db` for the focused disposable local SQL/concurrency checks;
use `npm run test:ui` for the editor and affected dashboard routing tests. See
`verification/2026-11-02-phase5-draft-save.json` and development-notes.md for results.
The hosted synthetic SQL verification transaction was rolled back. Do not rerun
unrelated Phase 2 suites for editor-only changes without a relevant concern.
