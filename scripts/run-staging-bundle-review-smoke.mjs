import { randomBytes } from "node:crypto";

import { assertRuntimeSync } from "./runtime-sync-utils.mjs";

const requiredEnvVars = ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"];

const missingEnvVars = requiredEnvVars.filter(
  (name) => !process.env[name] || process.env[name].trim().length === 0,
);

if (missingEnvVars.length > 0) {
  console.error(
    JSON.stringify(
      {
        missingEnvVars,
        ok: false,
      },
      null,
      2,
    ),
  );
  process.exit(1);
}

const stagingBaseUrl =
  process.env.STAGING_BASE_URL?.trim() || "https://alana-ai-agent.vercel.app";
const supabaseUrl = process.env.SUPABASE_URL.trim();
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY.trim();
const smokePassword =
  process.env.STAGING_SMOKE_PASSWORD?.trim() ||
  `Smoke-${randomBytes(8).toString("hex")}!`;
const smokeEmail =
  process.env.STAGING_SMOKE_EMAIL?.trim() ||
  `staging-bundle+${Date.now()}@alanatours.com`;

const requestJson = async (url, init = {}) => {
  const response = await fetch(url, init);
  const rawBody = await response.text();
  let parsedBody = null;

  if (rawBody.length > 0) {
    try {
      parsedBody = JSON.parse(rawBody);
    } catch {
      parsedBody = rawBody;
    }
  }

  if (!response.ok) {
    throw new Error(
      `request_failed:${response.status}:${url}:${JSON.stringify(parsedBody)}`,
    );
  }

  return {
    body: parsedBody,
    response,
  };
};

const requestBinary = async (url, init = {}) => {
  const response = await fetch(url, init);

  if (!response.ok) {
    throw new Error(`request_failed:${response.status}:${url}`);
  }

  return {
    bytes: new Uint8Array(await response.arrayBuffer()),
    response,
  };
};

const createSmokeUser = async () => {
  const { body } = await requestJson(`${supabaseUrl}/auth/v1/admin/users`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
    },
    body: JSON.stringify({
      email: smokeEmail,
      email_confirm: true,
      password: smokePassword,
      user_metadata: {
        full_name: "Bundle Smoke",
        role: "operator",
      },
    }),
  });

  return body?.id;
};

const deleteSmokeUser = async (userId) => {
  if (!userId) {
    return;
  }

  await fetch(`${supabaseUrl}/auth/v1/admin/users/${userId}`, {
    method: "DELETE",
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
    },
  });
};

const getCookieHeader = (response) => {
  const cookies =
    typeof response.headers.getSetCookie === "function"
      ? response.headers.getSetCookie()
      : [];

  return cookies.map((cookie) => cookie.split(";")[0]).join("; ");
};

const loginToStaging = async () => {
  const { body, response } = await requestJson(
    `${stagingBaseUrl}/api/auth/login`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: smokeEmail,
        password: smokePassword,
      }),
    },
  );

  return {
    cookieHeader: getCookieHeader(response),
    operator: body?.operator ?? null,
  };
};

