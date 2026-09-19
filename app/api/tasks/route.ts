import { NextResponse } from "next/server";
import { rowToTask } from "@/lib/tasks/mappers";
import { createClient } from "@/lib/supabase/server";
import { taskInputSchema } from "@/lib/validation/task";
import type { TaskRow } from "@/types/database";

export async function GET() {
  const supabase = await createClient();
  const { data: userData, error: authError } = await supabase.auth.getUser();
  if (authError || !userData.user)
    return NextResponse.json(
      { error: "Please sign in to view tasks." },
      { status: 401 },
    );

  const { data, error } = await supabase
    .from("tasks")
    .select("*")
    .order("created_at", { ascending: false });
  if (error)
    return NextResponse.json(
      { error: "Tasks could not be loaded." },
      { status: 500 },
    );
  return NextResponse.json({ data: (data as TaskRow[]).map(rowToTask) });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: userData, error: authError } = await supabase.auth.getUser();
  if (authError || !userData.user)
    return NextResponse.json(
      { error: "Please sign in to create tasks." },
      { status: 401 },
    );

  const parsed = taskInputSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success)
    return NextResponse.json(
      { error: "Check the task details and try again." },
      { status: 400 },
    );

  const input = parsed.data;
  const { data, error } = await supabase
    .from("tasks")
    .insert({
      user_id: userData.user.id,
      title: input.title,
      description: input.description,
      status: input.status,
      priority: input.priority,
      due_date: input.dueDate,
      completed_at:
        input.status === "completed" ? new Date().toISOString() : null,
    })
    .select("*")
    .single();

  if (error)
    return NextResponse.json(
      { error: "The task could not be created." },
      { status: 500 },
    );
  return NextResponse.json(
    { data: rowToTask(data as TaskRow) },
    { status: 201 },
  );
}
