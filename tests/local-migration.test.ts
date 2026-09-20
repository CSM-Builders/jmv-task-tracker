import { beforeEach, describe, expect, it } from "vitest";
import { LocalTaskRepository } from "@/lib/tasks/local-repository";
import { makeTask } from "./fixtures";

describe("local demo migration", () => {
  beforeEach(() => localStorage.clear());

  it("upgrades legacy tasks without changing their identity or status", async () => {
    localStorage.setItem(
      "jmv-task-tracker.tasks.v1",
      JSON.stringify([
        {
          id: "legacy-id",
          userId: "demo-user",
          title: "Legacy task",
          description: null,
          status: "completed",
          priority: "low",
          dueDate: "2026-09-20T15:59:59.000Z",
          createdAt: "2026-09-19T00:00:00.000Z",
          updatedAt: "2026-09-20T00:00:00.000Z",
          completedAt: "2026-09-20T00:00:00.000Z",
        },
      ]),
    );
    const [task] = await new LocalTaskRepository().list();
    expect(task).toMatchObject({
      id: "legacy-id",
      status: "completed",
      projectId: null,
      parentTaskId: null,
      dependencyIds: [],
      resourceLinks: [],
      tags: [],
    });
  });

  it("rejects dependency cycles and cross-project hierarchy changes", async () => {
    const first = makeTask({
      id: "11111111-1111-4111-8111-111111111111",
      projectId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    });
    const second = makeTask({
      id: "22222222-2222-4222-8222-222222222222",
      projectId: first.projectId,
      dependencyIds: [first.id],
    });
    const child = makeTask({
      id: "33333333-3333-4333-8333-333333333333",
      projectId: first.projectId,
      parentTaskId: first.id,
    });
    localStorage.setItem(
      "jmv-task-tracker.tasks.v1",
      JSON.stringify([first, second, child]),
    );
    const repository = new LocalTaskRepository();

    await expect(
      repository.update(first.id, { dependencyIds: [second.id] }),
    ).rejects.toThrow("cycle");
    await expect(
      repository.update(first.id, {
        projectId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
      }),
    ).rejects.toThrow("same project");
    await expect(repository.remove(first.id)).rejects.toThrow("children");
  });
});
