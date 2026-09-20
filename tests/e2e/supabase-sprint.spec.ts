import { expect, test } from "@playwright/test";
import manifest from "../data/tracker-upgrade-import.json" with { type: "json" };

interface ImportResult {
  dryRun: boolean;
  projectId?: string;
  createdProjectCount: number;
  createdTaskCount: number;
  existingTaskCount: number;
  conflictCount: number;
  wouldCreateProjectCount?: number;
  wouldCreateTaskCount?: number;
  parentCount: number;
  subtaskCount: number;
  totalTaskCount: number;
  estimatedMinutes: number;
  idMap: Record<string, string>;
}

interface ApiTask {
  id: string;
  projectId: string;
  parentTaskId: string | null;
  externalKey: string;
  dueDate: string;
  category: string;
  estimatedMinutes: number | null;
  definitionOfDone: string;
  requiredEvidence: string;
  interviewCompetency: string;
  resourceLinks: string[];
  notes: string;
  tags: string[];
  dependencyIds: string[];
}

const runIntegration = process.env.RUN_SUPABASE_INTEGRATION === "1";
const email = process.env.TEST_USER_EMAIL;
const password = process.env.TEST_USER_PASSWORD;
const secondEmail = process.env.TEST_SECOND_USER_EMAIL;
const secondPassword = process.env.TEST_SECOND_USER_PASSWORD;
let importedProjectId = "";

