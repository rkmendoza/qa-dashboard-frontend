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
| 4 | ✅ Hecho | Historial de ejecuciones con ambiente + fuente (plan vs suelta) — badge de ambiente, label de fuente, notas |
| 8 | ✅ Hecho | Renderizar menciones `@Nombre` en comentarios ADO — CSS para <code>a[data-vss-mention]</code> + fallback para texto plano con <code>.mention</code> |
| 10 | ✅ Hecho | Selector de ambiente en ejecución suelta (sandbox/producción) — ya implementado en ExecutionModal desde sesión anterior |

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
| Mayo 2026 | Fix: Dashboard ahora persiste cambios de estado en bugs_cache (backend) + filtra QA Validated en front con stat card propia |
| Mayo 2026 | Feature: Dashboard — gráfico por sprint, donut por estado, stats de TC ejecutados, card de TC Fallados reemplaza Bloqueados |
| Mayo 2026 | Feature: Historial de ejecuciones #4 — unifica suelta + plan, muestra ambiente (Sandbox/Prod), fuente y notas en TestCases y WorkItemModal |
| Mayo 2026 | Feature: Menciones @Nombre #8 — CSS data-vss-mention + fallback .mention para texto plano en comentarios, descripción y repro steps |
