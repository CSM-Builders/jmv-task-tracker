begin;

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 160),
  description text check (description is null or char_length(description) <= 20000),
  timezone text not null default 'Asia/Manila' check (char_length(timezone) between 1 and 100),
  start_date date,
  end_date date,
  external_key text,
  import_fingerprint text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint projects_external_key_length check (external_key is null or char_length(trim(external_key)) between 1 and 120),
  constraint projects_date_order check (start_date is null or end_date is null or start_date <= end_date)
);

create unique index projects_user_external_key_idx
on public.projects(user_id, external_key)
where external_key is not null;

create index projects_user_id_idx on public.projects(user_id);

create or replace function public.validate_project_timezone()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if not exists (select 1 from pg_catalog.pg_timezone_names where name = new.timezone) then
    raise exception 'Invalid IANA timezone.' using errcode = '22023';
  end if;
  return new;
end;
$$;

create trigger projects_validate_timezone
before insert or update of timezone on public.projects
for each row execute function public.validate_project_timezone();

create trigger projects_set_updated_at
before update on public.projects
for each row execute function public.set_updated_at();

create or replace function public.valid_http_urls(values_to_check text[])
returns boolean
language sql
immutable
set search_path = ''
as $$
  select coalesce(bool_and(value ~* '^https?://'), true)
  from unnest(values_to_check) value;
$$;

alter table public.tasks
  add column project_id uuid references public.projects(id) on delete set null,
  add column parent_task_id uuid references public.tasks(id) on delete restrict,
  add column external_key text,
  add column category text,
  add column estimated_minutes integer,
  add column day_number integer,
  add column definition_of_done text,
  add column required_evidence text,
  add column interview_competency text,
  add column resource_links text[] not null default '{}',
  add column notes text,
  add column tags text[] not null default '{}',
  add column import_fingerprint text;

alter table public.tasks drop constraint if exists tasks_description_check;
alter table public.tasks
  add constraint tasks_description_check check (description is null or char_length(description) <= 20000),
  add constraint tasks_external_key_length check (external_key is null or char_length(trim(external_key)) between 1 and 120),
  add constraint tasks_category_length check (category is null or char_length(category) <= 120),
  add constraint tasks_estimated_minutes_check check (estimated_minutes is null or estimated_minutes >= 0),
  add constraint tasks_day_number_check check (day_number is null or day_number > 0),
  add constraint tasks_definition_of_done_length check (definition_of_done is null or char_length(definition_of_done) <= 10000),
  add constraint tasks_required_evidence_length check (required_evidence is null or char_length(required_evidence) <= 10000),
  add constraint tasks_interview_competency_length check (interview_competency is null or char_length(interview_competency) <= 500),
  add constraint tasks_notes_length check (notes is null or char_length(notes) <= 20000),
  add constraint tasks_resource_links_limit check (cardinality(resource_links) <= 30),
  add constraint tasks_resource_links_protocol check (public.valid_http_urls(resource_links)),
  add constraint tasks_tags_limit check (cardinality(tags) <= 30),
  add constraint tasks_not_self_parent check (parent_task_id is null or parent_task_id <> id);

create unique index tasks_project_external_key_idx
on public.tasks(user_id, project_id, external_key)
where project_id is not null and external_key is not null;

create unique index tasks_unprojected_external_key_idx
on public.tasks(user_id, external_key)
where project_id is null and external_key is not null;

create index tasks_project_id_idx on public.tasks(project_id);
create index tasks_parent_task_id_idx on public.tasks(parent_task_id);
create index tasks_project_day_idx on public.tasks(project_id, day_number);

create table public.task_dependencies (
  task_id uuid not null references public.tasks(id) on delete cascade,
  depends_on_task_id uuid not null references public.tasks(id) on delete restrict,
  created_at timestamptz not null default now(),
  primary key (task_id, depends_on_task_id),
  constraint task_dependencies_not_self check (task_id <> depends_on_task_id)
);

create index task_dependencies_prerequisite_idx
on public.task_dependencies(depends_on_task_id);

create table public.task_dependency_overrides (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  task_id uuid not null references public.tasks(id) on delete cascade,
  requested_status text not null check (requested_status in ('in_progress', 'completed')),
  reason text not null check (char_length(trim(reason)) between 8 and 1000),
  unresolved_dependency_ids uuid[] not null,
  created_at timestamptz not null default now()
);

