import { NextResponse } from "next/server";
import { rowToProject } from "@/lib/tasks/mappers";
import { createClient } from "@/lib/supabase/server";
import { projectInputSchema } from "@/lib/validation/task";
import type { ProjectRow } from "@/types/database";

export async function GET() {
  const requestId = crypto.randomUUID();
  const supabase = await createClient();
  const { data: userData, error: authError } = await supabase.auth.getUser();
  if (authError || !userData.user)
    return NextResponse.json(
      { error: "Please sign in to view projects." },
      { status: 401 },
    );
  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .order("created_at");
  if (error) {
    console.error("Project list query failed.", {
      requestId,
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
    });
    return NextResponse.json(
      {
        error: "Projects could not be loaded.",
        code: "PROJECTS_LIST_FAILED",
        requestId,
        ...(process.env.NODE_ENV === "development" && {
          detail: `${error.code ?? "SUPABASE_ERROR"}: ${error.message}`,
        }),
      },
      { status: 500, headers: { "x-request-id": requestId } },
    );
  }
  return NextResponse.json({ data: (data as ProjectRow[]).map(rowToProject) });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: userData, error: authError } = await supabase.auth.getUser();
  if (authError || !userData.user)
    return NextResponse.json(
      { error: "Please sign in to create projects." },
      { status: 401 },
    );
  const parsed = projectInputSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success)
    return NextResponse.json(
      {
        error: parsed.error.issues[0]?.message ?? "Check the project details.",
      },
      { status: 400 },
    );
  const input = parsed.data;
  try {
    new Intl.DateTimeFormat("en", { timeZone: input.timezone });
  } catch {
    return NextResponse.json(
      { error: "Choose a valid IANA timezone." },
      { status: 400 },
    );
  }
  const { data, error } = await supabase
    .from("projects")
    .insert({
      user_id: userData.user.id,
      name: input.name,
      description: input.description,
      timezone: input.timezone,
      start_date: input.startDate,
      end_date: input.endDate,
      external_key: input.externalKey,
    })
    .select("*")
    .single();
  if (error)
    return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(
    { data: rowToProject(data as ProjectRow) },
    { status: 201 },
  );
}
