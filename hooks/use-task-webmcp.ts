"use client";

import { useEffect } from "react";
import { z } from "zod";
import type { Task, TaskInput } from "@/types/task";

const createToolSchema = z.object({
  title: z.string().trim().min(1).max(120),
  description: z.string().trim().max(1_000).optional(),
  priority: z.enum(["low", "medium", "high"]).default("medium"),
  dueDate: z.string().optional(),
});

export function useTaskWebMcp(
  tasks: Task[],
  createTask: (input: TaskInput) => Promise<Task>,
) {
  useEffect(() => {
    const context = document.modelContext;
    if (!context?.registerTool) return;
    const lifecycle = new AbortController();

    void Promise.resolve(
      context.registerTool(
        {
          name: "list_tasks",
          title: "List visible tasks",
          description: "Return the tasks currently loaded in JMV Task Tracker.",
          inputSchema: {
            type: "object",
            properties: {},
            additionalProperties: false,
          },
          annotations: { readOnlyHint: true, untrustedContentHint: true },
          execute: () =>
            tasks.map(({ id, title, status, priority, dueDate }) => ({
              id,
              title,
              status,
              priority,
              dueDate,
            })),
        },
        { signal: lifecycle.signal },
      ),
    ).catch(() => undefined);

    void Promise.resolve(
      context.registerTool(
        {
          name: "create_task",
          title: "Create a task",
          description:
            "Create a task in the same repository used by the visible dashboard.",
          inputSchema: {
            type: "object",
            properties: {
              title: { type: "string", minLength: 1, maxLength: 120 },
              description: { type: "string", maxLength: 1000 },
              priority: { type: "string", enum: ["low", "medium", "high"] },
              dueDate: { type: "string", format: "date" },
            },
            required: ["title"],
            additionalProperties: false,
          },
          annotations: { readOnlyHint: false, untrustedContentHint: false },
          async execute(rawInput) {
            const input = createToolSchema.parse(rawInput);
            const task = await createTask({
              title: input.title,
              description: input.description || null,
              priority: input.priority,
              status: "todo",
              dueDate: input.dueDate
                ? new Date(`${input.dueDate}T23:59:59`).toISOString()
                : null,
            });
            return { id: task.id, title: task.title, status: task.status };
          },
        },
        { signal: lifecycle.signal },
      ),
    ).catch(() => undefined);

    return () => lifecycle.abort();
  }, [createTask, tasks]);
}
