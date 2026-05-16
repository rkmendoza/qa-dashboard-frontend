# Tracking QA Dashboard — Sesión Mayo 2026

## Fase 5 — Integración Jira + Mejoras

| # | Estado | Descripción |
|---|--------|-------------|
| 1 | ✅ | Separar `jira_cache` de `bugs_cache` — tabla dedicada con RLS, columnas: id, title, status, severity, assignee, url, issue_type, synced_at |
| 2 | ✅ | Backend endpoints Jira en `routes/jira.js`: sync con paginación, detail, comment (ADF), transitions, create |
| 3 | ✅ | Tabs en Dashboard (Azure / Jira) con estado independiente |
| 4 | ✅ | `JiraItemModal.jsx` — detalle, transiciones (fetch dinámico), comentarios, asociación plans/TCs |
| 5 | ✅ | Sync Jira con paginación (`nextPageToken`) — 417 items totales del proyecto RMBL |
| 6 | ✅ | JQL sin filtro de issue type — trae Bugs + Tasks + Stories + Epics |
| 7 | ✅ | Limpieza de datos Jira viejos de `bugs_cache` (224 rows) |
| 8 | ✅ | Cards de Jira: "In QA / Ready for QA" suma ambos, "Validated" para status Validated |
| 9 | ✅ | Tabla oculta Done por defecto con toggle "Mostrar Done" para ambos tabs |
| 10 | ✅ | Azure sync extendido para incluir estado Done |
| 11 | ✅ | Fix: `isAzure` en temporal dead zone — página en blanco |
| 12 | ✅ | Fix: `handleItemUpdated` ahora actualiza tanto `items` como `jiraItems` |

## Fase 2 — UX y registros (mejoras)

| # | Estado | Descripción |
|---|--------|-------------|
| 13 | ✅ | Fix: campo `notes` faltante en SELECT de historial de ejecuciones |
| 14 | ✅ | Migración SQL: columna `notes` en `test_executions` y `plan_executions` |
| 15 | ✅ | Error handling en `handleExecute` de TestCases y TestPlans |
| 16 | ✅ | `EditExecutionModal.jsx` — editar notas/evidencia con borrado de bucket |
| 17 | ✅ | Subida de evidencias (imágenes) a comentarios ADO en WorkItemModal |

## Fase 5b — Fixes y limpieza

| # | Estado | Descripción |
|---|--------|-------------|
| 18 | ✅ | Fix: status "Failed" mal mapeado como "Ready for QA" en WorkItemModal |
| 19 | ✅ | ESTADOS recortado a: Failed, Ready for QA, QA Validated |
| 20 | ✅ | Status colors extendidos para estados Jira (In QA, Validated, etc.) |
| 21 | ✅ | Columna "Tipo" (issue_type) en tabla Jira en lugar de Sprint |

## Detalle técnico

### Base de datos
- `jira_cache` creada en Supabase con RLS (select público, insert/update autenticado)
- `bugs_cache` limpiada de datos Jira viejos (DELETE WHERE source IS NOT NULL)
- Azure: `bugs_cache` ahora incluye Done (WIQL expandido)

### Backend (`qa-dashboard-backend/routes/jira.js`)
| Endpoint | Método | Descripción |
|----------|--------|-------------|
| `/api/jira/sync` | GET | Paginación completa con `nextPageToken`, upsert a `jira_cache` |
| `/api/jira/detail/:key` | GET | Detalle + comentarios desde API v3 |
| `/api/jira/comment/:key` | POST | Comentario en ADF (Atlassian Document Format) |
| `/api/jira/transition/:key` | PATCH | Transición de estado + update en `jira_cache` |
| `/api/jira/transitions/:key` | GET | Lista transiciones disponibles |
| `/api/jira/create` | POST | Crear bug en Jira con projectKey |

### Backend (`qa-dashboard-backend/routes/azure.js`)
| Endpoint | Descripción |
|----------|-------------|
| `/api/azure/sync` | WIQL expandido: `IN ('Ready for QA','QA Validated','Failed','Done')` |

### Frontend (`qa-dashboard-frontend/src/`)
| Archivo | Cambio |
|---------|--------|
| `pages/Dashboard.jsx` | Tabs Azure/Jira, lectura desde `bugs_cache`/`jira_cache`, toggle Mostrar Done, cards adaptativos |
| `components/JiraItemModal.jsx` | Nuevo — modal con transiciones, comentarios, asociación plans/TCs |
| `components/WorkItemModal.jsx` | Fix estado Failed, subida evidencias a comentarios |
| `pages/TestCases.jsx` | Fix `notes` en SELECT, error handling execute |
| `pages/TestPlans.jsx` | Error handling execute |
| `supabase-migration.sql` | `jira_cache`, `notes`, `evidence`, bucket storage |
