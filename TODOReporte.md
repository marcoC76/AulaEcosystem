# TODO — Reporte AulaLook

> Mejoras pendientes para el módulo de reportes/consulta de AulaLook.
> Cada `- [ ]` es una unidad resoluble en **una sesión de tokens**. Al terminarla, cambia a `- [x]`.

---

## 🔴 Critical

### RC-1. Import Fuse.js faltante

**Skills:** `frontend-developer`

- [ ] **RC-1** — `AulaLook.tsx`: agregar `import Fuse from 'fuse.js'` en el bloque de imports (línea ~8, después de los imports de search). Sin esto no compila.

**Prompt RC-1:**
```
En AulaLook.tsx agrega import Fuse from 'fuse.js' en la sección de imports. Verifica con npm run build.
```

---

## 🟡 High

### RH-1. isAppLoading — Overlay en pasos 0-2

**Skills:** `frontend-developer`

- [ ] **RH-1a** — `AulaLookFilters.tsx`: recibir prop `isAppLoading: boolean`. Cuando sea true, renderizar overlay con `absolute inset-0 z-10 bg-theme-base/80 flex items-center justify-center rounded-2xl backdrop-blur-sm` que contenga un icono `scan` animado (`animate-spin material-icons-round text-5xl text-theme-accent1-500`) y texto "Cargando configuración...".
- [ ] **RH-1b** — `AulaLook.tsx`: pasar `isAppLoading` como prop a `<AulaLookFilters>`. El state ya existe (`useState(true)`), se setea `false` en el `.finally()` del useEffect de carga inicial (línea ~87). Cuando `isAppLoading` es true, deshabilitar botones de "Siguiente".

**Código clave:**
```tsx
{isAppLoading && (
  <div className="absolute inset-0 z-10 bg-theme-base/80 flex items-center justify-center rounded-2xl backdrop-blur-sm">
    <span className="animate-spin material-icons-round text-5xl text-theme-accent1-500">scan</span>
    <p className="ml-4 font-medium text-theme-text">Cargando configuración...</p>
  </div>
)}
```

**Prompt RH-1:**
```
Carga la skill frontend-developer. En AulaLookFilters.tsx agrega prop isAppLoading: boolean. Cuando sea true, renderiza un overlay absolute que cubra todo el área de filtros con spinner animado (icono scan) y texto "Cargando configuración...". Usa bg-theme-base/80 y backdrop-blur-sm. En AulaLook.tsx pasa el state isAppLoading (ya existe) como prop. Los botones de "Siguiente" deben estar deshabilitados cuando isAppLoading es true. Verifica con npm run build.
```

---

### RH-2. Backup retry — Reintento automático a los 2.5s

**Skills:** `frontend-developer`

- [ ] **RH-2a** — `AulaLook.tsx`: agregar state `dataLoadAttempted` (`useState(false)`).
- [ ] **RH-2b** — `AulaLook.tsx`: agregar useEffect que monitoree `step`, `isLoading`, `isAppLoading`, `data`, `studentModeData`, y `selectedGroups`/`selectedSearchStudent`. Cuando `step === 3`, datos vacíos, filtros seleccionados, y `!dataLoadAttempted`, iniciar setTimeout de 2500ms que llame a `loadGroupData()` o `loadStudentData()` y setee `dataLoadAttempted = true`.
- [ ] **RH-2c** — `AulaLook.tsx`: en `handleBack`, si `newStep < 3`, resetear `dataLoadAttempted` a `false`.

**Código clave:**
```tsx
const [dataLoadAttempted, setDataLoadAttempted] = useState(false);

useEffect(() => {
  if (step !== 3 || isLoading || isAppLoading || dataLoadAttempted) return;
  const isEmpty = mode === 'group' ? data.length === 0 : studentModeData.length === 0;
  if (isEmpty && (mode === 'group' ? selectedGroups.length > 0 : selectedSearchStudent)) {
    const timer = setTimeout(() => {
      setDataLoadAttempted(true);
      if (mode === 'group') loadGroupData();
      else loadStudentData();
    }, 2500);
    return () => clearTimeout(timer);
  }
}, [step, isLoading, data, studentModeData]);
```

