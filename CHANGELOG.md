# Changelog

## [Unreleased]

- **ba6bdac** — feat: mejorar viewfinder de cámara responsive + fixes de estabilidad (2026-07-16)

- **e64311e** — feat: implement new AulaLook UI components and update system documentation for reporting features (2026-07-15)

- **67084cb** — feat: implement core UI pages, authentication guard, and Tailwind theme configuration (2026-07-15)

- **8c4f3aa** — Feat: Glass unificado + Tour reposicionado Fix: Tour progreso (llaves dobles) + Encoding UTF-8 (2026-07-11)

### Feat

- **Scanner responsive:** Viewfinder de cámara expandido de 260px a 500px max-width. QR box ahora escala al 60% del viewfinder con máximo 300px, adaptándose automáticamente al tamaño disponible. Añadido `aspectRatio: { ideal: 1 }` en videoConstraints para cámara menos rectangular. Scan-frame con altura mínima aumentada a 300px. Modo kiosco ahora usa overlay CSS fullscreen (`fixed inset-0 z-40 h-screen bg-black/90`) con fondo negro. (`AulaScan.tsx`, `index.css`)

- **Version check en asistencia manual:** Añadido parámetro `V=${masterQrVersion}` al URL generado en búsqueda manual para validar expiración de credencial, consistente con el escaneo QR. (`AulaScan.tsx`)

### Fix

- **Scan line full-width:** Línea de escaneo ahora cruza de borde a borde del frame (eliminados márgenes laterales del 10%). Glow más intenso (`box-shadow: 0 0 12px + 0 0 30px`) y gradiente más definido con stops al 5%/50%/95%. (`index.css`)

- **Corner brackets más grandes:** Esquinas decorativas del marco de escaneo aumentadas de 20×20px a 28×28px con radio de esquina 8px para mejor visibilidad en pantallas grandes. (`index.css`)

- **Dashboard html5-qrcode compacto:** Selector de cámara y botones del dashboard reorganizados en fila horizontal con flexbox. Select estilado con variables del tema (`--theme-base`, `--theme-text`, `--theme-border`). Botones con padding reducido y fuente más pequeña. (`index.css`)

- **Video fill en scanner:** El video de la cámara ahora ocupa el 100% del ancho del contenedor con `object-fit: cover` y `border-radius` consistente. Scan region centrada con flexbox. (`index.css`)

- **Null safety en search helpers:** `getStudentControl`, `getStudentGrupo` y `getStudentEspecialidad` ahora convierten valores null/undefined a string vacío mediante `String(... ?? '')` en vez de `|| ''`, previniendo errores "control is undefined". (`search.ts`)

- **Data-row padding horizontal:** Filas del historial con padding horizontal de 0.75rem para mejor legibilidad en pantallas anchas. (`index.css`)

- **Blur dropdown prevenido:** Botones de sugerencias en búsqueda manual ahora previenen el blur del input con `onMouseDown.preventDefault()`, evitando que el dropdown se cierre antes de registrar el click. (`AulaScan.tsx`)

- **Modal z-index:** Overlay del Modal elevado de `z-50` a `z-[60]` para evitar solapamiento con el overlay del kiosko. (`Modal.tsx`)

- **ReloadPrompt z-index:** Banner de actualización PWA elevado a `z-[60]` para que los botones "Descargar Ahora" y "Cerrar" no queden tapados por la navegación inferior en móvil. (`ReloadPrompt.tsx`)

- **Tour reposicionado:** Botón de ayuda (Tour) movido a `sm:bottom-20 bottom-36 right-4 z-[9998]` para que siempre quede fijo arriba del ThemeSelector sin solaparse. (`Tour.tsx`)

- **Tour progreso:** Corregida sintaxis de placeholders en `progressText` — driver.js requiere llaves dobles `{{current}}`/`{{total}}`, no `{current}`/`{total}`. (`Tour.tsx`)
- **Encoding UTF-8:** Corregida corrupción de caracteres acentuados en Tour.tsx y AulaScan.tsx causada por herramientas que no preservan UTF-8. (`AulaScan.tsx`, `Tour.tsx`)

