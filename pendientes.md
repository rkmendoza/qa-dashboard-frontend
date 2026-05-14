# Pendientes QA Dashboard

## 🔴 Fase 1 — Core QA

| # | Estado | Descripción |
|---|--------|-------------|
| 2 | ✅ Hecho | Ejecución paso a paso con checkboxes y resultado automático |
| 5 | ⏳ Pendiente | Botón "Crear bug en ADO" desde paso fallido — implementado en UI, pendiente de refinamiento |
| 6 | ✅ Hecho | Imágenes rotas de ADO — backend ahora reescribe URLs relativas a absolutas en description, reprosteps y comentarios |
| 7 | ❌ Pendiente | Subir screenshot y adjuntarlo como comentario en ADO (requiere crear workitem de prueba primero) |

## 🟡 Fase 2 — UX y registros

| # | Estado | Descripción |
|---|--------|-------------|
| 4 | ❌ Pendiente | Historial de ejecuciones con ambiente + fuente (plan vs suelta) |
| 8 | ❌ Pendiente | Renderizar menciones `@Nombre` en comentarios ADO |
| 10 | ❌ Pendiente | Agregar selector de ambiente en ejecución suelta |

## 🟢 Fase 3 — Features nuevas

| # | Estado | Descripción |
|---|--------|-------------|
| 11 | ❌ Pendiente | CRUD de módulos desde UI (hoy lista fija en código) |
| 12 | ❌ Pendiente | Carpetas/sub-páginas en Documents |
| 9 | ❌ Pendiente | Importar test cases desde Excel |

## 🔵 Fase 4 — Integraciones

| # | Estado | Descripción |
|---|--------|-------------|
| 16 | ❌ Pendiente | Webhook Teams para fallos críticos |
| 15 | ❌ Pendiente | Jira (depende de acceso al proyecto del cliente) |
| 13 | ❌ Pendiente | Reporte exportable PDF/Excel al cerrar plan |

---

## Fixes aplicados (historial)

| Fecha | Descripción |
|------|-------------|
| Mayo 2026 | Fix: parámetros del callback `onExecute` en WorkItemModal — ahora mapea correctamente args según `executingTarget.type` |
| Mayo 2026 | Fix: `fetchPlanDetail` ahora incluye `plan_executions` para que el resultado se actualice al refrescar |
| Mayo 2026 | Fix: botón verde "Ejecutar" en plan asociado ahora abre `openPlanDetail` en vez de `ExecutionModal` directo |
| Mayo 2026 | Fix: `selectedPlan` y `executingTarget` movidos fuera del contenedor scrollable para evitar superposición z-index |
| Mayo 2026 | Feature: Ejecución paso a paso con checkboxes y resultado automático |
| Mayo 2026 | Fix: imágenes ADO rotas — proxy backend con PAT + Vite proxy para servir attachments |
