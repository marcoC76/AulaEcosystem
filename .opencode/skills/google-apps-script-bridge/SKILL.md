---
name: google-apps-script-bridge
description: Puente entre TypeScript y Google Apps Script. Sincronización de tipos, endpoints, payloads y lógica de negocio entre src/ y recursos/Code_AppsScript.js.
---

# Skill Google Apps Script Bridge — AulaEcosystem

## Arquitectura actual

- **Backend:** `recursos/Code_AppsScript.js` (Google Apps Script)
- **Frontend:** `src/lib/dataService.ts` (fetch API, URLSearchParams)
- **Formato:** POST con `Content-Type: application/x-www-form-urlencoded`, payload en JSON string
- **Endpoints:** `api_url` (CRUD asistencias) y `report_api_url` (consultas/reportes)
- **Autenticación:** PINs en Base64 desde `MASTER_CONFIG_URL`

## Cuándo usarla

Usar esta skill cuando:
- Modifiques `recursos/Code_AppsScript.js`
- Modifiques `src/lib/dataService.ts` (payloads, endpoints)
- Agregues nuevos campos a las interfaces en `src/types/index.ts`
- Cambies la estructura de Google Sheets

## Reglas de sincronización

### 1. Todo campo nuevo en el Sheet debe reflejarse en 3 lugares

| Lugar | Acción |
|---|---|
| `recursos/Code_AppsScript.js` | Leer/escribir el campo en Sheet |
| `src/lib/dataService.ts` | Incluirlo en el payload |
| `src/types/index.ts` | Agregarlo a la interfaz correspondiente |

### 2. Formato de payload siempre igual

```ts
// dataService.ts
const bodyParams = new URLSearchParams()
bodyParams.append('payload', JSON.stringify(finalData))

fetch(url, {
  method: 'POST',
  headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  body: bodyParams.toString()
})
```

### 3. El GAS recibe `action` como primer campo

```js
// Code_AppsScript.js
function doPost(e) {
  const payload = JSON.parse(e.parameter.payload)
  const action = payload.action
  if (action === 'add') { /* insertar fila */ }
  if (action === 'get') { /* consultar */ }
  if (action === 'update') { /* modificar */ }
  if (action === 'delete') { /* eliminar */ }
}
```

### 4. Doble mapeo de `status` para compatibilidad

Siempre enviar `status`, `s` y `st_reg` con el mismo valor:

```ts
if (data.status) {
  finalData.s = data.status
  finalData.st_reg = data.status
}
```

### 5. Consultas vía query params (GET)

`report_api_url` usa `URL.searchParams`:

```ts
const url = new URL(reportApiUrl)
url.searchParams.append('action', 'get')
url.searchParams.append('Ma', materia)
// etc.
```

## Archivos clave

| Archivo | Propósito |
|---|---|
| `recursos/Code_AppsScript.js` | Backend completo en GAS |
| `src/lib/dataService.ts` | Llamadas fetch tipadas |
| `src/types/index.ts` | Interfaces compartidas |
| `src/lib/constants.ts` | `MASTER_CONFIG_URL` |

## Verificación después de cambios

1. `npm run build` (tsc debe pasar)
2. Revisar que `recursos/Code_AppsScript.js` no tenga syntax errors
3. Si cambia la URL del endpoint, actualizar `MASTER_CONFIG_URL` en `constants.ts`
4. Probar con `test-api.js` si existe
