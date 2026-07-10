# TODO — AulaEcosystem

> Cada `- [ ]` es una unidad resoluble en **una sesión de tokens**. Al terminarla, cambia a `- [x]`.

---

## 🔴 Critical

### C-1. Reemplazar colores hardcodeados con variables de tema

**Skills:** `tailwind-v4-patterns`
    
- [x] **C-1a** — `AulaScan.tsx`: reemplazar `bg-slate-900`, `bg-slate-800`, `bg-slate-950` en el scanner card con `bg-gray-900` (oscuro fijo, no de tema) + variables `theme-*` para textos y bordes
- [x] **C-1b** — `AulaScan.tsx`: reemplazar colores fijos del status selector (emerald, orange, amber) con `text-theme-accent2-*`, `text-theme-warning-*`
- [x] **C-1c** — `AulaScan.tsx`: reemplazar colores del history y cards métricas (amber, red, blue) con `text-theme-warning-*`, `text-theme-accent1-*`, `bg-theme-*`
- [x] **C-1d** — `AulaLook.tsx`: reemplazar colores fijos de los KPIs summary cards con `bg-theme-accent1-400/10`, `text-theme-accent1-400`
- [x] **C-1e** — `AulaLook.tsx`: reemplazar colores de badges de grupos (colores enumerados en `badgeColors`) con variantes de `accent1-3` del tema cíclicamente
- [x] **C-1f** — `AulaLook.tsx`: reemplazar colores de gráficas Recharts (hex `#3b82f6`, `#a855f7`, etc.) con getters que usen `getComputedStyle` para leer variables CSS del tema

**Prompt C-1:**
```
Carga la skill tailwind-v4-patterns. En AulaScan.tsx y AulaLook.tsx, cada subtarea reemplaza colores fijos de Tailwind con variables theme-*. El scanner card de AulaScan debe mantener fondo oscuro fijo (bg-gray-900) pero textos y bordes con variables del tema. Badges de grupos en AulaLook deben usar las 3 variables accent cíclicamente. Gráficas Recharts deben leer colores desde CSS custom properties via getComputedStyle. No rompas funcionalidad. Verifica con npm run build tras cada subtarea.
```

---

### C-2. Eliminar `as any` — tipado fuerte

**Skills:** `frontend-developer`, `google-apps-script-bridge`

- [x] **C-2a** — `src/lib/search.ts`: eliminar dinámicas de keys `Object.keys(...).find(...)` creando interfaz `StudentDBRecordAccessors` con métodos tipados; reemplazar `as any`
- [x] **C-2b** — `src/pages/student/AulaPass.tsx`: reemplazar `as Record<string, any>` con acceso a `StudentDBRecord` directamente
- [x] **C-2c** — `src/pages/teacher/AulaScan.tsx`: reemplazar `as any` en `retryFailedScans` con acceso tipado a `StudentDBRecord`
- [x] **C-2d** — `src/pages/teacher/AulaLook.tsx`: reemplazar casteos `as any` en `loadGroupData` y `loadStudentData` usando helpers de `search.ts`

**Prompt C-2:**
```
Carga la skill frontend-developer. Revisa los archivos indicados buscando casteos as any o as Record<string, any>. En search.ts crea funciones helper tipadas (getStudentField(record, 'nombre')) para evitar Object.keys dinámicos. En AulaPass.tsx, AulaScan.tsx y AulaLook.tsx usa esas helpers. No cambies lógica de negocio. Verifica con npm run build tras cada subtarea.
```

---

### C-3. Descomponer `AulaLook.tsx` (2271 líneas)

**Skills:** `frontend-developer`