**Prompt RH-2:**
```
En AulaLook.tsx agrega state dataLoadAttempted (boolean, default false). Crea un useEffect que: si step===3, !isLoading, !isAppLoading, !dataLoadAttempted, y los datos están vacíos pero hay filtros seleccionados, ejecute un setTimeout de 2500ms que re-intente loadGroupData() o loadStudentData() según el mode. El flag dataLoadAttempted evita reintentos infinitos. En handleBack, si newStep < 3, resetea dataLoadAttempted a false. Verifica con npm run build.
```

---

### RH-3. Toast + Confirm Modal — Reemplazar alert() / window.confirm()

**Skills:** `frontend-developer`

- [ ] **RH-3a** — `AulaLook.tsx`: buscar todos los `alert(...)` y reemplazar por `toast('mensaje', 'tipo')` donde tipo es 'success' | 'error' | 'info'.
- [ ] **RH-3b** — `AulaLook.tsx`: buscar todos los `window.confirm(...)` y reemplazar por `setConfirmAction({ message, onConfirm })`.
- [ ] **RH-3c** — `AulaLook.tsx`: verificar que el render del `<Modal>` de confirmación ya exista (state `confirmAction` ya está declarado en línea 24). Si no existe, agregar el render.

**Mapeo alert → toast:**
| alert() actual | Reemplazo |
|---|---|
| `alert("Por favor selecciona un alumno primero.")` | `toast("Por favor selecciona un alumno primero.", "error")` |
| `alert('PDF generado correctamente.')` | `toast('PDF generado correctamente.', 'success')` |
| `alert('Error al cargar configuración remota.')` | `toast('Error al cargar configuración remota.', 'error')` |

**Mapeo confirm → setConfirmAction:**
```tsx
setConfirmAction({
  message: `¿Estás seguro de justificar la falta del ${dateStr}?`,
  onConfirm: async () => { /* lógica original */ }
});
```

**Prompt RH-3:**
```
En AulaLook.tsx reemplaza cada alert() por toast('mensaje', 'tipo'). Reemplaza cada window.confirm() por setConfirmAction({ message, onConfirm }). El state confirmAction ya existe (línea 24). Verifica que el render del Modal de confirmación esté presente. Verifica con npm run build.
```

---

### RH-4. 3 charts extra + datos — Tipos de Marca, Rachas, Distribución

**Skills:** `frontend-developer`

- [ ] **RH-4a** — ``AulaLook.tsx` (useMemo de stats): agregar cálculos de `markTypeData`, `histogramData`, y `streakData` dentro del bloque que procesa `activeData`.
- [ ] **RH-4b** — Renderizar 3 `<ChartCard>` adicionales en grid `lg:grid-cols-4`:
  - **Tipos de Marca:** PieChart donut (4 segmentos: Asistencia verde, Retardo amarillo, Justificado azul, Falta rojo)
  - **Rachas:** BarChart horizontal con barras coloreadas por severidad (0-5+ faltas consecutivas)
  - **Distribución:** BarChart con 5 barras de rojo a verde (buckets 0-20%, 20-40%, 40-60%, 60-80%, 80-100%)

**Código clave — cálculos:**
```tsx
let markAsistencia = 0, markRetardo = 0, markJustificado = 0, markFalta = 0;
const histo = [0, 0, 0, 0, 0]; // buckets 0-20, 20-40, 40-60, 60-80, 80-100
const streakCounts: Record<number, number> = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

activeData.forEach(d => {
  // markTypeData: contar por status real
  if (d.Asistencia === 'Asistencia') markAsistencia++;
  else if (d.Asistencia === 'Retardo') markRetardo++;
  else if (d.Asistencia === 'Justificado') markJustificado++;
  else markFalta++; // Falta calculada

  // histogramData: distribuir por porcentaje
  const pct = (d.Porcentaje ?? 0) * 100;
  const bucket = Math.min(Math.floor(pct / 20), 4);
  histo[bucket]++;

  // streakData: contar por racha de faltas
  const racha = Math.min(d.rachaFaltas ?? 0, 5);
  streakCounts[racha] = (streakCounts[racha] || 0) + 1;
});

