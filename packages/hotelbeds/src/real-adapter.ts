import { createHash } from "node:crypto";

import type {
  NormalizedOption,
  ServiceLine,
  StructuredIntake,
} from "@alana/domain";
import { createId, titleize } from "@alana/shared";

import { resolveTransferPropertyAnchor } from "./anchor-resolution";
import type {
  HotelbedsAdapterConfig,
  HotelbedsSearchAdapter,
  HotelbedsSuiteConfig,
  HotelbedsSuiteName,
  SupplierError,
  SupplierErrorCode,
  SupplierSearchResult,
} from "./contracts";

type HotelbedsRequestError = Error & {
  code: SupplierErrorCode;
  statusCode: number;
};

type HotelRate = {
  adults?: number;
  boardCode?: string;
  boardName?: string;
  cancellationPolicies?: Array<{ amount?: string; from?: string }>;
  net?: string;
  rateClass?: string;
  rateKey?: string;
  rateType?: string;
  taxes?: {
    allIncluded?: boolean;
    taxes?: Array<{
      amount?: string;
      currency?: string;
      included?: boolean;
      subType?: string;
    }>;
  };
};

type HotelRoom = {
  code?: string;
  name?: string;
  rates?: HotelRate[];
};

type HotelAvailabilityHotel = {
  categoryName?: string;
  code?: number;
  currency?: string;
  destinationCode?: string;
  destinationName?: string;
  minRate?: string;
  name?: string;
  rooms?: HotelRoom[];
  zoneName?: string;
};

type ActivityAmount = {
  ageFrom?: number;
  amount?: number;
  paxType?: string;
};

type ActivityModality = {
  amountsFrom?: ActivityAmount[];
  code?: string;
  freeCancellation?: boolean;
  language?: string;
  name?: string;
  rateCode?: string;
  session?: string;
};

type ActivityCountry = {
  destinations?: Array<{ code?: string; name?: string }>;
};

type ActivityAvailability = {
  amountsFrom?: ActivityAmount[];
  code?: string;
  country?: ActivityCountry;
  currency?: string;
  modalityCode?: string;
  modalityName?: string;
  modalities?: ActivityModality[];
  name?: string;
};

type TransferService = {
  category?: { code?: string; name?: string };
  direction?: string;
  maxPaxCapacity?: number;
  pickupInformation?: {
    from?: { code?: string; description?: string; type?: string };
    pickup?: { description?: string };
    time?: string;
    to?: { code?: string; description?: string; type?: string };
  };
  price?: { currencyId?: string; totalAmount?: number };
  provider?: { name?: string };
  rateKey?: string;
  serviceId?: string;
  transferType?: string;
  vehicle?: { code?: string; name?: string };
};

const supplierSuiteByServiceLine: Record<ServiceLine, HotelbedsSuiteName> = {
  activity: "activities",
  hotel: "hotels",
  transfer: "transfers",
};

const buildError = (
  code: SupplierErrorCode,
  message: string,
): SupplierError => ({ code, message });

const buildErrorResult = (
  serviceLine: ServiceLine,
  code: SupplierErrorCode,
  message: string,
): SupplierSearchResult => ({
  serviceLine,
  options: [],
  weakShortlist: code === "weak_results",
  warning: code === "weak_results" ? message : null,
  error: buildError(code, message),
});

const buildRequestError = (
  code: SupplierErrorCode,
  message: string,
  statusCode = 500,
): HotelbedsRequestError => {
  const error = new Error(message) as HotelbedsRequestError;
  error.code = code;
  error.statusCode = statusCode;
  return error;
};

const classifyStatusCode = (statusCode: number): SupplierErrorCode => {
  if (statusCode === 400 || statusCode === 404 || statusCode === 422) {
    return "validation_error";
  }

  if (statusCode === 401 || statusCode === 403) {
    return "auth_or_signature_error";
  }

  if (statusCode === 408 || statusCode === 504) {
    return "supplier_timeout";
  }

  if (statusCode === 429 || statusCode >= 500) {
    return "supplier_unavailable";
  }

  return "supplier_unavailable";
};

const parseNumber = (value: unknown) => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return null;
};

const getString = (value: unknown) =>
  typeof value === "string" && value.trim().length > 0 ? value.trim() : null;

