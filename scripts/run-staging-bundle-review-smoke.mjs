import { randomBytes } from "node:crypto";

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
  const parsedBody = rawBody.length > 0 ? JSON.parse(rawBody) : null;

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

const createQuoteSession = async (cookieHeader) => {
  const { body } = await requestJson(`${stagingBaseUrl}/api/quote-sessions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: cookieHeader,
    },
    body: JSON.stringify({
      agencyName: "Staging Bundle Smoke",
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

const assert = (condition, message) => {
  if (!condition) {
    throw new Error(`assertion_failed:${message}`);
  }
};

const main = async () => {
  let userId = null;

  try {
    userId = await createSmokeUser();
    assert(userId, "smoke_user_not_created");

    const login = await loginToStaging();
    assert(login.cookieHeader.length > 0, "auth_cookie_missing");

    const quoteSessionId = await createQuoteSession(login.cookieHeader);
    assert(quoteSessionId, "quote_session_not_created");

    const searchResult = await runCommand(
      login.cookieHeader,
      quoteSessionId,
      "append_operator_message",
      {
        content:
          "Need hotel in Madrid from 2026-05-01 to 2026-05-05 for 2 adults",
      },
    );
    const searchRecord = await getQuoteRecord(login.cookieHeader, quoteSessionId);
    const optionId = searchRecord.shortlists?.[0]?.items?.[0]?.id;

    assert(searchResult.nextAction === "results_ready", "search_not_ready");
    assert(searchRecord.session.status === "reviewing", "session_not_reviewing");
    assert(typeof optionId === "string" && optionId.length > 0, "option_missing");

    const selectResult = await runCommand(
      login.cookieHeader,
      quoteSessionId,
      "select_option_for_cart",
      {
        optionId,
      },
    );
    const selectedRecord = await getQuoteRecord(login.cookieHeader, quoteSessionId);

    assert(
      selectResult.nextAction === "export_ready",
      `unexpected_select_action:${selectResult.nextAction}`,
    );
    assert(
      selectedRecord.session.status === "export_ready",
      `unexpected_select_status:${selectedRecord.session.status}`,
    );
    assert(
      selectedRecord.selectedItems?.length === 1,
      "selected_items_not_persisted",
    );
    assert(
      selectedRecord.session.activeQuoteVersion >= 2,
      "quote_version_not_incremented",
    );
    assert(
      selectResult.viewModelDelta?.bundleReview?.isExportReady === true,
      "bundle_not_export_ready",
    );

    const removeResult = await runCommand(
      login.cookieHeader,
      quoteSessionId,
      "remove_cart_item",
      {
        optionId,
      },
    );
    const removedRecord = await getQuoteRecord(login.cookieHeader, quoteSessionId);

    assert(
      removeResult.nextAction === "bundle_blocked",
      `unexpected_remove_action:${removeResult.nextAction}`,
    );
    assert(
      removedRecord.session.status === "reviewing",
      `unexpected_remove_status:${removedRecord.session.status}`,
    );
    assert(
      removedRecord.selectedItems?.length === 0,
      "selected_items_not_removed",
    );
    assert(
      Array.isArray(removeResult.viewModelDelta?.bundleReview?.blockers) &&
        removeResult.viewModelDelta.bundleReview.blockers.length > 0,
      "bundle_blockers_missing_after_remove",
    );

    console.log(
      JSON.stringify(
        {
          ok: true,
          quoteSessionId,
          results: {
            removeAction: removeResult.nextAction,
            removeStatus: removedRecord.session.status,
            searchAction: searchResult.nextAction,
            searchStatus: searchRecord.session.status,
            selectAction: selectResult.nextAction,
            selectStatus: selectedRecord.session.status,
            selectBundleReady:
              selectResult.viewModelDelta?.bundleReview?.isExportReady ?? false,
          },
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
