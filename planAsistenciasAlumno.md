# Plan: Kardex de Asistencias para Alumnos — "Logro Desbloqueado"

> **ID:** C-5
> **Skills:** `frontend-design`, `animejs-animation`, `google-apps-script-bridge`, `react-best-practices`
> **Archivo destino:** `src/pages/student/AulaAttendance.tsx`
> **Dependencias:** animejs (ya incluido), recharts (ya incluido), feedback (ya incluido)

---

## 1. Dirección Estética

### Concepto

**"Logro Desbloqueado"** — Boletín de calificaciones como pantalla de logros de videojuego.

Cada materia es un **nivel** con barra de experiencia (XP). El % de asistencia es la **puntuación**. El alumno obtiene **medallas** (Bronce/Plata/Oro/Platino) según su desempeño. Las transiciones y micro-interacciones refuerzan la sensación de progreso y logro.

### Tipografía

| Rol | Fuente | Uso |
|---|---|---|
| Display | **Clash Display** (existente) | Porcentajes grandes, títulos de sección, medallas |
| Cuerpo | **Satoshi** (existente) | Labels, metadata, descripciones |
| Mono | **JetBrains Mono** (existente) | Fechas, nº control, datos tabulares |

### Paleta (usa variables CSS del theme)

| Concepto | Variable | Color |
|---|---|---|
| Barra XP (asistencia) | `--theme-accent2-500` | Verde esmeralda |
| Alerta (< 70%) | `--theme-warning-500` | Ámbar |
| Crítico (< 50%) | `--theme-danger-500` | Rojo |
| Perfecto (100%) | `--theme-warning-400` + glow | Dorado |
| Medalla Bronce | `amber-600` | #d97706 |
| Medalla Plata | `slate-300` | #cbd5e1 |
| Medalla Oro | `yellow-400` | #facc15 |
| Medalla Platino | `cyan-300` | #67e8f9 |

### Elemento inolvidable

Cuando los datos cargan, los números hacen **counting animation** (animejs) como marcador de puntuación de arcade. Las tarjetas aparecen con **stagger reveal** escalonado. Las materias con 100% obtienen un **glow dorado pulsante**. Logros desbloqueados emiten el sonido de `feedback.medium('success')` existente.

---

## 2. Arquitectura de la Página

```
AulaAttendance
├── StudentSearch          // Si no hay sesión activa
│   ├── Hero ilustrativo   // Icono grande + título
│   ├── Input búsqueda     // Nº control con placeholder animado
│   └── Botón "Buscar"
│
├── Dashboard              // Una vez identificado
│   ├── HeroHeader         // Avatar + nombre + nivel + badges + cerrar
│   ├── PeriodFilter       // Selector de parcial (P1 | P2 | P3 | Todos)
│   ├── GlobalKPIs         // Grid 2×2 de métricas con counting animation
│   ├── Tabs               // [Resumen] [Detalle]
│   │
│   ├── ResumenTab
│   │   ├── XPBarOverall         // Barra horizontal animada del % global
│   │   ├── SubjectBarChart      // Recharts BarChart comparativo
│   │   └── AchievementBadges    // Grid de logros desbloqueados/grisados
│   │
│   ├── DetalleTab
│   │   └── SubjectCard[]        // Grid responsivo de tarjetas
│   │       ├── CircularProgress  // SVG ring animado con animejs
│   │       ├── SubjectInfo       // Nombre materia + profesor
│   │       ├── StatusBreakdown   // Conteo con iconos por estado
│   │       └── DateList          // Expandible con acordeón + color dots
│   │
│   └── ExportButton      // Botón flotante para descargar PDF
```

### Estados de UI

| Estado | Qué se muestra |
|---|---|
| **Loading** (identificación) | Skeleton pulsing: placeholder input + botón gris |
| **Loading** (dashboard) | Cards con shimmer animation + círculos fantasma |
| **Error** (sin alumno) | Toast error + mensaje inline "No encontrado" |
| **Error** (sin datos) | Mensaje "Sin registros de asistencia para este parcial" con icono |
| **Vacío** (0 materias) | Ilustración + "Aún no tienes asistencias registradas" |
| **Éxito** (con datos) | Dashboard completo con animaciones |
| **Offline** | Indicador sutil "Datos en caché" con icono cloud_off |

---

## 3. Desglose de Componentes

### 3.1 `StudentSearch`

Reutiliza el patrón de `AulaPass.tsx` pero con diseño propio:

- Input centrado con glow pulsante en el borde (animación CSS `pulse-border`)
- Placeholder rotativo: `"Ej. 23309060760066"` → cambia cada 3s con fade
- Al encontrar alumno: `feedback.medium('success')` + transición suave al dashboard
- Persiste en localStorage bajo key `aulaAttendanceStudent`

