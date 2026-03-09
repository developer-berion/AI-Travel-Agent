import type {
  NormalizedOption,
  ServiceLine,
  StructuredIntake,
} from "@alana/domain";
import { createId } from "@alana/shared";

export const supplierErrorValues = [
  "validation_error",
  "missing_required_field",
  "invalid_anchor_or_mapping",
  "auth_or_signature_error",
  "supplier_timeout",
  "supplier_unavailable",
  "stale_or_expired_rate",
  "normalization_error",
  "unsupported_scope",
  "no_results",
  "weak_results",
] as const;

export type SupplierErrorCode = (typeof supplierErrorValues)[number];

export type SupplierError = {
  code: SupplierErrorCode;
  message: string;
};

export type SupplierSearchResult = {
  serviceLine: ServiceLine;
  options: NormalizedOption[];
  weakShortlist: boolean;
  warning: string | null;
  error: SupplierError | null;
};

export type HotelbedsSearchAdapter = {
  search(
    intake: StructuredIntake,
    serviceLine: ServiceLine,
  ): Promise<SupplierSearchResult>;
};

const baseOptions = (
  serviceLine: ServiceLine,
  destination: string,
): NormalizedOption[] => [
  {
    id: createId(),
    serviceLine,
    destination,
    title:
      serviceLine === "hotel"
        ? `Hotel ${destination} Grand`
        : serviceLine === "transfer"
          ? `Private ${destination} transfer`
          : `${destination} signature activity`,
    headlinePrice:
      serviceLine === "hotel" ? 780 : serviceLine === "transfer" ? 95 : 120,
    currency: "USD",
    whyItFits:
      serviceLine === "hotel"
        ? "Encaja con el destino, mantiene buena reputacion y salida operator-friendly."
        : serviceLine === "transfer"
          ? "Cubre la ruta pedida con claridad operativa y menor friccion."
          : "Mantiene fit con el destino y aporta valor sin inflar el circuito.",
    tradeoff:
      serviceLine === "hotel"
        ? "No es la opcion mas barata, pero equilibra zona y flexibilidad."
        : serviceLine === "transfer"
          ? "Tiene menos flexibilidad de horario que la opcion premium."
          : "Tiene inventario mas estrecho que actividades de catalogo amplio.",
    caveat:
      serviceLine === "activity"
        ? "La disponibilidad de activities es mas volatil y puede requerir reconfirmacion."
        : null,
    availabilityState:
      serviceLine === "hotel" ? "recheck_required" : "available",
    supplierMetadata: {
      source: "hotelbeds_mock",
      rateKey: `opaque_${createId()}`,
    },
  },
  {
    id: createId(),
    serviceLine,
    destination,
    title:
      serviceLine === "hotel"
        ? `Hotel ${destination} Value`
        : serviceLine === "transfer"
          ? `Shared ${destination} shuttle`
          : `${destination} essential activity`,
    headlinePrice:
      serviceLine === "hotel" ? 620 : serviceLine === "transfer" ? 60 : 85,
    currency: "USD",
    whyItFits:
      "Aporta una alternativa de valor con mejor relacion costo-utilidad.",
    tradeoff:
      serviceLine === "hotel"
        ? "Menor flexibilidad de cancelacion."
        : serviceLine === "transfer"
          ? "Menor privacidad y mas espera."
          : "Menor diferenciacion para viajeros premium.",
    caveat: null,
    availabilityState: "available",
    supplierMetadata: {
      source: "hotelbeds_mock",
      rateKey: `opaque_${createId()}`,
    },
  },
];

export const createMockHotelbedsAdapter = (): HotelbedsSearchAdapter => ({
  async search(intake, serviceLine) {
    const destination = String(intake.extractedFields.destination ?? "Unknown");

    if (destination.toLowerCase() === "smallville") {
      return {
        serviceLine,
        options: [],
        weakShortlist: false,
        warning: null,
        error: {
          code: "no_results",
          message:
            "No se encontraron opciones para este destino con los criterios actuales.",
        },
      };
    }

    if (serviceLine === "activity" && destination.toLowerCase() === "cancun") {
      return {
        serviceLine,
        options: baseOptions(serviceLine, destination).slice(0, 1),
        weakShortlist: true,
        warning:
          "Activities devolvio una shortlist debil; el paquete debe marcarse como parcial.",
        error: {
          code: "weak_results",
          message: "Inventario limitado para activities.",
        },
      };
    }

    return {
      serviceLine,
      options: baseOptions(serviceLine, destination),
      weakShortlist: false,
      warning: null,
      error: null,
    };
  },
});
