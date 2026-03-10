import type {
  BlockingField,
  ServiceLine,
  ServiceLineReadiness,
  StructuredIntake,
} from "@alana/domain";
import { createId, nowIso } from "@alana/shared";
import OpenAI from "openai";
import type { ReasoningEffort } from "openai/resources/shared";

const knownDestinations = [
  {
    canonical: "paris",
    aliases: ["paris"],
  },
  {
    canonical: "madrid",
    aliases: ["madrid"],
  },
  {
    canonical: "rome",
    aliases: ["rome", "roma"],
  },
  {
    canonical: "barcelona",
    aliases: ["barcelona"],
  },
  {
    canonical: "cancun",
    aliases: ["cancun", "cancun mexico"],
  },
  {
    canonical: "miami",
    aliases: ["miami"],
  },
  {
    canonical: "london",
    aliases: ["london", "londres"],
  },
  {
    canonical: "majorca",
    aliases: ["majorca", "mallorca", "palma", "palma de mallorca"],
  },
] as const;

type IntakeExtractionResult = {
  contradictions: string[];
  extractedFields: StructuredIntake["extractedFields"];
  missingFields: BlockingField[];
  previousResponseId: string | null;
  readinessByServiceLine: Partial<Record<ServiceLine, ServiceLineReadiness>>;
  requestedServiceLines: ServiceLine[];
};

type OpenAiIntakePayload = {
  adults: number;
  childAges: number[];
  children: number;
  contradictions: string[];
  destination: string;
  infants: number;
  requestedServiceLines: ServiceLine[];
  travelDates: string[];
};

export type QuoteAiRuntime = {
  extractStructuredIntake(input: {
    content: string;
    existingIntake?: StructuredIntake | null;
    previousResponseId?: string | null;
    quoteSessionId: string;
  }): Promise<IntakeExtractionResult>;
};

export const promptRegistry = {
  master: {
    key: "master-policy",
    version: "2026-03-09.2",
    summary:
      "Workflow-first, supplier-grounded, clarify blockers first, never fabricate unsupported supply.",
  },
  nodes: {
    intakeExtractor: {
      key: "intake-extractor",
      version: "2026-03-09.2",
    },
    clarificationPlanner: {
      key: "clarification-planner",
      version: "2026-03-09.2",
    },
    packagingWriter: {
      key: "packaging-writer",
      version: "2026-03-09.2",
    },
  },
};

const intakeJsonSchema = {
  additionalProperties: false,
  properties: {
    requestedServiceLines: {
      items: {
        enum: ["hotel", "transfer", "activity"],
        type: "string",
      },
      type: "array",
    },
    destination: { type: "string" },
    travelDates: {
      items: { type: "string" },
      type: "array",
    },
    adults: { minimum: 0, type: "integer" },
    children: { minimum: 0, type: "integer" },
    childAges: {
      items: { minimum: 0, type: "integer" },
      type: "array",
    },
    infants: { minimum: 0, type: "integer" },
    contradictions: {
      items: { type: "string" },
      type: "array",
    },
  },
  required: [
    "requestedServiceLines",
    "destination",
    "travelDates",
    "adults",
    "children",
    "childAges",
    "infants",
    "contradictions",
  ],
  type: "object",
} as const;

const buildMissingFields = (input: {
  adults: number;
  childAges: Array<number | string>;
  children: number;
  destination: string;
  requestedServiceLines: ServiceLine[];
  travelDates: string[];
}) => {
  const missingFields: BlockingField[] = [];

  if (!input.destination.trim()) {
    missingFields.push("destination");
  }

  if (input.travelDates.length < 2) {
    missingFields.push("travel_dates");
  }

  if (input.adults <= 0) {
    missingFields.push("occupancy");
  }

  if (input.requestedServiceLines.length === 0) {
    missingFields.push("service_scope");
  }

  if (input.children > 0 && input.childAges.length !== input.children) {
    missingFields.push("child_ages");
  }

  return missingFields;
};

const getStringField = (value: unknown) =>
  typeof value === "string" && value.trim().length > 0 ? value.trim() : "";

const getStringArrayField = (value: unknown) =>
  Array.isArray(value)
    ? value
        .map((item) => (typeof item === "string" ? item.trim() : ""))
        .filter((item): item is string => item.length > 0)
    : [];

const getNumberField = (value: unknown) =>
  typeof value === "number" && Number.isFinite(value) ? value : 0;

const dedupeValues = <T>(values: T[]) => [...new Set(values)];

