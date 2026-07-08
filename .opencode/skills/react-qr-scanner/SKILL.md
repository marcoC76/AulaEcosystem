---
name: react-qr-scanner
description: Patrones para generación de QR con react-qr-code, escaneo con html5-qrcode, exportación a PDF con jspdf y expiración por versión (V).
---

# Skill QR / Scanner — AulaEcosystem

## Stack actual

- **Generación:** `react-qr-code` (QR del pase de salida)
- **Escaneo:** `html5-qrcode` (lectura en AulaScan)
- **PDF:** `jspdf` + `html2canvas` (reportes y pases)
- **Expiración:** parámetro `V` en el JSON del QR (`qr_version` de `AppConfig`)

## Cuándo usarla

Usar esta skill cuando trabajes con:
- `src/pages/student/AulaPass.tsx` (generación de QR)
- `src/pages/teacher/AulaScan.tsx` (escaneo y captura)
- `src/pages/teacher/AulaLook.tsx` (reportes PDF)
- Cualquier nuevo componente que lea o escriba QRs

## Patrones obligatorios

### 1. Generar QR con versión (expiración)

```tsx
import QRCode from 'react-qr-code'

const qrData = JSON.stringify({
  V: config.qr_version || '1',
  ID: studentId,
  No: controlNumber,
  Gr: group,
  Es: specialty,
  Pe: parcial,
  Pro: teacher,
  Ma: subject,
  Time: new Date().toISOString()
})

<QRCode value={qrData} size={180} bgColor="#ffffff" fgColor="#000000" />
```

### 2. Escanear QR con html5-qrcode

```tsx
import { Html5Qrcode } from 'html5-qrcode'

useEffect(() => {
  const scanner = new Html5Qrcode('reader')
  scanner.start(
    { facingMode: 'environment' },
    { fps: 10, qrbox: { width: 300, height: 300 } },
    onScanSuccess,
    onScanFailure
  )
  return () => { scanner.stop().catch(() => {}) }
}, [])

function onScanSuccess(decodedText: string) {
  try {
    const data = JSON.parse(decodedText)
    if (data.V !== currentVersion) {
      // QR expirado
      return
    }
    // procesar asistencia
  } catch { /* QR inválido */ }
}
```

### 3. Exportar a PDF

```tsx
import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'

const exportPDF = async (elementId: string, filename: string) => {
  const element = document.getElementById(elementId)
  if (!element) return
  const canvas = await html2canvas(element, { scale: 2 })
  const imgData = canvas.toDataURL('image/png')
  const pdf = new jsPDF('p', 'mm', 'a4')
  const imgWidth = 190
  const imgHeight = (canvas.height * imgWidth) / canvas.width
  pdf.addImage(imgData, 'PNG', 10, 10, imgWidth, imgHeight)
  pdf.save(filename)
}
```

### 4. QR inválido — feedback al usuario

Siempre mostrar un toast/mensaje cuando:
- El QR no es JSON válido
- La versión (`V`) no coincide con la actual
- El estudiante no está en la base de datos
- La materia/grupo no corresponden

## Archivos clave

| Archivo | Propósito |
|---|---|
| `src/pages/student/AulaPass.tsx` | Generación de QR para pase de salida |
| `src/pages/teacher/AulaScan.tsx` | Escáner + captura de asistencia |
| `src/pages/teacher/AulaLook.tsx` | Reportes y exportación PDF |
| `src/lib/dataService.ts` | Envío de datos escaneados |
| `src/types/index.ts` | Interfaces de datos |

## Verificación

- El QR debe escanearse correctamente con la cámara trasera (`facingMode: 'environment'`)
- `html5-qrcode` tiene overrides CSS en `src/index.css` (`.override-html5-qrcode`)
- El PDF debe generarse sin cortar contenido (usar `scale: 2` en html2canvas)
