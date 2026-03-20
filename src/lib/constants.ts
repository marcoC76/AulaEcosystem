import type { AttendanceRecord } from '../types';

// URL única del JSON maestro de configuración en GitHub
export const MASTER_CONFIG_URL = "https://raw.githubusercontent.com/marcoC76/config/refs/heads/main/config.json";

export const MOCK_ATTENDANCE_DATA: AttendanceRecord[] = [
    {
        "Número de Control": "23309060760066",
        "Nombre del Alumno": "DANA PAOLA HERNANDEZ LARA",
        "Profesor": "Caballero Eduardo Nava",
        "Materia": "Conciencia Histórica 1",
        "Grupo": "4B",
        "Periodo": 1,
        "Asistencias": 8,
        "Total de Clases": 10,
        "Porcentaje": 0.8,
        "Fechas y Horas de Asistencia": '["2026-02-18T10:00:00Z","2026-02-19T10:00:00Z"]',
        "Especialidad": "radiología e imagen"
    },
    {
        "Número de Control": "24309060760535",
        "Nombre del Alumno": "RAFAEL GATICA CASTILLO",
        "Profesor": "Caballero Eduardo Nava",
        "Materia": "Conciencia Histórica 1",
        "Grupo": "4B",
        "Periodo": 1,
        "Asistencias": 10,
        "Total de Clases": 10,
        "Porcentaje": 1.0,
        "Fechas y Horas de Asistencia": '["2026-02-18T10:00:00Z","2026-02-19T10:00:00Z"]',
        "Especialidad": "radiología e imagen"
    }
];
