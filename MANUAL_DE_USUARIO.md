# Manual de Usuario - AulaEcosystem

Bienvenido a **AulaEcosystem**, la plataforma diseñada de forma exclusiva para la gestión ágil e inteligente de la asistencia e historial académico. Esta aplicación ha sido creada pensando en la rapidez que requiere un docente dentro de un aula moderna.

---

## 1. Acceso y Primeros Pasos
AulaEcosystem es una aplicación **PWA (Progressive Web App)**. Esto significa que puede funcionar directamente desde el navegador de tu computadora, tablet o teléfono web, y también puede ser instalada como una aplicación nativa.
- **Acceso Web:** Simplemente ingresa a la URL proporcionada para tu institución.
- **Instalación:** Si tu navegador lo soporta (como Chrome o Safari), verás un ícono de "Instalar Aplicación" en la barra de direcciones o en el menú de opciones.
- **Uso sin Conexión:** Una vez instalada y cargada por primera vez, la aplicación podrá abrirse incluso si no tienes internet (para la toma de asistencia sin conexión en casos de emergencia, se almacenará de manera automática en una cola que se sincronizará cuando el internet regrese).

---

## 2. Configuración Inicial (Setup)
Antes de poder escanear credenciales, es necesario que vincules la aplicación con tu servidor de base de datos.
1. Haz clic en el engrane superior o ve al apartado de **Setup / Configuración**.
2. Deberás ingresar los enlaces (`URLs`) y Claves Secretas proporcionados por el administrador de tu instituto:
   - **Base de Datos Principal:** El enlace a la hoja de Google Sheets / Apps Script que aloja todo el registro.
   - **PIN Maestro:** Una clave de seguridad necesaria para que otras personas no modifiquen la configuración del sistema.
3. Todo queda guardado de manera cifrada en tu dispositivo.

---

## 3. Tomas de Asistencia (Módulo AulaScan)
El corazón del ecosistema. Desde aquí pasarás lista de forma fugaz:

1. Ingresa a **Asistencias** desde el panel principal.
2. Deberás seleccionar los filtros correctos: Tu **Nombre (Profesor)**, la **Materia** que estás impartiendo y el **Grupo**.
3. Posteriormente, la cámara se activará. Tienes **3 modalidades** para pasar lista:
   * **Escáner Manual:** Presiona el botón al centro cada vez que quieras tomar foto al código de barras del alumno.
   * **Modo Kiosco (Manos Libres):** Especialmente diseñado para colocar un teléfono/tablet sobre un tripié. Al activarse esta opción, la cámara se prenderá indefinidamente. Los estudiantes podrán pasar y acercar su credencial uno tras otro y el sistema registrará la asistencia sin que toques la pantalla.
   * **Búsqueda Manual (Lupa):** ¿Un estudiante extravió su credencial hoy? Dale clic al ícono de buscar e ingresa las 3 primeras letras de su apellido. Aparecerá en una lista y podrás marcar su asistencia tocando su nombre.

---

## 4. Consultas y Reportes (Módulo AulaLook)
Al final del día, tu análisis académico requiere datos claros y procesables. Entra al menú **Reportes** para descubrir los tableros interactivos e historiales del periodo.

### Vista Inmediata (Dashboard General)
Recibirás una visión completa con KPIs: la cantidad de *Alumnos Registrados*, *Grupos*, *Materias* conformadas por la tira de materias, y *Profesores* activos en el instituto.

### 4.1 Consulta Clásica (Por Grupo y Materia)
Diseñado para la gestión tradicional:
1. En vez de "Por Alumno", entra a **Por Grupo**.
2. Selecciona Profesor, Materia y Grupo.
3. Se generará un análisis general del grupo:
   - Identificando promedios de asistencia vs faltas.
   - Listando alumnos con etiquetas visuales e indicadores rojo-amarillo-verde según su porcentaje.
4. **Hacer clic en el alumno:** Abrirá un *Modal Histórico* para ver su registro de asistencias al minuto, agrupados en mes de calendario.

### 4.2 Kárdex Individual (Consulta Avanzada de Alumno)
Si tu director, tutor escolar o tú mismo, requieres ver la información transversal a nivel estudiante:
1. Elige **Modo Alumno**.
2. Con ayuda del buscador predictivo, teclea e identifica al alumno por Apellido o Número de Control.
3. Al darle en Generar, AulaEcosystem consultará su historia en **todas las materias base** pertenecientes a su especialidad y grupo. 
4. Verás una tabla desglosando qué porcentaje de progreso tiene el estudiante en Geometría, en Inglés, en Programación, etc. Mostrando también a qué profesores se le ha ausentado.

### 4.3 Reportes para Exportar
En ambas consultas de reportes encontrarás el botón de acción para descarga:
- **Descargar Reporte Faltas (CSV):** Exportará en Excel los nombres del registro actual, cruzando sus datos para obtener fechas exactas y total de faltas. Ideal y listo para justificaciones e impresiones desde el área administrativa.

---

> En caso de percibir alguna lentitud ocasional al escanear, es normal. AulaEcosystem valida cada entrada contra el control digital en la nube bajo los estándares de seguridad de tu instituto.
