# Task and project deletion fix

Migration `003_cascade_task_and_project_deletion.sql` changes three foreign keys and adds an authenticated `delete_project` function. Deleting a parent task removes its subtasks. Deleting a prerequisite removes its dependency links. Deleting a project removes every task in that project. Other projects and unassigned tasks remain intact.

## Production rollout

1. Verify a current backup of the production database. These deletes are permanent.
2. Deploy the application change through the reviewed GitHub and Vercel workflow. Until migration 003 is installed, project deletion returns an error without deleting the project; parent or prerequisite task deletion may still be blocked.
3. In the production Supabase project, run the complete `supabase/migrations/003_cascade_task_and_project_deletion.sql` once in SQL Editor. Do not rerun migrations 001 or 002.
4. Verify the installed relationships with this read-only query:

   ```sql
   select conname, confdeltype
   from pg_constraint
   where conname in (
     'tasks_parent_task_id_fkey',
     'tasks_project_id_fkey',
     'task_dependencies_depends_on_task_id_fkey'
   )
   order by conname;
   ```

   All three rows should have `confdeltype = 'c'` (cascade). Also check:

   ```sql
   select to_regprocedure('public.delete_project(uuid)');
   ```

5. With a disposable account or disposable data, create a project containing a parent, subtask, and dependency. Confirm that deleting the parent removes the subtask and dependency link. Create another task in the project, delete the project, and verify its tasks are gone after refresh. Check that another account cannot delete the first account's project.

   The opt-in browser test `tests/e2e/supabase-deletion.spec.ts` performs these checks against a development Supabase project. Point `.env.local` at that project, install migration 003 there, and use dedicated test users:

   ```powershell
   $env:RUN_SUPABASE_DELETE_INTEGRATION="1"
   $env:TEST_USER_EMAIL="first-test-user@example.com"
   $env:TEST_USER_PASSWORD="first-test-password"
   $env:TEST_SECOND_USER_EMAIL="second-test-user@example.com"
   $env:TEST_SECOND_USER_PASSWORD="second-test-password"
   npm run build
   npm run test:e2e -- tests/e2e/supabase-deletion.spec.ts --project=chromium
   ```

If the app is rolled back, leave the additive function and foreign key changes in place until a reviewed follow-up migration is prepared. Restoring accidentally deleted data requires the verified backup.