const getStringArray = (value: unknown) =>
  Array.isArray(value)
    ? value
        .map((item) => (typeof item === "string" ? item.trim() : null))
        .filter((item): item is string => Boolean(item))
    : [];

const getPositiveInteger = (value: unknown, fallback = 0) => {
  const parsed = parseNumber(value);

  if (parsed === null || parsed < 0) {
    return fallback;
  }

  return Math.trunc(parsed);
};

const getTravelDates = (intake: StructuredIntake) =>
  getStringArray(intake.extractedFields.travelDates);

const getSuiteConfig = (
  config: HotelbedsAdapterConfig,
  serviceLine: ServiceLine,
) => {
  const suiteName = supplierSuiteByServiceLine[serviceLine];
  const suite = config[suiteName];

  if (!suite) {
    return null;
  }

  return {
    suite,
    suiteName,
  };
};

export const buildHotelbedsSignature = (input: {
  apiKey: string;
  secret: string;
  timestamp: string;
}) =>
  createHash("sha256")
    .update(`${input.apiKey}${input.secret}${input.timestamp}`)
    .digest("hex");

const buildHotelbedsHeaders = (suite: HotelbedsSuiteConfig) => {
  const timestamp = `${Math.trunc(Date.now() / 1000)}`;

  return {
    headers: {
      Accept: "application/json",
      "Api-key": suite.apiKey,
      "Content-Type": "application/json",
      "X-Signature": buildHotelbedsSignature({
        apiKey: suite.apiKey,
        secret: suite.secret,
        timestamp,
      }),
    },
    timestamp,
  };
};

const getJsonErrorMessage = (payload: unknown) => {
  if (typeof payload === "string") {
    return payload;
  }

  if (payload && typeof payload === "object") {
    const candidate = payload as {
      error?: { message?: string };
      errors?: Array<{ message?: string }>;
      message?: string;
    };

    if (typeof candidate.message === "string") {
      return candidate.message;
    }

    if (typeof candidate.error?.message === "string") {
      return candidate.error.message;
    }

    if (typeof candidate.errors?.[0]?.message === "string") {
      return candidate.errors[0].message;
    }
  }

  return null;
};

const requestHotelbedsJson = async <T>(input: {
  body?: BodyInit;
  fetchImpl: typeof fetch;
  method: "GET" | "POST";
  path: string;
  suite: HotelbedsSuiteConfig;
}) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), input.suite.timeoutMs);
  const { headers } = buildHotelbedsHeaders(input.suite);
  const url = new URL(input.path, input.suite.baseUrl);

  try {
    const response = await input.fetchImpl(url, {
      body: input.body,
      headers,
      method: input.method,
      signal: controller.signal,
    });
    const rawBody = await response.text();
    const jsonBody = rawBody.length > 0 ? (JSON.parse(rawBody) as T) : null;

    if (!response.ok) {
      const code = classifyStatusCode(response.status);
      const message =
        getJsonErrorMessage(jsonBody) ??
        `Hotelbeds ${response.status} on ${input.path}`;

      throw buildRequestError(code, message, response.status);
    }

    if (!jsonBody) {
      throw buildRequestError(
        "normalization_error",
        `Hotelbeds returned an empty body for ${input.path}`,
      );
    }

    return jsonBody;
  } catch (error) {
    if ((error as Error).name === "AbortError") {
      throw buildRequestError(
        "supplier_timeout",
        `Hotelbeds timeout on ${input.path}`,
        504,
      );
    }

    if ((error as HotelbedsRequestError).code) {
      throw error;
    }

    throw buildRequestError(
      "supplier_unavailable",
      `Hotelbeds request failed on ${input.path}`,
    );
  } finally {
    clearTimeout(timeout);
  }
};

const buildHotelOccupancies = (intake: StructuredIntake) => {
  const adults = getPositiveInteger(intake.extractedFields.adults);
  const children = getPositiveInteger(intake.extractedFields.children);
  const childAges = getStringArray(intake.extractedFields.childAges).map(
    (age) => Number(age),
  );

  if (adults <= 0) {
    return null;
  }

  const occupancy: {
    adults: number;
    children: number;
    paxes?: Array<{ age: number; type: "AD" | "CH" }>;
    rooms: number;
  } = {
    adults,
    children,
    rooms: 1,
  };

  if (children > 0) {
    if (childAges.length !== children || childAges.some(Number.isNaN)) {
      return null;
    }

    occupancy.paxes = [
      ...Array.from({ length: adults }, () => ({
        age: 30,
        type: "AD" as const,
      })),
      ...childAges.map((age) => ({ age, type: "CH" as const })),
    ];
  }

  return [occupancy];
};