- [x] **C-3a** — Extraer `AulaLookFilters.tsx`: wizard de configuración (pasos 0-2, selección profe/materia/grupo/alumno)
- [x] **C-3b** — Extraer `AulaLookDashboard.tsx`: KPIs + header del dashboard post-configuración
- [x] **C-3c** — Extraer `AulaLookCharts.tsx`: componentes Recharts (LineChart, PieChart, BarChart + weekday)
- [x] **C-3d** — Extraer `AulaLookTable.tsx`: tabla de estudiantes paginada con filtros/sort/riesgo
- [x] **C-3e** — Extraer `AulaLookPDF.tsx`: todas las funciones de exportación (CSV, PDF kárdex, PDF sábana, detalle alumno)
- [x] **C-3f** — Refactorizar `AulaLook.tsx` para que solo sea el orquestador que importa los 5 componentes nuevos

**Prompt C-3:**
```
Carga la skill frontend-developer. Extrae de AulaLook.tsx (2271 líneas) los 5 componentes listados. Sigue las convenciones del proyecto (mismos imports, cn(), tipos desde ../../types). El orquestador AulaLook.tsx debe pasar props y mantener el estado global. Cada nuevo archivo en src/pages/teacher/. Verifica con npm run build tras cada componente extraído.
```

---

### C-4. Manejo de errores visible (reemplazar `.catch(() => {})`)

**Skills:** `frontend-developer`

- [x] **C-4a** — `src/lib/dataService.ts`: agregar `console.error` contextual en cada `.catch()` silencioso sin cambiar la lógica de fallback
- [x] **C-4b** — `src/pages/teacher/AulaScan.tsx`: agregar toasts de error en los `.catch()` de `fetchAppConfig`, `getConfig`, `fetchStudentsDB`
- [x] **C-4c** — `src/pages/teacher/AulaLook.tsx`: agregar toasts de error en los `.catch()` de `fetchAppConfig`, `fetchParcialesConfig`, `fetchStudentsDB`

**Prompt C-4:**
```
Busca en dataService.ts, AulaScan.tsx y AulaLook.tsx todos los .catch(() => {}) donde el error se ignora. En dataService.ts agrega console.error("contexto:", err). En los componentes React (donde useToast existe) agrega toast("mensaje", "error"). No cambies lógica de negocio ni los valores de retorno. Verifica con npm run build por archivo.
```

---

## 🟡 High

### H-1. QR error correction demasiado bajo

**Skill:** `react-qr-scanner`

- [x] **H-1** — `AulaPass.tsx:263`: cambiar `level="L"` a `level="M"`

**Prompt H-1:**
```
Carga la skill react-qr-scanner. En AulaPass.tsx línea 263 cambia level="L" a level="M" en el QRCode. Verifica con npm run build.
```

---

### H-2. CSV exports sin UTF-8 BOM

**Skills:** `frontend-developer`

- [x] **H-2a** — `AulaLook.tsx:598` (`downloadReport`): agregar `"\uFEFF"` al inicio del CSV + convertir a Blob/URL
- [x] **H-2b** — `AulaScan.tsx:479` (`downloadCSVForDay`): agregar `"\uFEFF"` al inicio + convertir a Blob/URL

**Prompt H-2:**
```
En AulaLook.tsx función downloadReport() y AulaScan.tsx función downloadCSVForDay(), agrega "\uFEFF" (BOM) al inicio del contenido CSV. Cambia de data:text/csv;... a Blob + URL.createObjectURL como ya hace downloadAbsenceReport. Verifica con npm run build.
```

---

### H-3. Offline queue: limpiar historial automáticamente

**Skills:** `pwa-offline-first`

- [x] **H-3** — `AulaScan.tsx`: modificar purga de historial (líneas 126-145) para limpiar también items `sent` con más de 7 días

**Prompt H-3:**
```
Carga la skill pwa-offline-first. En AulaScan.tsx, modifica la purga de historial (efecto useEffect con parse de scan_session_history) para que también filtre items con status === 'sent' cuya date tenga más de 7 días. Mantén la purga de 14 días para no-sent. Verifica con npm run build.
```

---

### H-4. Hook `useAnimatedMount` inactivo

**Skills:** `frontend-developer`

