import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  from: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser: mocks.getUser },
    from: mocks.from,
  })),
}));

import { GET } from "@/app/api/projects/route";

function projectQuery(result: {
  data: unknown[] | null;
  error: Record<string, unknown> | null;
}) {
  const query = {
    select: vi.fn(),
    order: vi.fn(async () => result),
  };
  query.select.mockReturnValue(query);
  return query;
}

describe("GET /api/projects", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
      error: null,
    });
  });

  it("returns an authenticated empty project list as a successful state", async () => {
    mocks.from.mockReturnValue(projectQuery({ data: [], error: null }));

    const response = await GET();

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ data: [] });
    expect(mocks.from).toHaveBeenCalledWith("projects");
  });

  it("returns a diagnostic identifier when the authenticated query fails", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    mocks.from.mockReturnValue(
      projectQuery({
        data: null,
        error: {
          code: "PGRST205",
          message: "Could not find public.projects in the schema cache",
          details: null,
          hint: null,
        },
      }),
    );

    const response = await GET();
    const body = (await response.json()) as Record<string, unknown>;

    expect(response.status).toBe(500);
    expect(body).toMatchObject({
      error: "Projects could not be loaded.",
      code: "PROJECTS_LIST_FAILED",
    });
    expect(body.requestId).toEqual(expect.any(String));
    expect(response.headers.get("x-request-id")).toBe(body.requestId);
    expect(log).toHaveBeenCalledWith(
      "Project list query failed.",
      expect.objectContaining({
        requestId: body.requestId,
        code: "PGRST205",
      }),
    );
    log.mockRestore();
  });
});
