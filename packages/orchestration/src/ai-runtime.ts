import type {
  BlockingField,
  ServiceLine,
  StructuredIntake,
} from "@alana/domain";
import { createId, nowIso } from "@alana/shared";
import OpenAI from "openai";
import type { ReasoningEffort } from "openai/resources/shared";

const knownDestinations = [
  "paris",
  "madrid",
  "roma",
  "barcelona",
  "cancun",
  "miami",
  "london",
] as const;

type IntakeExtractionResult = {
  contradictions: string[];
  extractedFields: StructuredIntake["extractedFields"];
  missingFields: BlockingField[];
  previousResponseId: string | null;
  readinessByServiceLine: StructuredIntake["readinessByServiceLine"];
  requestedServiceLines: ServiceLine[];
};

type OpenAiIntakePayload = {
  adults: number;
  childAgesConfirmed: boolean;
  children: number;
  contradictions: string[];
  destination: string;
  requestedServiceLines: ServiceLine[];
  travelDates: string[];
};

export type QuoteAiRuntime = {
  extractStructuredIntake(input: {
    content: string;
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
    childAgesConfirmed: { type: "boolean" },
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
    "childAgesConfirmed",
    "contradictions",
  ],
  type: "object",
} as const;

const buildMissingFields = (input: {
  adults: number;
  childAgesConfirmed: boolean;
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

  if (input.children > 0 && !input.childAgesConfirmed) {
    missingFields.push("child_ages");
  }

  return missingFields;
};

const buildIntakeResult = (
  quoteSessionId: string,
  payload: OpenAiIntakePayload,
  raw: string,
  previousResponseId: string | null,
): IntakeExtractionResult => {
  const missingFields = buildMissingFields(payload);

  return {
    contradictions: payload.contradictions,
    extractedFields: {
      adults: payload.adults,
      children: payload.children,
      destination: payload.destination,
      raw,
      travelDates: payload.travelDates,
    },
    missingFields,
    previousResponseId,
    readinessByServiceLine: payload.requestedServiceLines.reduce<
      Partial<Record<ServiceLine, "blocked" | "ready" | "partial">>
    >((accumulator, serviceLine) => {
      accumulator[serviceLine] = missingFields.length > 0 ? "blocked" : "ready";
      return accumulator;
    }, {}),
    requestedServiceLines: payload.requestedServiceLines,
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
    content.toLowerCase().includes(destination),
  );

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
    quoteSessionId,
    previousResponseId,
  }) {
    const destination = extractDestination(content) ?? "";
    const travelDates = extractDates(content);
    const adults = extractAdults(content);
    const children = extractChildren(content);
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
        childAgesConfirmed:
          children === 0 || /age|ages|edad|edades/i.test(content),
        children,
        contradictions,
        destination,
        requestedServiceLines,
        travelDates,
      },
      content,
      previousResponseId ?? null,
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
      previousResponseId,
      quoteSessionId,
    }) {
      const response = await client.responses.create({
        input: [
          {
            content:
              "Extract the travel quoting intake into the requested JSON schema. Do not invent destinations, dates, service lines, pax counts, or child age confirmation.",
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

      return buildIntakeResult(quoteSessionId, parsed, content, response.id);
    },
  };

  return runtime;
};
