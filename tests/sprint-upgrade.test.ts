import { describe, expect, it } from "vitest";
import manifestFixture from "./data/tracker-upgrade-import.json";
import { summarizeProjectManifest } from "@/lib/import/manifest";
import {
  projectImportSchema,
  projectInputSchema,
  taskInputSchema,
  taskUpdateSchema,
} from "@/lib/validation/task";
import {
  dateKeyInTimeZone,
  dateOnlyToZonedEndOfDay,
} from "@/lib/utils/timezone";
import {
  isDueToday,
  isUpcoming,
  projectProgress,
  unresolvedDependencies,
} from "@/lib/utils/tasks";
import { makeTask } from "./fixtures";

const project = {
  externalKey: "sprint-1",
  name: "Sprint",
  description: "Four day sprint",
  timezone: "Asia/Manila",
  startDate: "2026-09-20",
  endDate: "2026-09-23",
};

const parent = {
  externalKey: "D1",
  parentExternalKey: null,
  title: "Day 1",
  description: "Parent",
  status: "todo" as const,
  priority: "high" as const,
  dayNumber: 1,
  category: "Day milestone",
  estimatedMinutes: null,
  dueDate: "2026-09-20",
  dependencyExternalKeys: [],
  definitionOfDone: "Children done",
  requiredEvidence: "Notes",
  interviewCompetency: "Planning",
  resourceLinks: [],
  notes: null,
  tags: ["day-1"],
};

const child = {
  ...parent,
  externalKey: "D1.1",
  parentExternalKey: "D1",
  title: "Discover",
  category: "Discovery",
  estimatedMinutes: 45,
};

describe("sprint upgrade contracts", () => {
  it("accepts an empty project description from the project form", () => {
    expect(
      projectInputSchema.parse({
        name: "Interview sprint",
        description: null,
        timezone: "Asia/Manila",
        startDate: "2026-09-20",
        endDate: "2026-09-23",
        externalKey: "interview-sprint",
      }).description,
    ).toBeNull();
  });

  it("does not add create defaults to a partial task update", () => {
    expect(taskUpdateSchema.parse({ status: "completed" })).toEqual({
      status: "completed",
    });
  });

  it("converts a Manila date to the correct absolute end-of-day timestamp", () => {
    const timestamp = dateOnlyToZonedEndOfDay("2026-09-20", "Asia/Manila");
    expect(timestamp).toBe("2026-09-20T15:59:59.000Z");
    expect(dateKeyInTimeZone(new Date(timestamp), "Asia/Manila")).toBe(
      "2026-09-20",
    );
  });

  it("accepts the import contract and rejects broken references", () => {
    expect(
      projectImportSchema.safeParse({
        schemaVersion: 1,
        dryRun: true,
        project,
        tasks: [parent, child],
      }).success,
    ).toBe(true);
    const broken = { ...child, dependencyExternalKeys: ["missing"] };
    expect(
      projectImportSchema.safeParse({
        schemaVersion: 1,
        dryRun: true,
        project,
        tasks: [parent, broken],
      }).success,
    ).toBe(false);
  });

  it("allows long safe text and only http resource links", () => {
    const base = {
      title: "Task",
      status: "todo" as const,
      priority: "medium" as const,
    };
    expect(
      taskInputSchema.safeParse({
        ...base,
        description: "a".repeat(20_000),
        resourceLinks: ["https://example.com"],
      }).success,
    ).toBe(true);
    expect(
      taskInputSchema.safeParse({
        ...base,
        resourceLinks: ["javascript:alert(1)"],
      }).success,
    ).toBe(false);
  });

  it("counts only leaf work and derives blocking from prerequisites", () => {
    const parentTask = makeTask({
      id: "p",
      projectId: "project",
      estimatedMinutes: null,
    });
    const done = makeTask({
      id: "a",
      projectId: "project",
      parentTaskId: "p",
      status: "completed",
      completedAt: "2026-09-20T00:00:00Z",
      estimatedMinutes: 30,
    });
    const todo = makeTask({
      id: "b",
      projectId: "project",
      parentTaskId: "p",
      estimatedMinutes: 60,
      dependencyIds: ["a"],
    });
    const blocked = makeTask({
      id: "c",
      projectId: "project",
      estimatedMinutes: 15,
      dependencyIds: ["b"],
    });
    expect(
      projectProgress("project", [parentTask, done, todo, blocked]),
    ).toEqual({ completed: 1, total: 3, percent: 33, estimatedMinutes: 105 });
    expect(
      unresolvedDependencies(blocked, [parentTask, done, todo, blocked]),
    ).toEqual(["b"]);
  });

  it("accepts and summarizes the complete four-day sprint manifest", () => {
    const manifest = projectImportSchema.parse(manifestFixture);

    expect(summarizeProjectManifest(manifest)).toEqual({
      projectCount: 1,
      parentCount: 4,
      subtaskCount: 32,
      totalTaskCount: 36,
      estimatedMinutes: 1680,
      timezone: "Asia/Manila",
      startDate: "2026-09-20",
      endDate: "2026-09-23",
    });
    expect(new Set(manifest.tasks.map((task) => task.externalKey)).size).toBe(
      36,
    );
  });

  it("derives full-manifest progress from the 32 leaf tasks", () => {
    const manifest = projectImportSchema.parse(manifestFixture);
    const idByExternalKey = new Map(
      manifest.tasks.map((task) => [task.externalKey, task.externalKey]),
    );
    const tasks = manifest.tasks.map((task) =>
      makeTask({
        id: task.externalKey,
        projectId: "sprint-project",
        parentTaskId: task.parentExternalKey
          ? (idByExternalKey.get(task.parentExternalKey) ?? null)
          : null,
        externalKey: task.externalKey,
        status: task.status,
        estimatedMinutes: task.estimatedMinutes,
        dependencyIds: task.dependencyExternalKeys.map(
          (key) => idByExternalKey.get(key) ?? key,
        ),
      }),
    );

    expect(projectProgress("sprint-project", tasks)).toEqual({
      completed: 0,
      total: 32,
      percent: 0,
      estimatedMinutes: 1680,
    });
  });

  it("uses Asia/Manila calendar days for Today and Upcoming", () => {
    const now = new Date("2026-09-20T01:00:00.000Z");
    const today = makeTask({ dueDate: "2026-09-20T15:59:59.000Z" });
    const upcoming = makeTask({ dueDate: "2026-09-21T15:59:59.000Z" });

    expect(isDueToday(today, now, "Asia/Manila")).toBe(true);
    expect(isUpcoming(today, now, "Asia/Manila")).toBe(false);
    expect(isDueToday(upcoming, now, "Asia/Manila")).toBe(false);
    expect(isUpcoming(upcoming, now, "Asia/Manila")).toBe(true);
  });
});
