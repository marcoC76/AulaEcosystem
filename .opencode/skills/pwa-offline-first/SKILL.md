---
name: pwa-offline-first
description: Patrones PWA offline-first para AulaEcosystem. Workbox background sync, cola de attendance, registro de service worker, prompts de instalación y recarga.
---

# Skill PWA / Offline-First — AulaEcosystem

## Arquitectura actual

- **Vite PWA** con `vite-plugin-pwa` y `registerType: 'prompt'`
- **Workbox Background Sync** para endpoints de Google Apps Script (`attendance-queue`, `maxRetentionTime: 24 * 60`)
- **`ReloadPrompt`** usa `useRegisterSW` de `virtual:pwa-register/react`
- **`InstallPWA`** escucha `beforeinstallprompt`
- **Sin archivo `src/lib/attendanceQueue.ts`** — la cola vive en `vite.config.ts` + lógica manual en `AulaScan.tsx`

## Cuándo usarla

Usar esta skill cuando trabajes con:
- `vite.config.ts` (configuración PWA/Workbox)
- `src/components/ui/InstallPWA.tsx`
- `src/components/ui/ReloadPrompt.tsx`
- Lógica de sincronización offline en `src/pages/teacher/AulaScan.tsx`
- Cualquier nuevo endpoint que requiera `backgroundSync`

## Patrones obligatorios

### 1. Nuevo endpoint con Background Sync

En `vite.config.ts`, agregar una entrada en `workbox.runtimeCaching`:

```ts
VitePWA({
  registerType: 'prompt',
  workbox: {
    runtimeCaching: [
      {
        urlPattern: /^https:\/\/script\.google\.com\/macros\/s\/.*/i,
        handler: 'NetworkOnly',
        options: {
          backgroundSync: {
            name: 'attendance-queue',
            options: { maxRetentionTime: 24 * 60 },
          },
        },
      },
    ],
  },
})
```

### 2. Retry manual en AulaScan

Siempre que quieras reintentar registros fallidos, usa el patrón existente:

```ts
const retryFailedScans = async () => {
  const failed = history.filter(h => h.status === 'error')
  for (const scan of failed) {
    try {
      await sendAttendance(scan.data)
      // marcar como success en history
    } catch { /* mantener como error */ }
  }
}

useEffect(() => {
  window.addEventListener('online', retryFailedScans)
  return () => window.removeEventListener('online', retryFailedScans)
}, [])
```

### 3. Cache de configuración

Usar el patrón `getConfig()` de `dataService.ts`: memoria → localStorage → fallback por defecto.

### 4. Nuevo componente PWA

- Usar `useRegisterSW` de `virtual:pwa-register/react` para detectar nuevo SW
- Usar `window.matchMedia('(display-mode: standalone)')` para detectar modo PWA
- No asumir `useRegisterSW` sin verificar que `vite-plugin-pwa` está en `package.json`

## Archivos clave

| Archivo | Propósito |
|---|---|
| `vite.config.ts` | Configuración Workbox + manifest |
| `src/components/ui/ReloadPrompt.tsx` | Notificar nueva versión |
| `src/components/ui/InstallPWA.tsx` | Botón de instalación |
| `src/lib/dataService.ts` | Cache offline de config y students |
| `src/pages/teacher/AulaScan.tsx` | Retry queue + `window.online` |

## Verificación

- `npm run build` no debe fallar
- `ReloadPrompt` no debe importar nada que no esté en `virtual:pwa-register/react`
- El `urlPattern` del `runtimeCaching` debe coincidir con las URLs reales de GAS