### 3.2 `HeroHeader`

```
┌──────────────────────────────────────────────────┐
│  ┌──────┐                                        │
│  │Avatar│  Nombre Completo              [Cerrar] │
│  └──────┘  #23309060760066                       │
│            Radiología · 4B                       │
│            🏆 Nivel 4 — Asistente de Bronce      │
└──────────────────────────────────────────────────┘
```

- Avatar con `StudentAvatar` (existente)
- Nivel calculado: `floor(globalPercentage / 20)` + 1 (rango 1-5)
- Título según nivel:
  - 1-2: "Novato"
  - 3: "Estudiante"
  - 4: "Asistente de Bronce/Plata/Oro"
  - 5: "Maestro de la Asistencia"

### 3.3 `PeriodFilter`

Tres botones tipo tabs de juego + opción "Todos":

```
[ P1 ] [ P2 ] [ P3 ] [ Todos ]
```

- Botón activo: fondo sólido con `theme-accent2` + glow
- Inactivos: outline sutil
- Al cambiar: fade-out → spinner → fade-in con animejs

### 3.4 `GlobalKPIs`

Grid 2×2 que responde a 1 columna en mobile:

```
┌─────────────────┐ ┌─────────────────┐
│  📊  85%         │ │  📚  4          │
│  Asistencia      │ │  Materias       │
│  Global          │ │  Cursadas       │
└─────────────────┘ └─────────────────┘
┌─────────────────┐ ┌─────────────────┐
│  ❌  3           │ │  🔥  5          │
│  Faltas Total    │ │  Racha Actual   │
│                  │ │  (días seg.)    │
└─────────────────┘ └─────────────────┘
```

- Cada card es un `<div>` con glassmorphism (`bg-theme-card/80 backdrop-blur-xl`)
- El número grande usa `font-display` con animejs counter desde 0
- Aparecen con stagger: 100ms entre cada card
- La card de faltas se tiñe de `theme-danger` si > 3

### 3.5 `Tabs`

Dos tabs con indicador animado (underline deslizante):

```
[ Resumen ] [ Detalle ]
```

- CSS `transition: left 300ms ease` en el indicador
- Al cambiar: fade + translateX del contenido (200ms)
- `role="tablist"` + `aria-selected` para accesibilidad

### 3.6 `ResumenTab`

#### 3.6.1 `XPBarOverall`

Barra horizontal que ocupa todo el ancho:

```
Asistencia Global  ████████████░░░░  85%
```

- Fondo: `bg-theme-border`
- Fill: gradiente `theme-accent2-500 → theme-accent2-400` + glow derecho
- Width animado con animejs: `{ width: [0, targetPercent], easing: 'spring(1, 80, 10, 0)', duration: 1500 }`
- Texto del % dentro de la barra, alineado a la derecha

#### 3.6.2 `SubjectBarChart`

Recharts `BarChart` con:

- Eje X: nombres de materia (truncados si > 12 chars)
- Eje Y: % asistencia (0-100)
- Barras coloreadas por rango:
  - ≥ 80%: fill `var(--theme-accent2-500)`
  - 60-79%: fill `var(--theme-warning-500)`
  - < 60%: fill `var(--theme-danger-500)`
- Tooltip personalizado con glassmorphism (como el de AulaLook)
- Animación de entrada: `animationDuration={1000}` de Recharts

#### 3.6.3 `AchievementBadges`

Grid de logros (3 columnas, responsivo):

```
┌──────────┐ ┌──────────┐ ┌──────────┐
│   🏅     │ │   🔥     │ │   📚     │
│ Asist.   │ │ Racha    │ │ Const.   │
│ Perfecta │ │ de 5     │ │ ≥ 80%    │
│ (1 mat.) │ │ (activo) │ │          │
└──────────┘ └──────────┘ └──────────┘
```

Logros definidos:

| ID | Nombre | Condición | Icono |
|---|---|---|---|
| `perfect` | Asistencia Perfecta | Alguna materia con 100% | 🏅 |
| `streak_5` | Racha de 5 | 5+ asistencias consecutivas | 🔥 |
| `streak_10` | Racha de 10 | 10+ asistencias consecutivas | 💫 |
| `constancy` | Constancia | Promedio global ≥ 80% | 📚 |
| `punctual` | Puntualidad | Sin retardos en ninguna materia | ⏰ |
| `perfect_all` | Semestre Perfecto | 100% en todas las materias | 👑 |

