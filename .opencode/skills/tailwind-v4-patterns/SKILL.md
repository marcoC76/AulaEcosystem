---
name: tailwind-v4-patterns
description: Patrones específicos de Tailwind CSS v4 para AulaEcosystem. Sin tailwind.config.js, @theme en CSS, variables CSS para theming, y la función cn().
---

# Skill Tailwind v4 — AulaEcosystem

## Stack actual

- **Tailwind CSS v4** (sin `tailwind.config.js`)
- **Plugin Vite:** `@tailwindcss/vite`
- **Configuración:** `@import "tailwindcss"` + directiva `@theme` en `src/index.css`
- **Temas:** 4 temas vía `data-theme` en `<html>` + variables CSS personalizadas
- **Merge de clases:** `cn()` de `src/lib/utils.ts` (clsx + tailwind-merge)

## Cuándo usarla

Usar esta skill cada vez que:
- Agregues o modifiques estilos en cualquier componente
- Cambies el sistema de temas
- Importes clases condicionales
- Necesites valores de espaciado, color o tipografía

## Patrones obligatorios

### 1. NO usar `tailwind.config.js`

Tailwind v4 configura todo en `src/index.css`:

```css
@import "tailwindcss";

@theme {
  --font-sans: 'Outfit', 'Inter', ui-sans-serif, system-ui, sans-serif;
  --font-mono: 'JetBrains Mono', 'Fira Code', ui-monospace, monospace;
  --color-gray-750: #2d3748;
  --animate-fade-in: fade-in 0.4s ease-out forwards;

  @keyframes fade-in {
    from { opacity: 0; }
    to { opacity: 1; }
  }
}
```

### 2. Usar colores del tema con `theme-*`

No usar colores fijos como `bg-blue-500`. Usar variables del tema:

```
bg-theme-card     → fondo de tarjetas
text-theme-text   → texto principal
text-theme-muted  → texto secundario
border-theme-border → bordes
bg-theme-accent1-500 → acento primario
bg-theme-accent2-500 → acento secundario (verde)
bg-theme-accent3-500 → acento terciario (púrpura)
bg-theme-warning-500 → advertencia
```

### 3. Temas vía `data-theme`

Nunca cambiar tema con clases. Usar el atributo `data-theme` en `<html>`:

```ts
document.documentElement.setAttribute('data-theme', 'ocean')
```

Temas disponibles: `dark` (default), `light`, `sunset`, `ocean`.

### 4. Usar `cn()` para clases condicionales

```tsx
import { cn } from '../../lib/utils'

<div className={cn(
  'p-4 rounded-lg',
  isActive ? 'bg-theme-accent1-500' : 'bg-theme-card',
  className
)} />
```

### 5. Animaciones desde `@theme`

Usar las animaciones definidas:

```
animate-fade-in    → fade-in 0.4s ease-out forwards
animate-fade-in-up → fade-in-up 0.5s ease-out forwards
```

### 6. Estilos de impresión

Usar las clases globales de `src/index.css`:

```
print-area    → contenido visible al imprimir
no-print      → contenido oculto al imprimir
```

## Archivos clave

| Archivo | Propósito |
|---|---|
| `src/index.css` | Toda la configuración de Tailwind v4 + temas |
| `src/lib/utils.ts` | Función `cn()` |

## Anti-patrones (NO hacer)

- ❌ `tailwind.config.js` — no existe en v4
- ❌ `@apply` — no uses directiva `@apply`, usa componentes React
- ❌ Colores fijos como `text-blue-600` fuera del tema — siempre usar `text-theme-*`
- ❌ `bg-gray-900` — ya está mapeado como `bg-theme-card` o similar
- ❌ Importar `tailwindcss` en `postcss.config.js` — en v4 se usa el plugin de Vite

## Verificación

- `npm run dev` debe mostrar los estilos correctamente
- Los 4 temas deben funcionar (dark, light, sunset, ocean)
- Las animaciones `fade-in` y `fade-in-up` deben respetar `prefers-reduced-motion`
