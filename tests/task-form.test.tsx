import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { TaskForm } from "@/components/tasks/task-form";

describe("TaskForm", () => {
  it("shows validation feedback and submits a trimmed valid task", async () => {
    const user = userEvent.setup();
    const submit = vi.fn().mockResolvedValue(undefined);
    render(
      <TaskForm
        task={null}
        tasks={[]}
        projects={[]}
        busy={false}
        onClose={vi.fn()}
        onSubmit={submit}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Create task" }));
    expect(await screen.findByText("Enter a task title.")).toBeInTheDocument();

    await user.type(screen.getByLabelText(/Title/), "  Prepare launch notes  ");
    await user.selectOptions(screen.getByLabelText("Priority"), "high");
    await user.click(screen.getByRole("button", { name: "Create task" }));

    expect(submit).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Prepare launch notes",
        priority: "high",
      }),
    );
  });
});
