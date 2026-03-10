import type { ServiceLine, StructuredIntake } from "@alana/domain";

type TransferAnchor = {
  aliases: string[];
  code: string;
  label: string;
  type: string;
};

type DestinationAnchorConfig = {
  activityDestinationCode: string;
  aliases: string[];
  canonicalName: string;
  hotelDestinationCode: string;
  transferAirports: TransferAnchor[];
  transferLocations: TransferAnchor[];
};

export type ResolvedDestinationAnchor = {
  activityDestinationCode: string;
  canonicalKey: string;
  canonicalName: string;
  hotelDestinationCode: string;
};

const destinationRegistry: DestinationAnchorConfig[] = [
  {
    activityDestinationCode: "BCN",
    aliases: ["barcelona"],
    canonicalName: "Barcelona",
    hotelDestinationCode: "BCN",
    transferAirports: [
      {
        aliases: ["barcelona airport", "el prat", "bcn"],
        code: "BCN",
        label: "Barcelona Airport",
        type: "IATA",
      },
    ],
    transferLocations: [],
  },
  {
    activityDestinationCode: "MAD",
    aliases: ["madrid"],
    canonicalName: "Madrid",
    hotelDestinationCode: "MAD",
    transferAirports: [
      {
        aliases: ["madrid airport", "barajas", "mad"],
        code: "MAD",
        label: "Madrid Airport",
        type: "IATA",
      },
    ],
    transferLocations: [],
  },
  {
    activityDestinationCode: "PAR",
    aliases: ["paris"],
    canonicalName: "Paris",
    hotelDestinationCode: "PAR",
    transferAirports: [
      {
        aliases: ["charles de gaulle", "cdg", "paris airport"],
        code: "CDG",
        label: "Paris Charles de Gaulle",
        type: "IATA",
      },
    ],
    transferLocations: [],
  },
  {
    activityDestinationCode: "ROM",
    aliases: ["rome", "roma"],
    canonicalName: "Rome",
    hotelDestinationCode: "ROM",
    transferAirports: [
      {
        aliases: ["fiumicino", "rome airport", "fco"],
        code: "FCO",
        label: "Rome Fiumicino",
        type: "IATA",
      },
    ],
    transferLocations: [],
  },
  {
    activityDestinationCode: "CUN",
    aliases: ["cancun", "cancun mexico"],
    canonicalName: "Cancun",
    hotelDestinationCode: "CUN",
    transferAirports: [
      {
        aliases: ["cancun airport", "cun"],
        code: "CUN",
        label: "Cancun Airport",
        type: "IATA",
      },
    ],
    transferLocations: [],
  },
  {
    activityDestinationCode: "MIA",
    aliases: ["miami"],
    canonicalName: "Miami",
    hotelDestinationCode: "MIA",
    transferAirports: [
      {
        aliases: ["miami airport", "mia"],
        code: "MIA",
        label: "Miami Airport",
        type: "IATA",
      },
    ],
    transferLocations: [],
  },
  {
    activityDestinationCode: "LON",
    aliases: ["london", "londres"],
    canonicalName: "London",
    hotelDestinationCode: "LON",
    transferAirports: [
      {
        aliases: ["heathrow", "lhr", "london airport"],
        code: "LHR",
        label: "London Heathrow",
        type: "IATA",
      },
    ],
    transferLocations: [],
  },
  {
    activityDestinationCode: "PMI",
    aliases: ["majorca", "mallorca", "palma", "palma de mallorca"],
    canonicalName: "Majorca",
    hotelDestinationCode: "PMI",
    transferAirports: [
      {
        aliases: [
          "palma airport",
          "majorca airport",
          "mallorca airport",
          "pmi",
        ],
        code: "PMI",
        label: "Majorca - Palma Airport",
        type: "IATA",
      },
    ],
    transferLocations: [
      {
        aliases: ["hm jaime iii", "hotel hm jaime iii"],
        code: "265",
        label: "HM Jaime III",
        type: "ATLAS",
      },
    ],
  },
];

const normalizeText = (value: string) =>
  value.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().trim();

const getStringField = (value: unknown) =>
  typeof value === "string" && value.trim().length > 0 ? value.trim() : "";

const setReadinessNote = (
  fields: StructuredIntake["extractedFields"],
  serviceLine: ServiceLine,
  note: string,
) => {
  fields[`${serviceLine}ReadinessNote`] = note;
};

const findDestinationConfig = (
  destination: string,
  raw: string,
): DestinationAnchorConfig | null => {
  const normalizedDestination = normalizeText(destination);
  const normalizedRaw = normalizeText(raw);

  return (
    destinationRegistry.find((candidate) =>
      candidate.aliases.some(
        (alias) =>
          normalizedDestination.includes(normalizeText(alias)) ||
          normalizedRaw.includes(normalizeText(alias)),
      ),
    ) ?? null
  );
};

