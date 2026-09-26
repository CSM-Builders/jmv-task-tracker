import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  from: vi.fn(),
  rpc: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser: mocks.getUser },
    from: mocks.from,
    rpc: mocks.rpc,
  })),
}));

import { DELETE as deleteProject } from "@/app/api/projects/[id]/route";
import { DELETE as deleteTask } from "@/app/api/tasks/[id]/route";

const id = "11111111-1111-4111-8111-111111111111";
const context = { params: Promise.resolve({ id }) };

function deletion(result: {
  data: { id: string } | null;
  error: { code: string } | null;
}) {
  const query = {
    delete: vi.fn(),
    eq: vi.fn(),
    select: vi.fn(),
    maybeSingle: vi.fn(async () => result),
  };
  query.delete.mockReturnValue(query);
  query.eq.mockReturnValue(query);
  query.select.mockReturnValue(query);
  mocks.from.mockReturnValue(query);
  return query;
}

describe("authenticated delete routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getUser.mockResolvedValue({
      data: { user: { id: "owner" } },
      error: null,
    });
  });

  it("deletes only the signed-in owner's task", async () => {
    const query = deletion({ data: { id }, error: null });
    const response = await deleteTask(new Request("http://localhost"), context);

    expect(response.status).toBe(200);
    expect(mocks.from).toHaveBeenCalledWith("tasks");
    expect(query.eq).toHaveBeenCalledWith("id", id);
    expect(query.eq).toHaveBeenCalledWith("user_id", "owner");
  });

  it("deletes a project through the migration-backed RPC", async () => {
    mocks.rpc.mockResolvedValue({ data: true, error: null });
    const response = await deleteProject(
      new Request("http://localhost"),
      context,
    );
    expect(response.status).toBe(200);
    expect(mocks.rpc).toHaveBeenCalledWith("delete_project", {
      p_project_id: id,
    });
  });

  it.each([
    ["task", deleteTask],
    ["project", deleteProject],
  ])("returns 404 when the %s is not owned or missing", async (_, handler) => {
    deletion({ data: null, error: null });
    mocks.rpc.mockResolvedValue({ data: false, error: null });
    const response = await handler(new Request("http://localhost"), context);
    expect(response.status).toBe(404);
  });

  it.each([
    ["task", deleteTask],
    ["project", deleteProject],
  ])("requires a session before deleting a %s", async (_, handler) => {
    mocks.getUser.mockResolvedValue({ data: { user: null }, error: null });
    const response = await handler(new Request("http://localhost"), context);
    expect(response.status).toBe(401);
    expect(mocks.from).not.toHaveBeenCalled();
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it("reports the missing migration instead of deleting a project's tasks incorrectly", async () => {
    mocks.rpc.mockResolvedValue({ data: null, error: { code: "PGRST202" } });
    const response = await deleteProject(
      new Request("http://localhost"),
      context,
    );
    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toMatchObject({ code: "PGRST202" });
  });
});