- **15b4453** — feat: implement interactive tour system and add student identification interface with QR generation (2026-07-10)

### Feat

- **Feed-1:** Sistema unificado de micro-interacciones: sonidos MP3 reales (éxito/error), retroalimentación háptica (vibración) y animaciones ligeras. Nuevo `src/lib/feedback.ts` con API `feedback.sound()`, `feedback.haptic()`, `feedback.light()`, `feedback.medium()`, `feedback.heavy()`. Los MP3 se cachean offline vía Workbox (estrategia CacheFirst). (`src/lib/feedback.ts`, `vite.config.ts`)

- **Feed-2:** Integración de feedback en todos los componentes: `Button` (click suave + vibración, destructivo con sonido error), `Toast` (sonido según tipo success/error/info), `PinGuard` (login exitoso/fallido), `AppLayout` (navegación), `LandingPage` (tarjetas), `AulaPass` (búsqueda/descarga), `AulaScan` (reemplazo de `playBeep` sintético por MP3 reales + vibración), `AulaLook` (reportes/errores vía Toast). (`src/components/ui/Button.tsx`, `src/components/ui/Toast.tsx`, `src/components/layout/PinGuard.tsx`, `src/components/layout/AppLayout.tsx`, `src/pages/LandingPage.tsx`, `src/pages/student/AulaPass.tsx`, `src/pages/teacher/AulaScan.tsx`)

### Fix

- **F1-FIX:** Reemplazo de `html2canvas` por `dom-to-image-more` en AulaPass para soportar colores `oklab()` de Tailwind v4. Soluciona error "Attempting to parse an unsupported color function oklab" al descargar PNG/PDF. (`src/pages/student/AulaPass.tsx`)

- **F1-A:** Rediseño completo de la credencial AulaPass. Nuevo layout con barra delgada de carrera, avatar DiceBear + info en fila, QR sin marco blanco, toggle tema oscuro/claro, descarga PNG/PDF con html2canvas, soporte @media print. (`src/pages/student/AulaPass.tsx`, `src/index.css`)

- **F1-B:** Reemplazo de avatares pixel art custom por DiceBear bottts-neutral. Avatares deterministas por seed (nombre+control). Eliminadas ~150 líneas de lógica de pixel art. (`src/components/ui/StudentAvatar.tsx`, `src/pages/student/AulaPass.tsx`)

- **F1-C:** Tutorial interactivo con driver.js. Botón flotante `?` que muestra tour contextual según la ruta actual (student, teacher/scan, teacher/report, consulta/report). Estilo dark consistente con el tema de la app. (`src/components/ui/Tour.tsx`, `src/App.tsx`, `src/index.css`)

- **602c4b4** — feat: implement frontend visual improvements batch 1 (2026-07-10)

- **dcf4617** — feat: implement PDF export functionality for student and group reports in AulaLook and add front-end roadmap document (2026-07-10)

- **84fa74f** — feat: add 3 new charts to report dashboard (Tipos de Marca, Rachas, Distribución) (2026-07-10)

- **e86ea67** — feat: implement teacher dashboard charts with Recharts and add utility functions (2026-07-09)

- **bf18942** — feat: implement attendance visualization charts and helper utilities for teacher dashboard (2026-07-09)

- **45b682d** — feat: add AulaLook dashboard for teacher attendance reporting and analytics with visualization components (2026-07-09)

### Feat

- **L-4:** Decorator anillo asimétrico en LandingPage. SVG triple concéntrico con `stroke-dasharray` animado, posicionado en bottom-right, opacidad 0.08 + blur(40px). (`src/index.css`, `src/pages/LandingPage.tsx`)