const markTypeData = [
  { name: 'Asistencia', value: markAsistencia, fill: cssVar('--theme-accent2-500') || '#10b981' },
  { name: 'Retardo', value: markRetardo, fill: cssVar('--theme-warning-500') || '#eab308' },
  { name: 'Justificado', value: markJustificado, fill: cssVar('--theme-accent3-500') || '#3b82f6' },
  { name: 'Falta', value: markFalta, fill: cssVar('--theme-accent1-500') || '#ef4444' },
];

const histogramData = [
  { range: '0-20%', count: histo[0], fill: '#ef4444' },
  { range: '20-40%', count: histo[1], fill: '#f97316' },
  { range: '40-60%', count: histo[2], fill: '#eab308' },
  { range: '60-80%', count: histo[3], fill: '#22c55e' },
  { range: '80-100%', count: histo[4], fill: '#10b981' },
];

const streakData = [0, 1, 2, 3, 4, 5].map(i => ({
  name: i === 5 ? '5+' : String(i),
  count: streakCounts[i] || 0,
  fill: i <= 1 ? '#10b981' : i <= 3 ? '#eab308' : '#ef4444',
}));
```

**Prompt RH-4:**
```
Carga la skill frontend-developer. agrega los cálculos de markTypeData, histogramData, y streakData usando activeData. Renderiza 3 ChartCard adicionales: PieChart donut para Tipos de Marca (4 segmentos), BarChart horizontal para Rachas (6 barras 0-5+), BarChart para Distribución (5 buckets). Usa cssVar() para colores del tema. Verifica con npm run build.
```

---

## 🟢 Medium

### RM-1. cssVar() — Reemplazar colores hardcoded en Recharts/tooltip/modal/tabla

**Skills:** `frontend-developer`, `tailwind-v4-patterns`

- [ ] **RM-1a** — `AulaLook.tsx`: la función `cssVar()` ya existe (línea 18). Verificar que se use en todos los `fill`, `stroke`, y `className` con colores hex hardcodeados.
- [ ] **RM-1b** — Reemplazar en Recharts: `#374151` → `cssVar('--theme-border') || '#374151'`, `#9ca3af` → `cssVar('--theme-muted') || '#9ca3af'`, `#3b82f6` → `cssVar('--theme-accent3-500') || '#3b82f6'`.
- [ ] **RM-1c** — Reemplazar en tooltip style: objeto inline → constante `tooltipStyle` que use `cssVar()`.
- [ ] **RM-1d** — Reemplazar en background modal/tabla: `#0b0f19` → `cssVar('--theme-base') || '#0b0f19'`, `#1f2937` → `cssVar('--theme-card') || '#1f2937'`.
- [ ] **RM-1e** — Reemplazar en spinner text hardcodeado: `"Procesando Analytics desde Base de Datos..."` → usar variable de tema o constante.

**Mapeo completo:**
| Hardcoded | cssVar |
|---|---|
| `#374151` | `cssVar('--theme-border') \|\| '#374151'` |
| `#9ca3af` | `cssVar('--theme-muted') \|\| '#9ca3af'` |
| `#f3f4f6` | `cssVar('--theme-text') \|\| '#f3f4f6'` |
| `#ef4444` | `cssVar('--theme-accent1-500') \|\| '#ef4444'` |
| `#eab308` | `cssVar('--theme-warning-500') \|\| '#eab308'` |
| `#10b981` | `cssVar('--theme-accent2-500') \|\| '#10b981'` |
| `#3b82f6` | `cssVar('--theme-accent3-500') \|\| '#3b82f6'` |
| `#0b0f19` | `cssVar('--theme-base') \|\| '#0b0f19'` |
| `#1f2937` | `cssVar('--theme-card') \|\| '#1f2937'` |
| `#0ea5e9` | `cssVar('--theme-accent1-400') \|\| '#60a5fa'` |

**Prompt RM-1:**
```
Carga la skill tailwind-v4-patterns. En AulaLook.tsx y sus componentes extraídos, busca todos los colores hex hardcodeados (#374151, #9ca3af, #3b82f6, etc.) en fill, stroke, estilos inline, y tailwind classes. Reemplaza cada uno por cssVar('--theme-...') || fallback. La función cssVar ya existe. Incluye tooltip styles y colores de background en modal/tabla. Verifica con npm run build.
```

