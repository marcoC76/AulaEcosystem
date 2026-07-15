# Manual de Usuario — AulaEcosystem

Bienvenido a **AulaEcosystem**, la plataforma diseñada para la gestión ágil de asistencia e
historial académico. Esta aplicación está pensada para la rapidez que un docente necesita
dentro del aula.

---

## 1. Acceso y Primeros Pasos

AulaEcosystem es una **PWA (Progressive Web App)**. Funciona directamente desde el navegador
y puede instalarse como aplicación nativa.

- **Acceso web:** Ingresa a la URL proporcionada por tu institución.
- **Instalación:** En Chrome o Safari verás un icono "Instalar aplicación" en la barra de
  direcciones o menú de opciones.
- **Uso sin conexión:** Una vez cargada, la aplicación funciona sin internet. La asistencia
  tomada offline se almacena en una cola local y se sincroniza automáticamente al recuperar
  la conexión.

### Rutas de acceso

| Pantalla                 | Ruta               | Botón en inicio              |
| ------------------------ | ------------------ | ---------------------------- |
| Pase estudiantil (QR)    | `/student`         | Estudiante                   |
| Escáner de asistencia    | `/teacher/scan`    | Docente → Escanear          |
| Reportes                 | `/teacher/report`  | Docente → Reportes           |
| Consulta (solo lectura)  | `/consulta/report` | Consulta                     |

---

## 2. Configuración automática

AulaEcosystem no requiere configuración manual. La aplicación carga automáticamente la
configuración remota (profesores, materias, grupos) desde una URL definida en el código
fuente. Con internet obtiene la versión más reciente; sin conexión usa la copia local
almacenada en el dispositivo.

El acceso a funciones de docente y consulta está protegido por un PIN numérico definido
en la configuración remota. Se ingresa una sola vez y persiste en el dispositivo.

---

## 3. Toma de Asistencia — AulaScan

El módulo de escaneo permite pasar lista de forma rápida:

1. Desde la pantalla de inicio presiona **Docente → Escanear**.
2. Selecciona tu **Nombre (Profesor)**, la **Materia** que impartes y el **Parcial**
   correspondiente. El grupo se obtiene automáticamente del código QR al escanearlo.
3. Presiona **Iniciar Escáner** para activar la cámara. Tienes tres modalidades:

   - **Escáner manual:** Presiona el botón central cada vez que quieras leer un código QR.
   - **Modo Kiosco (manos libres):** La cámara se mantiene activa continuamente. Los
     estudiantes acercan su credencial y el sistema registra la asistencia sin intervención.
   - **Búsqueda manual (lupa):** Si un estudiante no tiene credencial, busca por nombre o
     número de control y marca su asistencia manualmente.

El historial de escaneo del día se muestra en la parte inferior, con opción de descargar
CSV por fecha.

---

## 4. Consultas y Reportes — AulaLook

Desde la pantalla de inicio presiona **Docente → Reportes** o directamente **Consulta**
para modo solo lectura. Al entrar verás una vista previa con cuatro indicadores generales
del instituto: **Alumnos registrados**, **Grupos**, **Materias** y **Profesores** activos.

Para generar un reporte concreto debes completar el asistente paso a paso. Elige primero
el modo de consulta:

### 4.1 Consulta por Grupo y Materia

Diseñado para la gestión tradicional de grupo:

1. En el selector de modo elige **Por Grupo**.
2. **Paso 1:** Selecciona el **Profesor**.
3. **Paso 2:** Selecciona la **Materia**.
4. **Paso 3:** Elige uno o varios **Grupos** (con fichas de colores) y el **Período**.
5. **Paso 4:** Se genera el dashboard con:
   - KPIs del reporte (total alumnos, asistencias acumuladas, índice de asistencia, foco
     rojo para alumnos con menos del 80 %).
   - Gráficas de evolución y comparativa.
   - Tabla detallada con filtro por riesgo, búsqueda local y orden por columnas.
   - Al hacer clic en un alumno se abre un modal con su historial cronológico completo.

### 4.2 Kárdex Individual (Consulta por Alumno)

Para ver la información transversal de un estudiante en todas sus materias:

1. Elige **Por Alumno**.
2. Usa el buscador predictivo para encontrar al alumno por nombre o número de control.
3. Selecciona el **Período** a consultar.
4. Presiona **Generar**. Se mostrará el rendimiento del estudiante en cada materia base
   de su grupo: porcentaje de asistencia, total de clases y profesor responsable.

### 4.3 Reportes para Exportar

En el dashboard de resultados (paso 4) encontrarás estos botones de descarga:

- **CSV** — Exporta la tabla actual con control, nombre, grupo, asistencias y porcentaje.
- **PDF** — Reporte detallado con desglose por alumno, estado coloreado y resumen.
- **Sábana PDF** — Tabla estilo hoja de cálculo con todas las fechas del parcial como
  columnas y marcas de asistencia (✓, R, J, ✗). Ideal para reportes oficiales.
- **Faltas (CSV)** — Listado de alumnos con fechas exactas de falta.
- **PDF individual** — Desde el modal de detalle del alumno puedes generar un PDF con
  su historial cronológico, resumen y barra de porcentaje.

---

> Si percibes lentitud ocasional al escanear, es normal. AulaEcosystem valida cada
> entrada contra el control digital en la nube bajo los estándares de seguridad de tu
> instituto.
