# Descripción Técnica y Arquitectura - AulaEcosystem

**AulaEcosystem** es una aplicación en etapa de maduración técnica (*Progressive Web App* - PWA) impulsada por analíticas en tiempo real enfocada a la administración académica de instituciones educativas. Esta documentación expone la arquitectura técnica, la resiliencia en la capa de datos y el stack empleado para el correcto mantenimiento del sistema.

## 1. Stack Tecnológico (Core App)

- **Frontend Framework:** React 18 / TypeScript
- **Bundler y Compilador:** Vite 5 (Super rápido con *Hot Module Replacement*)
- **Ecosistema de Estilos:** Tailwind CSS 3 (Extendiendo clases e integrado con un sistema de tokens en `index.css` de Vanilla-CSS puros para mantener compatibilidad cross-component).
- **Gestión de Componentes UI:** Componentes aislados y adaptables localizados en `src/components/ui/`, inspirados en la estética moderna (glassmorphism/shadcn).
- **PWA Capabilities:** Integrado a través de `vite-plugin-pwa` interactuando con Service Workers usando Workbox, permitiendo caché *offline-first*.
- **Hosting y Despliegue CI/CD:** El build en la carpeta `dist` se despliega asíncronamente mediante Github Actions / gh-pages en un entorno Cloud gratuito.

## 2. Bases de Datos & Backend Middleware

Por diseño y para mantener una infraestructura costo-cero para las instancias estudiantiles, la aplicación utiliza una arquitectura Serverless apoyada en ecosistemas Google.

### Almacenamiento Central - BaaS (Backend as a Service)
- **Google Apps Script & Google Sheets:** Todas las peticiones, registros de asistencia e inyecciones de datos pasan de la GUI al API de *Apps Script* publicadas como webapps anónimas que procesan JSON y operan tras bastidores sobre libros de Google Sheets.
- **Micro-servicios (Multi-Endpoint Fetching):** Existen variables en la configuración de la app donde se depositan URLs asíncronamente:
  - `report_api_url`: Procesador usado para operaciones pesadas de historiales de lecturas, consolidación y borrado `(action='delete' o 'update')`.
  - `api_url`: Capa ultraligera empleada en el escaneo continuo para registrar el payload JSON `{ID, Pe, Pro, Ma, date}`.
- **Configuración Dinámica:** A fin de no tocar el repositorio *React* por cada cambio de ciclo escolar, existe `config_ejemplo.json` alojado de forma remota en github y accesible mediante un Base64 hash. Carga las materias, y profesores activos dinámicamente haciendo fetch a RAW de Github al inyectarse.

## 3. Topología de Componentes Principales

### 3.1 Módulo `AulaScan` (Motor de Captura Frontal)
El archivo gestiona un flujo complejo en hardware para PWA:
- Permisos explícitos a WebRTC a través de las Constraints de iOS/Android (`facingMode: environment`).
- Utiliza **ZXing** & `html5-qrcode` permitiendo modos continuos.
- **Cola Offline (Resiliencia Network):** Al no encontrar capa REST (`HTTP Error`/Fetch Failure) intercepta y detiene la subida enviando los datos a un array nativo (`localStorage.getItem('attendanceQueue')`). Una sub-rutina de polleo intenta restaurarlos al detectar evento `window.addEventListener('online')`.
- **Integración Fuse.js:** Búsqueda difusa de estudiantes (Autocompletion engine) calculando puntajes de similitudes usando la matriz de Levenshtein.

### 3.2 Módulo `AulaLook` (Motor Analítico)
Generador de las estadísticas (Dashboards Kárdex).
- Re-renderizado de Recharts `(ResponsiveContainer, PieChart, LineChart)`.
- **Transmisión Cruzada Multi-Materia:** Cuando el reporte solicita a alumnos de forma general y global, el Hook `loadStudentData` itera transponiendo y paralelizando en bloques *ChunkSize = 4* peticiones `fetch` contra el Apps Script (evitando de esta manera rate-limits 429 de red). Luego fusiona y agrupa los JSON descartables en tablas combinadas calculando inasistencias matemáticas basadas en picos lógicos.

## 4. Patrones de Diseño & Estado (Manejo de Memoria)

A diferencia de Arquitecturas corporativas pesadas que dependen en su totalidad de **Redux**, el engranaje de estado local (State) fluye a lo largo de AulaEcosystem valiéndose fuertemente de **React Context API** y delegación de Hooks `useState / useEffect`. 
Los objetos persistentes como las credenciales UUID, configuración PWA de instalación rápida, y bases transicionales de alumnos, se delegan a LocalStorage para el rendimiento sub-milisegundo esperado en escaneo móvil.

## 5. Rendimiento en Dispositivos Apple y Safaris

Debido al aislamiento sandbox de iOS implementado por Apple (WebKit):
- Las vistas como Reportes y Dashboard fueron abstraídas liberando *EventBubbling* sobre Modal Sheets generadas sobre Capas Z-index 50+ y con `createPortal`.
- Las actualizaciones recaen en un Prompt UI (*ReloadPrompt*) interactivo que asume el WebWorker SkipWaiting para evitar cachés huérfanos que impidieran al maestro obtener la versión más novedosa al recargar su portal.