test.describe("authenticated full sprint import", () => {
  test.describe.configure({ mode: "serial" });
  test.skip(
    !runIntegration || !email || !password,
    "Set RUN_SUPABASE_INTEGRATION=1 and disposable test-user credentials.",
  );

  test("previews, applies, reads back, and idempotently reimports the complete manifest", async ({
    page,
  }, testInfo) => {
    test.skip(
      testInfo.project.name !== "chromium",
      "The destructive local-development import runs once.",
    );

    await page.goto("/sign-in");
    await page.getByLabel("Email address").fill(email!);
    await page.getByLabel("Password").fill(password!);
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page).toHaveURL(/\/$/);

    const previewResponse = await page.request.post(
      "/api/import/project-plan",
      {
        data: { ...manifest, dryRun: true, updateExisting: false },
      },
    );
    expect(previewResponse.ok()).toBe(true);
    const preview = (await previewResponse.json()).data as ImportResult;
    expect(preview).toMatchObject({
      dryRun: true,
      wouldCreateProjectCount: 1,
      wouldCreateTaskCount: 36,
      existingTaskCount: 0,
      conflictCount: 0,
      parentCount: 4,
      subtaskCount: 32,
      totalTaskCount: 36,
      estimatedMinutes: 1680,
    });

    const applyResponse = await page.request.post("/api/import/project-plan", {
      data: { ...manifest, dryRun: false, updateExisting: false },
    });
    expect(applyResponse.ok()).toBe(true);
    const applied = (await applyResponse.json()).data as ImportResult;
    importedProjectId = applied.projectId ?? "";
    expect(applied).toMatchObject({
      dryRun: false,
      createdProjectCount: 1,
      createdTaskCount: 36,
      existingTaskCount: 0,
      conflictCount: 0,
      parentCount: 4,
      subtaskCount: 32,
      totalTaskCount: 36,
      estimatedMinutes: 1680,
    });

    const projectsResponse = await page.request.get("/api/projects");
    expect(projectsResponse.ok()).toBe(true);
    const projects = (await projectsResponse.json()).data as Array<{
      id: string;
      externalKey: string;
      timezone: string;
      startDate: string;
      endDate: string;
    }>;
    const project = projects.find(
      (candidate) => candidate.externalKey === manifest.project.externalKey,
    );
    expect(project).toMatchObject({
      id: applied.projectId,
      timezone: "Asia/Manila",
      startDate: "2026-09-20",
      endDate: "2026-09-23",
    });

    const tasksResponse = await page.request.get(
      `/api/tasks?projectId=${encodeURIComponent(applied.projectId!)}&limit=100`,
    );
    expect(tasksResponse.ok()).toBe(true);
    const taskPage = (await tasksResponse.json()).data as {
      tasks: ApiTask[];
      totalCount: number;
      nextCursor: string | null;
    };
    expect(taskPage.totalCount).toBe(36);
    expect(taskPage.nextCursor).toBeNull();
    expect(
      taskPage.tasks.filter((task) => task.parentTaskId === null),
    ).toHaveLength(4);
    const leaves = taskPage.tasks.filter((task) => task.parentTaskId !== null);
    expect(leaves).toHaveLength(32);
    expect(
      leaves.reduce((sum, task) => sum + (task.estimatedMinutes ?? 0), 0),
    ).toBe(1680);

    const importedByKey = new Map(
      taskPage.tasks.map((task) => [task.externalKey, task]),
    );
    const manifestByKey = new Map(
      manifest.tasks.map((task) => [task.externalKey, task]),
    );
    const lastTask = importedByKey.get("D4.8")!;
    const expectedLast = manifestByKey.get("D4.8")!;
    expect(lastTask).toMatchObject({
      category: expectedLast.category,
      definitionOfDone: expectedLast.definitionOfDone,
      requiredEvidence: expectedLast.requiredEvidence,
      interviewCompetency: expectedLast.interviewCompetency,
      resourceLinks: expectedLast.resourceLinks,
      notes: expectedLast.notes,
      tags: expectedLast.tags,
    });
    expect(lastTask.dueDate).toBe("2026-09-23T15:59:59+00:00");
    expect(lastTask.parentTaskId).toBe(importedByKey.get("D4")!.id);
    expect(lastTask.dependencyIds).toEqual([importedByKey.get("D4.7")!.id]);

    const secondApplyResponse = await page.request.post(
      "/api/import/project-plan",
      {
        data: { ...manifest, dryRun: false, updateExisting: false },
      },
    );
    expect(secondApplyResponse.ok()).toBe(true);
    const secondApply = (await secondApplyResponse.json()).data as ImportResult;
    expect(secondApply).toMatchObject({
      createdProjectCount: 0,
      createdTaskCount: 0,
      existingTaskCount: 36,
      conflictCount: 0,
      totalTaskCount: 36,
    });

    await page.goto("/");
    await page.getByRole("button", { name: "Projects", exact: true }).click();
    await expect(
      page.getByRole("heading", { name: manifest.project.name }),
    ).toBeVisible();
    await expect(page.getByText("0/32 (0%)")).toBeVisible();
    await expect(page.getByText("1680 min")).toBeVisible();
  });

  test("updateExisting persists fingerprinted evidence and resource links", async ({
    page,
  }, testInfo) => {
    test.skip(
      testInfo.project.name !== "chromium",
      "The authenticated database suite runs once.",
    );
    expect(importedProjectId).not.toBe("");

    await page.goto("/sign-in");
    await page.getByLabel("Email address").fill(email!);
    await page.getByLabel("Password").fill(password!);
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page).toHaveURL(/\/$/);

    const updatedRequiredEvidence =
      "Updated integration evidence: reviewer sign-off and release checklist";
    const updatedResourceLinks = [
      "https://example.com/reviewer-sign-off",
      "https://example.com/release-checklist",
    ];
    const updatedManifest = {
      ...manifest,
      tasks: manifest.tasks.map((task) =>
        task.externalKey === "D4.8"
          ? {
              ...task,
              requiredEvidence: updatedRequiredEvidence,
              resourceLinks: updatedResourceLinks,
            }
          : task,
      ),
    };

    const updateResponse = await page.request.post(
      "/api/import/project-plan",
      {
        data: {
          ...updatedManifest,
          dryRun: false,
          updateExisting: true,
        },
      },
    );
    expect(updateResponse.ok()).toBe(true);
    const updated = (await updateResponse.json()).data as ImportResult;
    expect(updated).toMatchObject({
      createdProjectCount: 0,
      createdTaskCount: 0,
      existingTaskCount: 36,
      conflictCount: 0,
    });

    const tasksResponse = await page.request.get(
      `/api/tasks?projectId=${encodeURIComponent(importedProjectId)}&limit=100`,
    );
    expect(tasksResponse.ok()).toBe(true);
    const taskPage = (await tasksResponse.json()).data as {
      tasks: ApiTask[];
      totalCount: number;
    };
    const updatedTask = taskPage.tasks.find(
      (task) => task.externalKey === "D4.8",
    );
    expect(updatedTask).toMatchObject({
      requiredEvidence: updatedRequiredEvidence,
      resourceLinks: updatedResourceLinks,
    });

    const previewResponse = await page.request.post(
      "/api/import/project-plan",
      {
        data: {
          ...updatedManifest,
          dryRun: true,
          updateExisting: false,
        },
      },
    );
    expect(previewResponse.ok()).toBe(true);
    const preview = (await previewResponse.json()).data as ImportResult;
    expect(preview).toMatchObject({
      dryRun: true,
      wouldCreateProjectCount: 0,
      wouldCreateTaskCount: 0,
      existingTaskCount: 36,
      conflictCount: 0,
    });
  });

  test("authenticated RLS hides the imported project from another user", async ({
    page,
  }, testInfo) => {
    test.skip(
      testInfo.project.name !== "chromium",
      "The authenticated database suite runs once.",
    );
    test.skip(
      !secondEmail || !secondPassword,
      "Set dedicated second-user credentials to exercise RLS isolation.",
    );
    expect(importedProjectId).not.toBe("");

    await page.goto("/sign-in");
    await page.getByLabel("Email address").fill(secondEmail!);
    await page.getByLabel("Password").fill(secondPassword!);
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page).toHaveURL(/\/$/);

    const projectsResponse = await page.request.get("/api/projects");
    expect(projectsResponse.ok()).toBe(true);
    const projects = (await projectsResponse.json()).data as Array<{
      externalKey: string;
    }>;
    expect(
      projects.some(
        (project) => project.externalKey === manifest.project.externalKey,
      ),
    ).toBe(false);

    const tasksResponse = await page.request.get(
      `/api/tasks?projectId=${encodeURIComponent(importedProjectId)}&limit=100`,
    );
    expect(tasksResponse.ok()).toBe(true);
    const taskPage = (await tasksResponse.json()).data as {
      tasks: ApiTask[];
      totalCount: number;
    };
    expect(taskPage).toMatchObject({ tasks: [], totalCount: 0 });
  });
});
