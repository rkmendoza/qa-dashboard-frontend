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

---

## Análisis de valor — Métricas y reportes QA

### Qué es medible

#### Bugs / Defectos
| Métrica | Cómo se calcula |
|---------|----------------|
| **Volumen por estado** | To Do, In QA, Ready for QA, Validated, Done — ya tenemos los counts |
| **Tasa de llegada** | Bugs creados por semana (comparando syncs) |
| **Tasa de cierre** | Bugs que pasan a Validated/Done por semana |
| **Edad del bug** | Días desde created (lo tiene Jira, no lo guardamos aún) |
| **Distribución por severidad** | P1-P4 / Critical-Low — ya existe filtro |
| **Distribución por asignado** | Quién tiene más bugs asignados — ya existe top 5 |
| **Tipo de item** | Bug vs Task vs Story vs Epic — jira_cache lo tiene |
| **Ciclo QA** | Tiempo desde que entra a In QA hasta que sale a Validated |

#### Ejecución de Tests
| Métrica | Cómo se calcula |
|---------|----------------|
| **Volumen de ejecución** | Tests ejecutados por día (test_executions + plan_executions) |
| **Tasa de paso** | % passed vs failed vs blocked — ya existe por TC individual |
| **Ejecución por ambiente** | Sandbox vs Producción — ya se guarda |
| **Ejecución por módulo** | Tests ejecutados agrupados por módulo del TC |
| **TCs nunca ejecutados** | Diferencia entre total de TCs y TCs con al menos 1 ejecución |
| **Planes completados** | Planes con 100% de TCs ejecutados |

#### Calidad y Cobertura
| Métrica | Cómo se calcula |
|---------|----------------|
| **Bugs sin cobertura** | Bugs sin asociación a ningún plan/TC |
| **Planes por bug** | Promedio de planes que cubren cada bug |
| **TCs con más fallos** | Ranking de TCs con más ejecuciones failed |
| **Módulos más problemáticos** | Módulos con más bugs asociados o más TCs fallados |

### Gráficos que podríamos mostrar

#### Dashboard Principal (hoy)
- Donut por severidad ✅
- Top 5 asignados ✅
- Cards: Ready for QA / In QA / Validated ✅

#### Podríamos agregar
| Gráfico | Tipo | Datos |
|---------|------|-------|
| **Funnel de estado** | Funnel | In QA → Ready for QA → Validated → Done |
| **Tendencia semanal** | Línea | Bugs que entran vs salen de QA por semana |
| **Tiempo en QA** | Barra | Días promedio que los bugs pasan en cada estado |
| **Distribución por tipo** | Donut | Bug vs Task vs Story vs Epic (solo Jira) |
| **Pasó/Falló/Bloqueado** | Donut | % global de resultados de ejecución |
| **Ejecuciones por día** | Línea | Tests ejecutados por día en los últimos 30 días |
| **Cobertura por módulo** | Barra | TCs totales vs ejecutados por módulo |
| **Top TCs fallados** | Barra horizontal | TCs con mayor tasa de fallo |
| **Progreso de planes** | Barra apilada | Planes activos con % completado |
| **Scorecard de release** | Tarjetas | Pass rate, cobertura, bugs abiertos, ciclo QA promedio |

### Valor real de la herramienta por rol

**QA Manager**
Vista unificada de carga de trabajo, cuellos de botella (bugs atascados), velocidad del equipo, módulos problemáticos, reportes sin Excel.

**QA Engineer**
Qué probar hoy, planes de prueba, evidencia de ejecución, trazabilidad bug ↔ test.

**PM / Stakeholder**
¿Estamos listos para release? Pass rate, bugs abiertos vs cerrados, tendencias.

**Dev**
Qué bugs están en QA, patrones de fallo, mejorar calidad basado en datos.

### Impacto concreto
1. **Trazabilidad completa**: cada bug sabe qué TCs lo cubren, quién ejecutó, cuándo, en qué ambiente, con qué resultado
2. **Dos fuentes unificadas**: Jira + Azure en un mismo panel sin saltar entre sistemas
3. **Eficiencia**: sin spreadsheets ni reports manuales
4. **Estandarización**: proceso de QA consistente
5. **Data-driven**: decisiones basadas en métricas, no en suposiciones
