import { NextResponse } from "next/server";
import { rowToTask } from "@/lib/tasks/mappers";
import { createClient } from "@/lib/supabase/server";
import { taskIdSchema, taskUpdateSchema } from "@/lib/validation/task";
import type { TaskRow } from "@/types/database";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: Request, context: RouteContext) {
  const { id } = await context.params;
  if (!taskIdSchema.safeParse(id).success)
    return NextResponse.json(
      { error: "Invalid task identifier." },
      { status: 400 },
    );

  const supabase = await createClient();
  const { data: userData, error: authError } = await supabase.auth.getUser();
  if (authError || !userData.user)
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
  const update = {
    ...(input.title !== undefined && { title: input.title }),
    ...(input.description !== undefined && { description: input.description }),
    ...(input.status !== undefined && {
      status: input.status,
      completed_at:
        input.status === "completed" ? new Date().toISOString() : null,
    }),
    ...(input.priority !== undefined && { priority: input.priority }),
    ...(input.dueDate !== undefined && { due_date: input.dueDate }),
  };

  const { data, error } = await supabase
    .from("tasks")
    .update(update)
    .eq("id", id)
    .select("*")
    .single();
  if (error)
    return NextResponse.json(
      { error: "The task could not be updated." },
      { status: 500 },
    );
  return NextResponse.json({ data: rowToTask(data as TaskRow) });
}

export async function DELETE(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  if (!taskIdSchema.safeParse(id).success)
    return NextResponse.json(
      { error: "Invalid task identifier." },
      { status: 400 },
    );

  const supabase = await createClient();
  const { data: userData, error: authError } = await supabase.auth.getUser();
  if (authError || !userData.user)
    return NextResponse.json(
      { error: "Please sign in to delete tasks." },
      { status: 401 },
    );

  const { error } = await supabase.from("tasks").delete().eq("id", id);
  if (error)
    return NextResponse.json(
      { error: "The task could not be deleted." },
      { status: 500 },
    );
  return NextResponse.json({ data: null });
}
