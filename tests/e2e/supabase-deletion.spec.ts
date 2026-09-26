import { expect, test, type APIRequestContext } from "@playwright/test";

const enabled = process.env.RUN_SUPABASE_DELETE_INTEGRATION === "1";
const email = process.env.TEST_USER_EMAIL;
const password = process.env.TEST_USER_PASSWORD;
const secondEmail = process.env.TEST_SECOND_USER_EMAIL;
const secondPassword = process.env.TEST_SECOND_USER_PASSWORD;

test("authenticated project and task deletion cascades without crossing accounts", async ({
  page,
  browser,
}, testInfo) => {
  test.skip(
    !enabled || !email || !password || testInfo.project.name !== "chromium",
    "Run only against a development Supabase project with migration 003 and dedicated test users.",
  );

  await page.goto("/sign-in");
  await page.getByLabel("Email address").fill(email!);
  await page.getByLabel("Password").fill(password!);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/$/);

  const request = page.request;
  const createProject = await request.post("/api/projects", {
    data: {
      name: `Deletion test ${crypto.randomUUID()}`,
      description: null,
      timezone: "Asia/Manila",
    },
  });
  expect(createProject.ok(), await createProject.text()).toBe(true);
  const projectId = ((await createProject.json()) as { data: { id: string } })
    .data.id;

  async function createTask(
    title: string,
    options: { parentTaskId?: string; dependencyIds?: string[] } = {},
  ) {
    const response = await request.post("/api/tasks", {
      data: {
        title,
        status: "todo",
        priority: "medium",
        projectId,
        parentTaskId: options.parentTaskId ?? null,
        dependencyIds: options.dependencyIds ?? [],
      },
    });
    expect(response.ok(), await response.text()).toBe(true);
    return ((await response.json()) as { data: { id: string } }).data.id;
  }

  async function projectTasks(api: APIRequestContext) {
    const response = await api.get(`/api/tasks?projectId=${projectId}`);
    expect(response.ok()).toBe(true);
    return (
      (await response.json()) as {
        data: { tasks: { id: string; dependencyIds: string[] }[] };
      }
    ).data.tasks;
  }

  try {
    const parentId = await createTask("Parent");
    const childId = await createTask("Child", { parentTaskId: parentId });
    const dependentId = await createTask("Dependent", {
      dependencyIds: [childId],
    });

    if (secondEmail && secondPassword) {
      const otherContext = await browser.newContext();
      try {
        const otherPage = await otherContext.newPage();
        await otherPage.goto("/sign-in");
        await otherPage.getByLabel("Email address").fill(secondEmail);
        await otherPage.getByLabel("Password").fill(secondPassword);
        await otherPage.getByRole("button", { name: "Sign in" }).click();
        await expect(otherPage).toHaveURL(/\/$/);
        expect(
          (await otherPage.request.delete(`/api/tasks/${parentId}`)).status(),
        ).toBe(404);
        expect(
          (
            await otherPage.request.delete(`/api/projects/${projectId}`)
          ).status(),
        ).toBe(404);
      } finally {
        await otherContext.close();
      }
    }

    expect((await request.delete(`/api/tasks/${parentId}`)).status()).toBe(200);
    await expect(projectTasks(request)).resolves.toMatchObject([
      { id: dependentId, dependencyIds: [] },
    ]);

    expect((await request.delete(`/api/projects/${projectId}`)).status()).toBe(
      200,
    );
    expect((await request.get(`/api/projects/${projectId}`)).status()).toBe(
      404,
    );
    await expect(projectTasks(request)).resolves.toEqual([]);
  } finally {
    await request.delete(`/api/projects/${projectId}`);
  }
});