const shouldOverrideNumericField = (content: string, patterns: RegExp[]) =>
  patterns.some((pattern) => pattern.test(content));

const buildIntakeResult = (
  quoteSessionId: string,
  payload: OpenAiIntakePayload,
  raw: string,
  previousResponseId: string | null,
  existingIntake?: StructuredIntake | null,
): IntakeExtractionResult => {
  const existingFields = existingIntake?.extractedFields ?? {};
  const existingDestination = getStringField(existingFields.destination);
  const existingTravelDates = getStringArrayField(existingFields.travelDates);
  const existingChildAges = getStringArrayField(existingFields.childAges);
  const existingAdults = getNumberField(existingFields.adults);
  const existingChildren = getNumberField(existingFields.children);
  const existingInfants = getNumberField(existingFields.infants);
  const requestedServiceLines = dedupeValues([
    ...(existingIntake?.requestedServiceLines ?? []),
    ...payload.requestedServiceLines,
  ]);
  const nextChildAges = payload.childAges
    .filter((age) => Number.isFinite(age) && age >= 0)
    .map((age) => `${Math.trunc(age)}`);
  const mergedRaw = [getStringField(existingFields.raw), raw]
    .filter((value) => value.length > 0)
    .join("\n");
  const adults = shouldOverrideNumericField(raw, [
    /adult|adults|adulto|adultos|pax/i,
  ])
    ? payload.adults
    : payload.adults > 0
      ? payload.adults
      : existingAdults;
  const children = shouldOverrideNumericField(raw, [
    /child|children|nino|ninos|kids/i,
  ])
    ? payload.children
    : payload.children > 0
      ? payload.children
      : existingChildren;
  const infants = shouldOverrideNumericField(raw, [
    /infant|infants|bebe|bebes|baby|babies/i,
  ])
    ? payload.infants
    : payload.infants > 0
      ? payload.infants
      : existingInfants;
  const destination = payload.destination.trim() || existingDestination;
  const travelDates =
    payload.travelDates.length > 0 ? payload.travelDates : existingTravelDates;
  const childAges =
    nextChildAges.length > 0 ? nextChildAges : existingChildAges;
  const normalizedMissingFields = buildMissingFields({
    adults,
    childAges,
    children,
    destination,
    requestedServiceLines,
    travelDates,
  });

  return {
    contradictions: dedupeValues([
      ...(existingIntake?.contradictions ?? []),
      ...payload.contradictions,
    ]),
    extractedFields: {
      ...existingFields,
      adults,
      childAges,
      children,
      destination,
      infants,
      raw: mergedRaw,
      travelDates,
    },
    missingFields: normalizedMissingFields,
    previousResponseId,
    readinessByServiceLine: requestedServiceLines.reduce<
      Partial<Record<ServiceLine, ServiceLineReadiness>>
    >((accumulator, serviceLine) => {
      accumulator[serviceLine] =
        normalizedMissingFields.length > 0 ? "blocked" : "ready";
      return accumulator;
    }, {}),
    requestedServiceLines,
  };
};

const parseServiceLines = (content: string): ServiceLine[] => {
  const lower = content.toLowerCase();
  const lines = new Set<ServiceLine>();

  if (lower.includes("hotel")) {
    lines.add("hotel");
  }

  if (lower.includes("transfer") || lower.includes("traslado")) {
    lines.add("transfer");
  }

  if (
    lower.includes("activity") ||
    lower.includes("activities") ||
    lower.includes("actividad") ||
    lower.includes("tour")
  ) {
    lines.add("activity");
  }

  return [...lines];
};

const extractDestination = (content: string) =>
  knownDestinations.find((destination) =>
    destination.aliases.some((alias) => content.toLowerCase().includes(alias)),
  )?.canonical ?? "";

const extractDates = (content: string) =>
  [...content.matchAll(/\b\d{4}-\d{2}-\d{2}\b/g)].map((match) => match[0]);

const extractAdults = (content: string) => {
  const match = content.match(/(\d+)\s*(adult|adults|adulto|adultos|pax)/i);
  return match ? Number(match[1]) : 0;
};

const extractChildren = (content: string) => {
  const match = content.match(/(\d+)\s*(child|children|nino|ninos|kids)/i);
  return match ? Number(match[1]) : 0;
};

const extractInfants = (content: string) => {
  const match = content.match(
    /(\d+)\s*(infant|infants|bebe|bebes|baby|babies)/i,
  );
  return match ? Number(match[1]) : 0;
};