alter table public.projects enable row level security;
alter table public.task_dependencies enable row level security;
alter table public.task_dependency_overrides enable row level security;

create policy "Users can select their own projects" on public.projects
for select to authenticated using ((select auth.uid()) = user_id);
create policy "Users can insert their own projects" on public.projects
for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Users can update their own projects" on public.projects
for update to authenticated using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);
create policy "Users can delete their own projects" on public.projects
for delete to authenticated using ((select auth.uid()) = user_id);

create policy "Users can select their task dependencies" on public.task_dependencies
for select to authenticated using (
  exists (select 1 from public.tasks where id = task_id and user_id = (select auth.uid()))
);
create policy "Users can insert their task dependencies" on public.task_dependencies
for insert to authenticated with check (
  exists (select 1 from public.tasks where id = task_id and user_id = (select auth.uid()))
);
create policy "Users can delete their task dependencies" on public.task_dependencies
for delete to authenticated using (
  exists (select 1 from public.tasks where id = task_id and user_id = (select auth.uid()))
);

create policy "Users can view their dependency overrides" on public.task_dependency_overrides
for select to authenticated using ((select auth.uid()) = user_id);
create policy "Users can create their dependency overrides" on public.task_dependency_overrides
for insert to authenticated with check (
  (select auth.uid()) = user_id
  and exists (
    select 1 from public.tasks
    where id = task_id and user_id = (select auth.uid())
  )
);

create or replace function public.validate_task_relationships()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  related public.tasks;
begin
  perform pg_advisory_xact_lock(hashtextextended(coalesce(new.project_id::text, new.user_id::text), 0));
  if new.project_id is not null and not exists (
    select 1 from public.projects p where p.id = new.project_id and p.user_id = new.user_id
  ) then
    raise exception 'Project does not belong to the task owner.' using errcode = '23514';
  end if;

  if new.parent_task_id is not null then
    if new.parent_task_id = new.id then
      raise exception 'A task cannot parent itself.' using errcode = '23514';
    end if;
    select * into related from public.tasks where id = new.parent_task_id;
    if not found then
      raise exception 'Parent task does not exist.' using errcode = '23503';
    end if;
    if related.user_id <> new.user_id or related.project_id is distinct from new.project_id then
      raise exception 'Parent and child must have the same owner and project.' using errcode = '23514';
    end if;
    if related.parent_task_id is not null then
      raise exception 'Only one child level is supported.' using errcode = '23514';
    end if;
    if exists (select 1 from public.tasks child where child.parent_task_id = new.id) then
      raise exception 'A parent task cannot also become a child.' using errcode = '23514';
    end if;
    if new.status <> 'completed' and related.status = 'completed' then
      update public.tasks set status = 'todo', completed_at = null where id = related.id;
    end if;
    update public.tasks set estimated_minutes = null where id = related.id and estimated_minutes is not null;
  end if;

  if exists (
    select 1 from public.tasks child
    where child.parent_task_id = new.id
      and (
        child.user_id <> new.user_id
        or child.project_id is distinct from new.project_id
      )
  ) then
    raise exception 'A parent and its existing children must stay in the same project.' using errcode = '23514';
  end if;

  if exists (
    select 1
    from public.task_dependencies dependency
    join public.tasks prerequisite on prerequisite.id = dependency.depends_on_task_id
    where dependency.task_id = new.id
      and (
        prerequisite.user_id <> new.user_id
        or prerequisite.project_id is distinct from new.project_id
      )
  ) or exists (
    select 1
    from public.task_dependencies dependency
    join public.tasks dependent on dependent.id = dependency.task_id
    where dependency.depends_on_task_id = new.id
      and (
        dependent.user_id <> new.user_id
        or dependent.project_id is distinct from new.project_id
      )
  ) then
    raise exception 'A task and its existing dependencies must stay in the same project.' using errcode = '23514';
  end if;

  if exists (select 1 from public.tasks child where child.parent_task_id = new.id) then
    new.estimated_minutes := null;
  end if;

  if new.status = 'completed' and exists (
    select 1 from public.tasks child
    where child.parent_task_id = new.id and child.status <> 'completed'
  ) then
    raise exception 'Complete every child before completing its parent.' using errcode = '23514';
  end if;

  return new;