- Logros desbloqueados: opacos con color
- No desbloqueados: grisados (opacity 0.35)
- Al desbloquearse: animación de reveal con animejs (`scale: [0, 1], rotate: [0, 360]`)

### 3.7 `DetalleTab`

#### 3.7.1 `SubjectCard`

Grid responsivo: 1 col (mobile) / 2 cols (md) / 3 cols (lg).

Cada card:

```
┌────────────────────────────┐
│          ┌───┐             │
│          │85%│             │  ← SVG CircularProgress
│          └───┘             │
│                            │
│  Conciencia Histórica 1    │
│  Caballero Eduardo Nava    │
│                            │
│  ✅ 8 Asistencias          │
│  ⏱️ 1 Retardo              │
│  📝 1 Justificado          │
│  ❌ 0 Faltas               │
│                            │
│  [▼ Ver detalle de fechas] │  ← expandible
│  ┌──────────────────────┐  │
│  │ 🟢 18 Feb — Asist.   │  │
│  │ 🟡 19 Feb — Retardo  │  │
│  │ 🔴 25 Feb — Falta    │  │
│  └──────────────────────┘  │
└────────────────────────────┘
```

**`CircularProgress`** (subcomponente SVG):

```tsx
<svg width={80} height={80} viewBox="0 0 100 100">
  <circle cx="50" cy="50" r="42" fill="none" stroke="var(--theme-border)" strokeWidth="8" />
  <circle
    ref={ringRef}
    cx="50" cy="50" r="42"
    fill="none"
    stroke={color}
    strokeWidth="8"
    strokeLinecap="round"
    strokeDasharray={`${2 * Math.PI * 42}`}
    strokeDashoffset={2 * Math.PI * 42 * (1 - percent / 100)}
    transform="rotate(-90 50 50)"
    style={{ transition: 'stroke-dashoffset 1.5s cubic-bezier(0.4, 0, 0.2, 1)' }}
  />
  <text x="50" y="50" textAnchor="middle" dominantBaseline="central" fill="var(--theme-text)" fontSize="24" fontFamily="var(--font-display)" fontWeight="700">
    {animatedPercent}%
  </text>
</svg>
```

- El ring se anima con animejs al entrar en viewport
- Color del ring según rango (misma lógica que barras)
- Si % = 100, la card entera tiene borde `theme-warning-400` con `box-shadow` gold glow animado

**`StatusBreakdown`:**

Cada línea usa icono Material + label + número:

| Estado | Icono | Color |
|---|---|---|
| Asistencia | `check_circle` | `text-theme-accent2-500` |
| Retardo | `access_time` | `text-theme-warning-500` |
| Justificado | `description` | `text-theme-accent1-500` |
| Falta | `cancel` | `text-theme-danger-500` |

**`DateList`** (expandible):

- Botón toggle: "Ver detalle de fechas" / "Ocultar fechas"
- Acordeón con `max-height` animado (CSS, 300ms ease)
- Cada fecha es una fila con:
  - `🟢` / `🟡` / `🔴` / `🔵` según status
  - Fecha formateada: "18 feb 2026"
  - Estado textual
  - Notas si existen

---

## 4. Animaciones (animejs)

### Timeline de entrada del Dashboard

```typescript
const tl = anime.timeline({
    easing: 'spring(1, 80, 10, 0)',
});

tl.add({
    targets: '.hero-header',
    translateY: [30, 0],
    opacity: [0, 1],
    duration: 600,
}).add({
    targets: '.kpi-card',
    translateY: [20, 0],
    opacity: [0, 1],
    delay: anime.stagger(100),
    duration: 500,
}, '-=300').add({
    targets: '.subject-card',
    translateY: [30, 0],
    opacity: [0, 1],
    delay: anime.stagger(80),
    duration: 600,
}, '-=200');
```

### Counting de números

```typescript
// Cada KPI numérico y porcentaje
anime({
    targets: kpiElement,
    innerHTML: [0, targetValue],
    round: 1,
    easing: 'easeOutCubic',
    duration: 1200,
});
```

### Progress ring fill

```typescript
const circumference = 2 * Math.PI * radius;
anime({
    targets: ringElement,
    strokeDashoffset: [circumference, circumference * (1 - percent / 100)],
    easing: 'spring(1, 50, 8, 0)',
    duration: 1500,
});
```

### Glow pulsante (100%)

```css
@keyframes gold-glow {
    0%, 100% { box-shadow: 0 0 8px rgba(250, 204, 21, 0.2); }
    50% { box-shadow: 0 0 20px rgba(250, 204, 21, 0.4); }
}
.subject-card--perfect {
    animation: gold-glow 3s ease-in-out infinite;
    border-color: rgba(250, 204, 21, 0.3);
}
```

