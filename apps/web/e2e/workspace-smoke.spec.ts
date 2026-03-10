import { expect, test } from "@playwright/test";

test("mock operator can sign in and open a new quote", async ({ page }) => {
  const runtimeSyncResponse = await page
    .context()
    .request.get("/api/runtime-sync");
  expect(runtimeSyncResponse.ok()).toBe(true);
  const runtimeSyncPayload = await runtimeSyncResponse.json();
  expect(runtimeSyncPayload).toMatchObject({
    AI_PROVIDER: "mock",
    AUTH_MODE: "mock",
    HOTELBEDS_PROVIDER: "mock",
    QUOTE_REPOSITORY_MODE: "mock",
  });
  expect(runtimeSyncPayload.gitSha).toEqual(expect.any(String));
  expect(runtimeSyncPayload.migrationHead).toEqual(expect.any(String));

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

test("mock operator can generate a downloadable PDF export from a selected bundle", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Enter workspace" }).click();
  await page
    .getByRole("main")
    .getByRole("button", { name: "New quote" })
    .click();

  await page
    .getByRole("textbox")
    .fill("Need hotel in Madrid from 2026-05-01 to 2026-05-05 for 2 adults");
  await page.getByRole("button", { name: "Send" }).click();

  await expect(
    page.getByRole("heading", { name: "Supplier-grounded options" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Select for quote" }).first().click();

  await expect(
    page.getByRole("button", { name: "Generate PDF export" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Generate PDF export" }).click();

  await expect(page).toHaveURL(/\/quotes\/.+\/export\/.+/);
  await expect(page.getByText("Quote export", { exact: true })).toBeVisible();
  const pdfLink = page.getByRole("link", { name: "Download PDF" });
  await expect(pdfLink).toBeVisible();

  const pdfPath = await pdfLink.getAttribute("href");
  expect(pdfPath).toBeTruthy();

  const pdfResponse = await page.context().request.get(pdfPath ?? "");
  expect(pdfResponse.ok()).toBe(true);
  expect(pdfResponse.headers()["content-type"]).toContain("application/pdf");
});
