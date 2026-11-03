# Submission readiness review

Reviewed November 3, 2026 against [assignment.md](assignment.md), sections 7-10,
the supplied specification and actual repository/evidence. This is a packaging
checklist, not the student's development report. No application testing was restarted.

## Required deliverables

| Deliverable | Current evidence/status | Remaining action |
| --- | --- | --- |
| A. GitHub repository URL | https://github.com/noahsteinberg/ClassroomSurveyApp ; source, five supplied specs including updated TODO, three migrations and README are present and tracked. Latest verified publication is `630069e`. | Include the URL in HuskyCT. Sanitized history/checklist are included in this documentation publication; private submission attachments are excluded. |
| B. Public application URL | https://classroomsurveyapp.pages.dev/ ; deployed workflow and physical phone test confirmed; deployment log inspected. | Include the URL in HuskyCT. Provide private instructor access separately. |
| B. Instructor test access | A privately provisioned instructor account works. README explains the shared trusted-instructor model. | Supply working login instructions and credentials through the intended private grading channel; do not put them in GitHub or screenshots. Delivery has not been confirmed. |
| C. Development summary | `AssignmentFiles/DevelopmentReport.docx` is present; final read-only audit found approximately 524 words covering all seven requested topics. | Confirm it is complete, approximately 1-2 pages, and addresses all seven assignment prompts including personal learning. |
| D. AI development history | [ai-development-history.md](ai-development-history.md) prepared from actual notes/interactions; Markdown summary is explicitly allowed instead of a raw export. | Student reviews for accuracy, then includes the file in the submission/publication as desired. |
| E. Database evidence | All four required categories visually reviewed; mapping below. | Attach the four PNGs to the submission, or include them in an appropriate submission bundle. They are currently untracked local files. |

The report file is preserved without edits. A later read-only final audit confirmed content coverage; final Word/PDF pagination still needs the student's review. The development-summary prompts are: how specifications guided the agent, which
parts AI generated, database configuration, frontend/database communication, one
actual problem and resolution, deployment, and personal learning. This checklist
does not supply that report or invent the student's reflections.

## Screenshot coverage

| Assignment evidence | Existing file | Visual review |
| --- | --- | --- |
| Supabase tables | `AssignmentFiles/supabase-tables.png` | All five tables, columns and relationship lines are visible. |
| At least one survey with associated questions | `AssignmentFiles/survey-and-questions.png` | Corrected saved draft: title/description, “Draft saved,” TF and MC questions with choices; edit URL contains the saved survey ID. |
| Stored student responses | `AssignmentFiles/stored-responses.png` | Supabase responses table has three rows, survey references and submission timestamps. |
| Results displayed in the app | `AssignmentFiles/survey_results.png` | Response total, Closed status, question text, counts, percentages and charts are visible. |

No missing screenshot category was found. Existing app images show localhost,
which the screenshot deliverable does not prohibit; public deployment is separately
supported by its URL and verification evidence. The images do not all depict the
same survey, which is not an explicit screenshot requirement. The survey editor
text is small but readable at the full image resolution; a tighter crop is optional.

No password, secret/service-role key, student name or student email is visible in
the four images. Stored responses include random browser UUIDs used in test
submissions, not authentication JWTs or API credentials. Hiding that column is
optional for presentation. The images show test data described in the development
history; do not substitute private real-student data. Browser bookmarks/project
identifiers are visible, so the student should review personal presentation details
before uploading. Images were reviewed without modifying them.

A separate questions-table screenshot or an Excel screenshot is optional supporting
evidence, not an additional explicitly required screenshot category. The assignment
requires working CSV export; prior actual spreadsheet-opening confirmation is
recorded. Do not confuse optional screenshots with missing required deliverables.

## Assignment checklist and rubric coverage

| Area | Evidence/status |
| --- | --- |
| Frontend functionality/usability (15) | Implemented; focused keyboard, contrast, validation, responsive and browser evidence recorded. No grade is predicted. |
| Instructor survey management (15) | Create/edit/list/activate/close/results plus archive/delete/duplicate verified; one active survey enforced in the database. |
| Student/QR functionality (15) | Anonymous submission/confirmation/duplicate protection and public physical-phone test confirmed on Safari/iPhone. |
| Database schema/relationships (15) | Five related tables, keys, constraints and three versioned migrations; Supabase schema screenshot and inspection evidence. |
| Integration/persistence/security (15) | Actual hosted Auth/PostgREST checks, RLS/grants, invalid-input/concurrency tests, reload persistence and results/CSV evidence. |
| Repository/deployment (10) | Required repository files tracked, public app deployed and build log inspected. Private grader credential delivery still outstanding. |
| Testing/debugging (5) | Actual failures/fixes and local/hosted/device evidence documented; performance limitation retained honestly. |
| Development summary/AI history (10) | AI history now prepared; report content covers all seven requested topics; final pagination/attachment remains for the student. |

The overview's functional checklist is supported by recorded local/public/user
evidence. The provided specification additionally states <2-second average page
load and 200 simultaneous students. The API workload check passed for 200 clients;
it does not establish 200 full browser instances under every network condition.
Cold means passed; warm results averaged 2.289s due to two unexplained successful
slow loads. Do not claim the entire load-time target passed. All raw measurements
are preserved, and testing/performance changes stopped at the student's direction.

## Still missing or requiring final inclusion

- [ ] Confirm final 1-2 page layout in Word/PDF and attach the existing report; content coverage has been reviewed.
- [ ] Private grader-access instructions and credential delivery, confirmed outside Git.
- [ ] Include the AI history file and four existing screenshots in the final package;
  preparing them locally does not mean they are attached in HuskyCT.
- [ ] Review/include the published AI history in the private submission as appropriate.
- [ ] Assemble the repository URL, app URL, report, history and evidence into HuskyCT,
  review the final package, submit and verify receipt. No submission was attempted.

Retain the disclosed performance limitation in final documentation. The Auth Site
URL correction is user-confirmed; an independent reread was stopped. These are
evidence qualifications, not new requests to restart testing. Phase 16 enhancements,
additional screenshots, a custom domain and optional hardening are not new required
submission deliverables.

The pasted assignment shows **November 5, 2026, 11:59 PM EST** and **one attempt
left**. Those are from the supplied assignment text, not a fresh HuskyCT check.
Review the live submission screen yourself before using the remaining attempt.

Private report/screenshot filenames above are an attachment inventory, not public repository links. `AssignmentFiles/` is intentionally excluded from this publication, along with all credentials. No HuskyCT submission or attachment state is independently certified.