export const resolveSupportedDestinationAnchor = (input: {
  destination?: string | null;
  raw?: string | null;
}): ResolvedDestinationAnchor | null => {
  const config = findDestinationConfig(
    input.destination ?? "",
    input.raw ?? "",
  );

  if (!config) {
    return null;
  }

  return {
    activityDestinationCode: config.activityDestinationCode,
    canonicalKey: normalizeText(config.canonicalName),
    canonicalName: config.canonicalName,
    hotelDestinationCode: config.hotelDestinationCode,
  };
};

export const extractSupportedDestinationKey = (text: string) =>
  resolveSupportedDestinationAnchor({
    destination: text,
    raw: text,
  })?.canonicalKey ?? "";

const findAnchorMatch = (text: string, anchors: TransferAnchor[]) => {
  const normalizedText = normalizeText(text);
  let bestMatch: {
    anchor: TransferAnchor;
    index: number;
  } | null = null;

  for (const anchor of anchors) {
    for (const alias of anchor.aliases) {
      const index = normalizedText.indexOf(normalizeText(alias));

      if (index >= 0 && (!bestMatch || index < bestMatch.index)) {
        bestMatch = {
          anchor,
          index,
        };
      }
    }
  }

  return bestMatch;
};

const getRouteAnchorFromFields = (
  fields: StructuredIntake["extractedFields"],
  prefix: "transferFrom" | "transferTo",
): TransferAnchor | null => {
  const code = getStringField(fields[`${prefix}Code`]);
  const type = getStringField(fields[`${prefix}Type`]);

  if (!code || !type) {
    return null;
  }

  return {
    aliases: [],
    code,
    label: getStringField(fields[`${prefix}Label`]) || code,
    type,
  };
};

const getStructuredPropertyAnchor = (
  fields: StructuredIntake["extractedFields"],
) => {
  const code = getStringField(fields.transferPropertyCode);
  const type = getStringField(fields.transferPropertyType);

  if (!code || !type) {
    return null;
  }

  return {
    aliases: [],
    code,
    label:
      getStringField(fields.transferPropertyLabel) ||
      getStringField(fields.transferPropertyName) ||
      "Selected property",
    type,
  } satisfies TransferAnchor;
};

const hasStructuredPropertyRouteMention = (text: string) => {
  const normalizedText = normalizeText(text);
  return [
    /\bto (the )?hotel\b/,
    /\bto (the )?selected hotel\b/,
    /\bto (the )?property\b/,
    /\bto (the )?selected property\b/,
    /\bto (the )?accommodation\b/,
    /\bfrom (the )?hotel\b/,
    /\bfrom (the )?selected hotel\b/,
    /\bfrom (the )?property\b/,
    /\bfrom (the )?selected property\b/,
    /\bfrom (the )?accommodation\b/,
    /\bal hotel\b/,
    /\bdel hotel\b/,
    /\ba la propiedad\b/,
    /\bde la propiedad\b/,
  ].some((pattern) => pattern.test(normalizedText));
};

const detectTransferDirection = (text: string) => {
  const normalizedText = normalizeText(text);

  const hotelToAirportPattern =
    /\b(from|pickup at|pick up at|de|del)\b.*\b(hotel|property|accommodation)\b.*\b(to|drop off at|dropoff at|al)\b.*\b(airport|aeropuerto)\b/;
  const airportToHotelPattern =
    /\b(from|pickup from|pick up from|del)\b.*\b(airport|aeropuerto)\b.*\b(to|drop off at|dropoff at|al)\b.*\b(hotel|property|accommodation)\b/;

  if (hotelToAirportPattern.test(normalizedText)) {
    return "property_to_airport" as const;
  }

  if (airportToHotelPattern.test(normalizedText)) {
    return "airport_to_property" as const;
  }

  if (
    normalizedText.includes("to airport") ||
    normalizedText.includes("al aeropuerto") ||
    normalizedText.includes("hotel to airport") ||
    normalizedText.includes("hotel al aeropuerto")
  ) {
    return "property_to_airport" as const;
  }

  if (
    normalizedText.includes("from airport") ||
    normalizedText.includes("del aeropuerto") ||
    normalizedText.includes("airport to hotel") ||
    normalizedText.includes("aeropuerto al hotel")
  ) {
    return "airport_to_property" as const;
  }

  return null;
};