const isNormalizedOption = (
  option: NormalizedOption | null,
): option is NormalizedOption => option !== null;

const normalizeHotels = (
  serviceLine: ServiceLine,
  hotels: HotelAvailabilityHotel[],
): SupplierSearchResult => {
  const options = hotels
    .map((hotel) => {
      const cheapestRoom = hotel.rooms?.reduce<{
        rate: HotelRate;
        room: HotelRoom;
      } | null>((currentCheapest, room) => {
        const roomCheapestRate = room.rates?.reduce<HotelRate | null>(
          (cheapestRate, rate) => {
            const currentAmount = parseNumber(rate.net);
            const cheapestAmount = parseNumber(cheapestRate?.net);

            if (currentAmount === null) {
              return cheapestRate;
            }

            if (cheapestAmount === null || currentAmount < cheapestAmount) {
              return rate;
            }

            return cheapestRate;
          },
          null,
        );

        if (!roomCheapestRate) {
          return currentCheapest;
        }

        const currentAmount = parseNumber(currentCheapest?.rate.net);
        const nextAmount = parseNumber(roomCheapestRate.net);

        if (nextAmount === null) {
          return currentCheapest;
        }

        if (currentAmount === null || nextAmount < currentAmount) {
          return {
            rate: roomCheapestRate,
            room,
          };
        }

        return currentCheapest;
      }, null);

      const headlinePrice =
        parseNumber(cheapestRoom?.rate.net) ?? parseNumber(hotel.minRate);

      if (headlinePrice === null || !hotel.name || !hotel.currency) {
        return null;
      }

      const caveat =
        cheapestRoom?.rate.taxes?.allIncluded === false
          ? "Hotelbeds devuelve taxes no incluidas en esta tarifa; revisa el disclosure antes de compartir."
          : null;

      // Prefer the supplier hotel code because the transfers API accepts it as
      // a direct ATLAS destination; keep the registry lookup only as fallback.
      const transferPropertyAnchor =
        hotel.code && hotel.name
          ? {
              code: `${hotel.code}`,
              label: hotel.name,
              type: "ATLAS",
            }
          : resolveTransferPropertyAnchor({
              destination: hotel.destinationName,
              hotelCode: hotel.code ? `${hotel.code}` : null,
              hotelName: hotel.name,
            });

      const option: NormalizedOption = {
        id: createId(),
        serviceLine,
        destination: hotel.destinationName ?? "Unknown",
        title: hotel.name,
        headlinePrice,
        currency: hotel.currency,
        whyItFits:
          hotel.zoneName && hotel.categoryName
            ? `${hotel.categoryName} en ${hotel.zoneName}, consistente con el destino solicitado.`
            : "Opcion hotelera supplier-backed para el destino solicitado.",
        tradeoff:
          cheapestRoom?.room.name && cheapestRoom.rate.boardName
            ? `${cheapestRoom.room.name} con ${cheapestRoom.rate.boardName}.`
            : "Conviene revalidar board, cancelacion y taxes antes de compartir.",
        caveat,
        availabilityState:
          cheapestRoom?.rate.rateType === "RECHECK"
            ? "recheck_required"
            : "available",
        supplierMetadata: {
          boardCode: cheapestRoom?.rate.boardCode ?? "unknown",
          destinationCode: hotel.destinationCode
            ? `${hotel.destinationCode}`
            : "unknown",
          hotelCode: hotel.code ? `${hotel.code}` : "unknown",
          rateKey: cheapestRoom?.rate.rateKey ?? "unknown",
          roomCode: cheapestRoom?.room.code ?? "unknown",
          source: "hotelbeds_hotels",
          ...(transferPropertyAnchor
            ? {
                transferPropertyCode: transferPropertyAnchor.code,
                transferPropertyLabel: transferPropertyAnchor.label,
                transferPropertyType: transferPropertyAnchor.type,
              }
            : {}),
        },
      };

      return option;
    })
    .filter(isNormalizedOption)
    .sort((left, right) => left.headlinePrice - right.headlinePrice)
    .slice(0, 5);

  if (options.length === 0) {
    return buildErrorResult(
      serviceLine,
      "no_results",
      "Hotelbeds no devolvio opciones hoteleras utilizables para estos anchors.",
    );
  }

  return {
    serviceLine,
    options,
    weakShortlist: false,
    warning: null,
    error: null,
  };
};

