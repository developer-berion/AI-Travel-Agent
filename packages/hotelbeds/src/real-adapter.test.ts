import { describe, expect, it, vi } from "vitest";

import type { StructuredIntake } from "@alana/domain";

import { buildHotelbedsSignature, createHotelbedsAdapter } from "./index";

const buildIntake = (
  extractedFields: StructuredIntake["extractedFields"],
): StructuredIntake => ({
  contradictions: [],
  createdAt: "2026-03-10T00:00:00.000Z",
  extractedFields,
  id: "00000000-0000-4000-8000-000000000001",
  missingFields: [],
  quoteSessionId: "00000000-0000-4000-8000-000000000002",
  readinessByServiceLine: {
    activity: "ready",
    hotel: "ready",
    transfer: "ready",
  },
  requestedServiceLines: ["hotel", "activity", "transfer"],
});

const buildConfig = (fetchImpl: typeof fetch) => ({
  activities: {
    apiKey: "activities-key",
    baseUrl: "https://api.test.hotelbeds.com",
    secret: "activities-secret",
    timeoutMs: 1000,
  },
  fetchImpl,
  hotels: {
    apiKey: "hotels-key",
    baseUrl: "https://api.test.hotelbeds.com",
    secret: "hotels-secret",
    timeoutMs: 1000,
  },
  language: "en",
  transfers: {
    apiKey: "transfers-key",
    baseUrl: "https://api.test.hotelbeds.com",
    secret: "transfers-secret",
    timeoutMs: 1000,
  },
});