### Micro-interacciones

| Elemento | Acción | Efecto |
|---|---|---|
| SubjectCard | hover | `scale(1.02)` + sombra elevada (CSS transition 200ms) |
| SubjectCard | tap (mobile) | `scale(0.98)` momentáneo |
| Botón tab | active | `scale(0.95)` momentáneo |
| Botón descarga | hover | glow + `translateY(-1px)` |
| Achievement badge | hover | `scale(1.1)` + tooltip con nombre |

---

## 5. Modificaciones a Archivos Existentes

### 5.1 `recursos/Code_AppsScript.js` — Backend

En `handleGet`, después del filtro por período (línea ~148 del original), agregar:

```javascript
if (e.parameter.ID) filteredRows = filteredRows.filter(r => String(r[2]) === String(e.parameter.ID));
```

Esto permite filtrar por número de control del alumno desde el frontend.

**Razonamiento**: El backend ya agrupa por alumno y calcula totales. Añadiendo este filtro ANTES del agrupamiento, obtenemos datos precisos de un solo alumno sin tener que filtrar del lado del cliente.

### 5.2 `src/lib/dataService.ts`

**A)** En `fetchReportData` (línea ~384), agregar después de `filters.parcial`:

```typescript
if (filters.id) url.searchParams.append('ID', filters.id);
```

**B)** Nueva función `fetchStudentKardex`:

```typescript
/**
 * Obtiene el kardex completo de un alumno a través de todas las materias.
 * Hace llamadas en paralelo y retorna solo las materias donde hay registros.
 */
export async function fetchStudentKardex(
    controlNumber: string,
    subjects: ConfigOption[],
    period?: string
): Promise<AttendanceRecord[]> {
    if (!subjects.length || !controlNumber) return [];

    const promises = subjects.map(subject =>
        fetchReportData({
            id: controlNumber,
            subject: subject.value,
            ...(period ? { parcial: period } : {}),
        }).catch(() => [] as AttendanceRecord[])
    );

    const results = await Promise.all(promises);
    return results
        .flat()
        .filter((r): r is AttendanceRecord =>
            r != null &&
            typeof r === 'object' &&
            String(r['Número de Control']).trim() === controlNumber.trim()
        );
}
```

### 5.3 `src/App.tsx`

Agregar ruta:

```typescript
import AulaAttendance from './pages/student/AulaAttendance';
// ...
<Route path="/student/attendance" element={<AulaAttendance />} />
```

### 5.4 `src/pages/LandingPage.tsx`

La tarjeta "Alumno" actual (líneas 96-111) se modifica para contener dos enlaces apilados verticalmente en lugar de uno:

```tsx
<div className="flex flex-col gap-3">
    <Link
        to="/student"
        onClick={() => feedback.light('navigate')}
        className="entrance-card group relative flex items-center gap-5 p-6 bg-theme-card/80 backdrop-blur-xl rounded-[2rem] transition-all duration-300 shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-card-hover)] hover:-translate-y-2 active:scale-[0.98] overflow-hidden"
    >
        <div className="w-14 h-14 rounded-2xl bg-theme-accent2-500/10 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform duration-500">
            <span className="material-icons-round text-2xl text-theme-accent2-400">badge</span>
        </div>
        <div>
            <h2 className="font-display text-xl font-bold text-theme-text">Alumno</h2>
            <p className="text-theme-muted text-sm leading-relaxed">
                Genera tu pase digital QR
            </p>
        </div>
    </Link>
    <Link
        to="/student/attendance"
        onClick={() => feedback.light('navigate')}
        className="entrance-card group relative flex items-center gap-5 p-6 bg-theme-card/80 backdrop-blur-xl rounded-[2rem] transition-all duration-300 shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-card-hover)] hover:-translate-y-2 active:scale-[0.98] overflow-hidden"
    >
        <div className="w-14 h-14 rounded-2xl bg-theme-accent2-500/10 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform duration-500">
            <span className="material-icons-round text-2xl text-theme-accent2-400">fact_check</span>
        </div>
        <div>
            <h2 className="font-display text-xl font-bold text-theme-text">Alumno</h2>
            <p className="text-theme-muted text-sm leading-relaxed">
                Consulta tu historial de asistencias
            </p>
        </div>
    </Link>
</div>
```

**Nota**: Ambos enlaces comparten la misma celda `md:col-span-2` dentro del grid del landing, apilados verticalmente con `gap-3`.

---

## 6. Cálculos y Lógica de Negocio

### 6.1 Cálculo de nivel

