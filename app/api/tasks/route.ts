import { NextResponse } from "next/server";
import { attachDependencies, taskInsert } from "@/lib/tasks/server";
import { createClient } from "@/lib/supabase/server";
import { taskInputSchema } from "@/lib/validation/task";
import type { TaskRow } from "@/types/database";

function decodeCursor(value: string | null) {
  if (!value) return 0;
  try {
    const offset = Number(Buffer.from(value, "base64url").toString("utf8"));
    return Number.isSafeInteger(offset) && offset >= 0 ? offset : 0;
  } catch {
    return 0;
  }
}

function encodeCursor(offset: number) {
  return Buffer.from(String(offset)).toString("base64url");
}

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: userData, error: authError } = await supabase.auth.getUser();
  if (authError || !userData.user)
    return NextResponse.json(
      { error: "Please sign in to view tasks." },
      { status: 401 },
    );

  const url = new URL(request.url);
  const limit = Math.min(
    Math.max(Number(url.searchParams.get("limit")) || 100, 1),
    100,
  );
  const offset = decodeCursor(url.searchParams.get("cursor"));
  const projectId = url.searchParams.get("projectId");
  const status = url.searchParams.get("status");
  const category = url.searchParams.get("category");
  const dayNumber = Number(url.searchParams.get("dayNumber"));

  let query = supabase.from("tasks").select("*", { count: "exact" });
  if (projectId === "none") query = query.is("project_id", null);
  else if (projectId) query = query.eq("project_id", projectId);
  if (status) query = query.eq("status", status);
  if (category) query = query.eq("category", category);
  if (Number.isInteger(dayNumber) && dayNumber > 0)
    query = query.eq("day_number", dayNumber);

  const { data, error, count } = await query
    .order("created_at", { ascending: false })
    .order("id", { ascending: true })
    .range(offset, offset + limit - 1);
  if (error)
    return NextResponse.json(
      { error: "Tasks could not be loaded." },
      { status: 500 },
    );

  try {
    const tasks = await attachDependencies(supabase, (data ?? []) as TaskRow[]);
    const totalCount = count ?? tasks.length;
    const nextOffset = offset + tasks.length;
    return NextResponse.json({
      data: {
        tasks,
        totalCount,
        nextCursor: nextOffset < totalCount ? encodeCursor(nextOffset) : null,
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Task dependencies could not be loaded." },
      { status: 500 },
    );
  }
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
    .insert(taskInsert(input, userData.user.id))
    .select("*")
    .single();
  if (error)
    return NextResponse.json({ error: error.message }, { status: 400 });

  if (input.dependencyIds.length) {
    const { error: dependencyError } = await supabase.rpc(
      "set_task_dependencies",
      {
        p_task_id: data.id,
        p_dependency_ids: input.dependencyIds,
      },
    );
    if (dependencyError) {
      await supabase.from("tasks").delete().eq("id", data.id);
      return NextResponse.json(
        { error: dependencyError.message },
        { status: 400 },
      );
    }
  }

  const [task] = await attachDependencies(supabase, [data as TaskRow]);
  return NextResponse.json({ data: task }, { status: 201 });
}
