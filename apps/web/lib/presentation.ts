import { type QuoteRecord, getCoverageState } from "@alana/database";
import type {
  CommercialStatus,
  QuoteSessionState,
  RecommendationMode,
  ServiceLine,
} from "@alana/domain";

export const quoteStateUiLabels: Record<QuoteSessionState, string> = {
  draft: "Borrador",
  clarifying: "Aclarando",
  searching: "Buscando",
  reviewing: "En revisión",
  export_ready: "Lista para exportar",
  exported: "Exportada",
  escalated: "Escalada",
  closed: "Cerrada",
  archived: "Archivada",
};

export const recommendationModeUiLabels: Record<RecommendationMode, string> = {
  best_match: "Mejor coincidencia",
  three_options: "Tres opciones",
  exact: "Exacta",
};

export const serviceLineUiLabels: Record<ServiceLine, string> = {
  hotel: "Hotel",
  transfer: "Traslado",
  activity: "Actividad",
};

export const continuityUiLabels = {
  active: "Activo",
  archived: "Archivado",
  follow_up: "Seguimiento",
} as const;

export const commercialStatusUiLabels: Record<CommercialStatus, string> = {
  abierta: "Abierta",
  en_seguimiento: "En seguimiento",
  compartida: "Compartida",
  avanzo_fuera_del_sistema: "Avanzó fuera del sistema",
  cerrada_sin_avance: "Cerrada sin avance",
  archivada: "Archivada",
};

const eyebrowUiLabels: Record<string, string> = {
  Compare: "Comparativa",
  "Blocking clarification": "Acción requerida",
  "Blocked intake": "Intake bloqueado",
  "Detail pane": "Detalle",
  "High-value clarification": "Precisión útil",
  "No results": "Sin resultados",
  "Partial / fallback": "Cobertura parcial",
  "Partial coverage": "Cobertura parcial",
  "Ready for search": "Lista para buscar",
  "Result handoff": "Resultados listos",
  "Resume continuity": "Continuidad",
  "Resume message": "Caso reactivado",
  "Search progress": "Búsqueda en curso",
  "Summary banner": "Resumen",
  "Thread header": "Conversación",
  "Understanding summary": "Esto entendí del caso",
  Versions: "Versiones",
};

const actionUiLabels: Record<string, string> = {
  "Answer blocker": "Resolver bloqueo",
  "Clear compare": "Limpiar comparativa",
  "Confirm assumptions": "Confirmar supuestos",
  "Confirm contradiction": "Resolver contradicción",
  "Open active quote": "Ver propuesta activa",
  "Open versions": "Abrir historial",
  "Request more options": "Pedir más opciones",
  "Review case sheet": "Ver hoja de caso",
  "Review caveats": "Revisar caveats",
  "Review shortlists": "Revisar shortlists",
  "Run supplier search": "Buscar con proveedor",
  "Update traveler facts": "Actualizar datos",
};

const compareRowUiLabels: Record<string, string> = {
  Action: "Acción",
  Attribute: "Criterio",
  Availability: "Disponibilidad",
  "Availability / cancellation": "Disponibilidad y cancelación",
  Caveat: "Caveat",
  Destination: "Destino",
  Fit: "Encaje",
  Modality: "Modalidad",
  Price: "Precio",
  Timing: "Horario",
  "Hotel code / name": "Hotel",
  "Operational constraints": "Condiciones operativas",
  "Route / provider": "Ruta y proveedor",
  Vehicle: "Vehículo",
};

export const translateUiEyebrow = (value: string) =>
  eyebrowUiLabels[value] ?? value;

export const translateUiAction = (value: string) =>
  actionUiLabels[value] ?? value;

export const translateCompareRowLabel = (value: string) =>
  compareRowUiLabels[value] ?? value;

export const getContinuityVariant = (record: Pick<QuoteRecord, "session">) => {
  if (
    record.session.status === "archived" ||
    record.session.commercialStatus === "archivada"
  ) {
    return "archived" as const;
  }

  if (record.session.commercialStatus === "en_seguimiento") {
    return "follow_up" as const;
  }

  return "active" as const;
};

