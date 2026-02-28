export interface AttendanceRecord {
    "Número de Control": string;
    "Nombre del Alumno": string;
    "Profesor": string;
    "Materia": string;
    "Grupo": string;
    "Periodo": number;
    "Asistencias": number;
    "Total de Clases": number;
    "Porcentaje": number; // 0.0 a 1.0
    "Fechas y Horas de Asistencia": string; // JSON string array de fechas
    "Especialidad": string;
}

export interface StudentDBRecord {
    "No. Control": string;
    "Nombre(s)": string;
    "Apellido Paterno": string;
    "Apellido Materno": string;
    "Grupo": string;
    "Carrera": string;
    "Turno"?: string;
    "Marca temporal"?: string;
}

export interface ConfigOption {
    value: string;
    text: string;
}