- [x] **H-4a** — Leer `useAnimatedMount.ts` y evaluar si es reusable
- [x] **H-4b** — Si aplica, integrarlo en `PinGuard.tsx` o `AulaScan.tsx` para reemplazar lógica manual de staggerEntrance
- [x] **H-4c** — Si no aplica, eliminar el archivo

**Prompt H-4:**
```
Lee src/hooks/useAnimatedMount.ts para entender su API. Busca componentes que hagan animación de entrada manual (PinGuard.tsx, AulaScan.tsx secciones animadas) y reemplaza con el hook si es posible. Si no hay un caso de uso claro, elimina el archivo. Verifica con npm run build.
```

---

## 🟢 Medium



### M-2. Toast: botón de cerrar

**Skills:** `frontend-developer`, `fixing-accessibility`

- [x] **M-2** — `Toast.tsx`: agregar botón "×" con `aria-label="Descartar notificación"` dentro de cada toast, que llame a `startExit(t.id)`

**Prompt M-2:**
```
Carga la skill fixing-accessibility. En Toast.tsx, dentro del div de cada toast (map), agrega un botón con aria-label="Descartar notificación" que ejecute startExit(t.id). Posiciónalo con ml-auto. Debe ser focusable por teclado. No rompas las animaciones existentes. Verifica con npm run build.
```

---

### M-3. ThemeSelector y ReloadPrompt solo en layout docente/consulta

**Skills:** `frontend-developer`

- [x] **M-3** — `App.tsx`: mover `<ThemeSelector />` y `<ReloadPrompt />` a `TeacherLayout.tsx` y `ConsultaLayout.tsx`

**Prompt M-3:**
```
En App.tsx, elimina los componentes ThemeSelector y ReloadPrompt del render principal. En TeacherLayout.tsx y ConsultaLayout.tsx, agrégalos dentro del header o como floating UI. No los dupliques - cada layout renderiza su propia copia. Verifica con npm run build.
```

---

### M-4. Unificar TeacherLayout y ConsultaLayout

**Skills:** `frontend-developer`

- [x] **M-4a** — Crear `AppLayout.tsx` con la lógica compartida (navbar, bottom nav, PIN guard, outlet)
- [x] **M-4b** — Refactorizar `TeacherLayout.tsx` para que use `AppLayout` con props (blue theme, teacher nav items)
- [x] **M-4c** — Refactorizar `ConsultaLayout.tsx` para que use `AppLayout` con props (purple theme, consulta nav items)

**Prompt M-4:**
```
Crea src/components/layout/AppLayout.tsx con props: authKey, correctPin, encoderPin, title, themeColor ('blue'|'purple'), navItems (array de {name,path,icon}), brandName. Extrae la lógica de PIN, navegación, header sticky y bottom nav de TeacherLayout y ConsultaLayout hacia AppLayout. TeacherLayout y ConsultaLayout deben ser wrappers delgados que solo importan AppLayout y pasan props. Verifica con npm run build.
```

---

### M-5. Overlay de grain/noise

**Skills:** `design-taste-frontend`, `tailwind-v4-patterns`

- [x] **M-5** — `App.tsx`: agregar overlay fijo con SVG noise filter que herede `--grain-opacity` del tema

**Prompt M-5:**
```
Carga la skill tailwind-v4-patterns. En App.tsx, agrega un div fijo con pointer-events-none fixed inset-0 z-[60] que contenga un SVG con el mismo noise filter definido en index.css. Aplica opacity: var(--grain-opacity, 0.035) para que herede la opacidad del tema activo. Verifica que no interfiera con clics. Verifica con npm run build.
```

---

### M-6. Página 404

**Skills:** `frontend-developer`

- [x] **M-6a** — Crear `src/pages/NotFound.tsx` con diseño centrado: logo + mensaje + botón a `/`
- [x] **M-6b** — `App.tsx`: agregar `<Route path="*" element={<NotFound />} />` al final de Routes

**Prompt M-6:**
```
Crea src/pages/NotFound.tsx con diseño centrado usando bg-theme-base, animate-fade-in. Muestra el logo, "Página no encontrada", descripción "La ruta solicitada no existe" y un Link a "/" con Button. En App.tsx agrega Route path="*" element={<NotFound />} al final de Routes. Verifica con npm run build.
```

