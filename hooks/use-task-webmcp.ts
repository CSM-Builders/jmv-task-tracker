"use client";

import { useEffect } from "react";
import { z } from "zod";
import { dateOnlyToZonedEndOfDay } from "@/lib/utils/timezone";
import { projectProgress } from "@/lib/utils/tasks";
import type { Project, Task, TaskInput, TaskListResult } from "@/types/task";

const createToolSchema = z.object({
  title: z.string().trim().min(1).max(120),
  description: z.string().trim().max(20_000).optional(),
  priority: z.enum(["low", "medium", "high"]).default("medium"),
  dueDate: z.iso.date().optional(),
  projectId: z.uuid().optional(),
  parentTaskId: z.uuid().optional(),
  category: z.string().trim().max(120).optional(),
  estimatedMinutes: z.number().int().min(0).optional(),
  dayNumber: z.number().int().positive().optional(),
  tags: z.array(z.string()).max(30).optional(),
});

async function apiRequest<T>(url: string, init?: RequestInit) {
  const response = await fetch(url, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  const body = (await response.json()) as {
    data?: T;
    error?: string;
    code?: string;
    requestId?: string;
    detail?: string;
  };
  if (!response.ok) {
    const diagnostics = [
      body.code,
      body.requestId ? `request ${body.requestId}` : null,
    ].filter(Boolean);
    throw new Error(
      `${body.error ?? "Application API request failed."}${
        diagnostics.length ? ` (${diagnostics.join(", ")})` : ""
      }${body.detail ? ` — ${body.detail}` : ""}`,
    );
  }
  return body.data as T;
}

export function useTaskWebMcp(
  tasks: Task[],
  projects: Project[],
  createTask: (input: TaskInput) => Promise<Task>,
  mode: "demo" | "supabase",
) {
  useEffect(() => {
    const context = document.modelContext;
    if (!context?.registerTool) return;
    const lifecycle = new AbortController();
    const register = (
      definition: Parameters<typeof context.registerTool>[0],
    ) => {
      void Promise.resolve(
        context.registerTool(definition, { signal: lifecycle.signal }),
      ).catch(() => undefined);
    };

    register({
      name: "list_projects",
      title: "List projects",
      description: "List the signed-in user's projects.",
      inputSchema: {
        type: "object",
        properties: {},
        additionalProperties: false,
      },
      annotations: { readOnlyHint: true, untrustedContentHint: true },
      execute: () =>
        mode === "supabase" ? apiRequest<Project[]>("/api/projects") : projects,
    });
    register({
      name: "get_project",
      title: "Get project",
      description: "Read one authorized project and its overview.",
      inputSchema: {
        type: "object",
        properties: { id: { type: "string", format: "uuid" } },
        required: ["id"],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: true, untrustedContentHint: true },
      execute: (input) => {
        const id = z.object({ id: z.uuid() }).parse(input).id;
        return mode === "supabase"
          ? apiRequest<unknown>(`/api/projects/${encodeURIComponent(id)}`)
          : (() => {
              const project = projects.find((item) => item.id === id);
              return project
                ? { project, progress: projectProgress(project.id, tasks) }
                : null;
            })();
      },
    });
    register({
      name: "get_task",
      title: "Get task",
      description:
        "Read one authorized task with its full description and metadata.",
      inputSchema: {
        type: "object",
        properties: { id: { type: "string", format: "uuid" } },
        required: ["id"],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: true, untrustedContentHint: true },
      execute: (input) => {
        const id = z.object({ id: z.uuid() }).parse(input).id;
        return mode === "supabase"
          ? apiRequest<Task>(`/api/tasks/${encodeURIComponent(id)}`)
          : (tasks.find((task) => task.id === id) ?? null);
      },
    });
    register({
      name: "list_tasks",
      title: "List tasks",
      description:
        "List authorized tasks with filters, full metadata, total count and a pagination cursor.",
      inputSchema: {
        type: "object",
        properties: {
          projectId: { type: "string" },
          status: {
            type: "string",
            enum: ["todo", "in_progress", "completed"],
          },
          category: { type: "string" },
          dayNumber: { type: "integer", minimum: 1 },
          limit: { type: "integer", minimum: 1, maximum: 100 },
          cursor: { type: "string" },
        },
        additionalProperties: false,
      },
      annotations: { readOnlyHint: true, untrustedContentHint: true },
      execute: async (raw) => {
        const input = z
          .object({
            projectId: z.string().optional(),
            status: z.enum(["todo", "in_progress", "completed"]).optional(),
            category: z.string().optional(),
            dayNumber: z.number().int().positive().optional(),
            limit: z.number().int().min(1).max(100).default(50),
            cursor: z.string().optional(),
          })
          .parse(raw);
        if (mode === "demo") {
          const filtered = tasks.filter(
            (task) =>
              (!input.projectId || task.projectId === input.projectId) &&
              (!input.status || task.status === input.status) &&
              (!input.category || task.category === input.category) &&
              (!input.dayNumber || task.dayNumber === input.dayNumber),
          );
          return {
            tasks: filtered.slice(0, input.limit),
            totalCount: filtered.length,
            nextCursor: null,
          };
        }
        const query = new URLSearchParams();
        Object.entries(input).forEach(([key, value]) => {
          if (value !== undefined) query.set(key, String(value));
        });
        return apiRequest<TaskListResult>(`/api/tasks?${query}`);
      },
    });
    register({
      name: "create_task",
      title: "Create a task",
      description:
        "Create a task through the same validated repository used by the dashboard.",
      inputSchema: {
        type: "object",
        properties: {
          title: { type: "string", minLength: 1, maxLength: 120 },
          description: { type: "string", maxLength: 20000 },
          priority: { type: "string", enum: ["low", "medium", "high"] },
          dueDate: { type: "string", format: "date" },
          projectId: { type: "string", format: "uuid" },
          parentTaskId: { type: "string", format: "uuid" },
          category: { type: "string" },
          estimatedMinutes: { type: "integer", minimum: 0 },
          dayNumber: { type: "integer", minimum: 1 },
          tags: { type: "array", items: { type: "string" } },
        },
        required: ["title"],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: false, untrustedContentHint: false },
      async execute(rawInput) {
        const input = createToolSchema.parse(rawInput);
        const timezone =
          projects.find((project) => project.id === input.projectId)
            ?.timezone ?? "Asia/Manila";
        const task = await createTask({
          projectId: input.projectId ?? null,
          parentTaskId: input.parentTaskId ?? null,
          externalKey: null,
          title: input.title,
          description: input.description || null,
          priority: input.priority,
          status: "todo",
          dueDate: input.dueDate
            ? dateOnlyToZonedEndOfDay(input.dueDate, timezone)
            : null,
          category: input.category ?? null,
          estimatedMinutes: input.estimatedMinutes ?? null,
          dayNumber: input.dayNumber ?? null,
          definitionOfDone: null,
          requiredEvidence: null,
          interviewCompetency: null,
          resourceLinks: [],
          notes: null,
          tags: input.tags ?? [],
          dependencyIds: [],
        });
        return task;
      },
    });
    register({
      name: "import_project_plan",
      title: "Import project plan",
      description:
        "Validate or atomically import a project manifest. Dry-run defaults to true.",
      inputSchema: {
        type: "object",
        properties: {
          manifest: { type: "object" },
          dryRun: { type: "boolean", default: true },
        },
        required: ["manifest"],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: false, untrustedContentHint: true },
      execute: async (raw) => {
        if (mode !== "supabase")
          throw new Error(
            "Project import requires an authenticated workspace.",
          );
        const input = z
          .object({
            manifest: z.record(z.string(), z.unknown()),
            dryRun: z.boolean().default(true),
          })
          .parse(raw);
        return apiRequest<unknown>("/api/import/project-plan", {
          method: "POST",
          body: JSON.stringify({ ...input.manifest, dryRun: input.dryRun }),
        });
      },
    });

    return () => lifecycle.abort();
  }, [createTask, mode, projects, tasks]);
}
