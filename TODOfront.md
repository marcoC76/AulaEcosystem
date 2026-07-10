# Frontend Refactor — Plan de Mejora Visual y Técnica

> Documento generado tras auditoría de diseño del frontend completo.
> Prioridades: P0 (crítico), P1 (importante), P2 (mejora), P3 (nice-to-have).

---

## P0 — Tipografía (Alto Impacto, Bajo Esfuerzo)

### F-1: Sustituir Outfit por Satoshi + Figtree

**Archivos:**
- `src/index.css:4` (línea `--font-sans`)
- `index.html` (cargar desde Google Fonts o CDN)

**Acción:**
- Reemplazar `'Outfit'` por `'Satoshi'` como heading font
- Reemplazar `'Inter'` por `'Figtree'` como body font
- Mantener `'JetBrains Mono'` para monoespaciada

**Por qué:** Outfit es correcta pero genérica. Satoshi tiene rasgos geométricos distintivos que dan personalidad sin perder legibilidad. Figtree es más amable que Inter para bloques de texto.

```css
--font-sans: 'Satoshi', 'Figtree', ui-sans-serif, system-ui, sans-serif;
```

Alternativa (tono editorial): DM Serif Display + DM Sans.

---

## P1 — LandingPage (`src/pages/LandingPage.tsx`)

### L-1: Mesh Gradient Animado en Hero Background

**Estado actual:** Gradiente lineal estático de accent1 a transparente.

**Reemplazar con:** Un mesh gradient animado usando SVG filter con `<feTurbulence>` + animate, o alternativamente un pseudo-elemento CSS con `@property` animado.

```css
/* aproximación — gradientes múltiples animados con @property */
@property --mesh-angle {
  syntax: '<angle>';
  initial-value: 0deg;
  inherits: false;
}
.hero-mesh {
  background: conic-gradient(
    from var(--mesh-angle),
    var(--theme-accent1-600) 0%,
    transparent 30%,
    var(--theme-accent2-600) 60%,
    transparent 90%
  );
  animation: rotate-mesh 20s linear infinite;
}
```

**Validación:** La animación debe respetar `prefers-reduced-motion`.

---

### L-2: Partículas Flotantes en Hero

**Estado actual:** Sin partículas (NotFound sí tiene).

**Acción:** Agregar 6-8 partículas SVG flotantes con anime.js `direction: alternate, loop: true` similar al NotFound pero con trayectorias más amplias y orgánicas (translateX + translateY + rotate).

---

### L-3: Feature Cards con Mayor Diferenciación

**Estado actual:** Todas las cards tienen mismo estilo (glassmorphism card/80).

**Acción para cada rol:**
- **Docente** (azul): Agregar un patrón de grid sutil de fondo, icono `admin_panel_settings` con glow pulsante
- **Alumno** (verde): Icono con animación de "badge scanning" (shine effect)
- **Consulta** (púrpura): Icono con efecto de "search reveal"

Cada card debe tener su propio `accent-color` dinámico que coincida con la ruta destino.

---

### L-4: Decorator Element Asimétrico

**Acción:** Agregar un elemento decorativo grande (círculo, anillo, o glyph) que rompa la simetría del layout — posicionado detrás del hero, parcialmente visible, con opacidad muy baja y blur.

Ejemplo: un círculo concéntrico con `stroke-dasharray` animado.

---

## P1 — AppLayout / Navegación (`src/components/layout/AppLayout.tsx`)

### N-1: Nav Indicator Animado

**Estado actual:** Link activo cambia de color/bg.

**Acción:** Agregar un `div` indicador que se deslice entre nav items usando `transform: translateX()` animado con anime.js o CSS transition.

- Desktop: underline que se mueve horizontalmente
- Mobile: un dot indicador debajo del icono activo

---

### N-2: Micro-interacción Mobile Nav

**Estado actual:** `active:scale-95` en los botones.

**Acción:** Agregar una pequeña animación CSS `@keyframes nav-bounce` al hacer tap: el icono escala a 1.2 luego vuelve a 1, con timing de 300ms.

---

## P1 — AulaPass (Estudiante, `src/pages/student/AulaPass.tsx`)

### AP-1: Animated Placeholder Shuffle

**Estado actual:** Placeholder estático "Ej. 24309060760447".

**Acción:** Ciclar cada 3 segundos entre 3-4 números de control de ejemplo distintos, con animación de fade entre cambios.

---

### AP-2: Credential Card Premium + Shine Effect

**Estado actual:** Card con `bg-theme-card/90 backdrop-blur-md`.

**Acción:**
- Agregar un `::after` pseudo-elemento con gradiente linear blanco que se desplace en hover (shine effect)
- Borde con gradiente animado (conic gradient)
- Sombra más dramática que se intensifique en hover

