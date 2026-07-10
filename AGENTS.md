# AulaEcosystem — Guía para el Agente

## Comandos

| Comando | Acción |
|---|---|
| `npm run dev` | Servidor de desarrollo Vite con HMR |
| `npm run build` | `tsc -b` luego `vite build` (el orden importa) |
| `npm run lint` | ESLint flat config |
| `npm run preview` | Vista previa del build de producción |

## Arquitectura

- **Paquete único** Vite 7 + React 19 + TypeScript 5.9 + Tailwind CSS 4. Sin workspaces de monorepo.
- **HashRouter** (compatible con GitHub Pages). Base URL: `/aulaEcosystem/`.
- **PWA** con Workbox (`registerType: 'prompt'`). Sincronización en segundo plano para endpoints de Google Apps Script mediante la cola `attendance-queue`.
- **Backend:** Sin servidor — Google Apps Script + Google Sheets (BaaS). Sin API Node.js.
- **Offline-first:** `attendanceQueue` en localStorage, sincronización automática al dispararse `window.online`.
- **Auth:** basada en PIN, codificado en Base64 en la configuración remota. `PinGuard` envuelve las rutas de teacher/consulta. El estado de autenticación persiste en `localStorage`.
- **Estado:** React Context + hook `useLocalStorage`. Sin Redux/Zustand.

## Rutas (`src/App.tsx`)

| Ruta | Componente | Protegida |
|---|---|---|
| `/` | LandingPage | No |
| `/student` | AulaPass (generador de pase QR) | No |
| `/teacher` | TeacherLayout → `/teacher/scan`, `/teacher/report` | PIN |
| `/consulta` | ConsultaLayout → `/consulta/report` | PIN |
| `/tools/encoder` | PinEncoder (codificador de PIN en Base64) | Oculta, PIN extra |

## Tailwind CSS v4

- **No hay `tailwind.config.js`.** La configuración vive en `src/index.css` mediante `@import "tailwindcss"` + directiva `@theme`.
- Variables CSS de tema personalizadas en `:root` / `:root[data-theme="..."]`. Cuatro temas: dark (predeterminado), light, sunset, ocean.
- Para fusionar clases: usar `cn()` de `src/lib/utils.ts` (envuelve `clsx` + `tailwind-merge`).

## TypeScript

- Proyecto con referencias: `tsconfig.json` → `tsconfig.app.json` (src) + `tsconfig.node.json` (config de vite).
- `verbatimModuleSyntax` habilitado → usar `import type { ... }` para importaciones solo de tipos.

## Archivos Clave

- `src/main.tsx` — Punto de entrada de React
- `src/App.tsx` — Definiciones de rutas
- `src/lib/dataService.ts` — Llamadas a la API, caché, fallback offline
- `src/lib/constants.ts` — URL de configuración remota, datos mock
- `src/types/index.ts` — Todas las interfaces de TypeScript
- `vite.config.ts` — Configuración de Vite + PWA
- `eslint.config.js` — Configuración plana de ESLint
- `recursos/Code_AppsScript.js` — Backend de Google Apps Script

## Changelog

- **Siempre que completes un cambio, actualiza `CHANGELOG.md`** antes de hacer commit.
- Usa el formato de versiones semánticas `[X.Y.Z] — YYYY-MM-DD`.
- Agrupa las entradas por categoría: `### Refactor`, `### Feat`, `### Fix`, `### Accessibility`, `### Chore`.
- Si el cambio corresponde a un item de `TODO.md`, referencia el ID (ej. `**C-3:** ...`).
- Hay un git hook `post-commit` que registra automáticamente el mensaje del commit bajo `## [Unreleased]`. Puedes mover esas entradas a una versión concreta cuando hagas release.

## Notas

- La configuración remota se obtiene de un JSON en GitHub RAW (`MASTER_CONFIG_URL`). Fallback local en `public/data/config.json`.
- La búsqueda de estudiantes usa Fuse.js (`src/lib/search.ts`).
- Las credenciales QR incluyen un parámetro de versión (`V`) para detectar expiración.
- Estilos de impresión: usar clases `.print-area` / `.no-print`.
- Peculiaridades de iOS WebKit: modales con z-index 50+, `createPortal`.
- No hay flujos de CI/CD configurados aún.