- **L-2:** Partículas SVG flotantes en hero de LandingPage. 7 formas variadas (círculos, anillos, diamantes) anime.js con translateX/Y + rotate, `direction: alternate, loop: true`, random stagger. Respeta `prefers-reduced-motion`. (`src/lib/animations.ts`, `src/pages/LandingPage.tsx`)

- **AL-7:** Sticky table header con backdrop-blur en AulaLook. Clase `sticky top-0 z-10 backdrop-blur-md` en `<thead>` para mantener encabezados visibles al scrollear. (`src/pages/teacher/AulaLook.tsx`)

- **T-3:** Grain texture con `mix-blend-mode: soft-light` en `body::before`. Reacciona con el color de fondo del tema en lugar de superposición gris plana. (`src/index.css`)

- **T-1:** Scrollbar tintado con gradiente del accent1 del tema. Reemplazado `rgba(255,255,255,0.08)` fijo por `linear-gradient` con `var(--theme-accent1-400)` + `color-mix()`. (`src/index.css`)

- **T-2:** Sombras tintadas con `color-mix(in srgb, var(--theme-accent1-500) X%, transparent)` en reemplazo de `rgba()` fijo. Cada tema hereda automáticamente el tono de su accent. `--shadow-button-destructive` usa `var(--theme-danger-500)`. (`src/index.css`: :root, light, forest, midnight, coffee)

- **F-1:** Sustituida tipografía Outfit → Satoshi (Fontshare) e Inter → Figtree (Google Fonts) en `--font-sans`. JetBrains Mono se mantiene. (`index.html`, `src/index.css`)

- **RC-2:** Nuevos helpers `animateCount(el, from, to, duration?)` y `animateShimmer(elements)` en `src/lib/animations.ts`. `animateCount` usa requestAnimationFrame con ease out quad. `animateShimmer` agrega clase `.skeleton` a targets. Ambos respetan `prefers-reduced-motion`. (`src/lib/animations.ts`)

- **AP-1:** Placeholder shuffle animado en input de búsqueda de AulaPass. 4 ejemplos de No. Control ciclan cada 3s con `placeholder:transition-[opacity]`. El ciclo se pausa al escribir. (`src/pages/student/AulaPass.tsx`)

- **N-1:** Nav indicator animado en AppLayout. Underline deslizable en nav desktop y dot indicador en mobile con `cubic-bezier(0.34, 1.56, 0.64, 1)` (overshoot). ResizeObserver para recalcular en resize/orientation change. (`src/components/layout/AppLayout.tsx`)

- **N-2:** Micro-interacción nav bounce en mobile. Reemplazado `active:scale-95` por `active:animate-nav-bounce` con keyframe 1→1.2→0.95→1 en 300ms en la nav inferior. (`src/index.css`, `src/components/layout/AppLayout.tsx`)

- **AP-3:** Esquinas decorativas QR en AulaPass. Marco en L con 4 `<span>` por esquina usando `var(--theme-accent2-400)`, consistente con el estilo de AS-2. (`src/index.css`, `src/pages/student/AulaPass.tsx`)

- **AS-2:** Corner glow pulsante en frame del scanner. 4 esquinas en L con `drop-shadow` animado (`@keyframes corner-glow`) que hereda el accent del tema activo. (`src/index.css`, `src/pages/teacher/AulaScan.tsx`)

- **AS-1:** Línea de escaneo animada en AulaScan. Nuevo `@keyframes scan-line` + clase `.scan-frame` con `::before` pseudo-elemento que cruza verticalmente el frame del scanner con glow gradiente adaptativo al tema activo. Respeta `prefers-reduced-motion`. (`src/index.css`, `src/pages/teacher/AulaScan.tsx`)