```css
.credential-card::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(
    105deg,
    transparent 40%,
    rgba(255,255,255,0.08) 45%,
    rgba(255,255,255,0.15) 50%,
    rgba(255,255,255,0.08) 55%,
    transparent 60%
  );
  translate: -100% 0;
  transition: translate 0.6s;
}
.credential-card:hover::after {
  translate: 100% 0;
}
```

---

### AP-3: QR Decorative Corners

**Estado actual:** QR en un contenedor blanco sin decoración.

**Acción:** Agregar 4 "esquinas decorativas" (tipo marco de QR bancario) usando pseudo-elementos. Cada esquina es una L rotada con color accent2.

---

### AP-4: Mejorar Canvas PNG (downloadPNG)

**Estado actual:** Canvas 800x1200 con colores hardcodeados y estilo genérico.

**Acción:** Rediseñar el canvas para que se parezca más a una credencial oficial:
- Fondo con patrón sutil (SVG convertido a Image)
- Header degradado con textura
- Border redondeado simulado en canvas
- Tipografía más cercana a la web (cargar Satoshi si es posible)

---

## P1 — AulaScan (Docente, `src/pages/teacher/AulaScan.tsx`)

### AS-1: Scanning Frame Animation

**Estado actual:** El div del scanner no tiene indicación visual de que está activo.

**Acción:** Agregar una animación CSS de línea de escaneo que cruce verticalmente el frame del scanner:

```css
@keyframes scan-line {
  0%, 100% { top: 0; }
  50% { top: calc(100% - 2px); }
}
.scan-frame::before {
  content: '';
  position: absolute;
  left: 10%;
  right: 10%;
  height: 2px;
  background: linear-gradient(90deg, transparent, var(--theme-accent1-400), transparent);
  box-shadow: 0 0 8px var(--theme-accent1-400);
  animation: scan-line 2.5s ease-in-out infinite;
}
```

---

### AS-2: Corner Glow en Scanner

**Acción:** Agregar 4 esquinas con borde grueso (como visor de cámara) que tengan un glow pulsante sincronizado con el scanning state.

---

### AS-3: Animated Counters en Metrics

**Estado actual:** `scansToday` y `totalScans` aparecen instantáneamente.

**Acción:** Cuando el valor cambie, animar el conteo desde el valor anterior hasta el nuevo con anime.js o CSS `@property`. Usar `requestAnimationFrame` para smootheza.

---

### AS-4: Status Toggle Pill Animado

**Estado actual:** Dos botones con estilo condicional.

**Acción:** Convertir en un toggle pill con un indicador que se deslice entre "Asistencia" y "Retardo", con cambio de color animado (verde ↔ ámbar).

---

### AS-5: Success Particles en Kiosk Mode

**Estado actual:** Overlay con backdrop-blur + mensaje.

**Acción:** Agregar una ráfaga de partículas (12-15 dots de colores) que emanen del centro en scan exitoso, usando anime.js.

---

## P1 — AulaLook (Reportes, `src/pages/teacher/AulaLook.tsx`)

### AL-1: Extraer Lógica Duplicada de Fechas

**Estado actual:** El parsing de `Fechas y Horas de Asistencia` está duplicado ~8 veces en el archivo.

**Acción:** Crear hook `useAttendanceDates` que encapsule:

```typescript
function useAttendanceDates(record: ExtendedAttendanceRecord) {
  // parsea y devuelve:
  // - masterDates
  // - studentDates
  // - faltasCalculadas
  // - rachaFaltas
  // - justificadoDates
  // - entries formateados
}
```

---

### AL-2: Unificar Charts (AulaLookCharts.tsx)

**Estado actual:** `AulaLookCharts.tsx` existe como componente separado pero AulaLook.tsx renderiza los charts inline.

**Acción (elegir una):**
- **Opción A:** Integrar AulaLookCharts.tsx en AulaLook.tsx (reemplazar charts inline)
- **Opción B:** Eliminar AulaLookCharts.tsx si no se usa

**Recomendación:** Opción A — AulaLookCharts tiene interfaz clean, es más mantenible.

---

### AL-3: Refactor Chart Blocks en `<ReportChart>`

**Estado actual:** Cada chart (Tendencia, Estatus, Patrón, Marcas, Rachas, Distribución) tiene su propio bloque con tooltipStyle, XAxis config, margins, etc.

**Acción:** Crear componente `<ReportChart>` que acepte:
```typescript
interface ReportChartProps {
  title: string;
  icon: string;
  type: 'line' | 'bar' | 'pie' | 'donut';
  data: any[];
  config: ChartConfig;
  height?: number;
}
```

