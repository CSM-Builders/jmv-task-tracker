import { z } from "zod";
import { dateOnlyToZonedEndOfDay } from "@/lib/utils/timezone";
import { TASK_PRIORITIES, TASK_STATUSES } from "@/types/task";

const optionalText = (maximum: number) =>
  z
    .string()
    .trim()
    .max(maximum)
    .nullable()
    .transform((value) => value || null);

const httpUrl = z
  .url()
  .refine(
    (value) => value.startsWith("http://") || value.startsWith("https://"),
    {
      message: "Use an http or https URL.",
    },
  );

export const taskFormSchema = z.object({
  projectId: z.string(),
  parentTaskId: z.string(),
  externalKey: z.string().trim().max(120),
  title: z.string().trim().min(1, "Enter a task title.").max(120),
  description: z.string().trim().max(20_000),
  status: z.enum(TASK_STATUSES),
  priority: z.enum(TASK_PRIORITIES),
  dueDate: z
    .string()
    .refine((value) => value === "" || /^\d{4}-\d{2}-\d{2}$/.test(value), {
      message: "Choose a valid due date.",
    }),
  category: z.string().trim().max(120),
  estimatedMinutes: z
    .string()
    .refine(
      (value) => value === "" || /^\d+$/.test(value),
      "Use a nonnegative whole number.",
    ),
  dayNumber: z
    .string()
    .refine(
      (value) => value === "" || /^[1-9]\d*$/.test(value),
      "Use a positive whole number.",
    ),
  definitionOfDone: z.string().trim().max(10_000),
  requiredEvidence: z.string().trim().max(10_000),
  interviewCompetency: z.string().trim().max(500),
  resourceLinks: z.string(),
  notes: z.string().trim().max(20_000),
  tags: z.string(),
  dependencyIds: z.array(z.string()),
});

export type TaskFormValues = z.infer<typeof taskFormSchema>;

const nullableDateTime = z.string().datetime({ offset: true }).nullable();

const taskShape = {
  projectId: z.uuid().nullable(),
  parentTaskId: z.uuid().nullable(),
  externalKey: z.string().trim().min(1).max(120).nullable(),
  title: z.string().trim().min(1).max(120),
  description: z.string().trim().max(20_000).nullable(),
  status: z.enum(TASK_STATUSES),
  priority: z.enum(TASK_PRIORITIES),
  dueDate: nullableDateTime,
  category: z.string().trim().max(120).nullable(),
  estimatedMinutes: z.number().int().min(0).nullable(),
  dayNumber: z.number().int().positive().nullable(),
  definitionOfDone: z.string().trim().max(10_000).nullable(),
  requiredEvidence: z.string().trim().max(10_000).nullable(),
  interviewCompetency: z.string().trim().max(500).nullable(),
  resourceLinks: z.array(httpUrl).max(30),
  notes: z.string().trim().max(20_000).nullable(),
  tags: z.array(z.string().trim().min(1).max(60)).max(30),
  dependencyIds: z.array(z.uuid()).max(50),
  dependencyOverrideReason: z
    .string()
    .trim()
    .min(8)
    .max(1_000)
    .nullable()
    .optional(),
};

export const taskInputSchema = z.object({
  ...taskShape,
  projectId: taskShape.projectId.default(null),
  parentTaskId: taskShape.parentTaskId.default(null),
  externalKey: taskShape.externalKey.default(null),
  description: taskShape.description.default(null),
  dueDate: taskShape.dueDate.default(null),
  category: taskShape.category.default(null),
  estimatedMinutes: taskShape.estimatedMinutes.default(null),
  dayNumber: taskShape.dayNumber.default(null),
  definitionOfDone: taskShape.definitionOfDone.default(null),
  requiredEvidence: taskShape.requiredEvidence.default(null),
  interviewCompetency: taskShape.interviewCompetency.default(null),
  resourceLinks: taskShape.resourceLinks.default([]),
  notes: taskShape.notes.default(null),
  tags: taskShape.tags.default([]),
  dependencyIds: taskShape.dependencyIds.default([]),
});

export const taskUpdateSchema = z
  .object(taskShape)
  .partial()
  .refine((value) => Object.keys(value).length > 0, {
    message: "Provide at least one field to update.",
  });

const timezoneSchema = z
  .string()
  .trim()
  .min(1)
  .max(100)
  .refine((value) => {
    try {
      new Intl.DateTimeFormat("en", { timeZone: value });
      return true;
    } catch {
      return false;
    }
  }, "Choose a valid IANA timezone.");

export const projectInputSchema = z
  .object({
    name: z.string().trim().min(1).max(160),
    description: optionalText(20_000),
    timezone: timezoneSchema.default("Asia/Manila"),
    startDate: z.iso.date().nullable().default(null),
    endDate: z.iso.date().nullable().default(null),
    externalKey: z.string().trim().min(1).max(120).nullable().default(null),
  })
  .refine(
    ({ startDate, endDate }) => !startDate || !endDate || startDate <= endDate,
    {
      message: "Project end date must be on or after its start date.",
      path: ["endDate"],
    },
  );

