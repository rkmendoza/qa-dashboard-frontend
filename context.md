# QA Dashboard — Contexto del proyecto

## Stack tecnológico

| Categoría | Tecnología |
|-----------|-----------|
| Framework | React 19 + Vite 8 |
| Estilos | Tailwind CSS 3 |
| Backend como servicio | Supabase (auth + DB) |
| Librerías UI | Headless UI, Recharts |
| Editor MD | @uiw/react-md-editor + react-markdown + remark-gfm |
| HTTP | Axios |
| Routing | React Router DOM v7 |
| Linter | ESLint 10 |

## Variables de entorno (`.env`)

```
VITE_SUPABASE_URL=https://nrcekmkfrvdlmvkcqard.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
VITE_BACKEND_URL=http://localhost:3001
```

## Estructura de archivos

```
src/
├── main.jsx                  # Entry point, Router + AuthProvider
├── App.jsx                   # Componente por defecto (no se usa)
├── App.css                   # Estilos demo (no se usa)
├── index.css                 # Tailwind directives + prose styles
├── supabaseClient.js         # Cliente Supabase
├── context/
│   └── AuthContext.jsx        # Contexto de autenticación
├── components/
│   ├── Layout.jsx             # Sidebar + navbar + Outlet
│   ├── PrivateRoute.jsx       # Protege rutas autenticadas
│   └── WorkItemModal.jsx      # Modal detalle de bug/item Azure
└── pages/
    ├── Login.jsx              # Login con email/password
    ├── Register.jsx           # Registro con dominio autorizado
    ├── Dashboard.jsx          # Reportes (bugs "Ready for QA")
    ├── TestCases.jsx          # CRUD de test cases + ejecuciones
    ├── TestPlans.jsx          # CRUD de test plans + ejecución
    └── Documents.jsx          # Wiki/documentación MD
```

## Routing

| Ruta | Página | Protegida |
|------|--------|-----------|
| `/login` | Login | No |
| `/register` | Register | No |
| `/` | Redirige a `/dashboard` | Sí |
| `/dashboard` | Reportes (bugs Ready for QA) | Sí |
| `/testcases` | Test Cases | Sí |
| `/testplans` | Test Plans | Sí |
| `/documents` | Documentación / Wiki | Sí |

Todas las rutas protegidas usan `PrivateRoute` que verifica `user` en `AuthContext`. Mientras carga la sesión muestra "Cargando...".

## Autenticación

- **Supabase Auth** con email/contraseña.
- `AuthContext` provee `{ user, loading, signIn, signOut }`.
- Registro solo para dominios autorizados: `col.flylevel.com`, `flylevel.com`, `airplane.solutions`.
- El registro llama a un backend propio (`POST /api/auth/register`) no a Supabase directamente.

## Funcionalidad por página

### Dashboard (`/dashboard`)
- Lista bugs de Azure DevOps sincronizados en tabla `bugs_cache` de Supabase.
- Botón "Sync Azure DevOps" → `GET /api/azure/sync` (backend propio).
- Filtros por severidad y búsqueda por título/asignado/ID.
- Gráficos (Recharts): bugs por severidad, top 5 asignados.
- Tarjetas de resumen: total, alta prioridad, sin asignar, bloqueados.
- Cada bug se puede abrir en `WorkItemModal` para ver detalle, cambiar estado, agregar comentarios y asociar test plans/cases.

### Test Cases (`/testcases`)
- CRUD completo de casos de prueba contra tabla `test_cases` (Supabase).
- Campos: título, descripción, pasos (lista dinámica), resultado esperado, prioridad (Smoke/Crítica/Normal), módulo.
- Ejecución rápida: botón "Ejecutar" → modal con 3 opciones (Pasó/Falló/Bloqueado).
- Historial de ejecuciones (tabla `test_executions` y `plan_executions`).
- Filtros por prioridad, módulo y búsqueda.
- Modal de detalle con historial y opciones de edición/ejecución.

### Test Plans (`/testplans`)
- CRUD de planes de prueba (tabla `test_plans`).
- Asociación de test cases al plan (tabla `test_plan_cases`).
- Estados: Borrador (draft), Activo (active), Completado (completed).
- Ejecución en 2 pasos: seleccionar resultado → elegir ambiente (sandbox/producción) + notas.
- Progreso visual (barra de progreso), historial por TC dentro del plan.
- Filtro por estado.

### Documents (`/documents`)
- Wiki interna con markdown.
- CRUD de documentos (tabla `documents`, Supabase).
- Editor en vivo con previsualización (@uiw/react-md-editor).
- Sidebar con lista de documentos y búsqueda.
- Soporte para GFM (tablas, listas, etc.).

## Componentes compartidos

- **Layout**: Sidebar con navegación, email del usuario, botón de cerrar sesión. Usa `<NavLink>` + `<Outlet>`.
- **PrivateRoute**: Wrapper que redirige a `/login` si no hay usuario.
- **WorkItemModal**: Modal pesado para bugs de Azure. Incluye cambio de estado, comentarios, asociación a test plans/cases.

## Backend API (endpoints usados)

| Método | Ruta | Propósito |
|--------|------|-----------|
| GET | `/api/azure/sync` | Sincronizar bugs desde Azure DevOps |
| GET | `/api/azure/detail/:id` | Obtener detalle de un work item |
| PATCH | `/api/azure/update/:id` | Actualizar estado del work item |
| POST | `/api/azure/comment/:id` | Agregar comentario |
| POST | `/api/auth/register` | Registrar usuario |

## Base de datos (Supabase)

| Tabla | Propósito |
|-------|-----------|
| `bugs_cache` | Bugs sincronizados de Azure |
| `test_cases` | Casos de prueba |
| `test_plans` | Planes de prueba |
| `test_plan_cases` | Relación plan ↔ TC |
| `test_executions` | Ejecuciones individuales de TC |
| `plan_executions` | Ejecuciones de TC dentro de un plan |
| `bug_associations` | Asociación bugs ↔ plans/TCs |
| `documents` | Documentación wiki |
| `profiles` | Perfiles de usuario |

## Estado actual / observaciones

- **App.jsx** no se usa en el routing real; el entry point es `main.jsx`.
- No hay TypeScript (todo JSX plano).
- No hay tests configurados.
- No hay manejo de errores global (solo errores locales por página).
- El backend (`VITE_BACKEND_URL`) se asume corriendo en `localhost:3001`.
- Los estilos del editor markdown (`MDEditor`) usan `data-color-mode="light"`.
- El sidebar del Layout tiene labels mixtos español/inglés.
