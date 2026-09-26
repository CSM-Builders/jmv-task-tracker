begin;

-- A confirmed task deletion removes its subtasks and any dependency links.
alter table public.tasks
  drop constraint tasks_parent_task_id_fkey,
  add constraint tasks_parent_task_id_fkey
    foreign key (parent_task_id) references public.tasks(id) on delete cascade;

alter table public.task_dependencies
  drop constraint task_dependencies_depends_on_task_id_fkey,
  add constraint task_dependencies_depends_on_task_id_fkey
    foreign key (depends_on_task_id) references public.tasks(id) on delete cascade;

-- A confirmed project deletion removes its tasks, including their subtasks.
alter table public.tasks
  drop constraint tasks_project_id_fkey,
  add constraint tasks_project_id_fkey
    foreign key (project_id) references public.projects(id) on delete cascade;

-- The API calls this function so a new deployment cannot remove only the
-- project if this migration has not yet been applied.
create function public.delete_project(p_project_id uuid)
returns boolean
language plpgsql
security invoker
set search_path = ''
as $$
declare
  deleted_count integer;
begin
  delete from public.projects
  where id = p_project_id and user_id = (select auth.uid());
  get diagnostics deleted_count = row_count;
  return deleted_count > 0;
end;
$$;

revoke all on function public.delete_project(uuid) from public, anon;
grant execute on function public.delete_project(uuid) to authenticated;

commit;
