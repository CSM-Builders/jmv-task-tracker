import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { TaskCard } from "@/components/tasks/task-card";
import { makeTask } from "./fixtures";

describe("TaskCard", () => {
  it("exposes task actions with accessible names and changes status", async () => {
    const user = userEvent.setup();
    const task = makeTask();
    const onStatus = vi.fn().mockResolvedValue(undefined);
    render(
      <TaskCard
        task={task}
        tasks={[task]}
        projects={[]}
        busy={false}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onStatus={onStatus}
      />,
    );

    expect(
      screen.getByRole("button", { name: `Edit ${task.title}` }),
    ).toBeInTheDocument();
    await user.selectOptions(
      screen.getByLabelText(`Change status for ${task.title}`),
      "completed",
    );
    expect(onStatus).toHaveBeenCalledWith(task, "completed");
  });
});