const resolveTransferAnchors = (
  intake: StructuredIntake,
  destinationConfig: DestinationAnchorConfig | null,
) => {
  const fields = { ...intake.extractedFields };
  const raw = getStringField(fields.raw);
  const directFromAnchor = getRouteAnchorFromFields(fields, "transferFrom");
  const directToAnchor = getRouteAnchorFromFields(fields, "transferTo");

  if (directFromAnchor && directToAnchor) {
    fields.transferFromLabel = directFromAnchor.label;
    fields.transferToLabel = directToAnchor.label;

    return {
      extractedFields: fields,
      note: `Transfer route resolved from ${directFromAnchor.label} to ${directToAnchor.label}.`,
      readiness: "ready" as const,
    };
  }

  if (!destinationConfig) {
    return {
      extractedFields: fields,
      note: "Transfer search needs a supported destination before route anchors can be resolved.",
      readiness: "blocked" as const,
    };
  }

  const airportMatch = findAnchorMatch(raw, destinationConfig.transferAirports);
  const explicitLocationMatch = findAnchorMatch(
    raw,
    destinationConfig.transferLocations,
  );
  const structuredPropertyAnchor = getStructuredPropertyAnchor(fields);
  const locationMatch =
    explicitLocationMatch ??
    (structuredPropertyAnchor && hasStructuredPropertyRouteMention(raw)
      ? {
          anchor: structuredPropertyAnchor,
          index: Number.MAX_SAFE_INTEGER,
        }
      : null);

  if (airportMatch && locationMatch) {
    const direction = detectTransferDirection(raw);
    const useAirportFirst =
      direction === "airport_to_property" ||
      (direction === null && airportMatch.index < locationMatch.index);
    const fromAnchor = useAirportFirst
      ? airportMatch.anchor
      : locationMatch.anchor;
    const toAnchor = useAirportFirst
      ? locationMatch.anchor
      : airportMatch.anchor;

    fields.transferFromCode = fromAnchor.code;
    fields.transferFromLabel = fromAnchor.label;
    fields.transferFromType = fromAnchor.type;
    fields.transferToCode = toAnchor.code;
    fields.transferToLabel = toAnchor.label;
    fields.transferToType = toAnchor.type;

    return {
      extractedFields: fields,
      note: `Transfer route resolved from ${fromAnchor.label} to ${toAnchor.label}.`,
      readiness: "ready" as const,
    };
  }

  if (airportMatch && !locationMatch) {
    return {
      extractedFields: fields,
      note: "Transfer search has the airport anchor but still needs an exact pickup or dropoff property.",
      readiness: "blocked" as const,
    };
  }

  return {
    extractedFields: fields,
    note: "Transfer search needs exact pickup and dropoff anchors such as airport code plus hotel or atlas property.",
    readiness: "blocked" as const,
  };
};

export const enrichStructuredIntakeWithHotelbedsAnchors = (
  intake: StructuredIntake,
): StructuredIntake => {
  const fields = { ...intake.extractedFields };
  const destination = getStringField(fields.destination);
  const raw = getStringField(fields.raw);
  const destinationConfig = findDestinationConfig(destination, raw);
  const readinessByServiceLine = { ...intake.readinessByServiceLine };
  const hasGlobalBlockers = intake.missingFields.length > 0;

  if (intake.requestedServiceLines.includes("hotel")) {
    if (destinationConfig) {
      fields.destinationCode = destinationConfig.hotelDestinationCode;
      fields.hotelDestinationCode = destinationConfig.hotelDestinationCode;
      readinessByServiceLine.hotel = hasGlobalBlockers ? "blocked" : "ready";
      setReadinessNote(
        fields,
        "hotel",
        `Hotel destination mapped to ${destinationConfig.hotelDestinationCode} for ${destinationConfig.canonicalName}.`,
      );
    } else {
      readinessByServiceLine.hotel = "blocked";
      setReadinessNote(
        fields,
        "hotel",
        "Hotel search needs a supported destination mapping before Hotelbeds can be queried.",
      );
    }
  }

  if (intake.requestedServiceLines.includes("activity")) {
    if (destinationConfig) {
      fields.activityDestinationCode =
        destinationConfig.activityDestinationCode;
      readinessByServiceLine.activity = hasGlobalBlockers ? "blocked" : "ready";
      setReadinessNote(
        fields,
        "activity",
        `Activity destination mapped to ${destinationConfig.activityDestinationCode} for ${destinationConfig.canonicalName}.`,
      );
    } else {
      readinessByServiceLine.activity = "blocked";
      setReadinessNote(
        fields,
        "activity",
        "Activity search needs a supported destination mapping before Hotelbeds can be queried.",
      );
    }
  }

  if (intake.requestedServiceLines.includes("transfer")) {
    const transferResolution = resolveTransferAnchors(
      {
        ...intake,
        extractedFields: fields,
      },
      destinationConfig,
    );
    Object.assign(fields, transferResolution.extractedFields);
    readinessByServiceLine.transfer = hasGlobalBlockers
      ? "blocked"
      : transferResolution.readiness;
    setReadinessNote(fields, "transfer", transferResolution.note);
  }

  return {
    ...intake,
    extractedFields: fields,
    readinessByServiceLine,
  };
};
