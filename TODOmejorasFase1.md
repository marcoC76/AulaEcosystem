# TODO — Mejoras Fase 1: Quick Wins

> Antes del inicio del semestre
> Esfuerzo estimado: 7-11 horas

---

## Orden de ejecución

```
B. Avatares DiceBear → A. Rediseño Card/QR → C. Tutorial
```

---

## B. Avatares DiceBear (~1-2 hrs)

**Instalación:**
```bash
npm install @dicebear/core @dicebear/bottts-neutral
```

### B1 — Reescribir StudentAvatar.tsx
- **Archivo:** `src/components/ui/StudentAvatar.tsx`
- Reemplazar lógica de pixel art (154 líneas) por DiceBear SDK
- Mantener misma interfaz: `{ name, control?, size?, className? }`
- Usar `createAvatar(botttsNeutral, { seed: name + '-' + control })`
- Renderizar SVG inline vía `toString()`
- Eliminar: `hashStr()`, `generatePixels()`, paletas de colores, `colorMap`

### B2 — Refactor drawAvatarOnCanvas en AulaPass.tsx
- **Archivo:** `src/pages/student/AulaPass.tsx`
- Eliminar función `generateAvatarSvgForCanvas()` (~60 líneas)
- Refactor `drawAvatarOnCanvas()` para usar:
  ```ts
  const svgDataUri = createAvatar(botttsNeutral, { seed }).toDataUri();
  ```
- Cargar como `Image`, dibujar en canvas (misma mecánica actual)

### B3 — Verificar AulaLook.tsx
- Ya usa `<StudentAvatar>` — no requiere cambios, se actualiza automáticamente

---

## A. Rediseño QR/Card (~3-4 hrs)

### A1 — Nuevo layout de la card
**Archivo:** `src/pages/student/AulaPass.tsx`

Estructura propuesta:
```
┌─────────────────────────────────┐
│ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ │  ← barra 4px color carrera
│  ┌────┐  Nombre Completo        │  ← avatar 64px + info en fila
│  │ ⬡  │  No. Control           │
│  └────┘  Carrera · Grupo        │
│  ┌──────────────────────────┐   │
│  │         QR code           │   │  ← sin marco blanco, borde sutil
│  └──────────────────────────┘   │
│  12:34:56                       │
└─────────────────────────────────┘
```

Cambios específicos:
- Eliminar gradiente "STUDENT" → barra delgada `h-1` con `bg-gradient-to-r` del color de carrera
- Mover avatar + nombre a fila (flex row) en vez de todo centrado
- Eliminar `qr-corner` (`.qr-corner-tl`, etc.)
- QR sobre fondo de la card sin el `<div>` blanco interior
- Reloj más compacto

### A2 — Toggle dark/light
**Archivo:** `src/pages/student/AulaPass.tsx`
- Nuevo estado `const [theme, setTheme] = useState<'dark' | 'light'>('dark')`
- Botón toggle (🌙/☀️) en área de acciones (.no-print)
- La card cambia clases: fondo `#111827` / `#ffffff`, texto `#fff` / `#000`
- El toggle persiste en localStorage

### A3 — Refactor downloadPNG
**Archivo:** `src/pages/student/AulaPass.tsx`
- Eliminar canvas manual (líneas 169-247)
- Usar `html2canvas` sobre el contenedor de la card:
  ```ts
  const canvas = await html2canvas(cardElement, { scale: 2, backgroundColor: ... });
  link.href = canvas.toDataURL('image/png');
  ```
- El tema activo (dark/light) se refleja en la descarga

### A4 — Nueva función downloadPDF
**Archivo:** `src/pages/student/AulaPass.tsx`
- Importar `jsPDF` (ya en proyecto)
- Misma estrategia que `exportSabanaPDF` en AulaLook:
  ```ts
  const canvas = await html2canvas(cardElement, { scale: 2, backgroundColor: ... });
  const pdf = new jsPDF({ unit: 'mm', format: 'a4' });
  pdf.addImage(canvas.toDataURL('image/jpeg'), 'JPEG', ...);
  pdf.save(`Pase_Aula_${control}.pdf`);
  ```

### A5 — @media print + botón imprimir
**Archivo:** `src/index.css` + `AulaPass.tsx`
- Agregar clase `.print-area` al contenedor de la card
- Refinar estilos `@media print` para variante dark/light
- Nuevo botón "Imprimir" que ejecuta `window.print()`
- Ocultar todo lo demás (nav, botones, etc.) con `.no-print`