---

### RM-2. Debug badges — Indicadores visuales arriba de charts

**Skills:** `frontend-developer`

- [ ] **RM-2** — `AulaLook.tsx` o `AulaLookDashboard.tsx`: entre el dashboard y los charts, dentro del bloque `step === 3`, agregar div con 4 spans que muestren en tiempo real: `data: {data.length}`, `activeData: {activeData.length}`, `totalItems: {totalItems}`, `isLoading: {String(isLoading)}`. Clases: `flex gap-3 text-xs font-mono no-print`. Cada span con color semitransparente distinto.

**Código clave:**
```tsx
<div className="flex gap-3 text-xs font-mono no-print">
  <span className="px-2 py-1 rounded bg-theme-accent1-500/20 text-theme-accent1-400">data: {data.length}</span>
  <span className="px-2 py-1 rounded bg-theme-accent2-500/20 text-theme-accent2-400">activeData: {activeData.length}</span>
  <span className="px-2 py-1 rounded bg-theme-warning-500/20 text-theme-warning-400">totalItems: {totalItems}</span>
  <span className="px-2 py-1 rounded bg-theme-accent3-500/20 text-theme-accent3-400">isLoading: {String(isLoading)}</span>
</div>
```

**Prompt RM-2:**
```
En AulaLook.tsx o AulaLookDashboard.tsx, dentro del bloque donde step === 3 (vista de datos), agrega un div con 4 debug badges que muestren data.length, activeData.length, totalItems, e isLoading en tiempo real. Usa font-mono, colores semitransparentes con theme variables, y clase no-print para ocultar en impresión. Verifica con npm run build.
```

---

### RM-3. StudentAvatar — Pixel-art en la tabla

**Skills:** `frontend-developer`

- [ ] **RM-3a** — Verificar que `src/components/ui/StudentAvatar.tsx` ya existe (según glob, sí existe).
- [ ] **RM-3b** — `AulaLookTable.tsx`: importar `StudentAvatar` y agregarlo en cada fila de la tabla, antes del nombre del alumno. El componente recibe `name`, `control`, y `size` (default 36).

**Código clave:**
```tsx
import StudentAvatar from '../../components/ui/StudentAvatar';

// En cada <td> del nombre:
<td className="flex items-center gap-2">
  <StudentAvatar name={item['Nombre del Alumno']} control={item['Número de Control']} size={36} />
  <span>{item['Nombre del Alumno']}</span>
</td>
```

**Prompt RM-3:**
```
En AulaLookTable.tsx importa StudentAvatar desde ../../components/ui/StudentAvatar. En cada fila de la tabla (celda del nombre del alumno), agrega <StudentAvatar name={item['Nombre del Alumno']} control={item['Número de Control']} size={36} /> antes del texto del nombre. No cambies lógica de datos. Verifica con npm run build.
```

---

### RM-4. exportStudentDetailPDF — PDF individual por alumno

**Skills:** `frontend-developer`

- [ ] **RM-4a** — `AulaLookPDF.tsx`: agregar función `exportStudentDetailPDF(student: ExtendedAttendanceRecord)` que genere un PDF individual con: encabezado (nombre + control), info general (materia, grupo, profesor, período), resumen (asistencias/total, porcentaje con barra), tabla cronológica (fecha, día, status coloreado), y fecha de generación.
- [ ] **RM-4b** — `AulaLook.tsx` o modal de detalle: agregar botón "Imprimir PDF" que llame a `PDF.exportStudentDetailPDF(selectedStudent)`.

**Código clave:**
```tsx
async function exportStudentDetailPDF(student: ExtendedAttendanceRecord) {
  const { jsPDF } = await import('jspdf');
  const pdf = new jsPDF('p', 'mm', 'a4');
  // Encabezado
  pdf.setFontSize(18);
  pdf.text(student['Nombre del Alumno'], 15, 20);
  pdf.setFontSize(11);
  pdf.text(`Control: ${student['Número de Control']}`, 15, 28);
  pdf.text(`Materia: ${student['Materia']}`, 15, 34);
  // ... resto del renderizado
  pdf.save(`detalle-${student['Número de Control']}.pdf`);
}
```

