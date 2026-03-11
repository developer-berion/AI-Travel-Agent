# UX/UI Visual Audit Report - Alana Travel Quoting OS
**Date**: 2026-03-11
**Auditor**: Antigravity (UX/UI Expert Tooling)
**Scope**: Visual and UX/UI reading audit based on the provided plan, utilizing the local Mock environment (martes 10 de marzo de 2026).

## Resumen Ejecutivo
El sistema presenta una estructura base funcional y un componente técnico robusto, pero la interfaz operativa de *Alana Travel Quoting OS* sufre de una elevada fricción cognitiva (alto "cognitive load") y deuda visual. 
Los hallazgos principales se centran en:
1. **Mezcla constante de idiomas (Spanglish)** en capas equivalentes.
2. **Exceso de badges técnicos y monospaced uppercase tags (M-01, M-02)** que exponen estado de ingeniería al operador comercial.
3. **Alta redundancia de información** (ej. los headers de Quote Workbench vs. The Thread Header y el Summary Banner dicen exactamente lo mismo).
4. **Matrices comparativas visualmente densas** sin jerarquía de lectura (Compare Tray).
5. **Humanización ausente en estados de error**, revelando variables técnicas en los *Blocked States*.

---

## 1. Inventario de Hallazgos por Superficie

### 1.1 Login (S1)
- **Hallazgo 1: Mezcla Idiomática**. Mezcla de inglés y español ("OPERATOR WORKSPACE", "Access control" y la aclaración "Mock auth mantiene el workbench...").
- **Hallazgo 2: Aclaración técnica en área comercial**. El texto de "Mock auth baseline" no es adecuado para la vista final de operador.
- **Severidad**: P2 (Degrada confianza comercial).
- **Recomendación Visual/Copy**: Unificar a English (o Spanish) según el locale definido por producto. Remover o esconder bajo un dev-toggle el texto técnico "Mock auth mantiene el workbench operativo...". Consolidar jerarquía: "OPERATOR WORKSPACE" puede ser el único label.

### 1.2 Topbar y Shell (S1, S2, etc.)
- **Hallazgo 3: Agresividad visual de badges técnicos**. Los pills ("Mock auth", "Mock repository", "Mock orchestration") compiten fuertemente con la información de casos, dominando visualmente el header.
- **Severidad**: P3 (Inconsistencia visual y deuda, no bloqueante, pero aumenta stress cognitivo).
- **Recomendación Visual**: Agrupar los estados de Mock en un solo badge verde o naranja ("Dev Mode" o "Mock Env") o reducirlos a un dot indicator con tooltip.

### 1.3 Workspace Inbox (S2, S3)
- **Hallazgo 4: Dominio visual de los estados vacíos**. Los grupos (ARCHIVADAS, CERRADAS, etc.) sin casos tienen un contenedor gigante ("No hay casos en este grupo con los filtros actuales") que agrega altura inútil a la pantalla y obliga a hacer scroll horizontal/vertical inoficioso.
- **Hallazgo 5: Acciones de triage redundantes**. Preview, Abrir y Archivar conviven con un botón lateral que también dice "Abrir quote", confuso si es la misma acción.
- **Severidad**: P2 (Degrada lectura).
- **Recomendación Visual**: Colapsar visualmente los contenedores vacíos a una altura mínima de 40px o implementar tabs en lugar de listas verticales si no hay casos.
- **Recomendación Copy**: Cambiar "Abrir quote" a "Ver caso" en español o "Open case" en inglés permanentemente para mantener el idioma constante.

### 1.4 Conversation Header y Timeline (S4, S8)
- **Hallazgo 6: Redundancia de encabezados (Triplicidad)**. Se muestra "QUOTE WORKBENCH", "PARTIAL COVERAGE" ("La cobertura actual es parcial"...) y "THREAD HEADER" de forma consecutiva repitiendo o encapsulando el mismo scope.
- **Hallazgo 7: Exposición del log técnico ("M-01", "M-02")**. El timeline parece un terminal parseado. Etiquetas como "M-02 BLOCKING CLARIFICATION" están en monospace uppercase azul y se leen como fallas, asustando al usuario.
- **Severidad**: P2 (Exceso de texto fragmentado degradando la comprensión).
- **Recomendación Visual/Copy**: 
  - Fusionar el Quote Workbench Header y el Thread Header. El estado, la recomendación y la versión pueden ir al mismo nivel sin tres cards estancados.
  - Eliminar los códigos "M-XX" de la UI del operador. Reemplazar por íconos sutiles (ej. un rayo o marca de revisión) y textos humanos (Ej. "Action Required" o "Clarificación Comercial").