---

## 🔵 Low

### L-1. Página offline para PWA

**Skill:** `pwa-offline-first`

- [x] **L-1a** — Crear `public/offline.html`: HTML estático con logo, "Sin conexión", botón reintentar
- [x] **L-1b** — `vite.config.ts`: agregar `offline.html` como offline page en VitePWA + configurar Workbox `navigateFallback`

**Prompt L-1:**
```
Carga la skill pwa-offline-first. Crea public/offline.html con HTML estático, logo de AulaEcosystem, mensaje "Sin conexión", y botón "Reintentar" que haga location.reload(). Estilos inline oscuros y centrados. En vite.config.ts agrega offline.html en VitePWA y configura workbox con navigateFallback: '/offline.html' y navigateFallbackDenylist: [/\/api\//]. Verifica con npm run build.
```

---

### L-2. Banner de cookies/privacidad

**Skills:** `frontend-developer`

- [x] **L-2a** — Crear `src/components/ui/CookieConsent.tsx` con banner y localStorage
- [x] **L-2b** — `App.tsx`: renderizar `<CookieConsent />`

**Prompt L-2:**
```
Crea src/components/ui/CookieConsent.tsx. Muestra banner fijo al fondo con texto de aceptación de cookies y botón "Aceptar". Guarda en localStorage cookie_consent='true' al aceptar. Usa bg-theme-card, backdrop-blur, z-40. En App.tsx renderízalo condicionalmente (no mostrar si localStorage tiene la key). Verifica con npm run build.
```

---

### L-3. package.json version

- [x] **L-3** — `package.json`: `"version": "0.0.0"` → `"version": "2.0.0"`

**Prompt L-3:**
```
En package.json cambia "version": "0.0.0" a "version": "2.0.0".
```

---

### L-4. Test framework + tests iniciales

**Skills:** `frontend-developer`

- [x] **L-4a** — Instalar `vitest` + configurar en `vite.config.ts`
- [x] **L-4b** — Crear `src/lib/__tests__/utils.test.ts` para `cn()`
- [x] **L-4c** — Crear `src/lib/__tests__/search.test.ts` para `getStudentName` y `searchStudents`
- [x] **L-4d** — Agregar script `"test": "vitest run"` en `package.json`

**Prompt L-4:**
```
Carga la skill frontend-developer. Instala vitest como devDependency. En vite.config.ts agrega test: { globals: true, environment: 'jsdom' } (impórtalo desde vitest/config). Crea src/lib/__tests__/utils.test.ts probando cn() con clsx + tailwind-merge. Crea src/lib/__tests__/search.test.ts probando getStudentName() y searchStudents() con datos mock. Agrega "test": "vitest run" en package.json scripts. Verifica con npm run test.
```

---

### L-5. grain-opacity en ocean y sunset

**Skills:** `tailwind-v4-patterns`

- [x] **L-5** — `src/index.css`: agregar `--grain-opacity: 0.04` en `[data-theme="ocean"]` y `0.05` en `[data-theme="sunset"]`

**Prompt L-5:**
```
Carga la skill tailwind-v4-patterns. En src/index.css, dentro de [data-theme="ocean"] agrega --grain-opacity: 0.04. Dentro de [data-theme="sunset"] agrega --grain-opacity: 0.05. Verifica con npm run build.
```

---

## 🟣 Accesibilidad

### A-1. Icon-only buttons sin `aria-label` en AulaScan

**Skill:** `fixing-accessibility`

- [x] **A-1a** — `AulaScan.tsx:604-607`: agregar `aria-label="Subir foto"` al botón upload; `aria-label="Alternar modo kiosco"` al botón kiosco
- [x] **A-1b** — `AulaScan.tsx:603`: agregar `aria-label="Subir imagen para escanear QR"` al `<input type="file" hidden>`
- [x] **A-1c** — `AulaScan.tsx:630-653`: agregar `aria-pressed` a cada botón de selector de estado (Asistencia/Retardo/Falta)

