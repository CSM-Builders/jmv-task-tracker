import { describe, expect, it } from "vitest";
import {
  filterTasks,
  isOverdue,
  sortTasks,
  taskStats,
} from "@/lib/utils/tasks";
import { makeTask } from "./fixtures";

describe("task utilities", () => {
  const tasks = [
    makeTask({
      id: "1",
      title: "Bravo",
      priority: "low",
      status: "todo",
      dueDate: "2030-04-10T12:00:00.000Z",
    }),
    makeTask({
      id: "2",
      title: "Alpha launch",
      priority: "high",
      status: "completed",
      completedAt: "2030-04-09T10:00:00.000Z",
    }),
    makeTask({
      id: "3",
      title: "Charlie",
      description: "Launch prep",
      priority: "medium",
      status: "in_progress",
      dueDate: "2030-04-15T12:00:00.000Z",
    }),
  ];

  it("filters by query, status, and priority", () => {
    expect(
      filterTasks(tasks, {
        query: "launch",
        status: "all",
        priority: "all",
        view: "all",
      }),
    ).toHaveLength(2);
    expect(
      filterTasks(tasks, {
        query: "",
        status: "in_progress",
        priority: "medium",
        view: "all",
      }),
    ).toEqual([tasks[2]]);
  });

  it("sorts by priority and due date without mutating input", () => {
    expect(sortTasks(tasks, "priority").map((task) => task.priority)).toEqual([
      "high",
      "medium",
      "low",
    ]);
    expect(sortTasks(tasks, "dueDate")[0].id).toBe("1");
    expect(tasks[0].id).toBe("1");
  });

  it("marks only incomplete past-due tasks as overdue", () => {
    const now = new Date("2030-04-12T12:00:00.000Z");
    expect(isOverdue(tasks[0], now)).toBe(true);
    expect(isOverdue(tasks[1], now)).toBe(false);
    expect(taskStats(tasks, now)).toMatchObject({
      total: 3,
      completed: 1,
      overdue: 1,
      completionRate: 33,
    });
  });
});
