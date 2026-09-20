import { NextResponse } from "next/server";
import { attachDependencies } from "@/lib/tasks/server";
import { createClient } from "@/lib/supabase/server";
import { taskIdSchema, taskUpdateSchema } from "@/lib/validation/task";
import type { TaskRow } from "@/types/database";

interface RouteContext {
  params: Promise<{ id: string }>;
}

async function authorizedTask(id: string) {
  const supabase = await createClient();
  const { data: userData, error } = await supabase.auth.getUser();
  return { supabase, user: error ? null : userData.user, id };
}

export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  if (!taskIdSchema.safeParse(id).success)
    return NextResponse.json(
      { error: "Invalid task identifier." },
      { status: 400 },
    );
  const { supabase, user } = await authorizedTask(id);
  if (!user)
    return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  const { data, error } = await supabase
    .from("tasks")
    .select("*")
    .eq("id", id)
    .single();
  if (error)
    return NextResponse.json({ error: "Task not found." }, { status: 404 });
  const [task] = await attachDependencies(supabase, [data as TaskRow]);
  return NextResponse.json({ data: task });
}

export async function PATCH(request: Request, context: RouteContext) {
  const { id } = await context.params;
  if (!taskIdSchema.safeParse(id).success)
    return NextResponse.json(
      { error: "Invalid task identifier." },
      { status: 400 },
    );
  const { supabase, user } = await authorizedTask(id);
  if (!user)
    return NextResponse.json(
      { error: "Please sign in to update tasks." },
      { status: 401 },
    );
  const parsed = taskUpdateSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success)
    return NextResponse.json(
      { error: "Check the task details and try again." },
      { status: 400 },
    );

  const input = parsed.data;
  if (input.status !== undefined) {
    const { error } = await supabase.rpc("update_task_status", {
      p_task_id: id,
      p_status: input.status,
      p_override_reason: input.dependencyOverrideReason ?? null,
    });
    if (error)
      return NextResponse.json({ error: error.message }, { status: 409 });
  }

  const update = {
    ...(input.projectId !== undefined && { project_id: input.projectId }),
    ...(input.parentTaskId !== undefined && {
      parent_task_id: input.parentTaskId,
    }),
    ...(input.externalKey !== undefined && { external_key: input.externalKey }),
    ...(input.title !== undefined && { title: input.title }),
    ...(input.description !== undefined && { description: input.description }),
    ...(input.priority !== undefined && { priority: input.priority }),
    ...(input.dueDate !== undefined && { due_date: input.dueDate }),
    ...(input.category !== undefined && { category: input.category }),
    ...(input.estimatedMinutes !== undefined && {
      estimated_minutes: input.estimatedMinutes,
    }),
    ...(input.dayNumber !== undefined && { day_number: input.dayNumber }),
    ...(input.definitionOfDone !== undefined && {
      definition_of_done: input.definitionOfDone,
    }),
    ...(input.requiredEvidence !== undefined && {
      required_evidence: input.requiredEvidence,
    }),
    ...(input.interviewCompetency !== undefined && {
      interview_competency: input.interviewCompetency,
    }),
    ...(input.resourceLinks !== undefined && {
      resource_links: input.resourceLinks,
    }),
    ...(input.notes !== undefined && { notes: input.notes }),
    ...(input.tags !== undefined && { tags: input.tags }),
  };
  if (Object.keys(update).length) {
    const { error } = await supabase.from("tasks").update(update).eq("id", id);
    if (error)
      return NextResponse.json({ error: error.message }, { status: 400 });
  }
  if (input.dependencyIds !== undefined) {
    const { error } = await supabase.rpc("set_task_dependencies", {
      p_task_id: id,
      p_dependency_ids: input.dependencyIds,
    });
    if (error)
      return NextResponse.json({ error: error.message }, { status: 400 });
  }
  const { data, error } = await supabase
    .from("tasks")
    .select("*")
    .eq("id", id)
    .single();
  if (error)
    return NextResponse.json({ error: "Task not found." }, { status: 404 });
  const [task] = await attachDependencies(supabase, [data as TaskRow]);
  return NextResponse.json({ data: task });
}

export async function DELETE(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  if (!taskIdSchema.safeParse(id).success)
    return NextResponse.json(
      { error: "Invalid task identifier." },
      { status: 400 },
    );
  const { supabase, user } = await authorizedTask(id);
  if (!user)
    return NextResponse.json(
      { error: "Please sign in to delete tasks." },
      { status: 401 },
    );
  const { error } = await supabase.from("tasks").delete().eq("id", id);
  if (error)
    return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ data: null });
}