- **RM-4:** Exportación de PDF individual por alumno desde el modal de detalle. Nueva función `exportStudentDetailPDF()` con jsPDF dinámico: encabezado, info (materia/grupo/profesor/período), resumen con barra de porcentaje coloreada, tabla cronológica con status coloreados (Asistencia/Retardo/Justificado/Falta), paginación automática y fecha de generación. Botón "Imprimir PDF" en modal reemplaza `window.print()`. (`AulaLook.tsx`)
- **RM-4 (cont):** Exportación PDF grupal (`exportGroupPDF`) desde la barra de herramientas del reporte. Reemplaza el anterior `exportPDF` (html2canvas) por un PDF programático con tabla cronológica por alumno, manejo de saltos de página con re-encabezado de tabla, y paginación automática. (`AulaLook.tsx`)

- **RH-4:** 3 nuevos gráficos en dashboard de reporte: Tipos de Marca (PieChart donut con 4 segmentos), Rachas (BarChart con 6 buckets 0-5+ coloreados por severidad) y Distribución (BarChart con 5 buckets porcentuales degradados). Cálculos de `markTypeData`, `histogramData`, `streakData` en `stats` useMemo a partir de `activeData`. (`AulaLook.tsx`)

- **RL-1:** Nuevo tab "Gráfico de Actividad" en modal de detalle del alumno con grid tipo GitHub contributions (horizontal, semanas como columnas, días como filas). Micro-interacciones (hover scale, ring glow, fade-in escalonado). Tooltip con fecha y hora, leyenda de colores. (`AulaLook.tsx`)
- **RM-3:** Avatar pixel-art (`StudentAvatar`) en cada fila de la tabla de alumnos en modo grupo. (`AulaLook.tsx`)

- **Filtros de Reporte (Wizard):** Eliminada la persistencia en `localStorage` de las selecciones del wizard para asegurar que siempre inicie desde cero al ingresar al reporte. Se agregaron limpiezas automáticas de claves heredadas en mount y se corrigieron advertencias de variables no leídas. (`AulaLook.tsx`)
- **Colores de riesgo:** Agregadas variables CSS `--theme-danger-*` (siempre rojo: `#ef4444`) en todos los temas. Migrados todos los badges, alerts y elementos visuales de riesgo de `theme-accent1-*` a `theme-danger-*`. (`index.css`, `AulaLookTable.tsx`, `AulaLookDashboard.tsx`, `AulaLookCharts.tsx`, `AulaLook.tsx`)

### Refactor

- **RM-1:** Centralizada función `cssVar()` en `src/lib/utils.ts`. Reemplazados ~20 colores hex hardcodeados en Recharts, tooltips, statusData, backgrounds y estilos de justificadas por variables CSS del tema. (`AulaLook.tsx`, `AulaLookCharts.tsx`)
- **RH-3:** Reemplazados 9x `alert()` por `toast()` y 2x `window.confirm()` por modal de confirmación con `setConfirmAction`. (`AulaLook.tsx`)

### Fix

- **Reporte:** Al entrar al reporte desde el docente con `step=3` persistido pero selecciones incompletas (profesor, materia o grupo vacíos), ahora se reinicia al paso 0 mostrando el UI de filtros en lugar de un dashboard vacío sin datos. (`AulaLook.tsx:351-368`)
- **ThemeSelector global:** Movido de `AppLayout.tsx` (solo visible tras PIN docente/consulta) a `App.tsx` para que esté disponible en TODAS las pantallas (landing, estudiante, 404, etc.) desde que carga la app. Elevado su z-index a `z-[9999]`. (`App.tsx`, `ThemeSelector.tsx`, `AppLayout.tsx`)
- **ThemeSelector oculto en móvil:** El botón flotante de temas (`fixed bottom-4`) quedaba detrás de la barra de navegación inferior (`h-16`, `z-50`). Cambiado a `sm:bottom-4 bottom-20`. (`ThemeSelector.tsx:110`)
- **Auto-load reporte:** El auto-load inicial ahora espera a que TODAS las fetched (config, parciales, studentsDB) terminen via `Promise.allSettled` antes de ejecutar `loadGroupData`, eliminando races condition. Usa refs para evitar closures obsoletas. (`AulaLook.tsx:107-129`)

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