### 1.5 Shortlists y Compare Tray (S5)
- **Hallazgo 8: Density y Bulky Cards en matriz**. Los grises son muy oscuros en *dark theme* y las cajas no tienen bordes definidos o delineadores de filas lo que hace todo el "Compare matrix" ilegible cuando tiene >3 elementos.
- **Hallazgo 9: English inyectado**. ("Taxes due at check-in" o "Promote to active quote" dentro de una UI en español como "Selecciona opciones desde la shortlist...").
- **Severidad**: P2 (Lectura densa).
- **Recomendación Visual**: Cambiar el bloque gris completo por una tabla real o pseudo-tabla de filas delimitadas (row-striping o bottom-border light) para evitar el bloque brutalista.

### 1.6 Case Sheet (S7)
- **Hallazgo 10: Falsa modularidad (Data Dump)**. El sheet se siente como una salida de base de datos (`FACTS CONFIRMADOS`, `BLOCKERS`, `ASSUMPTIONS`).
- **Severidad**: P3.
- **Recomendación Visual**: Simplificar quitando el card border a los pequeños facts, pasándolos a una lista más amigable `Key-Value` con íconos de check.

### 1.7 Active Quote Review (S6)
- **Hallazgo 11: Warnings visuales ambiguos**. La alerta "NOT INCLUDED: Taxes due at check-in" usa el color azul neutral de la interfaz. Debería usar tratamiento visual claro (amarillo de warning o gris delimitado).
- **Severidad**: P3.

### 1.8 Export / PDF y Error States (S10, S11)
- **Hallazgo 12: Errores técnicos expuestos (P1)**. La clave "TRANSIENT VISIBLE FAILURE: quote_command_not_allowed" está en el frontend, arruinando la ilusión "humana" y creando confusión (S11).
- **Severidad**: **P1 (Humano-bloqueante y daña la confianza)**.
- **Recomendación Copy**: Interceptar los errores del orchestrator. Reemplazar `"quote_command_not_allowed"` por `"No se puede exportar en el estado actual. Revise las alertas pendientes e intente nuevamente."`

### 1.9 Archive y Reactivación (S9)
- **Hallazgo 13: Loop o eco de copy**. Hay un banner de `"Caso reactivado. El resumen actual..."` más una card interactiva `"RESUME CONTINUITY"` más una tarjeta `"M-09 RESUME MESSAGE"` que dice `"Continuidad restaurada"`. El operador debe leer tres veces que el quote volvió a abrirse.
- **Severidad**: P2.
- **Recomendación**: Dejar un solo Event Badge sutil ("✓ Caso reactivado a las 4:00 PM") incrustado en el transcript.

### 1.10 Responsive (Tablet & Mobile S12)
- **Hallazgo 14: Header aplastado en Mobile**. Los tags de "Mock auth" comprimen todo el ancho y rompen el alineamiento visual en móviles.
- **Severidad**: P2.
- **Recomendación General**: En pantallas <1024px, ocultar los pills técnicos bajo un único *Info Icon* en el main header.

---

## 2. Recomendación Estratégica Conjunta (UX/UI + Product)

Se sugiere a Producto y UX/UI acordar tempranamente que **"la interface operativa NO es una terminal de debug"**.
**Capas a fusionar/simplificar de inmediato:**
1. **Thread Header + Quote Workbench Banner**: Combinar en un único encabezado tipo *Sticky Header* con un badge dinámico que indique el estado y acción actual sin repetir resúmenes.
2. **Eliminar los M-codes (ej. M-01 a M-09)** y sustituirlos por títulos comerciales descriptivos (ej. "Revisión Inicial", "Falta Información", "Opciones Listas").
3. **Decidir Locale principal**. Actualmente la App intenta ser global con una mezcla en el copy de 60% español y 40% inglés. Se recomienda definir un i18n real o apegarse al 100% de la metadata en un solo idioma.

**Criterios de Éxito para cerrar deuda:**
- Cero "M-labels" expuestos de la orquestación.
- Cero códigos en snake_case devueltos por errores de API.
- Cero scroll inducido por cajas genéricas de "No hay casos" (implementar colapso de empty slots).
- 100% de consistencia de color contrastante en estado dark/light para Compare Matrices.

---
**Reporte preparado por Antigravity**. Listo para pase a equipo de ingeniería UI/Frontend.