describe("hotelbeds real adapter", () => {
  it("builds the documented Hotelbeds signature", () => {
    const signature = buildHotelbedsSignature({
      apiKey: "api-key",
      secret: "secret",
      timestamp: "1710000000",
    });

    expect(signature).toBe(
      "5e9d79720c81cfad16188d4f7a90d0f0358eac78db3da94306a45e8a5e3e0fae",
    );
  });

  it("returns a mapping error without supplier-ready hotel anchors", async () => {
    const fetchMock = vi.fn() as unknown as typeof fetch;
    const adapter = createHotelbedsAdapter(buildConfig(fetchMock));

    const result = await adapter.search(
      buildIntake({
        adults: 2,
        children: 0,
        destination: "Barcelona",
        travelDates: ["2026-05-08", "2026-05-10"],
      }),
      "hotel",
    );

    expect(fetchMock).not.toHaveBeenCalled();
    expect(result.error?.code).toBe("invalid_anchor_or_mapping");
  });

  it("normalizes hotel availability responses", async () => {
    const fetchMock = vi.fn(async (_input, init) => {
      expect(init?.method).toBe("POST");
      expect(
        (init?.headers as Record<string, string> | undefined)?.["Api-key"],
      ).toBe("hotels-key");

      return new Response(
        JSON.stringify({
          hotels: {
            hotels: [
              {
                code: 14915,
                currency: "EUR",
                destinationCode: "BCN",
                destinationName: "Barcelona",
                name: "Alexandre Fira Congress Barcelona",
                rooms: [
                  {
                    code: "DBT.EJ",
                    name: "Executive Double or Twin Room",
                    rates: [
                      {
                        boardCode: "BB",
                        boardName: "BED AND BREAKFAST",
                        net: "525.44",
                        rateKey: "opaque-rate-key",
                        rateType: "BOOKABLE",
                        taxes: {
                          allIncluded: false,
                        },
                      },
                    ],
                  },
                ],
                zoneName: "Hospitalet de Llobregat",
              },
            ],
          },
        }),
        {
          headers: {
            "Content-Type": "application/json",
          },
          status: 200,
        },
      );
    }) as unknown as typeof fetch;
    const adapter = createHotelbedsAdapter(buildConfig(fetchMock));

    const result = await adapter.search(
      buildIntake({
        adults: 2,
        children: 0,
        destination: "Barcelona",
        destinationCode: "BCN",
        hotelDestinationCode: "BCN",
        travelDates: ["2026-05-08", "2026-05-10"],
      }),
      "hotel",
    );

    expect(result.error).toBeNull();
    expect(result.options).toHaveLength(1);
    expect(result.options[0]?.headlinePrice).toBe(525.44);
    expect(result.options[0]?.supplierMetadata.source).toBe("hotelbeds_hotels");
    expect(result.options[0]?.availabilityState).toBe("available");
  });

  it("sends child ages in hotel occupancies when the intake is supplier-ready", async () => {
    const fetchMock = vi.fn(async (_input, init) => {
      const body = JSON.parse(String(init?.body ?? "{}")) as {
        occupancies?: unknown[];
      };

      expect(body.occupancies).toEqual([
        {
          adults: 2,
          children: 2,
          paxes: [
            { age: 30, type: "AD" },
            { age: 30, type: "AD" },
            { age: 4, type: "CH" },
            { age: 7, type: "CH" },
          ],
          rooms: 1,
        },
      ]);

      return new Response(
        JSON.stringify({
          hotels: {
            hotels: [
              {
                code: 14915,
                currency: "EUR",
                destinationCode: "BCN",
                destinationName: "Barcelona",
                minRate: "525.44",
                name: "Alexandre Fira Congress Barcelona",
              },
            ],
          },
        }),
        {
          headers: {
            "Content-Type": "application/json",
          },
          status: 200,
        },
      );
    }) as unknown as typeof fetch;
    const adapter = createHotelbedsAdapter(buildConfig(fetchMock));

    const result = await adapter.search(
      buildIntake({
        adults: 2,
        childAges: ["4", "7"],
        children: 2,
        destination: "Barcelona",
        destinationCode: "BCN",
        hotelDestinationCode: "BCN",
        travelDates: ["2026-05-08", "2026-05-10"],
      }),
      "hotel",
    );

    expect(result.error).toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("blocks hotel search when child ages are incomplete", async () => {
    const fetchMock = vi.fn() as unknown as typeof fetch;
    const adapter = createHotelbedsAdapter(buildConfig(fetchMock));

    const result = await adapter.search(
      buildIntake({
        adults: 2,
        childAges: ["4"],
        children: 2,
        destination: "Barcelona",
        destinationCode: "BCN",
        hotelDestinationCode: "BCN",
        travelDates: ["2026-05-08", "2026-05-10"],
      }),
      "hotel",
    );

    expect(fetchMock).not.toHaveBeenCalled();
    expect(result.error?.code).toBe("missing_required_field");
  });

  it("maps supplier auth failures to auth_or_signature_error", async () => {
    const fetchMock = vi.fn(async () => {
      return new Response(
        JSON.stringify({
          message: "Invalid Api-key",
        }),
        {
          headers: {
            "Content-Type": "application/json",
          },
          status: 401,
        },
      );
    }) as unknown as typeof fetch;
    const adapter = createHotelbedsAdapter(buildConfig(fetchMock));

    const result = await adapter.search(
      buildIntake({
        activityDestinationCode: "PMI",
        adults: 2,
        children: 0,
        destination: "Majorca",
        travelDates: ["2026-05-20", "2026-05-22"],
      }),
      "activity",
    );

    expect(result.options).toEqual([]);
    expect(result.error?.code).toBe("auth_or_signature_error");
  });

  it("marks activities as weak when Hotelbeds returns a single option", async () => {
    const fetchMock = vi.fn(async () => {
      return new Response(
        JSON.stringify({
          activities: [
            {
              code: "E-E10-A0PPNO0027",
              country: {
                destinations: [{ code: "PMI", name: "Majorca" }],
              },
              currency: "EUR",
              modalities: [
                {
                  amountsFrom: [{ amount: 95.02, paxType: "ADULT" }],
                  code: "ENG8H30",
                  freeCancellation: false,
                  language: "ENG",
                  name: "In English - 8:30am from Arenal",
                  rateCode: "STANDARD",
                  session: "08:30",
                },
              ],
              name: "Island Tour",
            },
          ],
        }),
        {
          headers: {
            "Content-Type": "application/json",
          },
          status: 200,
        },
      );
    }) as unknown as typeof fetch;
    const adapter = createHotelbedsAdapter(buildConfig(fetchMock));

    const result = await adapter.search(
      buildIntake({
        activityDestinationCode: "PMI",
        adults: 2,
        children: 0,
        destination: "Majorca",
        travelDates: ["2026-05-20", "2026-05-22"],
      }),
      "activity",
    );

    expect(result.options).toHaveLength(1);
    expect(result.weakShortlist).toBe(true);
    expect(result.error?.code).toBe("weak_results");
    expect(result.options[0]?.supplierMetadata.source).toBe(
      "hotelbeds_activities",
    );
  });

  it("normalizes transfer availability responses", async () => {
    const fetchMock = vi.fn(async (input, init) => {
      expect(init?.method).toBe("GET");
      expect(String(input)).toContain("/transfer-api/1.0/availability/en/");

      return new Response(
        JSON.stringify({
          services: [
            {
              maxPaxCapacity: 4,
              pickupInformation: {
                from: {
                  code: "265",
                  description: "HM Jaime III",
                  type: "ATLAS",
                },
                to: {
                  code: "PMI",
                  description: "Majorca - Palma Airport",
                  type: "IATA",
                },
              },
              price: {
                currencyId: "EUR",
                totalAmount: 44.56,
              },
              provider: {
                name: "TMT - Majorca",
              },
              rateKey: "transfer-rate-key",
              serviceId: "1395532",
              transferType: "PRIVATE",
              vehicle: {
                code: "CR",
                name: "Car",
              },
            },
          ],
        }),
        {
          headers: {
            "Content-Type": "application/json",
          },
          status: 200,
        },
      );
    }) as unknown as typeof fetch;
    const adapter = createHotelbedsAdapter(buildConfig(fetchMock));

    const result = await adapter.search(
      buildIntake({
        adults: 2,
        children: 0,
        destination: "Majorca",
        transferFromCode: "265",
        transferFromType: "ATLAS",
        transferToCode: "PMI",
        transferToType: "IATA",
        travelDates: ["2026-05-08", "2026-05-10"],
      }),
      "transfer",
    );

    expect(result.error).toBeNull();
    expect(result.options).toHaveLength(1);
    expect(result.options[0]?.title).toContain("HM Jaime III");
    expect(result.options[0]?.supplierMetadata.source).toBe(
      "hotelbeds_transfers",
    );
  });
});
