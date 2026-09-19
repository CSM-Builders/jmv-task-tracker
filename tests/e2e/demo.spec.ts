import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
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