---

### AL-4: Skeleton Loading States

**Estado actual:** Spinner + texto "Procesando Analytics...".

**Acción:** Crear `<SkeletonCard>`, `<SkeletonTable>`, `<SkeletonChart>` con animación de shimmer (gradiente animado CSS).

```css
@keyframes shimmer {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}
.skeleton {
  background: linear-gradient(90deg, var(--theme-card) 25%, var(--theme-border) 50%, var(--theme-card) 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s ease-in-out infinite;
}
```

---

### AL-5: Transiciones entre Pasos del Wizard

**Estado actual:** Los pasos aparecen con `animate-fade-in`.

**Acción:** Agregar `slide-left` / `slide-right` según dirección (next/back):

```css
@keyframes slide-in-right {
  from { transform: translateX(30px); opacity: 0; }
  to { transform: translateX(0); opacity: 1; }
}
@keyframes slide-in-left {
  from { transform: translateX(-30px); opacity: 0; }
  to { transform: translateX(0); opacity: 1; }
}
```

---

### AL-6: Extraer PDF Sábana a Módulo Separado

**Estado actual:** `exportSabanaPDF` es una función de 250+ líneas dentro de AulaLook.tsx.

**Acción:** Mover a `src/lib/pdfSabana.ts` exportando la función.

---

### AL-7: Sticky Table Header con Blur

**Estado actual:** Tabla con `<thead>` estático.

**Acción:** Agregar `position: sticky; top: 0;` al header con `backdrop-blur` para que al scrollear los títulos permanezcan visibles.

---

## P1 — Refactor General de Componentes

### RC-1: Custom Select con Animación

**Estado actual:** `<select>` nativo con icono `expand_more`.

**Acción:** Reemplazar con dropdown personalizado:
- Trigger button con valor seleccionado
- Panel con `scaleY` / `opacity` animation
- Keyboard navigation (arrow keys, enter, escape)
- `role="listbox"` + `aria-activedescendant`

---

### RC-2: AnimationUtils — extraer animation helpers comunes

**Estado actual:** En AulaLook hay lógica de animation de números, en AulaScan también.

**Acción:** Agregar a `src/lib/animations.ts`:
- `animateCount(el, from, to, duration)` — counter animation
- `animateShimmer(elements)` — skeleton shimmer activator

---

## P2 — CSS / Theming (`src/index.css`)

### T-1: Scrollbar con Gradient Tint

**Estado actual:** Scrollbar gris neutro.

**Acción:** Cambiar `::-webkit-scrollbar-thumb` para usar un gradiente sutil del accent1 del tema. Esto se puede hacer con variables CSS.

---

### T-2: Shadows Tintadas con Color del Tema

**Estado actual:** Sombras con rgba negro fijo.

**Acción:** Usar `color-mix()` CSS para tintar sombras con el accent color:

```css
--shadow-card: 0 8px 32px color-mix(in srgb, var(--theme-accent1-500) 8%, transparent);
```

---

### T-3: Grain Texture con Blend Mode

**Estado actual:** `opacity: var(--grain-opacity)` directo.

**Acción:** Agregar `mix-blend-mode: overlay` o `soft-light` para que la textura reaccione mejor con el fondo del tema actual. Testear en cada tema.

---

## P2 — Componentes UI

### UI-1: NotFound Page — Timing de Partículas

**Estado actual:** Partículas con `3500 + random * 2000` ms.

**Acción:** Hacer que las partículas tengan diferentes trayectorias (no solo translateY/X) — algunas en círculo, otras en zigzag suave. Usar anime.js path.

---

### UI-2: ThemeSelector — Hover Preview

**Estado actual:** Muestra el color swatch al lado del nombre del tema.

**Acción:** Al hacer hover sobre un tema, aplicar un preview temporal del tema en el fondo (2-3 variables clave) con CSS transition.

---

### UI-3: Toast — Mejorar Posición y Estilos

**Estado actual:** Fixed bottom center.

**Acción:** Agregar opción para posición (top-right, bottom-left) y variante con icono + color más vibrante.

---

### UI-4: StudentAvatar — Animated Pixel Reveal

**Estado actual:** SVG se renderiza instantáneamente.

**Acción:** Usar anime.js stagger para que los píxeles del avatar aparezcan en orden (top-left a bottom-right) al montarse.

---

## P3 — Rendimiento y DX

### DX-1: Dividir AulaLook.tsx

**Estado actual:** 2200+ líneas, múltiples responsabilidades.

**Propuesta de división:**

