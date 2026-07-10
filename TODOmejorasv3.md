# TODO — Mejoras v3

> Plan general de mejoras para AulaEcosystem
> Versión: 3.0.0 — Julio 2026

---

## Fase 1 — Quick Wins (Antes del semestre)

### B. Avatares DiceBear
- [x] **B1** `npm install @dicebear/core @dicebear/bottts-neutral`
- [x] **B2** Reescribir `src/components/ui/StudentAvatar.tsx` usando DiceBear SDK
- [x] **B3** Refactor `drawAvatarOnCanvas()` en `src/pages/student/AulaPass.tsx` para usar DiceBear `toDataUri()`
- [x] **B4** Eliminar código de pixel art muerto (`generateAvatarSvgForCanvas`, paletas, hashStr)

### A. Rediseño QR/Card
- [x] **A1** Rediseñar layout de la card: barra delgada de carrera, avatar+info en fila, QR sin marco blanco
- [x] **A2** Implementar toggle 🌙/☀️ para variante dark/light de la card
- [x] **A3** Refactor `downloadPNG()` usando `html2canvas` (en vez de canvas manual)
- [x] **A4** Implementar `downloadPDF()` con `jsPDF` + `html2canvas`
- [x] **A5** Agregar soporte `@media print` + botón imprimir
- [x] **A6** Agregar botones de descarga (PNG, PDF, Imprimir) en área .no-print
- [x] **A7** Eliminar esquineros decorativos obsoletos (`.qr-corner`)

### C. Tutorial interactivo
- [x] **C1** `npm install driver.js`
- [x] **C2** Crear `src/components/ui/Tour.tsx` con botón flotante `?` y definición de tours por ruta
- [x] **C3** Integrar `<Tour />` en `src/App.tsx`
- [x] **C4** Agregar `id`s faltantes a elementos clave para los pasos del tour
- [x] **C5** Estilos del botón FAB en `src/index.css`

### Limpieza global
- [x] **CL1** Eliminar código de pixel art duplicado en AulaPass.tsx
- [x] **CL2** Verificar `npm run build` sin errores
- [x] **CL3** Actualizar `CHANGELOG.md`

---

## Fase 2 — Funcionalidad (Durante el semestre)

### D. Historial de asistencias del alumno
- [ ] **D1** Nueva ruta `/student/history` en `src/App.tsx`
- [ ] **D2** Nuevo componente/página `src/pages/student/AulaHistory.tsx`
- [ ] **D3** Reutilizar sesión existente (`aulaPassData` en localStorage) o búsqueda por No. Control
- [ ] **D4** Fetch a `report_api_url` con el No. Control del alumno
- [ ] **D5** Mostrar tabla de asistencias por materia con fechas, porcentaje y estado
- [ ] **D6** Agregar enlace "Ver mi historial" en AulaPass.tsx
- [ ] **D7** Verificar que el backend GAS devuelva datos correctos para consultas individuales

---

## Fase 3 — Futuro (Requiere planificación externa)

### E. Auth por docente + scoping
- [ ] **E1** Definir nueva estructura de `profesores` en config remoto (password, materias[], grupos[])
- [ ] **E2** Actualizar interfaz `AppConfig` y `ConfigOption` en `src/types/index.ts`
- [ ] **E3** Refactor `PinGuard` o crear nuevo flujo de login por docente
- [ ] **E4** Actualizar `AppLayout` / `TeacherLayout` para autenticación individual
- [ ] **E5** Modificar `AulaScan` para auto-seleccionar docente y pre-filtrar materias/grupos
- [ ] **E6** Modificar `AulaLook` para pre-filtrar por docente autenticado
- [ ] **E7** Verificar compatibilidad con backend GAS (ya soporta `?Pro=`)

### F. Auto-registro de alumnos y docentes
- [ ] **F1** Definir nuevo endpoint en `Code_AppsScript.js` para registro
- [ ] **F2** Formulario de registro de alumnos (Nombre, No. Control, Carrera, Grupo)
- [ ] **F3** Formulario de registro de docentes (Nombre, Materias, Contraseña)
- [ ] **F4** Flujo de validación/verificación de datos registrados
- [ ] **F5** Integración con Google Sheets para almacenar registros
- [ ] **F6** Actualizar fetch de estudiantes en frontend para incluir datos registrados

---

## Release checklist
- [ ] Probar offline-first (service worker + cola de attendance)
- [ ] Probar en iOS Safari (modales, z-index, AudioContext)
- [ ] Probar en Android Chrome (PWA, escáner)
- [ ] Probar impresión/PDF en varios navegadores
- [ ] Etiquetar release en git (`v3.0.0`)
