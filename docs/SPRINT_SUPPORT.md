# Sprint support release

This release adds projects, one-level task hierarchy, dependencies, expanded task metadata, project-timezone dates, a validated atomic JSON import, and authenticated WebMCP read/import tools without replacing existing tasks or status values.

## Safe production rollout

1. Create and verify an authorized backup before changing production. At minimum, export the current `public.tasks` rows and the existing schema through the Supabase dashboard or an authorized `pg_dump` connection. Store the backup outside the repository.
2. Create a separate Supabase test project and apply `001_create_tasks.sql`, followed once by `002_add_projects_hierarchy_and_import.sql`.
3. Run the application test suite against the test project and confirm existing tasks retain their IDs, statuses, due timestamps, and completion timestamps.
4. Test a manifest with `dryRun: true`. Confirm the preview counts and verify that no rows were written.
5. Apply migration `002_add_projects_hierarchy_and_import.sql` once to production through the Supabase SQL Editor. Never rerun `001_create_tasks.sql` as a production reset.
6. Deploy the application code through the existing reviewed GitHub/Vercel process.
7. Perform the production smoke tests before applying any real import.

The migration is additive. Legacy tasks keep `project_id` and `parent_task_id` as `null`. It does not drop or recreate `tasks`.

## Rollback

Prefer application rollback over schema deletion:

1. Stop imports and dependency edits.
2. Roll Vercel back to the prior known-good deployment.
3. Leave additive tables and populated columns in place. The prior application ignores them, and existing task columns remain compatible.
4. Investigate and forward-fix the migration in a new numbered migration.
5. Restore from the verified backup only for confirmed data corruption and only through an authorized database owner.

Do not roll back by dropping populated project, hierarchy, dependency, evidence, or import columns.

## Import API

`POST /api/import/project-plan` accepts at most 1 MB and 100 tasks. The caller must have an authenticated Supabase session. JSON uses camelCase and must match schema version 1 from the implementation brief.

- `dryRun` defaults to `true`.
- Project and task identity use `externalKey`, not titles.
- Plain `YYYY-MM-DD` due dates become `23:59:59` in the project timezone.
- ISO-8601 timestamps must include an offset.
- Missing parents/dependencies, duplicate keys, invalid dates, self-links, cycles, and active tasks with incomplete prerequisites reject the complete request.
- The database function uses the caller's `auth.uid()`, RLS, and a transaction-scoped advisory lock.
- A successful create is one database transaction. Any error rolls it all back.
- An identical reimport returns existing IDs and creates no duplicate rows.
- A changed imported record reports a conflict unless `updateExisting: true` is explicitly supplied.
- Updates never replace task status, completion timestamps, required evidence, resource links, or notes.

The UI exposes the same operation under **Projects → Import JSON**. Run **Dry preview** before the Apply button becomes available.

## API and WebMCP contract

Authenticated application routes:

- `GET/POST /api/projects`
- `GET /api/projects/{id}`
- `GET/POST /api/tasks`
- `GET/PATCH/DELETE /api/tasks/{id}`
- `POST /api/import/project-plan`

`GET /api/tasks` accepts `projectId`, `status`, `category`, `dayNumber`, `limit` (maximum 100), and an opaque `cursor`. It returns `tasks`, `totalCount`, and `nextCursor`.

WebMCP tools:

- `list_projects`
- `get_project`
- `get_task`
- `list_tasks`
- `create_task` (backward compatible; new fields are optional)
- `import_project_plan` (`dryRun` defaults to `true`)

Tool results contain task/project data only. They do not expose cookies, session tokens, API keys, passwords, or connection strings.

## Dependency and hierarchy behavior

- The UI supports a parent plus one child level.
- Parent, child, prerequisite, and dependent must have the same owner and project.
- Parent estimates and progress are derived from leaf children.
- A parent cannot complete until every child is complete.
- Reopening a child atomically reopens its completed parent.
- Unmet prerequisites derive a **Blocked** badge; they do not introduce a fourth status.
- Starting or completing blocked work is rejected by default.
- The status RPC can accept an explicit override reason and records it in `task_dependency_overrides`.
- Reopening a prerequisite does not rewrite a dependent task's completion history; the completed task displays a warning.

## Project-loading diagnostics

`GET /api/projects` now distinguishes an authenticated empty result from a database failure. A failure returns a stable `PROJECTS_LIST_FAILED` code, a per-request identifier in both the JSON body and `x-request-id` header, and logs the sanitized Supabase error server-side. Development builds also show the database error code/message in an expandable detail. The dashboard and Projects page do not render zero statistics or an empty-workspace message until projects and tasks have both loaded successfully.

The local investigation on September 20, 2026 returned Supabase `PGRST205`: `public.projects` was absent from the schema cache. That means migration `002_add_projects_hierarchy_and_import.sql` had not been applied to the configured database. Apply that migration to a disposable development Supabase project before testing the authenticated project/import flows. Do not apply it to production as part of local acceptance.

## Full-manifest acceptance

The complete supplied manifest is checked in as the test fixture `tests/data/tracker-upgrade-import.json`. Its validated contract is:

- 1 project, 4 parents, 32 subtasks, and 36 total task records
- 1,680 leaf-task minutes
- `Asia/Manila`
- September 20–23, 2026

The regular Vitest suite validates the complete manifest, its unique external keys, leaf-derived progress, project error-versus-empty states, authenticated project-route error diagnostics, and Manila Today/Upcoming behavior.

The database acceptance test is intentionally opt-in because it writes the complete manifest. Point `.env.local` at a disposable Supabase development project with migrations `001` and `002` applied, then run PowerShell with a dedicated test user:

```powershell
$env:RUN_SUPABASE_INTEGRATION="1"
$env:TEST_USER_EMAIL="your-test-user@example.com"
$env:TEST_USER_PASSWORD="your-test-password"
$env:TEST_SECOND_USER_EMAIL="another-test-user@example.com"
$env:TEST_SECOND_USER_PASSWORD="another-test-password"
npm run build
npm run test:e2e -- tests/e2e/supabase-sprint.spec.ts --project=chromium
```

The test requires a clean database for the first user. It verifies the expected dry-run counts, applies 36 records, reads hierarchy and metadata back through authenticated APIs, checks `0/32` leaf progress and `1,680 min` in the UI, and applies the same manifest again to prove external-key idempotency (`0` new projects, `0` new tasks, `36` existing tasks). When second-user credentials are supplied, it also confirms authenticated RLS hides that project and all 36 tasks from the second account.

### Local development verification — September 20, 2026

Migration `002_add_projects_hierarchy_and_import.sql` was applied to the confirmed development project. The exact supplied manifest then passed the authenticated WebMCP dry preview with 1 project, 4 parents, 32 subtasks, 36 total records, 1,680 estimated minutes, and zero conflicts. Apply created all 36 records. A field-by-field read-back found no mismatches in hierarchy, dependencies, due dates, evidence, notes, categories, tags, competencies, or leaf estimates. Repeating preview and apply created no new records and reported all 36 tasks as existing.

The signed-in Projects UI, project filter, Today view, Upcoming view, and `list_projects` WebMCP tool were also verified. An anonymous REST request can reach `public.projects` but sees zero rows, confirming that the schema is available while RLS still prevents anonymous reads.