**Prompt RM-4:**
```
En AulaLookPDF.tsx agrega exportStudentDetailPDF(student: ExtendedAttendanceRecord). Usa jsPDF (dynamic import). Renderiza: encabezado con nombre y control, info de materia/grupo/profesor/período, resumen con porcentaje, tabla cronológica de fechas con status coloreado, y fecha de generación. En el modal de detalle del alumno, agrega botón "Imprimir PDF" que llame a esta función. Verifica con npm run build.
```

---

## 🔵 Low

### RL-1. Calendar view — Gráfico de Actividad tipo GitHub

**Skills:** `frontend-developer`

- [ ] **RL-1a** — `AulaLook.tsx` (modal de selectedStudent): agregar tercer botón de tab "Gráfico de Actividad" con `modalView === 'calendar'`.
- [ ] **RL-1b** — Renderizar vista de calendario: parsear fechas del registro del alumno (asistencias, justificaciones históricas, faltas calculadas), alinear a semanas (lun-dom), generar grid 15×15px por día con colores (verde/asistencia, azul/justificado, rojo/falta, gris oscuro/sin registro, gris claro/fin de semana).
- [ ] **RL-1c** — Agregar leyenda debajo del grid y tooltip con `title` attribute por día.

**Prompt RL-1:**
```
En el modal de detalle de selectedStudent (AulaLook.tsx), agrega un tercer tab "Gráfico de Actividad" con modalView='calendar'. Renderiza un grid tipo GitHub contributions: parsea fechas del registro (asistencias, justificaciones mapeando histórico a fecha original, faltas calculadas), alinea a lun-dom según parciales[selectedPeriod], genera grid de 15×15px por día con colores por status. Incluye leyenda y tooltips. Edge cases: días sin fecha con opacidad 20%, fines de semana con fondo diferente. Verifica con npm run build.
```

---

### RL-2. AulaLookPDF — Extraer de AulaLook.tsx si aún está inline

**Skills:** `frontend-developer`

- [ ] **RL-2** — Verificar que todas las funciones de exportación (exportPDF, exportCSV, exportStudentDetailPDF, etc.) estén en `AulaLookPDF.tsx` y no inline en `AulaLook.tsx`. Si hay funciones restantes, migrarlas.

**Prompt RL-2:**
```
Revisa AulaLook.tsx buscando funciones de exportación (downloadReport, exportPDF, etc.) que no hayan sido extraídas a AulaLookPDF.tsx. Si las encuentras, muévelas a AulaLookPDF.tsx y reemplaza en AulaLook.tsx por llamadas a PDF.exportXxx(). Verifica con npm run build.
```

---

### RL-3. Spinner text hardcodeado → constante de tema

**Skills:** `frontend-developer`

- [ ] **RL-3** — Buscar `"Procesando Analytics desde Base de Datos..."` y otros textos de spinner hardcodeados. Mover a una constante `SPINNER_TEXT` en `constants.ts` o usar variable de tema si aplica.

**Prompt RL-3:**
```
Busca en AulaLook.tsx y componentes derivados el texto "Procesando Analytics desde Base de Datos..." u otros textos de spinner hardcodeados. Extrae a una constante SPINNER_TEXT en src/lib/constants.ts. Reemplaza en los componentes. Verifica con npm run build.
```

---

## 📋 Resumen

| Prioridad | Tareas | Estado |
|---|---|---|
| 🔴 Critical | 1 (RC-1) | Pendiente |
| 🟡 High | 4 (RH-1 a RH-4) | Pendiente |
| 🟢 Medium | 4 (RM-1 a RM-4) | Pendiente |
| 🔵 Low | 3 (RL-1 a RL-3) | Pendiente |
| **Total** | **12** | **0 completadas** |

> **Orden sugerido:** RC-1 → RH-1 → RH-3 → RH-2 → RH-4 → RM-1 → RM-2 → RM-3 → RM-4 → RL-1 → RL-2 → RL-3
