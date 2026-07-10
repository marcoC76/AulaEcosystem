# Changelog

## [Unreleased]

- **dfa4105** — aqui funciona (2026-07-09)

### Fix

- **Reporte:** Al entrar al reporte desde el docente con `step=3` persistido pero selecciones incompletas (profesor, materia o grupo vacíos), ahora se reinicia al paso 0 mostrando el UI de filtros en lugar de un dashboard vacío sin datos. (`AulaLook.tsx:351-368`)
- **ThemeSelector global:** Movido de `AppLayout.tsx` (solo visible tras PIN docente/consulta) a `App.tsx` para que esté disponible en TODAS las pantallas (landing, estudiante, 404, etc.) desde que carga la app. Elevado su z-index a `z-[9999]` para que siempre esté sobre cualquier elemento. (`App.tsx`, `ThemeSelector.tsx`, `AppLayout.tsx`)
- **ThemeSelector oculto en móvil:** El botón flotante de temas (`fixed bottom-4`) quedaba detrás de la barra de navegación inferior (`h-16`, `z-50`). Cambiado a `sm:bottom-4 bottom-20` para que en móvil quede 16px arriba del nav. (`ThemeSelector.tsx:110`)
- **Auto-load reporte:** El auto-load inicial ahora espera a que TODAS las fetched (config, parciales, studentsDB) terminen via `Promise.allSettled` antes de ejecutar `loadGroupData`, eliminando races condicion que impedían cargar datos al entrar al reporte. Usa refs para evitar closures obsoletas. (`AulaLook.tsx:107-129` → refactor a `Promise.allSettled`)

### Feat

- **Filtros de Reporte (Wizard):** Eliminada la persistencia en `localStorage` de las selecciones del wizard para asegurar que siempre inicie desde cero al ingresar al reporte. Se agregaron limpiezas automáticas de claves heredadas en mount y se corrigieron advertencias de variables no leídas. (`AulaLook.tsx`)
- **Colores de riesgo:** Agregadas variables CSS `--theme-danger-*` (siempre rojo: `#ef4444`) en todos los temas. Migrados todos los badges, alerts y elementos visuales de riesgo (badge "Riesgo", racha de faltas, barra de progreso <80%, KPI "Foco Rojo", banner de alerta crítica, faltas detectadas en modal, gráfico de patrón, umbral 85%) de `theme-accent1-*` (azul en tema dark) a `theme-danger-*` (rojo consistente en todos los temas). (`index.css`, `AulaLookTable.tsx`, `AulaLookDashboard.tsx`, `AulaLookCharts.tsx`, `AulaLook.tsx`)

### Chore

- **Skill:** Agregada skill `attendance-analytics` en `.opencode/skills/attendance-analytics/SKILL.md` para visualización Chart.js y detección de alumnos en riesgo.

## [2.1.0] — 2026-07-08

### Refactor

- **C-3: Descomponer AulaLook.tsx (2271→~400 líneas)** — Extraídos 5 componentes modulares: `AulaLookFilters.tsx` (wizard de selección), `AulaLookDashboard.tsx` (KPIs/header), `AulaLookCharts.tsx` (Recharts), `AulaLookTable.tsx` (tabla paginada), `AulaLookPDF.tsx` (exportación CSV/PDF). El orquestador principal solo importa y coordina.
- **C-2: Eliminar `as any`** — Tipado fuerte en `search.ts`, `AulaPass.tsx`, `AulaScan.tsx` y `AulaLook.tsx`. Creada interfaz `StudentDBRecordAccessors` con métodos helper tipados (`getStudentField`) para evitar `Object.keys` dinámicos.
- **M-4: Unificar TeacherLayout y ConsultaLayout** — Extraída lógica compartida a `AppLayout.tsx`. TeacherLayout (167→13 líneas) y ConsultaLayout (151→13 líneas) son ahora wrappers delgados que solo pasan props de configuración (authKey, themeColor, brandName, navItems). Eliminadas ~270 líneas de código duplicado.

### Feat

- **L-1: Página offline PWA** — Creado `public/offline.html` con diseño oscuro estático. Configurado Workbox `navigateFallback` en `vite.config.ts`.
- **M-5: Overlay grain/noise** — Agregado overlay fijo SVG con noise filter en `App.tsx`, opacidad controlada por `--grain-opacity` del tema activo.
- **M-6: Página 404** — Creada `NotFound.tsx` con diseño centrado. Ruta `*` agregada en `App.tsx`.
- **L-2: Banner de cookies** — Creado `CookieConsent.tsx` con persistencia en localStorage. Renderizado condicional desde `App.tsx`.
- **H-4: Hook useAnimatedMount** — Eliminado por falta de caso de uso claro; lógica de staggerEntrance permanece inline en componentes.

