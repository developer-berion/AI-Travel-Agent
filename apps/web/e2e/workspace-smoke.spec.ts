import { type Page, expect, test } from "@playwright/test";

const seedMockOperatorSession = async (page: Page) => {
  const cookieValue = Buffer.from(
    JSON.stringify({
      email: "operator@alana.mock",
      fullName: "operator",
      id: crypto.randomUUID(),
      role: "operator",
    }),
    "utf8",
  ).toString("base64url");

  await page.context().addCookies([
    {
      domain: "localhost",
      httpOnly: true,
      name: "alana-operator",
      path: "/",
      sameSite: "Lax",
      value: cookieValue,
    },
  ]);
};

const enterWorkspace = async (page: Page) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/login$/);
  await seedMockOperatorSession(page);
  await page.goto("/quotes");
  await expect(page).toHaveURL(/\/quotes$/);
};

const createQuote = async (page: Page) => {
  await expect(
    page.getByRole("main").getByRole("button", { name: "Nueva cotización" }),
  ).toBeVisible();
  const response = await page.context().request.post("/api/quote-sessions", {
    data: {
      agencyName: "Alana Tours",
    },
  });
  expect(response.ok()).toBe(true);
  const payload = (await response.json()) as {
    quoteSessionId: string;
  };
  await page.goto(`/quotes/${payload.quoteSessionId}/conversation`);
  await expect(page).toHaveURL(/\/quotes\/.+\/conversation$/);
};

const sendComposerMessage = async (page: Page, content: string) => {
  await page.getByRole("textbox").fill(content);
  await page.getByRole("button", { name: "Enviar" }).click();
};

const getCurrentQuoteSessionId = (page: Page) => {
  const quoteSessionId = page.url().match(/\/quotes\/([^/]+)/)?.[1];

  expect(quoteSessionId).toBeTruthy();

  if (!quoteSessionId) {
    throw new Error("No se pudo resolver el quoteSessionId actual.");
  }

  return quoteSessionId;
};

const gotoQuoteSurface = async (
  page: Page,
  surface: "case" | "conversation" | "quote" | "versions",
) => {
  const quoteSessionId = getCurrentQuoteSessionId(page);

  await page.goto(`/quotes/${quoteSessionId}/${surface}`);
  await expect(page).toHaveURL(
    new RegExp(`/quotes/${quoteSessionId}/${surface}$`),
  );
};

const runQuoteCommand = async (
  page: Page,
  commandName: string,
  payload: Record<string, unknown>,
) => {
  const quoteSessionId = getCurrentQuoteSessionId(page);
  const response = await page
    .context()
    .request.post(`/api/quote-sessions/${quoteSessionId}/commands`, {
      data: {
        commandName,
        payload,
      },
    });
  expect(response.ok()).toBe(true);
  await page.reload();
};

test("mock operator can sign in, create a blocked intake, and see the grouped inbox", async ({
  page,
}) => {
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

  await page.goto("/");
  await expect(page).toHaveURL(/\/login$/);
  await expect(
    page.getByRole("heading", { name: "Acceso al workspace" }),
  ).toBeVisible();

  const html = page.locator("html");
  const initialTheme = await html.getAttribute("data-theme");
  await page.getByRole("button", { name: /Cambiar a modo/i }).click();
  await expect(html).not.toHaveAttribute("data-theme", initialTheme ?? "");

  await seedMockOperatorSession(page);
  await page.goto("/quotes");
  await expect(page).toHaveURL(/\/quotes$/);
  await expect(page.getByText("No hay casos activos todavía")).toBeVisible();

  await createQuote(page);
  await runQuoteCommand(page, "append_operator_message", {
    content: "Need hotel for 2 adults",
  });

  await expect(page.getByText("Acción requerida").first()).toBeVisible();
  await expect(page.getByText("Intake bloqueado").first()).toBeVisible();
  await expect(page.getByText("Resolver bloqueo").first()).toBeVisible();

  await page.goto("/quotes");
  await expect(page.getByText("Acción requerida").first()).toBeVisible();
  await expect(page.getByText("Mostrar archivadas")).toBeVisible();
  await expect(page.getByLabel("Buscar")).toBeVisible();
});

test("partial coverage stays visible, compare is category-specific, and versions show superseded diff", async ({
  page,
}) => {
  await enterWorkspace(page);
  await createQuote(page);
  await sendComposerMessage(
    page,
    "Need hotel and transfer in Madrid from 2026-05-01 to 2026-05-05 for 2 adults",
  );

  await expect(page.getByText("Cobertura parcial").first()).toBeVisible();
  await expect(page.getByText("Resultados listos").first()).toBeVisible();

  await page
    .getByRole("button", { name: "Agregar a comparativa" })
    .nth(0)
    .click();
  await page
    .getByRole("button", { name: "Seleccionar para propuesta" })
    .nth(1)
    .click();
  await page
    .getByRole("link", { name: "Propuesta" })
    .evaluate((element) => (element as HTMLAnchorElement).click());
  await expect(page).toHaveURL(/\/quotes\/.+\/quote$/);

  await expect(page.getByText("Matriz por categoría")).toBeVisible();
  await expect(page.getByText("Promover a propuesta")).toBeVisible();
  await expect(page.getByText("Lo que decide")).toBeVisible();

  await page
    .getByRole("button", { name: "Promover a propuesta" })
    .first()
    .click();
  await gotoQuoteSurface(page, "versions");

  await expect(page.getByText("Histórica").first()).toBeVisible();
  await page.getByRole("button", { name: /v1/i }).click();
  await expect(page.getByText("Cambios frente a la activa")).toBeVisible();
  await expect(
    page.getByText(/añadida|reemplazada|retirada/i).first(),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Usar como base" }),
  ).toBeVisible();
});

