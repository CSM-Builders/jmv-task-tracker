import { beforeEach, describe, expect, it } from "vitest";
import { LocalProjectRepository } from "@/lib/projects/local-repository";
import { LocalTaskRepository } from "@/lib/tasks/local-repository";
import { createSampleTasks } from "@/lib/tasks/sample-data";
import type { Task } from "@/types/task";

const TASKS_KEY = "jmv-task-tracker.tasks.v1";

function task(id: string, overrides: Partial<Task> = {}): Task {
  return {
    ...createSampleTasks()[0],
    id,
    projectId: null,
    parentTaskId: null,
    dependencyIds: [],
    ...overrides,
  };
}

describe("confirmed deletions in demo mode", () => {
  beforeEach(() => window.localStorage.clear());

  it("deletes a parent and its subtasks, clearing surviving dependency links", async () => {
    window.localStorage.setItem(
      TASKS_KEY,
      JSON.stringify([
        task("parent"),
        task("child", { parentTaskId: "parent" }),
        task("dependent", { dependencyIds: ["parent", "child"] }),
      ]),
    );
    const repository = new LocalTaskRepository();

    await repository.remove("parent");

    await expect(repository.list()).resolves.toMatchObject([
      { id: "dependent", dependencyIds: [] },
    ]);
  });

  it("deletes a project and its tasks while preserving other projects", async () => {
    const projects = new LocalProjectRepository();
    const first = await projects.create({
      name: "First",
      description: null,
      timezone: "Asia/Manila",
      startDate: null,
      endDate: null,
      externalKey: null,
    });
    const second = await projects.create({
      name: "Second",
      description: null,
      timezone: "Asia/Manila",
      startDate: null,
      endDate: null,
      externalKey: null,
    });
    window.localStorage.setItem(
      TASKS_KEY,
      JSON.stringify([
        task("first-task", { projectId: first.id }),
        task("second-task", { projectId: second.id }),
      ]),
    );

    await projects.remove(first.id);

    await expect(projects.list()).resolves.toMatchObject([{ id: second.id }]);
    await expect(new LocalTaskRepository().list()).resolves.toMatchObject([
      { id: "second-task" },
    ]);
  });
});
