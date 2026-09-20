import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ProjectPanel } from "@/components/projects/project-panel";

const baseProps = {
  projects: [],
  tasks: [],
  selectedProjectId: "",
  busyId: null,
  projectLoad: { status: "ready" as const, failure: null },
  taskLoad: { status: "ready" as const, failure: null },
  onSelect: vi.fn(),
  onCreate: vi.fn(async () => {}),
  onEdit: vi.fn(),
  onDelete: vi.fn(),
  onStatus: vi.fn(async () => {}),
  onRetryProjects: vi.fn(),
  onReload: vi.fn(async () => {}),
};

describe("ProjectPanel resource and form states", () => {
  it("shows a failed project request instead of an empty workspace", async () => {
    const onRetryProjects = vi.fn();
    const user = userEvent.setup();
    render(
      <ProjectPanel
        {...baseProps}
        projectLoad={{
          status: "error",
          failure: {
            message: "Projects could not be loaded.",
            code: "PROJECTS_LIST_FAILED",
            requestId: "request-123",
            detail: "PGRST205: public.projects was not found",
          },
        }}
        onRetryProjects={onRetryProjects}
      />,
    );

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Projects could not be loaded.",
    );
    expect(screen.getByRole("alert")).toHaveTextContent("PROJECTS_LIST_FAILED");
    expect(screen.queryByText("No projects yet")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Retry" }));
    expect(onRetryProjects).toHaveBeenCalledOnce();
  });

  it("shows the empty state only after a successful empty response", () => {
    render(<ProjectPanel {...baseProps} />);
    expect(screen.getByText("No projects yet")).toBeVisible();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("keeps create and import panels mutually exclusive and validates creation", async () => {
    const user = userEvent.setup();
    render(<ProjectPanel {...baseProps} />);

    await user.click(screen.getByRole("button", { name: "New project" }));
    const create = screen.getByRole("button", { name: "Create project" });
    expect(create).toBeDisabled();

    await user.type(screen.getByRole("textbox", { name: "Name" }), "Sprint");
    expect(create).toBeEnabled();

    await user.click(screen.getByRole("button", { name: "Import JSON" }));
    expect(screen.getByText("Import project plan")).toBeVisible();
    expect(
      screen.queryByRole("button", { name: "Create project" }),
    ).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "New project" }));
    expect(screen.queryByText("Import project plan")).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Create project" }),
    ).toBeEnabled();
  });
});
