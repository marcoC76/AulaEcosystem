/**
 * Google Apps Script para AulaEcosystem
 * Gestiona asistencia, retardos, justificantes y reportes.
 */

const SPREADSHEET_ID = "1iUrxGI3IPvlMhqhQn8IU0xvc6utEiZgDYI5xOW1LwbU"; // <--- CAMBIA ESTO POR TU ID DE HOJA

// === NUEVO: doPost para recibir POST desde GitHub Pages ===
function doPost(e) {
  try {
    // Intentamos leer el payload (que enviamos desde el frontend por POST form-encoded)
    const payloadRaw = e.parameter.payload || e.postData.contents;
    let data = {};
    if (payloadRaw) {
      data = JSON.parse(payloadRaw);
    }

    // Unificamos e.parameter con la data de payload para reutilizar tus handlers
    // Si viene action en el payload, lo usamos
    const fakeEvent = {
      parameter: {
        ...e.parameter,
        ...data,
        action: data.action || e.parameter.action || 'add'
      }
    };

    let result;
    const action = fakeEvent.parameter.action;
    
    if (action === 'get') {
      result = handleGet(fakeEvent);
    } else if (action === 'update') {
      result = handleUpdate(fakeEvent);
    } else if (action === 'delete') {
      result = handleDelete(fakeEvent);
    } else {
      result = handleAdd(fakeEvent);
    }

    // Retorno con JSON y cabeceras CORS
    const out = ContentService
      .createTextOutput(result.getContent()) // extraer el string de ContentService de tus handlers
      .setMimeType(ContentService.MimeType.JSON);

    // Apps Script no permite setHeaders() en general en HtmlService/ContentService, 
    // pero si lo agregamos como lo propusiste en tu prompt (si estás usando un entorno modificado o wrapper):
    try {
      if (typeof out.setHeaders === 'function') {
        out.setHeaders({
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type'
        });
      }
    } catch(err) {
      // Ignore si no está soportado en la API pública estándar
    }
    
    return out;

  } catch (error) {
    return createJsonResponse({ status: 'error', message: error.toString() });
  }
}

function doGet(e) {
  const action = e.parameter.action || 'add';
  
  try {
    if (action === 'get') {
      return handleGet(e);
    } else if (action === 'update') {
      return handleUpdate(e);
    } else if (action === 'delete') {
      return handleDelete(e);
    } else {
      return handleAdd(e); // Acción por defecto: Registro de asistencia
    }
  } catch (error) {
    return createJsonResponse({ status: 'error', message: error.toString() });
  }
}

/**
 * Registra una nueva asistencia o retardo
 */
function handleAdd(e) {
  const materia = e.parameter.Ma;
  if (!materia) throw new Error("Falta el parámetro 'Materia' (Ma)");

  const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = spreadsheet.getSheetByName(materia);

  if (!sheet) {
    sheet = spreadsheet.insertSheet(materia);
    sheet.appendRow(["Fecha", "Nombre Alumno", "Número Control", "Grupo", "Especialidad", "Periodo", "Profesor", "Estado", "Notas"]);
    sheet.getRange(1, 1, 1, 9).setFontWeight("bold").setBackground("#f3f3f3");
    sheet.setFrozenRows(1);
  }

  // Prioridad absoluta al parámetro corto 's' para estado
  const rawStatus = e.parameter.s || e.parameter.st_reg || e.parameter.status || e.parameter.Status || 'Asistencia';
  const status = (rawStatus && rawStatus.trim() !== '') ? rawStatus.trim() : 'Asistencia';
  
  const rowData = [
    new Date(),
    e.parameter.No || 'N/A',
    e.parameter.ID || 'N/A',
    e.parameter.Gr || 'N/A',
    e.parameter.Es || 'N/A',
    e.parameter.Pe || 'N/A',
    e.parameter.Pro || 'N/A',
    status,
    e.parameter.notes || ''
  ];

  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    sheet.appendRow(rowData);
    return createJsonResponse({ status: 'success', message: 'Registro añadido: ' + status, action: 'add' });
  } finally {
    lock.releaseLock();
  }
}

/**
 * Obtiene los datos AGREGADOS para AulaLook
 */
