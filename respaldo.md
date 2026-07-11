# Respaldo — Estado original antes de unificar estilo glass de cards

Creado: 2026-07-11
Propósito: Restaurar el estado original si los cambios no quedan bien.

---

## 1. `src/components/ui/Card.tsx` — línea 8

**Original:**
```
rounded-3xl bg-theme-card/80 backdrop-blur-xl text-theme-text shadow-[var(--shadow-card)] overflow-hidden
```

---

## 2. `src/pages/LandingPage.tsx`

### Logo — línea 69
**Original:**
```
hero-logo inline-flex items-center justify-center w-24 h-24 p-2 bg-theme-card/80 backdrop-blur-md rounded-3xl shadow-2xl mb-8
```

### Card Docente — línea 84
**Original:**
```
entrance-card group relative flex flex-col items-start justify-center p-8 md:col-span-3 bg-theme-card/80 backdrop-blur-xl rounded-[2.5rem] transition-all duration-300 shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-card-hover)] hover:-translate-y-2 active:scale-[0.98] overflow-hidden
```

---

## 3. `src/components/layout/PinGuard.tsx` — línea 87

**Original:**
```
bg-theme-card/90 backdrop-blur-xl border border-theme-border rounded-[2rem] shadow-2xl overflow-hidden relative before:absolute before:inset-[1px] before:rounded-[calc(2rem-1px)] before:border before:border-white/[0.04] before:pointer-events-none
```

---

## 4. `src/pages/tools/PinEncoder.tsx` — línea 38

**Original:**
```
bg-theme-card border border-theme-border rounded-[2rem] shadow-2xl overflow-hidden relative
```

---

## 5. `src/components/ui/CookieConsent.tsx` — línea 23

**Original:**
```
mx-auto max-w-lg bg-theme-card/95 backdrop-blur-md border border-theme-border rounded-2xl p-4 shadow-2xl
```

---

## 6. `src/components/ui/InstallPWA.tsx` — línea 47

**Original:**
```
fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:w-80 bg-theme-card/90 backdrop-blur-xl border border-theme-border shadow-2xl rounded-2xl p-4 z-50 animate-fade-in-up
```

---

## 7. `src/components/ui/ReloadPrompt.tsx` — línea 25

**Original:**
```
bg-theme-card/95 backdrop-blur-xl border border-theme-accent1-500/50 shadow-2xl rounded-2xl p-4 md:p-5 w-full max-w-sm pointer-events-auto flex flex-col gap-3 animate-fade-in-up
```

---

## 8. `src/components/ui/Modal.tsx` — línea 96

**Original:**
```
w-full flex flex-col bg-theme-card shadow-2xl overflow-hidden print-area
```

---

## 9. `src/pages/NotFound.tsx` — línea 96

**Original:**
```
w-20 h-20 p-2 bg-theme-card/80 backdrop-blur-md rounded-3xl shadow-2xl mb-8
```