### Fix

- **C-1: Reemplazar colores hardcodeados** — Sustituidos colores fijos de Tailwind en `AulaScan.tsx` y `AulaLook.tsx` por variables CSS del tema (`theme-accent1-*`, `theme-warning-*`, etc.). Badges de grupos usan 3 variables accent cíclicamente. Gráficas Recharts leen colores desde `getComputedStyle`.
- **C-4: Manejo de errores visible** — Reemplazados `.catch(() => {})` silenciosos con `console.error` contextual en `dataService.ts` y toasts de error en `AulaScan.tsx` y `AulaLook.tsx`.
- **H-1: QR error correction** — Cambiado `level="L"` a `level="M"` en `AulaPass.tsx:263` para mejor tolerancia a fallos.
- **H-2: CSV export UTF-8 BOM** — Agregado `"\uFEFF"` (BOM) a `downloadReport` y `downloadCSVForDay`. Migrado a Blob + `URL.createObjectURL`.
- **H-3: Offline queue purga** — Modificada purga de historial en `AulaScan.tsx` para limpiar también items `sent` con más de 7 días.
- **Scanner:** Ocultados iconos decorativos negros de `html5-qrcode` (cámara, info, y iconos del selector) mediante CSS en `index.css` para mejorar estética en tema oscuro.
- **M-3:** `ThemeSelector` se había quedado en `App.tsx` a pesar de estar marcado como completado en TODO.md. Se movió a `AppLayout.tsx`.

### Accessibility

- **A-1:** `aria-label` en icon-only buttons de `AulaScan.tsx` + `aria-pressed` en selector de estado.
- **A-2:** `htmlFor`/`id` en inputs de `AulaScan.tsx` y `AulaPass.tsx`.
- **A-3:** `aria-describedby`/`aria-invalid` en formularios + `role="listbox"`/`role="option"` en dropdowns.
- **A-4:** `role="alert"` en contenedor `lastScanMsg`.
- **A-5:** `aria-label` en bottom nav de `TeacherLayout` y `ConsultaLayout`.
- **A-6:** `prefers-reduced-motion` respetado globalmente en `animations.ts` e `index.css`.
- **A-7:** Navegación por teclado (ArrowRight/Left) en radiogroup de filtro de riesgo.
- **A-8:** Tooltip visible con foco de teclado (`group-focus-within/tooltip:block`).
- **A-9:** Elementos semánticos: `tablist`/`tab`, `aria-current="step"`, `aria-expanded`.
- **A-10:** `focus-visible:ring` reemplaza `focus:outline-none` en `PinEncoder` y `PinGuard`.
- **A-11:** `alt="Logo"` → `alt="AulaEcosystem"` en layouts y AulaPass.
- **A-12:** Race condition de focus trap en `Modal.tsx` corregida.

### Chore

- **L-3:** `package.json` version `0.0.0` → `2.0.0`.
- **L-4:** Vitest configurado + tests unitarios para `cn()` y `searchStudents()`.
- **L-5:** `--grain-opacity` agregado en temas ocean (0.04) y sunset (0.05).
- **M-2:** Botón de cerrar "×" con `aria-label` en todos los toasts.

## [2.0.2] — 2026-07-08

### Fix

- **Scanner:** Ocultados iconos decorativos negros de `html5-qrcode` (cámara, info, y iconos del selector) mediante CSS en `index.css` para mejorar estética en tema oscuro.

## [2.0.1] — 2026-07-08

### Refactor

- **M-4: Unificar TeacherLayout y ConsultaLayout** — Extraída lógica compartida a `AppLayout.tsx`. TeacherLayout (167→13 líneas) y ConsultaLayout (151→13 líneas) son ahora wrappers delgados que solo pasan props de configuración (authKey, themeColor, brandName, navItems). Eliminadas ~270 líneas de código duplicado.

### Fix

- **M-3 (incompleto):** `ThemeSelector` se había quedado en `App.tsx` a pesar de estar marcado como completado en TODO.md. Se movió a `AppLayout.tsx` para que cada layout docente/consulta renderice su propia copia, que era el objetivo original de M-3.