function handleGet(e) {
  const materia = e.parameter.Ma;
  if (!materia) throw new Error("Falta la materia para filtrar");

  const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = spreadsheet.getSheetByName(materia);
  if (!sheet) return createJsonResponse([]);

  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return createJsonResponse([]); // Solo cabeceras
  
  data.shift(); // Quitar cabeceras
  
  // 1. Filtrar registros
  let filteredRows = data;
  if (e.parameter.Pro) filteredRows = filteredRows.filter(r => String(r[6]) === String(e.parameter.Pro));
  if (e.parameter.Gr) filteredRows = filteredRows.filter(r => String(r[3]) === String(e.parameter.Gr));
  if (e.parameter.Pe) filteredRows = filteredRows.filter(r => String(r[5]) === String(e.parameter.Pe));

  // 2. Calcular clases totales únicas en este set filtrado
  const uniqueDates = new Set();
  filteredRows.forEach(row => {
    if (row[0]) uniqueDates.add(new Date(row[0]).toDateString());
  });
  const totalClases = uniqueDates.size || 1;

  // 3. Agrupar por alumno
  const studentMap = {};
  filteredRows.forEach(row => {
    const id = String(row[2]);
    if (!studentMap[id]) {
      studentMap[id] = {
        "Número de Control": id,
        "Nombre del Alumno": row[1],
        "Profesor": row[6],
        "Materia": materia,
        "Grupo": row[3],
        "Especialidad": row[4],
        "Periodo": row[5],
        "Asistencias": 0,
        "Total de Clases": totalClases,
        "Fechas y Horas de Asistencia": []
      };
    }
    
    // Contar como asistencia si el estado es válido
    const estado = row[7];
    if (estado === 'Asistencia' || estado === 'Retardo' || estado === 'Justificado') {
      studentMap[id].Asistencias++;
    }
    
    studentMap[id]["Fechas y Horas de Asistencia"].push(row[0]);
  });

  // 4. Formatear para el frontend
  const results = Object.values(studentMap).map(s => {
    s.Porcentaje = s.Asistencias / totalClases;
    s["Fechas y Horas de Asistencia"] = JSON.stringify(s["Fechas y Horas de Asistencia"]);
    return s;
  });

  return createJsonResponse(results);
}

/**
 * Actualiza un registro (p.ej. para justificar)
 */
function handleUpdate(e) {
  const materia = e.parameter.Ma;
  const idControl = e.parameter.ID;
  const fechaStr = e.parameter.date;
  const newStatus = e.parameter.status || e.parameter.s || 'Justificado';

  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(materia);
  if (!sheet) throw new Error("Hoja no encontrada");

  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    const rowDate = new Date(data[i][0]).toISOString();
    if (String(data[i][2]) === String(idControl) && rowDate === fechaStr) {
      sheet.getRange(i + 1, 8).setValue(newStatus); 
      return createJsonResponse({ status: 'success', message: 'Registro actualizado' });
    }
  }
  throw new Error("Registro no encontrado");
}

/**
 * Elimina un registro
 */
function handleDelete(e) {
  const materia = e.parameter.Ma;
  const idControl = e.parameter.ID;
  const fechaStr = e.parameter.date;

  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(materia);
  if (!sheet) throw new Error("Hoja no encontrada");

  const data = sheet.getDataRange().getValues();
  for (let i = data.length - 1; i >= 1; i--) {
    const rowDate = new Date(data[i][0]).toISOString();
    if (String(data[i][2]) === String(idControl) && rowDate === fechaStr) {
      sheet.deleteRow(i + 1);
      return createJsonResponse({ status: 'success', message: 'Registro eliminado' });
    }
  }
  throw new Error("Registro no encontrado");
}

function createJsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

function mapHeaderToKey(header) {
  const map = {
    "Fecha": "Fecha",
    "Nombre Alumno": "Nombre del Alumno",
    "Número Control": "Número de Control",
    "Grupo": "Grupo",
    "Especialidad": "Especialidad",
    "Periodo": "Periodo",
    "Profesor": "Profesor",
    "Estado": "Estado",
    "Notas": "Notas"
  };
  return map[header] || header;
}