| Archivo | Contenido |
|---|---|
| `AulaLook.tsx` | Orquestador, layout, render condicional de pasos |
| `hooks/useAttendanceData.ts` | `loadGroupData`, `loadStudentData` |
| `hooks/useReports.ts` | `downloadReport`, `downloadAbsenceReport`, PDF exports |
| `components/AulaLookFilters.tsx` | Filtros (search, filterRisk, sort) |
| `components/AulaLookTable.tsx` | Tabla + paginación |
| `components/AulaLookKPIs.tsx` | Cards de KPIs |
| `components/AulaLookDetailModal.tsx` | Modal con vistas list/sheet/calendar |

---

### DX-2: Page Transitions con anime.js

**Acción:** Envolver las rutas con un wrapper `<RouteTransition>` que anime opacity + translateY al montar/desmontar cada página. Usar `createTimeline` para coordinar con los entrance animations existentes.

---

### DX-3: Code Splitting por Ruta

**Estado actual:** Solo AulaScan, AulaLook, PinEncoder están lazy-loaded.

**Acción:** Agregar lazy loading para LandingPage (ya que tiene anime.js pesado) y AulaPass.

---

## Matriz de Priorización

| ID | Tarea | Esfuerzo | Impacto | Dependencias |
|---|---|---|---|---|
| F-1 | Tipografía | Bajo | Alto | Ninguna |
| L-1 | Mesh gradient | Medio | Alto | Ninguna |
| L-2 | Partículas hero | Bajo | Medio | Ninguna |
| L-3 | Feature cards | Medio | Alto | Ninguna |
| L-4 | Decorator element | Bajo | Medio | Ninguna |
| N-1 | Nav indicator | Bajo | Medio | Ninguna |
| N-2 | Mobile nav micro | Bajo | Bajo | Ninguna |
| AP-1 | Placeholder shuffle | Bajo | Bajo | Ninguna |
| AP-2 | Shine effect | Medio | Alto | Ninguna |
| AP-3 | QR corners | Bajo | Medio | Ninguna |
| AP-4 | Canvas PNG | Medio | Alto | Ninguna |
| AS-1 | Scan line | Bajo | Alto | Ninguna |
| AS-2 | Corner glow | Bajo | Medio | Ninguna |
| AS-3 | Animated counters | Medio | Alto | RC-2 |
| AS-4 | Toggle pill | Bajo | Medio | Ninguna |
| AS-5 | Success particles | Medio | Alto | Ninguna |
| AL-1 | Fechas hook | Alto | Alto | Ninguna |
| AL-2 | Unificar charts | Bajo | Medio | Ninguna |
| AL-3 | ReportChart | Medio | Medio | AL-2 |
| AL-4 | Skeleton loading | Medio | Alto | Ninguna |
| AL-5 | Wizard transitions | Bajo | Medio | Ninguna |
| AL-6 | PDF module | Bajo | Bajo | Ninguna |
| AL-7 | Sticky header | Bajo | Medio | Ninguna |
| RC-1 | Custom select | Medio | Medio | Ninguna |
| RC-2 | Animation utils | Bajo | Bajo | Ninguna |
| T-1 | Scrollbar tint | Bajo | Bajo | Ninguna |
| T-2 | Color-mix shadows | Bajo | Bajo | Ninguna |
| T-3 | Blend mode grain | Bajo | Bajo | Ninguna |
| UI-1 | Particle paths | Bajo | Bajo | Ninguna |
| UI-2 | Hover preview | Medio | Medio | Ninguna |
| UI-3 | Toast positions | Bajo | Bajo | Ninguna |
| UI-4 | Avatar reveal | Medio | Bajo | Ninguna |
| DX-1 | Dividir AulaLook | Alto | Alto | AL-1 |
| DX-2 | Page transitions | Medio | Medio | Ninguna |
| DX-3 | Lazy loading | Bajo | Bajo | Ninguna |

---

## Notas Técnicas

1. **anime.js v4** — El proyecto usa anime.js con sintaxis `createTimeline = createTimeline`. Verificar compatibilidad al actualizar.
2. **Tailwind v4** — No hay `tailwind.config.js`. Usar `@theme` en CSS. Esto es correcto, mantenerlo.
3. **Accesibilidad** — Todas las animaciones deben respetar `prefers-reduced-motion`. El proyecto ya lo hace bien en animations.ts.
4. **iOS Safari** — Recordar que los modales usan `createPortal` y z-index 50+. No romper esto.
5. **Print styles** — Las clases `.print-area` / `.no-print` deben preservarse. No agregar animaciones a elementos imprimibles.
6. **Offline-first** — No modificar la lógica de offline queue o de dataService sin verificar el flujo completo.
7. **HashRouter** — No cambiar el router. Las rutas viven en HashRouter con base `/aulaEcosystem/`.