const createQuoteSession = async (cookieHeader, agencyName) => {
  const { body } = await requestJson(`${stagingBaseUrl}/api/quote-sessions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: cookieHeader,
    },
    body: JSON.stringify({
      agencyName,
    }),
  });

  return body?.quoteSessionId;
};

const runCommand = async (cookieHeader, quoteSessionId, commandName, payload) => {
  const { body } = await requestJson(
    `${stagingBaseUrl}/api/quote-sessions/${quoteSessionId}/commands`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: cookieHeader,
      },
      body: JSON.stringify({
        commandName,
        payload,
      }),
    },
  );

  return body;
};

const getQuoteRecord = async (cookieHeader, quoteSessionId) => {
  const { body } = await requestJson(
    `${stagingBaseUrl}/api/quote-sessions/${quoteSessionId}`,
    {
      headers: {
        Cookie: cookieHeader,
      },
    },
  );

  return body;
};

const getQuoteExport = async (cookieHeader, quoteSessionId, exportId) => {
  const { body } = await requestJson(
    `${stagingBaseUrl}/api/quote-sessions/${quoteSessionId}/exports/${exportId}`,
    {
      headers: {
        Cookie: cookieHeader,
      },
    },
  );

  return body;
};

const getQuotePdf = async (cookieHeader, quoteSessionId, exportId) =>
  requestBinary(
    `${stagingBaseUrl}/api/quote-sessions/${quoteSessionId}/exports/${exportId}/pdf`,
    {
      headers: {
        Cookie: cookieHeader,
      },
    },
  );

const assert = (condition, message) => {
  if (!condition) {
    throw new Error(`assertion_failed:${message}`);
  }
};

const runExportScenario = async (cookieHeader) => {
  const quoteSessionId = await createQuoteSession(
    cookieHeader,
    "Staging Bundle Smoke",
  );
  assert(quoteSessionId, "export:quote_session_not_created");

  const searchResult = await runCommand(
    cookieHeader,
    quoteSessionId,
    "append_operator_message",
    {
      content:
        "Need hotel in Madrid from 2026-05-01 to 2026-05-05 for 2 adults",
    },
  );
  const searchRecord = await getQuoteRecord(cookieHeader, quoteSessionId);
  const optionId = searchRecord.shortlists?.[0]?.items?.[0]?.id;

  assert(searchResult.nextAction === "results_ready", "export:search_not_ready");
  assert(
    searchRecord.session.status === "reviewing",
    "export:session_not_reviewing",
  );
  assert(typeof optionId === "string" && optionId.length > 0, "export:option_missing");

  const selectResult = await runCommand(
    cookieHeader,
    quoteSessionId,
    "select_option_for_cart",
    {
      optionId,
    },
  );
  const selectedRecord = await getQuoteRecord(cookieHeader, quoteSessionId);

  assert(
    selectResult.nextAction === "export_ready",
    `export:unexpected_select_action:${selectResult.nextAction}`,
  );
  assert(
    selectedRecord.session.status === "export_ready",
    `export:unexpected_select_status:${selectedRecord.session.status}`,
  );

  const exportResult = await runCommand(
    cookieHeader,
    quoteSessionId,
    "generate_quote_pdf",
    {},
  );
  const exportId = exportResult.viewModelDelta?.exportId;
  const exportedRecord = await getQuoteRecord(cookieHeader, quoteSessionId);

  assert(typeof exportId === "string" && exportId.length > 0, "export:export_id_missing");
  assert(
    exportedRecord.session.status === "exported",
    `export:unexpected_export_status:${exportedRecord.session.status}`,
  );

  const exportPayload = await getQuoteExport(cookieHeader, quoteSessionId, exportId);
  const pdfResponse = await getQuotePdf(cookieHeader, quoteSessionId, exportId);

  assert(exportPayload.export?.id === exportId, "export:metadata_id_mismatch");
  assert(
    exportPayload.export?.snapshotId === exportPayload.snapshot?.id,
    "export:snapshot_link_mismatch",
  );
  assert(
    exportPayload.export?.mimeType === "application/pdf",
    "export:unexpected_mime_type",
  );
  assert(
    pdfResponse.response.headers.get("content-type")?.includes("application/pdf"),
    "export:pdf_content_type_missing",
  );
  assert(pdfResponse.bytes.byteLength > 1000, "export:pdf_empty");

  return {
    exportAction: exportResult.nextAction,
    exportId,
    exportStatus: exportedRecord.session.status,
    pdfBytes: pdfResponse.bytes.byteLength,
    quoteSessionId,
    searchAction: searchResult.nextAction,
    selectAction: selectResult.nextAction,
  };
};

const runRemoveScenario = async (cookieHeader) => {
  const quoteSessionId = await createQuoteSession(
    cookieHeader,
    "Staging Bundle Smoke Remove",
  );
  assert(quoteSessionId, "remove:quote_session_not_created");

  await runCommand(cookieHeader, quoteSessionId, "append_operator_message", {
    content: "Need hotel in Madrid from 2026-05-01 to 2026-05-05 for 2 adults",
  });

  const afterSearch = await getQuoteRecord(cookieHeader, quoteSessionId);
  const optionId = afterSearch.shortlists?.[0]?.items?.[0]?.id;

  assert(typeof optionId === "string" && optionId.length > 0, "remove:option_missing");

  await runCommand(cookieHeader, quoteSessionId, "select_option_for_cart", {
    optionId,
  });

  const removeResult = await runCommand(
    cookieHeader,
    quoteSessionId,
    "remove_cart_item",
    {
      optionId,
    },
  );
  const removedRecord = await getQuoteRecord(cookieHeader, quoteSessionId);

  assert(
    removeResult.nextAction === "bundle_blocked",
    `remove:unexpected_remove_action:${removeResult.nextAction}`,
  );
  assert(
    removedRecord.session.status === "reviewing",
    `remove:unexpected_remove_status:${removedRecord.session.status}`,
  );
  assert(removedRecord.selectedItems?.length === 0, "remove:selected_items_not_removed");

  return {
    quoteSessionId,
    removeAction: removeResult.nextAction,
    removeStatus: removedRecord.session.status,
  };
};

const main = async () => {
  let userId = null;

  try {
    const runtimeSyncCheck = await assertRuntimeSync({
      expectedModes: {
        AI_PROVIDER: "openai",
        AUTH_MODE: "supabase",
        HOTELBEDS_PROVIDER: "hotelbeds",
        QUOTE_EXPORTS_BUCKET: "quote-exports",
        QUOTE_REPOSITORY_MODE: "supabase",
      },
      requestJson,
      stagingBaseUrl,
    });

    userId = await createSmokeUser();
    assert(userId, "smoke_user_not_created");

    const login = await loginToStaging();
    assert(login.cookieHeader.length > 0, "auth_cookie_missing");

    const exportScenario = await runExportScenario(login.cookieHeader);
    const removeScenario = await runRemoveScenario(login.cookieHeader);

    console.log(
      JSON.stringify(
        {
          ok: true,
          results: {
            exportScenario,
            removeScenario,
          },
          runtimeSync: runtimeSyncCheck,
          stagingBaseUrl,
          userEmail: smokeEmail,
        },
        null,
        2,
      ),
    );
  } finally {
    await deleteSmokeUser(userId);
  }
};

main().catch((error) => {
  console.error(
    JSON.stringify(
      {
        message: error instanceof Error ? error.message : String(error),
        ok: false,
        stagingBaseUrl,
        userEmail: smokeEmail,
      },
      null,
      2,
    ),
  );
  process.exit(1);
});
