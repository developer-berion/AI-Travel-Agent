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
  process.env.STAGING_SMOKE_PASSWORD?.trim() || `Smoke-${randomBytes(8).toString("hex")}!`;
const smokeEmail =
  process.env.STAGING_SMOKE_EMAIL?.trim() ||
  `staging-smoke+${Date.now()}@alanatours.com`;

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
        full_name: "Staging Smoke",
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

const appendOperatorMessage = async (cookieHeader, quoteSessionId, content) => {
  const { body } = await requestJson(
    `${stagingBaseUrl}/api/quote-sessions/${quoteSessionId}/commands`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: cookieHeader,
      },
      body: JSON.stringify({
        commandName: "append_operator_message",
        payload: {
          content,
        },
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

const hasSupplierSource = (record, expectedSource) =>
  record.shortlists.some((shortlist) =>
    shortlist.items.some(
      (item) => item?.supplierMetadata?.source === expectedSource,
    ),
  );

const runScenario = async (cookieHeader, scenario) => {
  const quoteSessionId = await createQuoteSession(cookieHeader, "Staging Smoke");
  assert(quoteSessionId, `${scenario.name}:quote_session_not_created`);

  const commandResult = await appendOperatorMessage(
    cookieHeader,
    quoteSessionId,
    scenario.content,
  );
  const record = await getQuoteRecord(cookieHeader, quoteSessionId);

  assert(
    commandResult.nextAction === scenario.expectedNextAction,
    `${scenario.name}:unexpected_next_action:${commandResult.nextAction}`,
  );
  assert(
    record.session.status === scenario.expectedStatus,
    `${scenario.name}:unexpected_status:${record.session.status}`,
  );

  for (const expectedSource of scenario.expectedSources) {
    assert(
      hasSupplierSource(record, expectedSource),
      `${scenario.name}:missing_source:${expectedSource}`,
    );
  }

  for (const blockedService of scenario.expectedBlockedServices ?? []) {
    assert(
      record.intake?.readinessByServiceLine?.[blockedService] === "blocked",
      `${scenario.name}:service_not_blocked:${blockedService}`,
    );
  }

  if (scenario.pendingQuestionIncludes) {
    assert(
      typeof record.session.pendingQuestion === "string" &&
        record.session.pendingQuestion
          .toLowerCase()
          .includes(scenario.pendingQuestionIncludes.toLowerCase()),
      `${scenario.name}:missing_pending_question:${scenario.pendingQuestionIncludes}`,
    );
  }

  return {
    expectedNextAction: scenario.expectedNextAction,
    expectedSources: scenario.expectedSources,
    name: scenario.name,
    nextAction: commandResult.nextAction,
    quoteSessionId,
    status: record.session.status,
    supplierSources: record.shortlists.flatMap((shortlist) =>
      shortlist.items.map((item) => item?.supplierMetadata?.source ?? "unknown"),
    ),
  };
};

const scenarios = [
  {
    content:
      "Need hotel in Madrid from 2026-05-01 to 2026-05-05 for 2 adults",
    expectedNextAction: "results_ready",
    expectedSources: ["hotelbeds_hotels"],
    expectedStatus: "reviewing",
    name: "hotel_only",
  },
  {
    content:
      "Need activities in Majorca from 2026-05-20 to 2026-05-22 for 2 adults",
    expectedNextAction: "results_ready",
    expectedSources: ["hotelbeds_activities"],
    expectedStatus: "reviewing",
    name: "activity_only",
  },
  {
    content:
      "Need transfer in Majorca from 2026-05-08 to 2026-05-10 for 2 adults. Transfer from Palma airport to HM Jaime III.",
    expectedNextAction: "results_ready",
    expectedSources: ["hotelbeds_transfers"],
    expectedStatus: "reviewing",
    name: "transfer_only",
  },
  {
    content:
      "Need hotel and transfer in Madrid from 2026-05-01 to 2026-05-05 for 2 adults. Pickup from Madrid airport.",
    expectedBlockedServices: ["transfer"],
    expectedNextAction: "await_clarification_answer",
    expectedSources: ["hotelbeds_hotels"],
    expectedStatus: "clarifying",
    name: "partial_transfer_blocked",
    pendingQuestionIncludes: "pickup",
  },
];

const main = async () => {
  let userId = null;

  try {
    userId = await createSmokeUser();
    assert(userId, "smoke_user_not_created");

    const login = await loginToStaging();
    assert(login.cookieHeader.length > 0, "auth_cookie_missing");

    const results = [];

    for (const scenario of scenarios) {
      results.push(await runScenario(login.cookieHeader, scenario));
    }

    console.log(
      JSON.stringify(
        {
          ok: true,
          stagingBaseUrl,
          userEmail: smokeEmail,
          results,
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