### A6 — Botones de acción
**Archivo:** `src/pages/student/AulaPass.tsx`
- Área `.no-print` con 3 botones:
  - `[🌙/☀️]` Toggle tema
  - `[📥 PNG]` Descargar PNG
  - `[📄 PDF]` Descargar PDF
  - `[🖨️ Imprimir]` Imprimir

### A7 — Limpiar estilos obsoletos
**Archivo:** `src/index.css`
- Eliminar estilos de `.qr-corner` si existen
- Agregar clases para el nuevo layout

---

## C. Tutorial interactivo (~3-5 hrs)

### C1 — Instalar driver.js
```bash
npm install driver.js
```

### C2 — Crear Tour.tsx
**Nuevo archivo:** `src/components/ui/Tour.tsx`

Estructura:
```tsx
import { driver } from 'driver.js';
import 'driver.js/dist/driver.css';

const tours: Record<string, StepDefinition[]> = {
  '/student': [
    { element: '#student-search', popover: { title: 'Buscar alumno', description: '...' } },
    { element: '#qr-code-svg', popover: { title: 'Tu código QR', description: '...' } },
    { element: '#download-section', popover: { title: 'Descargar', description: '...' } },
  ],
  '/teacher/scan': [
    { element: '#teacher-select', popover: { title: 'Seleccionar docente', description: '...' } },
    { element: '#subject-select', popover: { title: 'Elegir materia', description: '...' } },
    { element: '#qr-reader', popover: { title: 'Escáner QR', description: '...' } },
    { element: '#scan-history', popover: { title: 'Historial', description: '...' } },
  ],
  '/teacher/report': [
    { element: '#report-filters', popover: { title: 'Filtros de reporte', description: '...' } },
    { element: '#report-table', popover: { title: 'Tabla de datos', description: '...' } },
    { element: '#export-actions', popover: { title: 'Exportar', description: '...' } },
  ],
  '/consulta/report': [
    { element: '#report-filters', popover: { title: 'Filtros de reporte', description: '...' } },
    { element: '#report-table', popover: { title: 'Tabla de datos', description: '...' } },
  ],
};
```

Comportamiento:
- Botón `?` flotante, fijo, esquina inferior derecha (z-50)
- Al hacer clic → detecta ruta actual via `useLocation()` → carga tour correspondiente
- Si la ruta no tiene tour definido, el botón se oculta
- Estilo acorde al tema (dark, colores accent)

### C3 — Integrar en App.tsx
**Archivo:** `src/App.tsx`
- Agregar `<Tour />` como componente global (dentro del `<Suspense>` o `<ErrorBoundary>`)

### C4 — Agregar IDs a elementos clave
- `#teacher-select` — contenedor del `<Select>` de profesor en AulaScan
- `#subject-select` — contenedor del `<Select>` de materia
- `#scan-history` — tabla de historial de escaneo
- `#report-filters` — contenedor de filtros en AulaLook
- `#report-table` — tabla principal de reportes
- `#export-actions` — botones de exportación
- `#download-section` — área de botones de descarga en AulaPass

### C5 — Estilos del FAB
**Archivo:** `src/index.css`
```css
.tour-fab {
  position: fixed;
  bottom: 1.5rem;
  right: 1.5rem;
  z-index: 50;
  /* ... resto del estilo */
}
```

---

## Limpieza final

- [x] Eliminar `generateAvatarSvgForCanvas` de AulaPass.tsx (~60 líneas)
- [x] Eliminar variables de paletas de colores (skinColors, hairColors, etc.)
- [x] Eliminar estilos `.qr-corner` si existen en index.css
- [x] Verificar que no haya código muerto importado pero no usado
- [x] Verificar tipos TypeScript (`npm run build`)

---

## Build & Release

```bash
npm run build    # tsc -b && vite build
npm run lint     # ESLint flat config
```

- [x] `npm run build` sin errores
- [x] Probar en modo dev (`npm run dev`) — pendiente (requiere servidor)
- [ ] Probar descarga PNG y PDF en Chrome y Safari
- [ ] Probar impresión (Ctrl+P)
- [ ] Probar tutorial en cada ruta
- [x] Actualizar `CHANGELOG.md`
- [ ] Commit y tag (`v3.0.0`)