const normalizeActivities = (
  config: HotelbedsAdapterConfig,
  serviceLine: ServiceLine,
  activities: ActivityAvailability[],
): SupplierSearchResult => {
  const preferredLanguage = config.language.toUpperCase();
  const options = activities
    .map((activity) => {
      const modality =
        activity.modalities?.find(
          (candidate) =>
            candidate.language?.toUpperCase() === preferredLanguage,
        ) ?? activity.modalities?.[0];
      const adultAmount =
        modality?.amountsFrom?.find((amount) => amount.paxType === "ADULT") ??
        activity.amountsFrom?.find((amount) => amount.paxType === "ADULT");
      const headlinePrice = parseNumber(adultAmount?.amount);
      const destination =
        activity.country?.destinations?.[0]?.name ??
        activity.country?.destinations?.[0]?.code ??
        "Unknown";

      if (headlinePrice === null || !activity.name || !activity.currency) {
        return null;
      }

      const option: NormalizedOption = {
        id: createId(),
        serviceLine,
        destination,
        title: activity.name,
        headlinePrice,
        currency: activity.currency,
        whyItFits: modality?.name
          ? `Modalidad supplier-backed: ${modality.name}.`
          : "Actividad supplier-backed para el destino solicitado.",
        tradeoff: modality?.session
          ? `Opera en sesion ${modality.session}; requiere revisar ventana operativa final.`
          : "La modalidad exacta puede cambiar segun language o pickup area.",
        caveat:
          modality?.freeCancellation === false
            ? "La modalidad no marca cancelacion gratuita en Hotelbeds test."
            : null,
        availabilityState: "available",
        supplierMetadata: {
          activityCode: activity.code ?? "unknown",
          destinationCode:
            activity.country?.destinations?.[0]?.code ?? "unknown",
          modalityCode: modality?.code ?? activity.modalityCode ?? "unknown",
          rateCode: modality?.rateCode ?? "unknown",
          source: "hotelbeds_activities",
        },
      };

      return option;
    })
    .filter(isNormalizedOption)
    .sort((left, right) => left.headlinePrice - right.headlinePrice)
    .slice(0, 5);

  if (options.length === 0) {
    return buildErrorResult(
      serviceLine,
      "no_results",
      "Hotelbeds no devolvio actividades utilizables para estos anchors.",
    );
  }

  const weakShortlist = options.length < 2;

  return {
    serviceLine,
    options,
    weakShortlist,
    warning: weakShortlist
      ? "Activities devolvio una shortlist estrecha; marcar como parcial o debil."
      : null,
    error: weakShortlist
      ? buildError(
          "weak_results",
          "Inventario limitado de activities para el destino solicitado.",
        )
      : null,
  };
};