**Prompt A-1:**
```
Carga la skill fixing-accessibility. En AulaScan.tsx agrega aria-label a los botones con icono que ocultan texto en mobile. Agrega aria-pressed a los botones de selector de estado. Verifica con npm run build.
```

---

### A-2. Inputs sin `<label>` asociado

**Skill:** `fixing-accessibility`

- [x] **A-2a** — `AulaScan.tsx:541,549,557`: agregar `id` a los `<Select>` y `htmlFor` a los `<label>` de configuración (Profesor, Materia, Grupo)
- [x] **A-2b** — `AulaScan.tsx:691`: agregar `<label htmlFor="manual-search">` al input de búsqueda manual
- [x] **A-2c** — `AulaPass.tsx:167`: agregar `<label htmlFor="student-search">` al input de búsqueda

**Prompt A-2:**
```
Carga la skill fixing-accessibility. En AulaScan.tsx y AulaPass.tsx asocia cada label con su input/select usando htmlFor + id. Verifica con npm run build.
```

---

### A-3. Errores de formulario sin `aria-describedby`

**Skill:** `fixing-accessibility`

- [x] **A-3a** — `AulaPass.tsx:167-175`: agregar `id` al `<p>` de error, `aria-describedby` + `aria-invalid` al `<Input>`
- [x] **A-3b** — `AulaScan.tsx:688-714`: agregar `role="listbox"`/`role="option"` al dropdown de sugerencias, `aria-expanded` al input

**Prompt A-3:**
```
Carga la skill fixing-accessibility. En AulaPass.tsx vincula el mensaje de error al input con aria-describedby y agrega aria-invalid. En AulaScan.tsx agrega rol listbox/option al dropdown de sugerencias. Verifica con npm run build.
```

---

### A-4. Notificaciones sin `role="alert"`

**Skill:** `fixing-accessibility`

- [x] **A-4** — `AulaScan.tsx:658-686`: agregar `role="alert"` al contenedor de `lastScanMsg`

**Prompt A-4:**
```
Carga la skill fixing-accessibility. En AulaScan.tsx agrega role="alert" al div de lastScanMsg. Verifica con npm run build.
```

---

### A-5. Navegación móvil sin etiquetas

**Skill:** `fixing-accessibility`

- [x] **A-5a** — `TeacherLayout.tsx`: agregar `aria-label` a todos los Link/button del bottom nav (`sm:hidden`)
- [x] **A-5b** — `ConsultaLayout.tsx`: agregar `aria-label` a todos los Link/button del bottom nav (`sm:hidden`)

**Prompt A-5:**
```
Carga la skill fixing-accessibility. En TeacherLayout.tsx y ConsultaLayout.tsx, agrega aria-label a cada Link y button dentro de la sección sm:hidden (bottom nav). Usa: "Escanear asistencia", "Ver reportes", "Cerrar sesión". Si el item tiene texto visible, el label puede ser más descriptivo. Verifica con npm run build.
```

---

### A-6. `prefers-reduced-motion` no respetado globalmente

**Skills:** `fixing-accessibility`, `animejs-animation`

- [x] **A-6a** — `src/lib/animations.ts`: envolver cada función con guardia `window.matchMedia('(prefers-reduced-motion: reduce)').matches`; si true, aplicar estado final sin animación
- [x] **A-6b** — `src/index.css`: agregar `@media (prefers-reduced-motion: reduce)` que anule duraciones a `0.01ms`
- [x] **A-6c** — Verificar componentes con animaciones directas (Modal, Toast, PinGuard, LandingPage, AulaScan) ya no necesitan guardias individuales

**Prompt A-6:**
```
Carga la skill fixing-accessibility. En lib/animations.ts, cada función exportada debe verificar window.matchMedia('(prefers-reduced-motion: reduce)').matches; si true, aplicar estado final sin animar. En index.css agrega @media (prefers-reduced-motion: reduce) que fuerce animation-duration: 0.01ms. Verifica con npm run build.
```