test("no results surfaces recovery guidance", async ({ page }) => {
  await enterWorkspace(page);
  await createQuote(page);
  await sendComposerMessage(
    page,
    "Need hotel in Smallville from 2026-05-01 to 2026-05-05 for 2 adults",
  );

  await expect(page.getByText("Sin resultados").first()).toBeVisible();
  await expect(
    page.getByText(/la b[uú]squeda no devolvi[oó] opciones activas/i).first(),
  ).toBeVisible();
  await gotoQuoteSurface(page, "quote");
  await expect(
    page.getByRole("button", { name: /Más opciones de Hotel/i }),
  ).toBeVisible();
});

test("quote review exposes pricing split and keeps operator notes out of quote and export", async ({
  page,
}) => {
  const noteSentinel = "internal note qa sentinel";

  await enterWorkspace(page);
  await createQuote(page);
  await sendComposerMessage(
    page,
    "Need hotel in Madrid from 2026-05-01 to 2026-05-05 for 2 adults",
  );
  await page
    .getByRole("button", { name: "Seleccionar para propuesta" })
    .first()
    .click();

  await gotoQuoteSurface(page, "case");
  const notesField = page.getByPlaceholder(
    "Seguimiento interno, caveats comerciales, pendientes con proveedor...",
  );
  await notesField.fill(noteSentinel);
  await page.getByRole("button", { name: "Guardar notas" }).click();
  await expect(notesField).toHaveValue(noteSentinel);

  await gotoQuoteSurface(page, "quote");
  await expect(page.getByText("Precios y taxes")).toBeVisible();
  await expect(page.getByText("No incluido")).toBeVisible();
  await expect(page.getByText("Taxes due at check-in.").first()).toBeVisible();
  await expect(page.getByText(noteSentinel)).not.toBeVisible();

  await page.getByRole("button", { name: "Exportar propuesta PDF" }).click();
  await expect(page).toHaveURL(/\/quotes\/.+\/export\/.+/);
  await expect(page.getByText("Exportación", { exact: true })).toBeVisible();
  await expect(page.getByText("Taxes due at check-in.").first()).toBeVisible();
  await expect(page.getByText(noteSentinel)).not.toBeVisible();
});

test("archive, reactivate, and resume prioritize continuity over transcript", async ({
  page,
}) => {
  await enterWorkspace(page);
  await createQuote(page);
  await sendComposerMessage(
    page,
    "Need hotel in Madrid from 2026-05-01 to 2026-05-05 for 2 adults",
  );
  await page
    .getByRole("button", { name: "Seleccionar para propuesta" })
    .first()
    .click();

  await page.getByRole("button", { name: "Archivar caso" }).click();
  await expect(
    page.getByRole("button", { name: "Reactivar caso" }),
  ).toBeVisible();

  await page.getByRole("button", { name: "Reactivar caso" }).click();
  await expect(page.getByText("Continuidad").first()).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Ver propuesta activa" }),
  ).toBeVisible();
  await expect(page.locator("details.transcript-toggle")).toHaveJSProperty(
    "open",
    false,
  );
});

test("mock operator can generate a downloadable PDF export from a selected bundle", async ({
  page,
}) => {
  await enterWorkspace(page);
  await createQuote(page);
  await sendComposerMessage(
    page,
    "Need hotel in Madrid from 2026-05-01 to 2026-05-05 for 2 adults",
  );
  await page
    .getByRole("button", { name: "Seleccionar para propuesta" })
    .first()
    .click();
  await gotoQuoteSurface(page, "quote");

  await expect(
    page.getByRole("button", { name: "Exportar propuesta PDF" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Exportar propuesta PDF" }).click();

  await expect(page).toHaveURL(/\/quotes\/.+\/export\/.+/);
  await expect(page.getByText("Exportación", { exact: true })).toBeVisible();
  const pdfLink = page.getByRole("link", { name: "Descargar PDF" });
  await expect(pdfLink).toBeVisible();

  const pdfPath = await pdfLink.getAttribute("href");
  expect(pdfPath).toBeTruthy();

  const pdfResponse = await page.context().request.get(pdfPath ?? "");
  expect(pdfResponse.ok()).toBe(true);
  expect(pdfResponse.headers()["content-type"]).toContain("application/pdf");
});
