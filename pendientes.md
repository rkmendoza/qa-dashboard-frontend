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
| 11 | ✅ Hecho | CRUD de módulos desde UI — modal con crear/renombrar/eliminar, fetch desde DB |
| 12 | ✅ Hecho | Carpetas/sub-páginas en Documents — jerarquía con parent_id + tree sidebar |
| 9 | ✅ Hecho | Importar test cases desde Excel con preview y detección de columnas |

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
| Mayo 2026 | Fix: parámetros del callback `onExecute` en WorkItemModal |
| Mayo 2026 | Fix: fetchPlanDetail incluye plan_executions |
| Mayo 2026 | Fix: botón "Ejecutar" en plan abre openPlanDetail |
| Mayo 2026 | Fix: modales fuera de contenedor scrollable |
| Mayo 2026 | Feature: Ejecución paso a paso con checkboxes |
| Mayo 2026 | Fix: imágenes ADO rotas — proxy backend |
| Mayo 2026 | Feature: Import test cases Excel/CSV con preview + column autodetect |
| Mayo 2026 | Feature: Column sorting en TestCases (headers clickeables) |
| Mayo 2026 | Feature: Validación duplicados en import TC por título (case-insensitive) |
| Mayo 2026 | Feature: Documents tipo Notion — jerarquía, favoritos, plantillas, import md/docx, drag to nest, emoji picker, breadcrumbs |
| Mayo 2026 | Feature: CRUD de módulos desde UI — tabla modules en Supabase, modal de gestión, reemplazo de lista hardcodeada en TestCases y TestPlans |