end;
$$;

create trigger tasks_validate_relationships
before insert or update of user_id, project_id, parent_task_id, status, estimated_minutes on public.tasks
for each row execute function public.validate_task_relationships();

create or replace function public.validate_task_dependency()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  dependent public.tasks;
  prerequisite public.tasks;
begin
  select * into dependent from public.tasks where id = new.task_id;
  select * into prerequisite from public.tasks where id = new.depends_on_task_id;
  if dependent.id is null or prerequisite.id is null then
    raise exception 'Dependency task does not exist.' using errcode = '23503';
  end if;
  perform pg_advisory_xact_lock(hashtextextended(coalesce(dependent.project_id::text, dependent.user_id::text), 0));
  if dependent.user_id <> prerequisite.user_id
    or dependent.project_id is distinct from prerequisite.project_id then
    raise exception 'Dependencies must have the same owner and project.' using errcode = '23514';
  end if;
  if exists (
    with recursive graph(node) as (
      select new.depends_on_task_id
      union
      select d.depends_on_task_id
      from public.task_dependencies d join graph g on d.task_id = g.node
    ) select 1 from graph where node = new.task_id
  ) then
    raise exception 'Task dependency cycle detected.' using errcode = '23514';
  end if;
  if dependent.status in ('in_progress', 'completed') and prerequisite.status <> 'completed' then
    raise exception 'An active task cannot gain an unresolved dependency.' using errcode = '23514';
  end if;
  return new;
end;
$$;

create trigger task_dependencies_validate
before insert or update on public.task_dependencies
for each row execute function public.validate_task_dependency();

create or replace function public.enforce_task_dependency_status()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  unresolved uuid[];
  override_reason text;
begin
  if new.status in ('in_progress', 'completed') and new.status is distinct from old.status then
    select coalesce(array_agg(d.depends_on_task_id), '{}') into unresolved
    from public.task_dependencies d
    join public.tasks prerequisite on prerequisite.id = d.depends_on_task_id
    where d.task_id = new.id and prerequisite.status <> 'completed';
    if cardinality(unresolved) > 0 then
      override_reason := nullif(current_setting('app.dependency_override_reason', true), '');
      if override_reason is null then
        raise exception 'Complete dependencies before starting or completing this task.' using errcode = '23514';
      end if;
      insert into public.task_dependency_overrides
        (user_id, task_id, requested_status, reason, unresolved_dependency_ids)
      values (new.user_id, new.id, new.status, override_reason, unresolved);
    end if;
  end if;
  return new;
end;
$$;

create trigger tasks_enforce_dependency_status
before update of status on public.tasks
for each row execute function public.enforce_task_dependency_status();

create or replace function public.reopen_parent_after_child()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.status = 'completed' and new.status <> 'completed' and new.parent_task_id is not null then
    update public.tasks
    set status = 'todo', completed_at = null
    where id = new.parent_task_id and status = 'completed';
  end if;
  return new;
end;
$$;

create trigger tasks_reopen_parent
after update of status on public.tasks
for each row execute function public.reopen_parent_after_child();

create or replace function public.clear_changed_import_fingerprint()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_setting('app.import_in_progress', true) is distinct from '1' then
    new.import_fingerprint := null;
  end if;
  return new;
end;
$$;

create trigger projects_clear_changed_import_fingerprint
before update of name, description, timezone, start_date, end_date, external_key on public.projects
for each row execute function public.clear_changed_import_fingerprint();

create trigger tasks_clear_changed_import_fingerprint
before update of project_id, parent_task_id, external_key, title, description, priority,
  due_date, category, estimated_minutes, day_number, definition_of_done,
  required_evidence, interview_competency, resource_links, tags on public.tasks
for each row execute function public.clear_changed_import_fingerprint();

create or replace function public.set_task_dependencies(p_task_id uuid, p_dependency_ids uuid[])
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  dependency_id uuid;
  task_project_id uuid;
  task_user_id uuid;