const normalizeTransfers = (
  serviceLine: ServiceLine,
  transfers: TransferService[],
): SupplierSearchResult => {
  const options = transfers
    .map((transfer) => {
      const totalAmount = parseNumber(transfer.price?.totalAmount);
      const destination =
        transfer.pickupInformation?.to?.description ??
        transfer.pickupInformation?.to?.code ??
        "Unknown";

      if (totalAmount === null || !transfer.price?.currencyId) {
        return null;
      }

      const fromLabel =
        transfer.pickupInformation?.from?.description ??
        transfer.pickupInformation?.from?.code ??
        "origen";
      const toLabel =
        transfer.pickupInformation?.to?.description ??
        transfer.pickupInformation?.to?.code ??
        "destino";
      const transferType = titleize(
        (transfer.transferType ?? "transfer").toLowerCase(),
      );
      const provider = transfer.provider?.name;

      const option: NormalizedOption = {
        id: createId(),
        serviceLine,
        destination,
        title: `${transferType} ${fromLabel} -> ${toLabel}`,
        headlinePrice: totalAmount,
        currency: transfer.price.currencyId,
        whyItFits: provider
          ? `Proveedor ${provider} para la ruta solicitada.`
          : "Salida supplier-backed para la ruta solicitada.",
        tradeoff:
          transfer.maxPaxCapacity && transfer.vehicle?.name
            ? `${transfer.vehicle.name} con capacidad maxima de ${transfer.maxPaxCapacity} pax.`
            : "Conviene revisar pickup y waiting policy antes de compartir.",
        caveat: transfer.pickupInformation?.pickup?.description
          ? "Hotelbeds devuelve instrucciones operativas de pickup que deben mantenerse visibles."
          : null,
        availabilityState: "available",
        supplierMetadata: {
          destinationCode: transfer.pickupInformation?.to?.code ?? "unknown",
          rateKey: transfer.rateKey ?? "unknown",
          serviceId: transfer.serviceId ?? "unknown",
          source: "hotelbeds_transfers",
          vehicleCode: transfer.vehicle?.code ?? "unknown",
        },
      };

      return option;
    })
    .filter(isNormalizedOption)
    .sort((left, right) => left.headlinePrice - right.headlinePrice)
    .slice(0, 5);

  if (options.length === 0) {
    return buildErrorResult(
      serviceLine,
      "no_results",
      "Hotelbeds no devolvio transfers utilizables para estos anchors.",
    );
  }

  return {
    serviceLine,
    options,
    weakShortlist: false,
    warning: null,
    error: null,
  };
};

const executeHotelSearch = async (
  config: HotelbedsAdapterConfig,
  intake: StructuredIntake,
  serviceLine: ServiceLine,
) => {
  const travelDates = getTravelDates(intake);
  const destinationCode =
    getString(intake.extractedFields.hotelDestinationCode) ??
    getString(intake.extractedFields.destinationCode);

  if (!destinationCode) {
    return buildErrorResult(
      serviceLine,
      "invalid_anchor_or_mapping",
      "Hotel search requiere destinationCode supplier-ready; el destino natural aun no esta mapeado.",
    );
  }

  if (travelDates.length < 2) {
    return buildErrorResult(
      serviceLine,
      "missing_required_field",
      "Hotel search requiere check-in y check-out antes de consultar Hotelbeds.",
    );
  }

  const occupancies = buildHotelOccupancies(intake);

  if (!occupancies) {
    return buildErrorResult(
      serviceLine,
      "missing_required_field",
      "Hotel search requiere occupancy valida y edades de ninos cuando aplique.",
    );
  }

  const suiteConfig = getSuiteConfig(config, serviceLine);

  if (!suiteConfig) {
    return buildErrorResult(
      serviceLine,
      "auth_or_signature_error",
      "No hay credenciales Hotelbeds configuradas para hotels.",
    );
  }

  const response = await requestHotelbedsJson<{
    hotels?: { hotels?: HotelAvailabilityHotel[] };
  }>({
    body: JSON.stringify({
      destination: {
        code: destinationCode,
      },
      occupancies,
      stay: {
        checkIn: travelDates[0],
        checkOut: travelDates[1],
      },
    }),
    fetchImpl: config.fetchImpl ?? fetch,
    method: "POST",
    path: "/hotel-api/1.0/hotels",
    suite: suiteConfig.suite,
  });

  return normalizeHotels(serviceLine, response.hotels?.hotels ?? []);
};

const executeActivitySearch = async (
  config: HotelbedsAdapterConfig,
  intake: StructuredIntake,
  serviceLine: ServiceLine,
) => {
  const travelDates = getTravelDates(intake);
  const destinationCode =
    getString(intake.extractedFields.activityDestinationCode) ??
    getString(intake.extractedFields.destinationCode);

  if (!destinationCode) {
    return buildErrorResult(
      serviceLine,
      "invalid_anchor_or_mapping",
      "Activities search requiere destinationCode supplier-ready; el mapping natural aun no existe.",
    );
  }

  if (travelDates.length < 2) {
    return buildErrorResult(
      serviceLine,
      "missing_required_field",
      "Activities search requiere rango de fechas antes de consultar Hotelbeds.",
    );
  }

  const suiteConfig = getSuiteConfig(config, serviceLine);

  if (!suiteConfig) {
    return buildErrorResult(
      serviceLine,
      "auth_or_signature_error",
      "No hay credenciales Hotelbeds configuradas para activities.",
    );
  }

  const response = await requestHotelbedsJson<{
    activities?: ActivityAvailability[];
  }>({
    body: JSON.stringify({
      filters: [
        {
          searchFilterItems: [
            {
              type: "destination",
              value: destinationCode,
            },
          ],
        },
      ],
      from: travelDates[0],
      language: config.language,
      order: "DEFAULT",
      pagination: {
        itemsPerPage: 10,
        page: 1,
      },
      to: travelDates[1],
    }),
    fetchImpl: config.fetchImpl ?? fetch,
    method: "POST",
    path: "/activity-api/3.0/activities",
    suite: suiteConfig.suite,
  });

  return normalizeActivities(config, serviceLine, response.activities ?? []);
};

