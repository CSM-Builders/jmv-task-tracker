import { NextResponse } from "next/server";
import { dateOnlyToZonedEndOfDay } from "@/lib/utils/timezone";
import { createClient } from "@/lib/supabase/server";
import { projectImportSchema } from "@/lib/validation/task";

const MAX_REQUEST_BYTES = 1_000_000;

function hasCycle(edges: Map<string, string[]>) {
  const visiting = new Set<string>();
  const visited = new Set<string>();
  const visit = (key: string): boolean => {
    if (visiting.has(key)) return true;
    if (visited.has(key)) return false;
    visiting.add(key);
    if ((edges.get(key) ?? []).some(visit)) return true;
    visiting.delete(key);
    visited.add(key);
    return false;
  };
  return [...edges.keys()].some(visit);
}

export async function POST(request: Request) {
  const declaredLength = Number(request.headers.get("content-length"));
  if (declaredLength > MAX_REQUEST_BYTES)
    return NextResponse.json(
      { error: "Import request exceeds 1 MB." },
      { status: 413 },
    );
  const raw = await request.text();
  if (new TextEncoder().encode(raw).length > MAX_REQUEST_BYTES)
    return NextResponse.json(
      { error: "Import request exceeds 1 MB." },
      { status: 413 },
    );
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return NextResponse.json(
      { error: "Import must be valid JSON." },
      { status: 400 },
    );
  }

  const parsed = projectImportSchema.safeParse(value);
  if (!parsed.success)
    return NextResponse.json(
      {
        error: parsed.error.issues[0]?.message ?? "Import validation failed.",
        issues: parsed.error.issues,
      },
      { status: 400 },
    );

  const manifest = parsed.data;
  const parentEdges = new Map(
    manifest.tasks.map((task) => [
      task.externalKey,
      task.parentExternalKey ? [task.parentExternalKey] : [],
    ]),
  );
  const dependencyEdges = new Map(
    manifest.tasks.map((task) => [
      task.externalKey,
      task.dependencyExternalKeys,
    ]),
  );
  if (hasCycle(parentEdges) || hasCycle(dependencyEdges))
    return NextResponse.json(
      { error: "Import contains a parent or dependency cycle." },
      { status: 400 },
    );

  const normalized = {
    ...manifest,
    tasks: manifest.tasks.map((task) => ({
      ...task,
      dueDate:
        task.dueDate && /^\d{4}-\d{2}-\d{2}$/.test(task.dueDate)
          ? dateOnlyToZonedEndOfDay(task.dueDate, manifest.project.timezone)
          : task.dueDate,
    })),
  };

  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user)
    return NextResponse.json(
      { error: "Please sign in to import a project." },
      { status: 401 },
    );
  const { data, error } = await supabase.rpc("import_project_plan", {
    p_manifest: normalized,
  });
  if (error)
    return NextResponse.json({ error: error.message }, { status: 409 });
  return NextResponse.json({ data });
}
