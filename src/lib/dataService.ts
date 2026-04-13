import { MASTER_CONFIG_URL, MOCK_ATTENDANCE_DATA } from './constants';
import type { AttendanceRecord, StudentDBRecord, ConfigOption, AppConfig, ParcialConfig } from '../types';

// ─── Cache del config maestro ───────────────────────────────────
let _configCache: AppConfig | null = null;
let _configPromise: Promise<AppConfig> | null = null;

/**
 * Obtiene la configuración maestra del JSON remoto.
 * Cachea en memoria y en localStorage para funcionar offline.
 */
export const getConfig = async (): Promise<AppConfig> => {
    // Si ya está en memoria, regresar inmediatamente
    if (_configCache) return _configCache;

    // Si ya hay un fetch en curso, esperar ese mismo
    if (_configPromise) return _configPromise;

    _configPromise = (async () => {
        try {
            const res = await fetch(MASTER_CONFIG_URL);
            if (!res.ok) throw new Error("Remote config failed");

            let rawText = await res.text();
            let data: AppConfig;
            try {
                data = JSON.parse(rawText);
            } catch (parseError) {
                console.warn("Syntax error parsing remote config JSON, attempting sanitization...", parseError);
                rawText = rawText.trim().replace(/}(\s*})+$/, '}');
                data = JSON.parse(rawText);
            }

            // Decodificar PINs de Base64
            data.teacher_pin = safeAtob(data.teacher_pin);
            data.consulta_pin = safeAtob(data.consulta_pin);
            data.encoder_pin = safeAtob(data.encoder_pin);

            _configCache = data;
            localStorage.setItem('cached_master_config', JSON.stringify(data));
            return data;
        } catch (error) {
            console.warn("Using localStorage fallback for master config:", error);
            const cached = localStorage.getItem('cached_master_config');
            if (cached) {
                try {
                    const data = JSON.parse(cached) as AppConfig;
                    _configCache = data;
                    return data;
                } catch {
                    // fall through
                }
            }
            // Fallback mínimo para que la app no reviente
            return getDefaultConfig();
        } finally {
            _configPromise = null;
        }
    })();

    return _configPromise;
};

/** Decodifica Base64 de forma segura (regresa el original si falla) */
function safeAtob(encoded: string): string {
    try {
        return atob(encoded);
    } catch {
        return encoded; // Ya estaba en texto plano
    }
}

/** Config por defecto si todo falla */
function getDefaultConfig(): AppConfig {
    return {
        api_url: "",
        report_api_url: "",
        students_url: "",
        teacher_pin: "",
        consulta_pin: "",
        encoder_pin: "",
        profesores: [],
        materias: [],
        parciales: [
            { id: "1", nombre: "Parcial 1" },
            { id: "2", nombre: "Parcial 2" },
            { id: "3", nombre: "Parcial 3" }
        ]
    };
}

/** Invalida el cache (útil para forzar recarga) */
export const invalidateConfigCache = () => {
    _configCache = null;
    _configPromise = null;
};

// ─── Re-exports de interfaces para compatibilidad ───────────────
export type { ParcialConfig };

export interface ScanPayload {
    Time: Date;
    No: string;
    ID: string;
    Gr: string;
    Es: string;
    Pe: string | number;
    Pro: string;
    Ma: string;
    status?: string;
    notes?: string;
}

// ─── Funciones de datos que usan el config centralizado ─────────

export const fetchAppConfig = async (): Promise<{ profesores: ConfigOption[], materias: ConfigOption[] }> => {
    const config = await getConfig();
    return { profesores: config.profesores, materias: config.materias };
};

export const fetchParcialesConfig = async (): Promise<ParcialConfig[]> => {
    const config = await getConfig();
    return config.parciales || [
        { id: "1", nombre: "Parcial 1" },
        { id: "2", nombre: "Parcial 2" },
        { id: "3", nombre: "Parcial 3" }
    ];
};

