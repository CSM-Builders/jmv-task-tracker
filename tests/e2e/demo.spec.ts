import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.clear());
  await page.goto("/");
  await expect(page.getByLabel("Demo Mode")).toBeVisible();
});

test("demo mode supports the critical task workflow", async ({ page }) => {
  await expect(page.getByLabel("Demo Mode")).toBeVisible();

  await page.getByRole("button", { name: "New Task" }).click();
  await page
    .getByRole("textbox", { name: /Title/ })
    .fill("Portfolio launch checklist");
  await page
    .getByRole("textbox", { name: /Description/ })
    .fill("Verify responsive layout and monitoring.");
  await page
    .getByRole("dialog")
    .getByLabel("Priority", { exact: true })
    .selectOption("high");
  await page.getByRole("button", { name: "Create task" }).click();
  await expect(
    page.getByRole("heading", { name: "Portfolio launch checklist" }),
  ).toBeVisible();

  await page
    .getByRole("button", { name: "Edit Portfolio launch checklist" })
    .click();
  await page
    .getByRole("textbox", { name: /Title/ })
    .fill("Portfolio launch review");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(
    page.getByRole("heading", { name: "Portfolio launch review" }),
  ).toBeVisible();

  await page
    .getByLabel("Change status for Portfolio launch review")
    .selectOption("completed");
  await expect(page.getByText("Task completed.")).toBeVisible();

  await page
    .getByLabel("Filter by status", { exact: true })
    .selectOption("completed");
  await expect(
    page.getByRole("heading", { name: "Portfolio launch review" }),
  ).toBeVisible();

  await page
    .getByRole("button", { name: "Delete Portfolio launch review" })
    .click();
  await page.getByRole("button", { name: "Delete task" }).click();
  await expect(
    page.getByRole("heading", { name: "Portfolio launch review" }),
  ).toHaveCount(0);
});

test("theme and keyboard controls remain usable", async ({ page }) => {
  const themeButton = page.getByRole("button", { name: "Toggle color theme" });
  await themeButton.focus();
  await expect(themeButton).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");

  await page.getByRole("button", { name: "New Task" }).focus();
  await page.keyboard.press("Enter");
  await expect(
    page.getByRole("dialog", { name: "Capture the next action" }),
  ).toBeVisible();
  await expect(page.getByRole("textbox", { name: /Title/ })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("dialog", { name: "Capture the next action" }),
  ).toHaveCount(0);
});

test("projects derive progress from leaf subtasks", async ({ page }) => {
  await page
    .getByRole("button", { name: "Projects", exact: true })
    .first()
    .click();
  await page.getByRole("button", { name: "New project" }).click();
  const projectForm = page
    .locator("form")
    .filter({ has: page.getByRole("button", { name: "Create project" }) });
  await projectForm.locator('input[name="name"]').fill("Interview sprint");
  await projectForm
    .locator('input[name="externalKey"]')
    .fill("interview-sprint");
  await projectForm.locator('input[name="startDate"]').fill("2026-09-20");
  await projectForm.locator('input[name="endDate"]').fill("2026-09-23");
  await page.getByRole("button", { name: "Create project" }).click();
  await expect(
    page.getByRole("heading", { name: "Interview sprint" }),
  ).toBeVisible();

  await page.getByRole("button", { name: "New Task" }).click();
  await page.getByRole("textbox", { name: /Title/ }).fill("Day 1 milestone");
  await page
    .getByLabel("Project", { exact: true })
    .selectOption({ label: "Interview sprint" });
  await page.getByLabel("Day number").fill("1");
  await page.getByRole("button", { name: "Create task" }).click();

  await page.getByRole("button", { name: "New Task" }).click();
  await page.getByRole("textbox", { name: /Title/ }).fill("Draft architecture");
  await page
    .getByRole("textbox", { name: /Description/ })
    .fill("- [ ] Draw boundaries\n- [x] Record assumptions");
  await page
    .getByLabel("Project", { exact: true })
    .selectOption({ label: "Interview sprint" });
  await page
    .getByLabel("Parent task", { exact: true })
    .selectOption({ label: "Day 1 milestone" });
  await page.getByLabel("Estimate (minutes)").fill("60");
  await page.getByLabel("Day number").fill("1");
  await page.getByLabel(/Due date/).fill("2026-09-20");
  await page.getByRole("button", { name: "Create task" }).click();

  await expect(page.getByText("0/1 (0%)")).toBeVisible();
  await expect(page.getByText(/Sep 20, 2026 \(Asia\/Manila\)/)).toBeVisible();
  await page
    .getByLabel("Change status for Draft architecture")
    .selectOption("completed");
  await expect(page.getByText("1/1 (100%)")).toBeVisible();
  await expect(page.getByText("60 min")).toBeVisible();
});