const buildTransferDateTime = (
  input: string | null,
  fallbackDate: string | null,
) => {
  if (input) {
    return input;
  }

  if (fallbackDate) {
    return `${fallbackDate}T10:00:00`;
  }

  return null;
};

const executeTransferSearch = async (
  config: HotelbedsAdapterConfig,
  intake: StructuredIntake,
  serviceLine: ServiceLine,
) => {
  const travelDates = getTravelDates(intake);
  const fromCode = getString(intake.extractedFields.transferFromCode);
  const fromType = getString(intake.extractedFields.transferFromType);
  const toCode = getString(intake.extractedFields.transferToCode);
  const toType = getString(intake.extractedFields.transferToType);
  const outboundDateTime = buildTransferDateTime(
    getString(intake.extractedFields.transferOutboundDateTime),
    travelDates[0] ?? null,
  );
  const inboundDateTime = getString(
    intake.extractedFields.transferInboundDateTime,
  );
  const adults = getPositiveInteger(intake.extractedFields.adults);
  const children = getPositiveInteger(intake.extractedFields.children);
  const infants = getPositiveInteger(intake.extractedFields.infants);

  if (!fromCode || !fromType || !toCode || !toType) {
    return buildErrorResult(
      serviceLine,
      "invalid_anchor_or_mapping",
      "Transfer search requiere anchors from/to supplier-ready con code y type.",
    );
  }

  if (!outboundDateTime || adults <= 0) {
    return buildErrorResult(
      serviceLine,
      "missing_required_field",
      "Transfer search requiere outboundDateTime y ocupacion valida.",
    );
  }

  const suiteConfig = getSuiteConfig(config, serviceLine);

  if (!suiteConfig) {
    return buildErrorResult(
      serviceLine,
      "auth_or_signature_error",
      "No hay credenciales Hotelbeds configuradas para transfers.",
    );
  }

  const inboundSegment = inboundDateTime ? `/${inboundDateTime}` : "";
  const response = await requestHotelbedsJson<{
    services?: TransferService[];
  }>({
    fetchImpl: config.fetchImpl ?? fetch,
    method: "GET",
    path:
      `/transfer-api/1.0/availability/${config.language}/from/${fromType}/${fromCode}` +
      `/to/${toType}/${toCode}/${outboundDateTime}${inboundSegment}/${adults}/${children}/${infants}`,
    suite: suiteConfig.suite,
  });

  return normalizeTransfers(serviceLine, response.services ?? []);
};

const mapThrownErrorToResult = (serviceLine: ServiceLine, error: unknown) => {
  if ((error as HotelbedsRequestError).code) {
    const supplierError = error as HotelbedsRequestError;

    return buildErrorResult(
      serviceLine,
      supplierError.code,
      supplierError.message,
    );
  }

  return buildErrorResult(
    serviceLine,
    "supplier_unavailable",
    "Hotelbeds fallo de forma inesperada durante la consulta.",
  );
};

export const createHotelbedsAdapter = (
  config: HotelbedsAdapterConfig,
): HotelbedsSearchAdapter => ({
  async search(intake, serviceLine) {
    try {
      if (serviceLine === "hotel") {
        return await executeHotelSearch(config, intake, serviceLine);
      }

      if (serviceLine === "activity") {
        return await executeActivitySearch(config, intake, serviceLine);
      }

      return await executeTransferSearch(config, intake, serviceLine);
    } catch (error) {
      return mapThrownErrorToResult(serviceLine, error);
    }
  },
});
