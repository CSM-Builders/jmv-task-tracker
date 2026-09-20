import { NextResponse } from "next/server";
import { rowToProject } from "@/lib/tasks/mappers";
import { createClient } from "@/lib/supabase/server";
import { taskIdSchema } from "@/lib/validation/task";
import type { ProjectRow } from "@/types/database";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  if (!taskIdSchema.safeParse(id).success)
    return NextResponse.json(
      { error: "Invalid project identifier." },
      { status: 400 },
    );
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user)
    return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .eq("id", id)
    .single();
  if (error)
    return NextResponse.json({ error: "Project not found." }, { status: 404 });
  const { data: taskRows, error: taskError } = await supabase
    .from("tasks")
    .select("id, parent_task_id, status, estimated_minutes")
    .eq("project_id", id);
  if (taskError)
    return NextResponse.json(
      { error: "Project tasks could not be loaded." },
      { status: 500 },
    );
  const rows = taskRows ?? [];
  const parentIds = new Set(
    rows.map((task) => task.parent_task_id).filter(Boolean),
  );
  const leaves = rows.filter((task) => !parentIds.has(task.id));
  const completed = leaves.filter((task) => task.status === "completed").length;
  return NextResponse.json({
    data: {
      project: rowToProject(data as ProjectRow),
      progress: {
        completed,
        total: leaves.length,
        percent: leaves.length
          ? Math.round((completed / leaves.length) * 100)
          : 0,
        estimatedMinutes: leaves.reduce(
          (sum, task) => sum + (task.estimated_minutes ?? 0),
          0,
        ),
      },
    },
  });
}
