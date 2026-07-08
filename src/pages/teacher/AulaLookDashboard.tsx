import { cn } from '../../lib/utils';
import { Card } from '../../components/ui/Card';
import { Select } from '../../components/ui/Select';
import { Button } from '../../components/ui/Button';
import type { ExtendedAttendanceRecord, ParcialConfig } from '../../types';
import type { StudentSearchResult } from '../../lib/search';

interface AulaLookDashboardProps {
    mode: 'group' | 'student';
    selectedTeacher: string;
    selectedSubject: string;
    selectedGroups: string[];
    selectedSearchStudent: StudentSearchResult | null;
    parciales: ParcialConfig[];
    selectedPeriod: string;
    onPeriodChange: (period: string) => void;
    onBackToFilters: () => void;
    onDownloadReport: () => void;
    onExportPDF: () => void;
    onExportSabanaPDF?: () => void;
    criticalStudents: ExtendedAttendanceRecord[];
    showCriticalAlert: boolean;
    onDismissCriticalAlert: () => void;
    totalItems: number;
    totalAsistencias: number;
    avgAttendance: number;
    atRisk: number;
    isEmpty: boolean;
    isLoading: boolean;
}

export default function AulaLookDashboard({
    mode, selectedTeacher, selectedSubject, selectedGroups, selectedSearchStudent,
    parciales, selectedPeriod, onPeriodChange,
    onBackToFilters, onDownloadReport, onExportPDF, onExportSabanaPDF,
    criticalStudents, showCriticalAlert, onDismissCriticalAlert,
    totalItems, totalAsistencias, avgAttendance, atRisk, isEmpty, isLoading,
}: AulaLookDashboardProps) {
    const kpis = [
        {
            title: mode === 'group' ? "Alumnos en Grupo" : "Materias Cursadas",
            value: totalItems,
            subtitle: mode === 'group' ? 'Registrados' : 'En kárdex',
            icon: mode === 'group' ? "groups" : "auto_stories",
            color: "text-theme-accent1-400",
            bg: "bg-theme-accent1-400/10"
        },
        {
            title: "Asistencias (Suma)",
            value: totalAsistencias,
            subtitle: "Acumulado global",
            icon: "fact_check",
            color: "text-theme-accent2-400",
            bg: "bg-theme-accent2-400/10"
        },
        {
            title: "Índice de Asistencia",
            value: `${(avgAttendance * 100).toFixed(1)}%`,
            subtitle: "Promedio del grupo",
            icon: "timeline",
            color: "text-theme-accent2-400",
            bg: "bg-theme-accent2-400/10"
        },
        {
            title: "Foco Rojo (<80%)",
            value: atRisk,
            subtitle: mode === 'group' ? "Alumnos clave" : "Materias de alerta",
            icon: "warning",
            color: "text-theme-accent1-400",
            bg: "bg-theme-accent1-400/10"
        }
    ];

    return (
        <>
            {/* Dashboard Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-theme-card/80 backdrop-blur-xl p-4 sm:p-6 rounded-3xl border border-theme-border shadow-md">
                <div>
                    <h1 className="text-2xl font-bold text-theme-text mb-1">
                        {mode === 'group' ? 'Reporte de Asistencia' : 'Kárdex de Asistencia (Alumno)'}
                    </h1>
                    <p className="text-theme-muted text-sm">
                        {mode === 'group'
                            ? `${selectedTeacher} • ${selectedSubject} • ${selectedGroups.join(', ')}`
                            : `${selectedSearchStudent?.nombre} • Control: ${selectedSearchStudent?.control}`
                        }
                        {parciales.length > 0 && ` • ${parciales.find(p => p.id === selectedPeriod)?.nombre || ''}`}
                    </p>
                </div>
                <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto no-print">
                    {parciales.length > 0 && (
                        <Select
                            value={selectedPeriod}
                            onChange={e => onPeriodChange(e.target.value)}
                            className="h-10 text-sm w-36 bg-theme-border/50 text-theme-text border-theme-border"
                        >
                            {parciales.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                        </Select>
                    )}
                    <Button variant="outline" onClick={onBackToFilters} className="flex-1 sm:flex-none min-h-[44px]">
                        <span className="material-icons-round text-sm mr-1">tune</span> Filtros
                    </Button>
                    <Button onClick={onDownloadReport} className="flex-1 sm:flex-none bg-theme-accent2-600 hover:bg-theme-accent2-700 min-h-[44px]">
                        <span className="material-icons-round text-sm mr-1">download</span> CSV
                    </Button>
                    <Button onClick={onExportPDF} className="flex-1 sm:flex-none bg-theme-accent1-600 hover:bg-theme-accent1-700 min-h-[44px]">
                        <span className="material-icons-round text-sm mr-1">picture_as_pdf</span> PDF
                    </Button>
                    {mode === 'group' && onExportSabanaPDF && (
                        <Button onClick={onExportSabanaPDF} className="flex-1 sm:flex-none bg-theme-accent2-600 hover:bg-theme-accent2-500 min-h-[44px] text-white font-medium">
                            <span className="material-icons-round text-sm mr-1">grid_on</span> Sábana PDF
                        </Button>
                    )}
                </div>
            </div>

            {/* Critical Absences Banner */}
            {criticalStudents.length > 0 && showCriticalAlert && (
                <div className="bg-theme-accent1-500/10 border border-theme-accent1-500/20 text-theme-accent1-400 p-4 rounded-3xl flex items-center justify-between gap-4 shadow-lg animate-fade-in no-print" role="alert">
                    <div className="flex items-center gap-3">
                        <span className="material-icons-round text-theme-accent1-500 text-2xl animate-pulse" aria-hidden="true">error_outline</span>
                        <div>
                            <h2 className="font-bold text-sm">Alumnos en Riesgo Crítico</h2>
                            <p className="text-xs text-theme-accent1-400/80">
                                {criticalStudents.length === 1
                                    ? `El alumno ${criticalStudents[0]['Nombre del Alumno']} tiene una racha de ${criticalStudents[0].rachaFaltas} faltas consecutivas.`
                                    : `${criticalStudents.length} alumnos tienen una racha de 3 o más faltas consecutivas al final del periodo.`
                                }
                            </p>
                        </div>
                    </div>
                    <button onClick={onDismissCriticalAlert} className="text-theme-accent1-400 hover:brightness-110" aria-label="Cerrar alerta">
                        <span className="material-icons-round text-lg" aria-hidden="true">close</span>
                    </button>
                </div>
            )}

            {isLoading && (
                <div className="h-64 flex flex-col items-center justify-center text-theme-accent1-500" role="status" aria-live="polite">
                    <span className="animate-spin material-icons-round text-5xl mb-4" aria-hidden="true">settings</span>
                    <p className="font-medium animate-pulse">Procesando Analytics desde Base de Datos...</p>
                </div>
            )}

            {!isLoading && (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-2">
                    {kpis.map((kpi, i) => (
                        <Card key={i} className="border-none bg-gradient-to-br from-theme-card to-theme-border/20 shadow-lg p-5 flex flex-col justify-between relative overflow-hidden group">
                            <div className="flex justify-between items-start mb-4">
                                <div className={cn("p-2.5 sm:p-3 rounded-2xl shadow-inner backdrop-blur-sm", kpi.bg, kpi.color)}>
                                    <span className="material-icons-round text-2xl sm:text-3xl">{kpi.icon}</span>
                                </div>
                                <span className={cn("text-3xl sm:text-4xl font-black tracking-tight", kpi.color)}>{kpi.value}</span>
                            </div>
                            <div className="z-10 mt-2">
                                <p className="text-xs sm:text-sm text-theme-text font-bold uppercase tracking-wider mb-1 line-clamp-1">{kpi.title}</p>
                                <p className="text-[10px] sm:text-xs text-theme-muted font-medium uppercase">{kpi.subtitle}</p>
                            </div>
                            <div className={cn("absolute -bottom-6 -right-6 opacity-5 transform group-hover:scale-110 transition-transform duration-500", kpi.color)}>
                                <span className="material-icons-round text-[100px]">{kpi.icon}</span>
                            </div>
                        </Card>
                    ))}
                </div>
            )}

            {/* Empty state */}
            {!isLoading && isEmpty && (
                <Card className="border-theme-border bg-theme-border/20 p-12 text-center flex flex-col items-center justify-center max-w-xl mx-auto my-12">
                    <div className="p-4 rounded-full bg-theme-border/30 text-theme-muted mb-4">
                        <span className="material-icons-round text-5xl">analytics</span>
                    </div>
                    <h2 className="text-xl font-bold text-theme-text mb-2">Sin Datos Disponibles</h2>
                    <p className="text-theme-muted text-sm max-w-md">
                        No se encontraron registros de asistencia para el período o filtros seleccionados. Intenta cambiar de período o ajustar la búsqueda.
                    </p>
                </Card>
            )}
        </>
    );
}