begin
  select project_id, user_id into task_project_id, task_user_id
  from public.tasks
  where id = p_task_id and user_id = (select auth.uid());
  if not found then
    raise exception 'Task not found.' using errcode = '42501';
  end if;
  perform pg_advisory_xact_lock(hashtextextended(coalesce(task_project_id::text, task_user_id::text), 0));
  delete from public.task_dependencies where task_id = p_task_id;
  foreach dependency_id in array coalesce(p_dependency_ids, '{}') loop
    insert into public.task_dependencies(task_id, depends_on_task_id)
    values (p_task_id, dependency_id);
  end loop;
end;
$$;

create or replace function public.update_task_status(
  p_task_id uuid,
  p_status text,
  p_override_reason text default null
)
returns setof public.tasks
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if p_status not in ('todo', 'in_progress', 'completed') then
    raise exception 'Invalid task status.' using errcode = '22023';
  end if;
  perform set_config('app.dependency_override_reason', coalesce(trim(p_override_reason), ''), true);
  return query
    update public.tasks
    set status = p_status,
        completed_at = case
          when p_status = 'completed' then coalesce(completed_at, now())
          else null
        end
    where id = p_task_id and user_id = (select auth.uid())
    returning *;
end;
$$;

create or replace function public.import_project_plan(p_manifest jsonb)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  actor uuid := (select auth.uid());
  project_json jsonb := p_manifest -> 'project';
  tasks_json jsonb := p_manifest -> 'tasks';
  dry_run boolean := coalesce((p_manifest ->> 'dryRun')::boolean, true);
  update_existing boolean := coalesce((p_manifest ->> 'updateExisting')::boolean, false);
  project_row public.projects;
  item jsonb;
  item_id uuid;
  parent_id uuid;
  dependency_id uuid;
  fingerprint text;
  existing_fingerprint text;
  created_projects integer := 0;
  created_tasks integer := 0;
  existing_tasks integer := 0;
  conflicts text[] := '{}';
  id_map jsonb := '{}'::jsonb;
