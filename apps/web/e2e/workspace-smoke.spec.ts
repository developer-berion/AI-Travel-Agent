import { expect, test } from "@playwright/test";

test("mock operator can sign in and open a new quote", async ({ page }) => {
  await page.goto("/");

  await expect(page).toHaveURL(/\/login$/);
  await expect(
    page.getByRole("heading", { name: "Alana Travel Quoting OS" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: /Switch to dark mode/i }),
  ).toBeVisible();

  await page.getByRole("button", { name: /Switch to dark mode/i }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");

  await page.getByRole("button", { name: "Enter workspace" }).click();

  await expect(page).toHaveURL(/\/quotes$/);
  await expect(page.getByRole("heading", { name: "Quotes" })).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await expect(
    page.getByRole("button", { name: /Switch to light mode/i }),
  ).toBeVisible();

  await page
    .getByRole("main")
    .getByRole("button", { name: "New quote" })
    .click();

  await expect(page).toHaveURL(/\/quotes\/.+/);
  await expect(page.getByText("Send the first traveler request")).toBeVisible();
  await expect(page.getByText("Mock auth")).toBeVisible();
});