const importTaskSchema = z.object({
  externalKey: z.string().trim().min(1).max(120),
  parentExternalKey: z.string().trim().min(1).max(120).nullable(),
  title: z.string().trim().min(1).max(120),
  description: z.string().trim().max(20_000).nullable().default(null),
  status: z.enum(TASK_STATUSES),
  priority: z.enum(TASK_PRIORITIES),
  dayNumber: z.number().int().positive().nullable().default(null),
  category: z.string().trim().max(120).nullable().default(null),
  estimatedMinutes: z.number().int().min(0).nullable().default(null),
  dueDate: z
    .union([z.iso.date(), z.string().datetime({ offset: true })])
    .nullable(),
  dependencyExternalKeys: z.array(z.string().trim().min(1).max(120)).max(50),
  definitionOfDone: z.string().trim().max(10_000).nullable().default(null),
  requiredEvidence: z.string().trim().max(10_000).nullable().default(null),
  interviewCompetency: z.string().trim().max(500).nullable().default(null),
  resourceLinks: z.array(httpUrl).max(30).default([]),
  notes: z.string().trim().max(20_000).nullable().default(null),
  tags: z.array(z.string().trim().min(1).max(60)).max(30).default([]),
});

export const projectImportSchema = z
  .object({
    schemaVersion: z.literal(1),
    dryRun: z.boolean().default(true),
    updateExisting: z.boolean().default(false),
    project: projectInputSchema.safeExtend({
      externalKey: z.string().trim().min(1).max(120),
    }),
    tasks: z.array(importTaskSchema).min(1).max(100),
  })
  .superRefine(({ project, tasks }, context) => {
    const keys = new Set<string>();
    const statusByKey = new Map(
      tasks.map((task) => [task.externalKey, task.status]),
    );
    for (const [index, task] of tasks.entries()) {
      if (keys.has(task.externalKey))
        context.addIssue({
          code: "custom",
          path: ["tasks", index, "externalKey"],
          message: "Task external keys must be unique within an import.",
        });
      keys.add(task.externalKey);
    }
    for (const [index, task] of tasks.entries()) {
      if (task.parentExternalKey && !keys.has(task.parentExternalKey))
        context.addIssue({
          code: "custom",
          path: ["tasks", index, "parentExternalKey"],
          message: "Parent task is missing from this import.",
        });
      for (const dependency of task.dependencyExternalKeys)
        if (!keys.has(dependency))
          context.addIssue({
            code: "custom",
            path: ["tasks", index, "dependencyExternalKeys"],
            message: `Dependency ${dependency} is missing from this import.`,
          });
      if (
        ["in_progress", "completed"].includes(task.status) &&
        task.dependencyExternalKeys.some(
          (key) => statusByKey.get(key) !== "completed",
        )
      )
        context.addIssue({
          code: "custom",
          path: ["tasks", index, "status"],
          message: "Imported active tasks must have completed prerequisites.",
        });
      if (
        task.status === "completed" &&
        tasks.some(
          (candidate) =>
            candidate.parentExternalKey === task.externalKey &&
            candidate.status !== "completed",
        )
      )
        context.addIssue({
          code: "custom",
          path: ["tasks", index, "status"],
          message: "A completed parent cannot contain incomplete children.",
        });
      if (task.dueDate && /^\d{4}-\d{2}-\d{2}$/.test(task.dueDate)) {
        try {
          dateOnlyToZonedEndOfDay(task.dueDate, project.timezone);
        } catch {
          context.addIssue({
            code: "custom",
            path: ["tasks", index, "dueDate"],
            message: "The date or project timezone is invalid.",
          });
        }
      }
    }
  });

export type ProjectImport = z.infer<typeof projectImportSchema>;

export const taskIdSchema = z.uuid();

export function formValuesToTaskInput(
  values: TaskFormValues,
  timezone = "Asia/Manila",
) {
  return taskInputSchema.parse({
    projectId: values.projectId || null,
    parentTaskId: values.parentTaskId || null,
    externalKey: values.externalKey || null,
    title: values.title,
    description: values.description || null,
    status: values.status,
    priority: values.priority,
    dueDate: values.dueDate
      ? dateOnlyToZonedEndOfDay(values.dueDate, timezone)
      : null,
    category: values.category || null,
    estimatedMinutes:
      values.estimatedMinutes === "" ? null : Number(values.estimatedMinutes),
    dayNumber: values.dayNumber === "" ? null : Number(values.dayNumber),
    definitionOfDone: values.definitionOfDone || null,
    requiredEvidence: values.requiredEvidence || null,
    interviewCompetency: values.interviewCompetency || null,
    resourceLinks: values.resourceLinks
      .split(/\r?\n/)
      .map((value) => value.trim())
      .filter(Boolean),
    notes: values.notes || null,
    tags: values.tags
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean),
    dependencyIds: values.dependencyIds,
  });
}
