import type {
  NormalizedOption,
  ServiceLine,
  StructuredIntake,
} from "@alana/domain";

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

export type HotelbedsSuiteName = "hotels" | "activities" | "transfers";

export type HotelbedsSuiteConfig = {
  apiKey: string;
  baseUrl: string;
  secret: string;
  timeoutMs: number;
};

export type HotelbedsAdapterConfig = {
  activities?: HotelbedsSuiteConfig;
  fetchImpl?: typeof fetch;
  hotels?: HotelbedsSuiteConfig;
  language: string;
  transfers?: HotelbedsSuiteConfig;
};
