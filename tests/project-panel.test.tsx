import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ProjectPanel } from "@/components/projects/project-panel";
import { makeTask } from "./fixtures";
import type { Project } from "@/types/task";

const project = (id: string, name: string): Project => ({
  id,
  userId: "demo-user",
  name,
  description: null,
  timezone: "Asia/Manila",
  startDate: null,
  endDate: null,
  externalKey: null,
  createdAt: "2030-04-01T10:00:00.000Z",
  updatedAt: "2030-04-01T10:00:00.000Z",
});

const baseProps = {
  projects: [],
  tasks: [],
  selectedProjectId: "",
  busyId: null,
  projectLoad: { status: "ready" as const, failure: null },
  taskLoad: { status: "ready" as const, failure: null },
  onSelect: vi.fn(),
  onCreate: vi.fn(async () => {}),
  onDeleteProject: vi.fn(),
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

  it("separates active work from completed task and project history", async () => {
    const user = userEvent.setup();
    const projects = [
      project("active", "Active project"),
      project("done", "Finished project"),
      project("empty", "Empty project"),
    ];
    const tasks = [
      makeTask({ id: "a1", projectId: "active", title: "Open task" }),
      makeTask({
        id: "a2",
        projectId: "active",
        title: "Finished task",
        status: "completed",
      }),
      makeTask({
        id: "d1",
        projectId: "done",
        title: "Archived task",
        status: "completed",
      }),
    ];
    render(
      <ProjectPanel
        {...baseProps}
        projects={projects}
        tasks={tasks}
        selectedProjectId="active"
      />,
    );

    expect(screen.getByRole("tab", { name: "Active" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(screen.getByRole("button", { name: "Empty project" })).toBeVisible();
    expect(
      screen.queryByRole("button", { name: "Finished project" }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Open task" })).toBeVisible();
    expect(
      screen.queryByRole("heading", { name: "Finished task" }),
    ).not.toBeInTheDocument();

    await user.click(screen.getByRole("tab", { name: "History" }));
    expect(
      screen.getByRole("button", { name: "Finished project" }),
    ).toBeVisible();
    expect(
      screen.queryByRole("button", { name: "Empty project" }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Finished task" }),
    ).toBeVisible();
    expect(
      screen.queryByRole("heading", { name: "Open task" }),
    ).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Finished project" }));
    expect(baseProps.onSelect).toHaveBeenCalledWith("done");
  });

  it("shows a task-load error before inferring project completion", () => {
    render(
      <ProjectPanel
        {...baseProps}
        projects={[project("empty", "Empty project")]}
        taskLoad={{
          status: "error",
          failure: { message: "Tasks could not be loaded." },
        }}
      />,
    );
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Tasks could not be loaded.",
    );
    expect(screen.queryByText("No projects yet")).not.toBeInTheDocument();
  });

  it("allows keyboard movement between Active and History", async () => {
    const user = userEvent.setup();
    render(<ProjectPanel {...baseProps} />);
    const active = screen.getByRole("tab", { name: "Active" });
    const history = screen.getByRole("tab", { name: "History" });
    active.focus();
    await user.keyboard("{ArrowRight}");
    expect(history).toHaveFocus();
    expect(history).toHaveAttribute("aria-selected", "true");
    await user.keyboard("{ArrowLeft}");
    expect(active).toHaveFocus();

    await user.click(screen.getByRole("button", { name: "New project" }));
    expect(
      screen.getByRole("button", { name: "Create project" }),
    ).toBeVisible();
    await user.click(history);
    expect(
      screen.queryByRole("button", { name: "Create project" }),
    ).not.toBeInTheDocument();
  });

  it("keeps an unfinished child visible when its completed parent is in History", async () => {
    const user = userEvent.setup();
    render(
      <ProjectPanel
        {...baseProps}
        projects={[project("p", "Mixed hierarchy")]}
        tasks={[
          makeTask({
            id: "parent",
            projectId: "p",
            title: "Finished parent",
            status: "completed",
            dayNumber: 1,
          }),
          makeTask({
            id: "child",
            projectId: "p",
            parentTaskId: "parent",
            title: "Open child",
            dayNumber: 1,
          }),
        ]}
      />,
    );

    expect(screen.getByRole("heading", { name: "Open child" })).toBeVisible();
    expect(
      screen.queryByRole("heading", { name: "Finished parent" }),
    ).not.toBeInTheDocument();
    await user.click(screen.getByRole("tab", { name: "History" }));
    expect(
      screen.getByRole("heading", { name: "Finished parent" }),
    ).toBeVisible();
    expect(
      screen.queryByRole("heading", { name: "Open child" }),
    ).not.toBeInTheDocument();
  });
});