export const fetchStudentsDB = async (): Promise<StudentDBRecord[]> => {
    const config = await getConfig();
    const studentsUrl = config.students_url;

    if (!studentsUrl) {
        console.warn("No students_url in config");
        return getCachedStudents();
    }

    try {
        const res = await fetch(studentsUrl);
        if (!res.ok) throw new Error("Remote students failed");
        const data = await res.json();
        localStorage.setItem('cached_students_db', JSON.stringify(data));
        return data;
    } catch (error) {
        console.warn("Using localStorage fallback for students:", error);
        return getCachedStudents();
    }
};

function getCachedStudents(): StudentDBRecord[] {
    const cached = localStorage.getItem('cached_students_db');
    if (cached) {
        try { return JSON.parse(cached); } catch { return []; }
    }
    return [];
}

export const sendAttendance = async (data: ScanPayload): Promise<boolean> => {
    const config = await getConfig();
    const apiUrl = config.api_url;

    if (!apiUrl) {
        console.error("No api_url configured");
        return false;
    }

    try {
        const url = new URL(apiUrl);
        const finalData: any = {
           action: 'add',
           ...data
        };
        // Mapeo duplicado para asegurar compatibilidad
        if (data.status) {
           finalData.s = data.status;
           finalData.st_reg = data.status;
        }

        const bodyParams = new URLSearchParams();
        bodyParams.append('payload', JSON.stringify(finalData));

        console.log('Sending attendance POST:', url.toString());
        const response = await fetch(url.toString(), {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded"
            },
            body: bodyParams.toString()
        });

        // Autodebug
        try {
            const respText = await response.text();
            console.log('Server response:', respText);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status} - ${respText.substring(0, 50)}`);
            }
        } catch (e) {
            console.warn("Could not read response (might be opaque on GET redirect, or CORS):", e);
        }

        return true;
    } catch (error) {
        console.error("Error sending attendance:", error);
        throw error; // Lanzar error para que AulaScan lo atrape y lo muestre
    }
};

export const insertJustifiedAbsence = async (data: {
    No: string;
    ID: string;
    Gr: string;
    Es: string;
    Pe: string | number;
    Pro: string;
    Ma: string;
    date: string;
}): Promise<boolean> => {
    const config = await getConfig();
    const apiUrl = config.api_url;

    if (!apiUrl) return false;

    try {
        const url = new URL(apiUrl);
        const finalData: any = {
            action: 'add',
            No: data.No,
            ID: data.ID,
            Gr: data.Gr,
            Es: data.Es,
            Pe: data.Pe,
            Pro: data.Pro,
            Ma: data.Ma,
            status: 'Justificado',
            s: 'Justificado',
            st_reg: 'Justificado',
            notes: 'Justificante histórico (' + data.date + ')',
            Time: data.date,
            date: data.date
        };

        const bodyParams = new URLSearchParams();
        bodyParams.append('payload', JSON.stringify(finalData));

        const response = await fetch(url.toString(), {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded"
            },
            body: bodyParams.toString()
        });

        // Intentar leer para debug
        try {
            await response.text();
        } catch (e) {}

        return true;
    } catch (error) {
        console.error("Error force inserting justified record:", error);
        throw error;
    }
};

export const updateAttendanceRecord = async (materia: string, studentId: string, date: string, status: string): Promise<boolean> => {
    const config = await getConfig();
    const reportUrl = config.report_api_url;

    if (!reportUrl) return false;

    try {
        const url = new URL(reportUrl);
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

export const deleteAttendanceRecord = async (materia: string, studentId: string, date: string): Promise<boolean> => {
    const config = await getConfig();
    const reportUrl = config.report_api_url;

    if (!reportUrl) return false;

    try {
        const url = new URL(reportUrl);
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
    const config = await getConfig();
    const reportUrl = config.report_api_url;

    if (!reportUrl) return MOCK_ATTENDANCE_DATA;

    try {
        const url = new URL(reportUrl);
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