export const getContinuityLabel = (record: Pick<QuoteRecord, "session">) => {
  const variant = getContinuityVariant(record);

  return variant === "archived"
    ? continuityUiLabels.archived
    : variant === "follow_up"
      ? continuityUiLabels.follow_up
      : continuityUiLabels.active;
};

export const getCoverageUiLabel = (record: QuoteRecord) => {
  const coverageState = getCoverageState(record);

  return coverageState === "full"
    ? "Cobertura completa"
    : coverageState === "partial"
      ? "Cobertura parcial"
      : "Pendiente de completar";
};

export const getCoverageUiTone = (record: QuoteRecord) => {
  const coverageState = getCoverageState(record);

  return coverageState === "full"
    ? "success"
    : coverageState === "partial"
      ? "warning"
      : "danger";
};

export const getCurrentActionPresentation = (record: QuoteRecord) => {
  if (
    record.session.status === "archived" ||
    record.session.commercialStatus === "archivada"
  ) {
    return {
      description:
        "El caso sigue disponible en modo lectura hasta que decidas reactivarlo.",
      label: "Caso archivado",
    };
  }

  if (record.session.pendingQuestion) {
    return {
      description: record.session.pendingQuestion,
      label: "Acción requerida",
    };
  }

  if (record.session.status === "searching") {
    return {
      description:
        "Alana está consultando las capas listas sin esconder el estado actual del caso.",
      label: "Buscando opciones",
    };
  }

  if (record.session.status === "export_ready") {
    return {
      description:
        "La selección activa ya está lista para revisión final y exportación.",
      label: "Lista para exportar",
    };
  }

  if (record.selectedItems.length > 0) {
    return {
      description:
        "Ya existe una propuesta activa por categoría y puedes revisarla comercialmente.",
      label: "Revisar propuesta",
    };
  }

  if (record.shortlists.length > 0) {
    return {
      description:
        "Hay resultados visibles para comparar, afinar o promover al quote activo.",
      label: "Comparar opciones",
    };
  }

  return {
    description:
      "Comparte el pedido del viajero para abrir el hilo de cotización y validar readiness.",
    label: "Iniciar cotización",
  };
};

export const formatUiDate = (value: string | null) => {
  if (!value) {
    return "Por confirmar";
  }

  return new Intl.DateTimeFormat("es-ES", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
};

export const formatUiDateTime = (value: string) =>
  new Intl.DateTimeFormat("es-ES", {
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    month: "short",
  }).format(new Date(value));

export const normalizeVisibleCommandError = (error: string) => {
  const normalized = error.trim();

  const knownErrors: Record<string, string> = {
    quote_cart_item_not_found:
      "La selección que intentas modificar ya no está disponible en este paquete.",
    quote_command_failed:
      "No se pudo completar la acción en este momento. Inténtalo de nuevo.",
    quote_command_not_allowed:
      "No se puede completar esta acción desde el estado actual del caso.",
    quote_command_not_implemented:
      "Esta acción todavía no está disponible en esta versión del workbench.",
    quote_export_not_ready:
      "No se puede exportar todavía. Revisa las alertas visibles y completa la propuesta antes de generar el PDF.",
    quote_intake_not_found:
      "El caso todavía no tiene un intake válido para ejecutar esta acción.",
    quote_option_not_found:
      "La opción seleccionada ya no está disponible en la shortlist actual.",
    quote_service_search_not_ready:
      "Todavía faltan datos para pedir más opciones en esta categoría.",
    quote_session_not_found:
      "No encontré el caso solicitado. Actualiza la vista e inténtalo de nuevo.",
    quote_version_not_found: "No encontré la versión que intentas reutilizar.",
    unauthorized:
      "Tu sesión ya no es válida. Vuelve a iniciar sesión para continuar.",
  };

  if (knownErrors[normalized]) {
    return knownErrors[normalized];
  }

  if (/^[a-z0-9_]+$/.test(normalized)) {
    return "No se pudo completar la acción por una validación interna. Inténtalo de nuevo.";
  }

  return normalized;
};
