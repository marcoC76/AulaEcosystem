import { API_URL, REPORT_API_URL, MOCK_ATTENDANCE_DATA, REMOTE_STUDENTS_URL, REMOTE_CONFIG_URL } from './constants';
import type { AttendanceRecord, StudentDBRecord, ConfigOption } from '../types';

export interface ScanPayload {
    Time: Date;
    No: string; // Nombre
    ID: string; // Número de control
    Gr: string; // Grupo
    Es: string; // Especialidad (Carrera)
    Pe: string | number; // Periodo (Parcial)
    Pro: string; // Profesor
    Ma: string; // Materia
    status?: string; // Asistencia, Retardo, Justificado
    notes?: string;
}

export const fetchStudentsDB = async (): Promise<StudentDBRecord[]> => {
    try {
        const res = await fetch(REMOTE_STUDENTS_URL);
        if (!res.ok) throw new Error("Remote failed");
        const data = await res.json();
        // Guardar copia local si el fetch es exitoso
        localStorage.setItem('cached_students_db', JSON.stringify(data));
        return data;
    } catch (error) {
        console.warn("Using localStorage fallback for students:", error);
        // Recuperar del localStorage si falla la conexión
        const cached = localStorage.getItem('cached_students_db');
        if (cached) {
            try { return JSON.parse(cached); } catch (e) { return []; }
        }
        return [];
    }
};

export const fetchAppConfig = async (): Promise<{ profesores: ConfigOption[], materias: ConfigOption[] }> => {
    try {
        const res = await fetch(REMOTE_CONFIG_URL);
        if (!res.ok) throw new Error("Remote failed");
        const data = await res.json();
        // Guardar copia local
        localStorage.setItem('cached_app_config', JSON.stringify(data));
        return data;
    } catch (error) {
        console.warn("Using localStorage fallback for config:", error);
        // Recuperar del localStorage si hay copia
        const cached = localStorage.getItem('cached_app_config');
        if (cached) {
            try { return JSON.parse(cached); } catch (e) { return { profesores: [], materias: [] }; }
        }
        return { profesores: [], materias: [] };
    }
};

export const sendAttendance = async (data: ScanPayload): Promise<boolean> => {
    try {
        const url = new URL(API_URL);
        url.searchParams.append('action', 'add');
        Object.keys(data).forEach(key => {
            const val = data[key as keyof ScanPayload];
            // Skip status, notes and Time (Time is handled by GAS server-side)
            if (val !== undefined && val !== null && key !== 'status' && key !== 'notes' && key !== 'Time') {
                url.searchParams.append(key, String(val));
            }
        });

        // Usar parámetros cortos para máxima fiabilidad
        if (data.status) {
            url.searchParams.append('s', String(data.status)); // Nuevo estándar corto
            url.searchParams.append('st_reg', String(data.status)); // Backup
        }
        if (data.notes) url.searchParams.append('notes', String(data.notes));

        console.log('Sending attendance URL:', url.toString());
        await fetch(url.toString(), {
            method: "GET",
            mode: "no-cors"
        });

        return true;
    } catch (error) {
        console.error("Error sending attendance:", error);
        return false;
    }
};

/**
 * Actualiza el estado de un registro (p.ej. para justificar)
 */
export const updateAttendanceRecord = async (materia: string, studentId: string, date: string, status: string): Promise<boolean> => {
    try {
        const url = new URL(REPORT_API_URL); // Usamos la misma URL base de reportes/escritura
        url.searchParams.append('action', 'update');
        url.searchParams.append('Ma', materia);
        url.searchParams.append('ID', studentId);
        url.searchParams.append('date', date);
        url.searchParams.append('status', status);

        const res = await fetch(url.toString());
        const result = await res.json();
        return result.status === 'success';
    } catch (error) {
        console.error("Error updating record:", error);
        return false;
    }
};

/**
 * Elimina un registro de asistencia
 */
export const deleteAttendanceRecord = async (materia: string, studentId: string, date: string): Promise<boolean> => {
    try {
        const url = new URL(REPORT_API_URL);
        url.searchParams.append('action', 'delete');
        url.searchParams.append('Ma', materia);
        url.searchParams.append('ID', studentId);
        url.searchParams.append('date', date);

        const res = await fetch(url.toString());
        const result = await res.json();
        return result.status === 'success';
    } catch (error) {
        console.error("Error deleting record:", error);
        return false;
    }
};

export const fetchReportData = async (filters: any): Promise<AttendanceRecord[]> => {
    try {
        const url = new URL(REPORT_API_URL);
        url.searchParams.append('action', 'get');
        if (filters.subject) url.searchParams.append('Ma', filters.subject);
        if (filters.teacher) url.searchParams.append('Pro', filters.teacher);
        if (filters.group) url.searchParams.append('Gr', filters.group);
        if (filters.parcial) url.searchParams.append('Pe', filters.parcial);

        const response = await fetch(url.toString());
        if (!response.ok) throw new Error("Failed to fetch report data");
        const data = await response.json();
        return Array.isArray(data) ? data : MOCK_ATTENDANCE_DATA;
    } catch (error) {
        console.error("Error fetching report data, using mock fallback:", error);
        return MOCK_ATTENDANCE_DATA;
    }
};
