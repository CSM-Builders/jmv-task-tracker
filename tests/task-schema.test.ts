import { describe, expect, it } from "vitest";
import { formValuesToTaskInput, taskFormSchema } from "@/lib/validation/task";

describe("task validation", () => {
  const defaults = {
    projectId: "",
    parentTaskId: "",
    externalKey: "",
    category: "",
    estimatedMinutes: "",
    dayNumber: "",
    definitionOfDone: "",
    requiredEvidence: "",
    interviewCompetency: "",
    resourceLinks: "",
    notes: "",
    tags: "",
    dependencyIds: [],
  };
  it("trims required text and rejects a blank title", () => {
    const invalid = taskFormSchema.safeParse({
      ...defaults,
      title: "   ",
      description: "",
      status: "todo",
      priority: "medium",
      dueDate: "",
    });
    expect(invalid.success).toBe(false);

    const valid = taskFormSchema.parse({
      ...defaults,
      title: "  Ship review  ",
      description: "  Verify alerts  ",
      status: "todo",
      priority: "high",
      dueDate: "",
    });
    expect(valid.title).toBe("Ship review");
    expect(valid.description).toBe("Verify alerts");
  });

  it("normalizes optional fields for persistence", () => {
    const value = formValuesToTaskInput({
      ...defaults,
      title: "Write notes",
      description: "",
      status: "in_progress",
      priority: "low",
      dueDate: "2030-04-20",
    });
    expect(value.description).toBeNull();
    expect(value.dueDate).toMatch(/^2030-04-20T/);
  });
});
