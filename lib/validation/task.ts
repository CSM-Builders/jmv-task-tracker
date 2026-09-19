import { z } from "zod";
import { TASK_PRIORITIES, TASK_STATUSES } from "@/types/task";

export const taskFormSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "Enter a task title.")
    .max(120, "Keep the title under 120 characters."),
  description: z
    .string()
    .trim()
    .max(1_000, "Keep the description under 1,000 characters."),
  status: z.enum(TASK_STATUSES),
  priority: z.enum(TASK_PRIORITIES),
  dueDate: z
    .string()
    .refine(
      (value) => value === "" || !Number.isNaN(Date.parse(`${value}T12:00:00`)),
      "Choose a valid due date.",
    ),
});

export type TaskFormValues = z.infer<typeof taskFormSchema>;

const nullableDateTime = z.string().datetime({ offset: true }).nullable();

export const taskInputSchema = z.object({
  title: z.string().trim().min(1).max(120),
  description: z.string().trim().max(1_000).nullable(),
  status: z.enum(TASK_STATUSES),
  priority: z.enum(TASK_PRIORITIES),
  dueDate: nullableDateTime,
});

export const taskUpdateSchema = taskInputSchema
  .partial()
  .refine((value) => Object.keys(value).length > 0, {
    message: "Provide at least one field to update.",
  });

export const taskIdSchema = z.uuid();

export function formValuesToTaskInput(values: TaskFormValues) {
  return taskInputSchema.parse({
    title: values.title,
    description: values.description || null,
    status: values.status,
    priority: values.priority,
    dueDate: values.dueDate
      ? new Date(`${values.dueDate}T23:59:59`).toISOString()
      : null,
  });
}
