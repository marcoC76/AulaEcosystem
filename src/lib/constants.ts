import type { AttendanceRecord } from '../types';

export const API_URL = "https://script.google.com/macros/s/AKfycbwiWogccR5ri7QfLu06kXd_R2OH9pRKiUAMFRFCBVcsnEHpipTxc1UCv41AoN1EWpK7/exec";
export const REPORT_API_URL = "https://script.google.com/macros/s/AKfycbwiWogccR5ri7QfLu06kXd_R2OH9pRKiUAMFRFCBVcsnEHpipTxc1UCv41AoN1EWpK7/exec";
export const REMOTE_STUDENTS_URL = "https://raw.githubusercontent.com/aulaPass/aulaPass.github.io/refs/heads/main/csvjson.json";
export const REMOTE_CONFIG_URL = "https://raw.githubusercontent.com/aulaScan/aulascan.github.io/refs/heads/main/datos.json";
export const TEACHER_PIN = "C762026";

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