---

### A-7. Grupo radio sin navegación por teclado

**Skill:** `fixing-accessibility`

- [x] **A-7** — `AulaLook.tsx:~1906`: agregar `onKeyDown` al `radiogroup` de filtro de riesgo (ArrowRight/ArrowLeft mueven selección)

**Prompt A-7:**
```
Carga la skill fixing-accessibility. En AulaLook.tsx, agrega un onKeyDown al div con role="radiogroup" que maneje ArrowRight/ArrowLeft para mover el foco y selección entre los radios. Verifica con npm run build.
```

---

### A-8. Tooltip solo en hover, no accesible por teclado

**Skill:** `fixing-accessibility`

- [x] **A-8** — `AulaLook.tsx:1993-2001`: agregar `group-focus-within/tooltip:block` al tooltip de racha de faltas

**Prompt A-8:**
```
Carga la skill fixing-accessibility. En AulaLook.tsx agrega group-focus-within/tooltip:block al tooltip para que aparezca también con foco de teclado. Verifica con npm run build.
```

---

### A-9. Elementos semánticos faltantes

**Skill:** `fixing-accessibility`

- [x] **A-9a** — `AulaLook.tsx:1983`: reemplazar `role="button"` en `<tr>` por un `<button>` interno o mantener `tabIndex` quitando `role="button"`
- [x] **A-9b** — `AulaLook.tsx:2089-2091`: agregar `role="tablist"`/`role="tab"`/`aria-selected` a los botones de vista modal
- [x] **A-9c** — `AulaLook.tsx:1509-1519`: agregar `aria-current="step"` al paso activo del breadcrumb
- [x] **A-9d** — `AulaScan.tsx:789-795`: agregar `aria-expanded`/`aria-controls` al botón de expandir historial

**Prompt A-9:**
```
Carga la skill fixing-accessibility. En AulaLook.tsx reemplaza role="button" en tr, agrega patrón tablist/tab, aria-current en breadcrumbs. En AulaScan.tsx agrega aria-expanded al botón de expandir historial. Verifica con npm run build.
```

---

### A-10. Foco visible eliminado sin reemplazo

**Skill:** `fixing-accessibility`

- [x] **A-10a** — `PinEncoder.tsx:72`: reemplazar `focus:outline-none` con `focus-visible:ring-2 focus-visible:ring-amber-500/50`
- [x] **A-10b** — `PinGuard.tsx:117`: reemplazar `focus:outline-none focus:ring-0` con `focus-visible:ring-2 focus-visible:ring-theme-accent1-500`

**Prompt A-10:**
```
Carga la skill fixing-accessibility. En PinEncoder.tsx y PinGuard.tsx reemplaza focus:outline-none por focus-visible:ring para mantener indicador de foco visible. Verifica con npm run build.
```

---

### A-11. `alt="Logo"` genérico en imágenes

**Skill:** `fixing-accessibility`

- [x] **A-11** — `TeacherLayout.tsx:81`, `ConsultaLayout.tsx:77`, `AulaPass.tsx:206`: cambiar `alt="Logo"` → `alt="AulaEcosystem"`

**Prompt A-11:**
```
Carga la skill fixing-accessibility. Cambia alt="Logo" por alt="AulaEcosystem" en TeacherLayout.tsx, ConsultaLayout.tsx y AulaPass.tsx. Verifica con npm run build.
```

---

### A-12. Modal: foco inicial con race condition

**Skill:** `fixing-accessibility`

- [x] **A-12** — `Modal.tsx:56-70`: mover instalación del focus trap dentro del mismo `requestAnimationFrame` que el foco inicial

**Prompt A-12:**
```
Carga la skill fixing-accessibility. En Modal.tsx asegura que el focus trap se instale después de que la animación de entrada coloque los elementos focusables (mismo rAF que el focus inicial). Verifica con npm run build.
```