begin
  if actor is null then raise exception 'Authentication required.' using errcode = '42501'; end if;
  if p_manifest ->> 'schemaVersion' is distinct from '1' then
    raise exception 'Unsupported import schema version.' using errcode = '22023';
  end if;
  if jsonb_typeof(tasks_json) <> 'array' or jsonb_array_length(tasks_json) < 1 or jsonb_array_length(tasks_json) > 100 then
    raise exception 'Import must contain between 1 and 100 tasks.' using errcode = '22023';
  end if;
  if project_json ->> 'externalKey' is null then
    raise exception 'Project externalKey is required.' using errcode = '22023';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(actor::text || ':' || (project_json ->> 'externalKey'), 0));
  if (select count(*) from jsonb_array_elements(tasks_json)) <>
     (select count(distinct value ->> 'externalKey') from jsonb_array_elements(tasks_json) value) then
    raise exception 'Task external keys must be unique.' using errcode = '23505';
  end if;
  if exists (
    with recursive edges(task_key, dependency_key) as (
      select task_json ->> 'externalKey', dependency_key
      from jsonb_array_elements(tasks_json) as task_rows(task_json)
      cross join lateral jsonb_array_elements_text(coalesce(task_json -> 'dependencyExternalKeys', '[]'::jsonb)) as dependency_rows(dependency_key)
    ), paths(start_key, node) as (
      select task_key, dependency_key from edges
      union
      select paths.start_key, edges.dependency_key
      from paths join edges on edges.task_key = paths.node
    )
    select 1 from paths where start_key = node
  ) then
    raise exception 'Task dependency cycle detected.' using errcode = '23514';
  end if;

  fingerprint := encode(extensions.digest(project_json::text, 'sha256'), 'hex');
  select * into project_row from public.projects
  where user_id = actor and external_key = project_json ->> 'externalKey';

  if project_row.id is null then
    created_projects := 1;
    project_row.id := gen_random_uuid();
  elsif project_row.import_fingerprint is distinct from fingerprint and not update_existing then
    conflicts := array_append(conflicts, project_json ->> 'externalKey');
  end if;

  for item in select value from jsonb_array_elements(tasks_json) loop
    if item ->> 'externalKey' is null then raise exception 'Every task needs an externalKey.'; end if;
    if item ->> 'dueDate' is not null
      and item ->> 'dueDate' !~ '(Z|[+-][0-9]{2}:[0-9]{2})$' then
      raise exception 'Task dueDate must include an explicit timezone offset.' using errcode = '22023';
    end if;
    if item ->> 'parentExternalKey' = item ->> 'externalKey' then raise exception 'A task cannot parent itself.'; end if;
    if exists (
      select 1 from jsonb_array_elements_text(coalesce(item -> 'dependencyExternalKeys', '[]'::jsonb)) as dependency_rows(dependency_key)
      where dependency_key = item ->> 'externalKey'
    ) then raise exception 'A task cannot depend on itself.'; end if;
    if item ->> 'parentExternalKey' is not null and not exists (
      select 1 from jsonb_array_elements(tasks_json) as candidate_rows(candidate_json)
      where candidate_json ->> 'externalKey' = item ->> 'parentExternalKey'
        and candidate_json ->> 'parentExternalKey' is null
    ) then raise exception 'Parent is missing or is already a child.'; end if;
    if exists (
      select 1 from jsonb_array_elements_text(coalesce(item -> 'dependencyExternalKeys', '[]'::jsonb)) as dependency_rows(dependency_key)
      where not exists (
        select 1 from jsonb_array_elements(tasks_json) as candidate_rows(candidate_json)
        where candidate_json ->> 'externalKey' = dependency_key
      )
    ) then raise exception 'Dependency is missing from the import.'; end if;

    fingerprint := encode(extensions.digest((item - 'status' - 'notes')::text, 'sha256'), 'hex');
    select id, import_fingerprint into item_id, existing_fingerprint
    from public.tasks where user_id = actor and project_id = project_row.id
      and external_key = item ->> 'externalKey';
    if item_id is null then
      item_id := gen_random_uuid();
      created_tasks := created_tasks + 1;
    elsif existing_fingerprint is distinct from fingerprint and not update_existing then
      conflicts := array_append(conflicts, item ->> 'externalKey');
    else
      existing_tasks := existing_tasks + 1;
    end if;
    id_map := id_map || jsonb_build_object(item ->> 'externalKey', item_id);
  end loop;

  if cardinality(conflicts) > 0 then
    raise exception 'Import conflicts: %', array_to_string(conflicts, ', ') using errcode = '23505';
  end if;

  if dry_run then
    return jsonb_build_object(
      'dryRun', true,
      'createdProjectCount', 0,
      'createdTaskCount', 0,
      'existingTaskCount', existing_tasks,
      'conflictCount', 0,
      'wouldCreateProjectCount', created_projects,
      'wouldCreateTaskCount', created_tasks,
      'totalTaskCount', jsonb_array_length(tasks_json),
      'parentCount', (select count(*) from jsonb_array_elements(tasks_json) value where value ->> 'parentExternalKey' is null),
      'subtaskCount', (select count(*) from jsonb_array_elements(tasks_json) value where value ->> 'parentExternalKey' is not null),
      'estimatedMinutes', (
        select coalesce(sum((value ->> 'estimatedMinutes')::integer), 0)
        from jsonb_array_elements(tasks_json) value
        where value ->> 'parentExternalKey' is not null
      ),
      'idMap', id_map
    );
  end if;

  perform set_config('app.import_in_progress', '1', true);

  if created_projects = 1 then
    insert into public.projects(id, user_id, name, description, timezone, start_date, end_date, external_key, import_fingerprint)
    values (
      project_row.id, actor, project_json ->> 'name', project_json ->> 'description',
      coalesce(project_json ->> 'timezone', 'Asia/Manila'),
      (project_json ->> 'startDate')::date, (project_json ->> 'endDate')::date,
      project_json ->> 'externalKey', encode(extensions.digest(project_json::text, 'sha256'), 'hex')
    );
  elsif update_existing then
    update public.projects set
      name = project_json ->> 'name', description = project_json ->> 'description',
      timezone = coalesce(project_json ->> 'timezone', timezone),
      start_date = (project_json ->> 'startDate')::date,
      end_date = (project_json ->> 'endDate')::date,
      import_fingerprint = encode(extensions.digest(project_json::text, 'sha256'), 'hex')
    where id = project_row.id;
  end if;

  for item in
    select value from jsonb_array_elements(tasks_json) value
    order by case when value ->> 'parentExternalKey' is null then 0 else 1 end
  loop
    item_id := (id_map ->> (item ->> 'externalKey'))::uuid;
    parent_id := case when item ->> 'parentExternalKey' is null then null
      else (id_map ->> (item ->> 'parentExternalKey'))::uuid end;
    fingerprint := encode(extensions.digest((item - 'status' - 'notes')::text, 'sha256'), 'hex');
    if not exists (select 1 from public.tasks where id = item_id) then
      insert into public.tasks(
        id, user_id, project_id, parent_task_id, external_key, title, description,
        status, priority, due_date, category, estimated_minutes, day_number,
        definition_of_done, required_evidence, interview_competency,
        resource_links, notes, tags, completed_at, import_fingerprint
      ) values (
        item_id, actor, project_row.id, parent_id, item ->> 'externalKey', item ->> 'title', item ->> 'description',
        item ->> 'status', item ->> 'priority', (item ->> 'dueDate')::timestamptz,
        item ->> 'category', case when item ->> 'parentExternalKey' is null then null else (item ->> 'estimatedMinutes')::integer end,
        (item ->> 'dayNumber')::integer, item ->> 'definitionOfDone', item ->> 'requiredEvidence',
        item ->> 'interviewCompetency', coalesce(array(select jsonb_array_elements_text(item -> 'resourceLinks')), '{}'),
        item ->> 'notes', coalesce(array(select jsonb_array_elements_text(item -> 'tags')), '{}'),
        case when item ->> 'status' = 'completed' then now() else null end, fingerprint
      );
    elsif update_existing then
      update public.tasks set
        parent_task_id = parent_id, title = item ->> 'title', description = item ->> 'description',
        priority = item ->> 'priority', due_date = (item ->> 'dueDate')::timestamptz,
        category = item ->> 'category',
        estimated_minutes = case when item ->> 'parentExternalKey' is null then null else (item ->> 'estimatedMinutes')::integer end,
        day_number = (item ->> 'dayNumber')::integer,
        definition_of_done = item ->> 'definitionOfDone',
        required_evidence = item ->> 'requiredEvidence',
        interview_competency = item ->> 'interviewCompetency',
        resource_links = coalesce(array(select jsonb_array_elements_text(item -> 'resourceLinks')), '{}'),
        tags = coalesce(array(select jsonb_array_elements_text(item -> 'tags')), '{}'),
        import_fingerprint = fingerprint
      where id = item_id;
    end if;
  end loop;

  for item in select value from jsonb_array_elements(tasks_json) loop
    item_id := (id_map ->> (item ->> 'externalKey'))::uuid;
    if update_existing then
      delete from public.task_dependencies where task_id = item_id;
    end if;
    if not exists (select 1 from public.task_dependencies where task_id = item_id) then
      for dependency_id in
        select (id_map ->> dependency_key)::uuid
        from jsonb_array_elements_text(coalesce(item -> 'dependencyExternalKeys', '[]'::jsonb)) as dependency_rows(dependency_key)
      loop
        insert into public.task_dependencies(task_id, depends_on_task_id)
        values (item_id, dependency_id);
      end loop;
    end if;
  end loop;

  return jsonb_build_object(
    'dryRun', false,
    'projectId', project_row.id,
    'createdProjectCount', created_projects,
    'createdTaskCount', created_tasks,
    'existingTaskCount', existing_tasks,
    'conflictCount', 0,
    'totalTaskCount', jsonb_array_length(tasks_json),
    'parentCount', (select count(*) from jsonb_array_elements(tasks_json) value where value ->> 'parentExternalKey' is null),
    'subtaskCount', (select count(*) from jsonb_array_elements(tasks_json) value where value ->> 'parentExternalKey' is not null),
    'estimatedMinutes', (
      select coalesce(sum((value ->> 'estimatedMinutes')::integer), 0)
      from jsonb_array_elements(tasks_json) value
      where value ->> 'parentExternalKey' is not null
    ),
    'idMap', id_map
  );
end;
$$;

grant execute on function public.set_task_dependencies(uuid, uuid[]) to authenticated;
grant execute on function public.update_task_status(uuid, text, text) to authenticated;
grant execute on function public.import_project_plan(jsonb) to authenticated;

commit;