```typescript
function calculateLevel(globalPercent: number): { level: number; title: string } {
    const level = Math.min(5, Math.floor(globalPercent / 20) + 1);
    const titles = ['', 'Novato', 'Aprendiz', 'Estudiante', 'Asistente', 'Maestro'];
    return { level, title: titles[level] || 'Maestro' };
}
```

### 6.2 Cálculo de racha de asistencias

```typescript
function calculateStreak(dates: { date: string; status: string }[]): number {
    const sorted = dates
        .filter(d => d.status === 'Asistencia')
        .map(d => new Date(d.date).toDateString())
        .sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

    let streak = 0;
    const today = new Date().toDateString();

    for (let i = 0; i < sorted.length; i++) {
        const expected = new Date();
        expected.setDate(expected.getDate() - streak);
        if (sorted[i] === expected.toDateString() || sorted[i] === today) {
            streak++;
        } else break;
    }
    return streak;
}
```

### 6.3 Determinación de logros

```typescript
function calculateAchievements(records: AttendanceRecord[], streak: number): string[] {
    const unlocked: string[] = [];
    const all100 = records.every(r => r.Porcentaje >= 1);
    const any100 = records.some(r => r.Porcentaje >= 1);
    const avg = records.reduce((a, r) => a + r.Porcentaje, 0) / records.length;
    const noRetardos = records.every(r => {
        const fechas = JSON.parse(r['Fechas y Horas de Asistencia'] || '[]') as any[];
        return fechas.every((f: any) => f.status !== 'Retardo');
    });

    if (any100) unlocked.push('perfect');
    if (streak >= 5) unlocked.push('streak_5');
    if (streak >= 10) unlocked.push('streak_10');
    if (avg >= 0.8) unlocked.push('constancy');
    if (noRetardos) unlocked.push('punctual');
    if (all100) unlocked.push('perfect_all');

    return unlocked;
}
```

### 6.4 Conteo por status

```typescript
function countStatuses(fechasJson: string): Record<string, number> {
    const fechas = JSON.parse(fechasJson || '[]') as { status?: string }[];
    const counts: Record<string, number> = { Asistencia: 0, Retardo: 0, Justificado: 0, Falta: 0 };
    fechas.forEach(f => {
        const s = f.status || 'Asistencia';
        if (s === 'Asistencia' || s === 'Retardo' || s === 'Justificado') {
            counts[s]++;
        } else {
            counts.Falta++;
        }
    });
    return counts;
}
```

---

## 7. Accesibilidad

| Elemento | Práctica |
|---|---|
| Tabs | `role="tablist"` + `role="tab"` + `aria-selected` + `aria-controls` |
| Expandible (fechas) | `aria-expanded` + `aria-controls` |
| Botones icon-only | `aria-label` descriptivo |
| Animaciones | `prefers-reduced-motion: reduce` → sin animación (ya cubierto globalmente) |
| KPIs numéricos | `role="text"` + `aria-label` con el valor completo |
| Gráficas Recharts | `role="img"` + `aria-label` describiendo los datos |
| Logros | `role="list"` + `role="listitem"` con `aria-label` del nombre + estado |

---

## 8. Printeabilidad

- `.print-area` en el contenedor del dashboard
- `.no-print` en botones de acción, tabs, selector de parcial
- En impresión: fondo blanco, texto negro, barras en escala de grises
- Reutilizar reglas `@media print` existentes en `index.css`

---

## 9. Resumen de Archivos

| Archivo | Tipo | Líneas estimadas |
|---|---|---|
| `recursos/Code_AppsScript.js` | Modificación | +3 |
| `src/lib/dataService.ts` | Modificación | +25 |
| `src/pages/student/AulaAttendance.tsx` | **Nuevo** | ~600 |
| `src/App.tsx` | Modificación | +2 |
| `src/pages/LandingPage.tsx` | Modificación | ~30 |
| `CHANGELOG.md` | Modificación | +5 |
| **Total** | | **~665 líneas** |

---

## 10. Checklist de Implementación

- [ ] **10.1** — Modificar `Code_AppsScript.js`: agregar filtro ID en handleGet
- [ ] **10.2** — Modificar `dataService.ts`: agregar `id` en fetchReportData + crear `fetchStudentKardex`
- [ ] **10.3** — Crear `AulaAttendance.tsx` con todos los subcomponentes
- [ ] **10.4** — Agregar ruta en `App.tsx`
- [ ] **10.5** — Modificar `LandingPage.tsx` con doble enlace
- [ ] **10.6** — Verificar build: `npm run build`
- [ ] **10.7** — Verificar lint: `npm run lint`
- [ ] **10.8** — Actualizar `CHANGELOG.md`
