import { createHash } from "node:crypto";

const requiredEnvVars = [
  "HOTELBEDS_HOTELS_API_KEY",
  "HOTELBEDS_HOTELS_SECRET",
  "HOTELBEDS_ACTIVITIES_API_KEY",
  "HOTELBEDS_ACTIVITIES_SECRET",
  "HOTELBEDS_TRANSFERS_API_KEY",
  "HOTELBEDS_TRANSFERS_SECRET",
];

const missingEnvVars = requiredEnvVars.filter(
  (envVar) => !process.env[envVar] || process.env[envVar].trim().length === 0,
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

const baseUrl =
  process.env.HOTELBEDS_BASE_URL ?? "https://api.test.hotelbeds.com";
const language = process.env.HOTELBEDS_DEFAULT_LANGUAGE ?? "en";

const formatDate = (date) => date.toISOString().slice(0, 10);
const withFutureDays = (days) => {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + days);
  return date;
};

const hotelCheckIn = formatDate(withFutureDays(45));
const hotelCheckOut = formatDate(withFutureDays(47));
const transferDateTime = `${formatDate(withFutureDays(45))}T10:00:00`;

const buildSignature = ({ apiKey, secret, timestamp }) =>
  createHash("sha256").update(`${apiKey}${secret}${timestamp}`).digest("hex");

const buildHeaders = ({ apiKey, secret, hasJsonBody }) => {
  const timestamp = `${Math.trunc(Date.now() / 1000)}`;

  return {
    Accept: "application/json",
    ...(hasJsonBody ? { "Content-Type": "application/json" } : {}),
    "Api-key": apiKey,
    "X-Signature": buildSignature({
      apiKey,
      secret,
      timestamp,
    }),
  };
};

const requestJson = async ({ apiKey, body, method, path, secret }) => {
  const response = await fetch(new URL(path, baseUrl), {
    body,
    headers: buildHeaders({
      apiKey,
      hasJsonBody: typeof body === "string" && body.length > 0,
      secret,
    }),
    method,
  });
  const rawBody = await response.text();
  const payload = rawBody.length > 0 ? JSON.parse(rawBody) : null;

  if (!response.ok) {
    throw new Error(
      JSON.stringify({
        payload,
        path,
        statusCode: response.status,
      }),
    );
  }

  return {
    payload,
    statusCode: response.status,
  };
};

const parseProbeError = (error) => {
  if (!(error instanceof Error)) {
    return {
      message: "unknown_error",
      statusCode: -1,
    };
  }

  try {
    const parsed = JSON.parse(error.message);

    return {
      message: parsed?.payload?.message ?? error.message,
      payload: parsed?.payload ?? null,
      statusCode:
        typeof parsed?.statusCode === "number" ? parsed.statusCode : -1,
    };
  } catch {
    return {
      message: error.message,
      statusCode: -1,
    };
  }
};

const probes = [
  {
    apiKey: process.env.HOTELBEDS_HOTELS_API_KEY,
    body: JSON.stringify({
      destination: {
        code: process.env.HOTELBEDS_VERIFY_HOTELS_DESTINATION_CODE ?? "BCN",
      },
      occupancies: [
        {
          adults: 2,
          children: 0,
          rooms: 1,
        },
      ],
      stay: {
        checkIn: hotelCheckIn,
        checkOut: hotelCheckOut,
      },
    }),
    method: "POST",
    parseCount: (payload) => payload?.hotels?.hotels?.length ?? 0,
    path: "/hotel-api/1.0/hotels",
    secret: process.env.HOTELBEDS_HOTELS_SECRET,
    suite: "hotels",
  },
  {
    apiKey: process.env.HOTELBEDS_ACTIVITIES_API_KEY,
    body: JSON.stringify({
      filters: [
        {
          searchFilterItems: [
            {
              type: "destination",
              value:
                process.env.HOTELBEDS_VERIFY_ACTIVITIES_DESTINATION_CODE ??
                "PMI",
            },
          ],
        },
      ],
      from: hotelCheckIn,
      language,
      order: "DEFAULT",
      pagination: {
        itemsPerPage: 5,
        page: 1,
      },
      to: hotelCheckOut,
    }),
    method: "POST",
    parseCount: (payload) => payload?.activities?.length ?? 0,
    path: "/activity-api/3.0/activities",
    secret: process.env.HOTELBEDS_ACTIVITIES_SECRET,
    suite: "activities",
  },
  {
    apiKey: process.env.HOTELBEDS_TRANSFERS_API_KEY,
    body: undefined,
    method: "GET",
    parseCount: (payload) => payload?.services?.length ?? 0,
    path:
      `/transfer-api/1.0/availability/${language}` +
      `/from/${process.env.HOTELBEDS_VERIFY_TRANSFERS_FROM_TYPE ?? "ATLAS"}` +
      `/${process.env.HOTELBEDS_VERIFY_TRANSFERS_FROM_CODE ?? "265"}` +
      `/to/${process.env.HOTELBEDS_VERIFY_TRANSFERS_TO_TYPE ?? "IATA"}` +
      `/${process.env.HOTELBEDS_VERIFY_TRANSFERS_TO_CODE ?? "PMI"}` +
      `/${transferDateTime}/2/0/0`,
    secret: process.env.HOTELBEDS_TRANSFERS_SECRET,
    suite: "transfers",
  },
];

const results = [];

for (const probe of probes) {
  try {
    const { payload, statusCode } = await requestJson(probe);
    results.push({
      ok: true,
      path: probe.path,
      sampleCount: probe.parseCount(payload),
      statusCode,
      suite: probe.suite,
    });
  } catch (error) {
    const parsedError = parseProbeError(error);

    results.push({
      message: parsedError.message,
      ok: false,
      path: probe.path,
      sampleCount: 0,
      statusCode: parsedError.statusCode ?? -1,
      suite: probe.suite,
    });
  }
}

console.log(
  JSON.stringify(
    {
      ok: results.every((result) => result.ok),
      results,
    },
    null,
    2,
  ),
);

if (!results.every((result) => result.ok)) {
  process.exit(1);
}