const extractChildAges = (content: string) => {
  const ageBlock =
    content.match(
      /(?:child(?:ren)?|kids?|nino|ninos)?\s*ages?\s*[:\-]?\s*([0-9,\sand]+)/i,
    ) ??
    content.match(/edades?\s*(?:de\s*los\s*ninos)?\s*[:\-]?\s*([0-9,\sy]+)/i);

  if (ageBlock?.[1]) {
    return [...ageBlock[1].matchAll(/\b\d{1,2}\b/g)].map((match) =>
      Number(match[0]),
    );
  }

  return [
    ...content.matchAll(/\b(\d{1,2})\s*(?:yo|yrs?|years?\s*old)\b/gi),
  ].map((match) => Number(match[1]));
};

export const createStructuredIntake = (
  quoteSessionId: string,
  extraction: IntakeExtractionResult,
): StructuredIntake => ({
  id: createId(),
  quoteSessionId,
  requestedServiceLines: extraction.requestedServiceLines,
  extractedFields: extraction.extractedFields,
  missingFields: extraction.missingFields,
  contradictions: extraction.contradictions,
  readinessByServiceLine: extraction.readinessByServiceLine,
  createdAt: nowIso(),
});

export const getClarificationQuestion = (intake: StructuredIntake) => {
  const firstMissing = intake.missingFields[0];

  switch (firstMissing) {
    case "destination":
      return "Necesito confirmar el destino principal para poder cotizar.";
    case "travel_dates":
      return "Necesito las fechas del viaje en formato YYYY-MM-DD para avanzar.";
    case "occupancy":
      return "Necesito la ocupacion base del caso, por ejemplo 2 adults o 2 adults 1 child.";
    case "service_scope":
      return "Confirma si el caso incluye hotel, traslados, actividades o combinacion de servicios.";
    case "child_ages":
      return "Hay ninos en el caso; necesito sus edades antes de buscar opciones validas.";
    default:
      return "Necesito una aclaracion breve antes de continuar.";
  }
};

export const createMockAiRuntime = (): QuoteAiRuntime => ({
  async extractStructuredIntake({
    content,
    existingIntake,
    quoteSessionId,
    previousResponseId,
  }) {
    const destination = extractDestination(content);
    const travelDates = extractDates(content);
    const adults = extractAdults(content);
    const children = extractChildren(content);
    const childAges = extractChildAges(content);
    const infants = extractInfants(content);
    const requestedServiceLines = parseServiceLines(content);
    const contradictions: string[] = [];

    if (/luxury|lujo/i.test(content) && /budget|barato|cheap/i.test(content)) {
      contradictions.push(
        "El caso mezcla expectativa premium con sensibilidad fuerte de presupuesto.",
      );
    }

    return buildIntakeResult(
      quoteSessionId,
      {
        adults,
        childAges,
        children,
        contradictions,
        destination,
        infants,
        requestedServiceLines,
        travelDates,
      },
      content,
      previousResponseId ?? null,
      existingIntake,
    );
  },
});

export const createOpenAiResponsesRuntime = (input: {
  apiKey: string;
  intakeReasoningEffort: ReasoningEffort;
  model: string;
}) => {
  const client = new OpenAI({
    apiKey: input.apiKey,
  });

  const runtime: QuoteAiRuntime = {
    async extractStructuredIntake({
      content,
      existingIntake,
      previousResponseId,
      quoteSessionId,
    }) {
      const response = await client.responses.create({
        input: [
          {
            content:
              "Extract the travel quoting intake into the requested JSON schema. Do not invent destinations, dates, service lines, pax counts, child ages, or infants.",
            role: "developer",
          },
          {
            content: `Traveler request:\n${content}`,
            role: "user",
          },
        ],
        max_output_tokens: 600,
        metadata: {
          node: promptRegistry.nodes.intakeExtractor.key,
          quote_session_id: quoteSessionId,
        },
        model: input.model,
        previous_response_id: previousResponseId ?? undefined,
        reasoning: {
          effort: input.intakeReasoningEffort,
          summary: "concise",
        },
        text: {
          format: {
            description:
              "Structured intake extraction for the Alana quote workflow.",
            name: "alana_intake_extraction",
            schema: intakeJsonSchema,
            strict: true,
            type: "json_schema",
          },
          verbosity: "low",
        },
      });

      const parsed = JSON.parse(response.output_text) as OpenAiIntakePayload;

      return buildIntakeResult(
        quoteSessionId,
        parsed,
        content,
        response.id,
        existingIntake,
      );
    },
  };

  return runtime;
};
