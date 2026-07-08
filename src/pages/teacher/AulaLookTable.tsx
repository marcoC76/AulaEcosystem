import { cn } from '../../lib/utils';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import type { ExtendedAttendanceRecord } from '../../types';

function getRiskColor(percent: number) {
    if (percent < 0.8) return 'text-theme-accent1-500 bg-theme-accent1-500/10 border-theme-accent1-500/20';
    if (percent < 0.9) return 'text-theme-warning-500 bg-theme-warning-500/10 border-theme-warning-500/20';
    return 'text-theme-accent2-500 bg-theme-accent2-500/10 border-theme-accent2-500/20';
}

function renderSortIcon(sortField: string, currentField: string, sortDir: 'asc' | 'desc') {
    if (sortField !== currentField) return <span className="material-icons-round text-sm text-theme-muted/40 ml-1">sort</span>;
    return sortDir === 'asc'
        ? <span className="material-icons-round text-sm text-theme-accent1-400 ml-1">arrow_upward</span>
        : <span className="material-icons-round text-sm text-theme-accent1-400 ml-1">arrow_downward</span>;
}

interface AulaLookTableProps {
    mode: 'group' | 'student';
    selectedGroups: string[];
    paginatedData: ExtendedAttendanceRecord[];
    activeData: ExtendedAttendanceRecord[];
    currentPage: number;
    setCurrentPage: (p: number) => void;
    totalPages: number;
    ITEMS_PER_PAGE: number;
    localSearchQuery: string;
    setLocalSearchQuery: (v: string) => void;
    filterRisk: 'all' | 'perfect' | 'risk';
    setFilterRisk: (v: 'all' | 'perfect' | 'risk') => void;
    sortField: string;
    setSortField: (v: string) => void;
    sortDir: 'asc' | 'desc';
    setSortDir: (v: 'asc' | 'desc') => void;
    setSelectedStudent: (v: ExtendedAttendanceRecord | null) => void;
    onDownloadAbsenceReport: () => void;
}

export default function AulaLookTable({
    mode, selectedGroups, paginatedData, activeData,
    currentPage, setCurrentPage, totalPages, ITEMS_PER_PAGE,
    localSearchQuery, setLocalSearchQuery,
    filterRisk, setFilterRisk,
    sortField, setSortField, sortDir, setSortDir,
    setSelectedStudent, onDownloadAbsenceReport,
}: AulaLookTableProps) {
    const handleSortClick = (field: string) => {
        if (sortField === field) {
            setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortDir('asc');
        }
    };

    const handleSortKeyDown = (e: React.KeyboardEvent, field: string) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleSortClick(field);
        }
    };

    return (
        <Card className="border-theme-border bg-theme-border/50 overflow-hidden">
            <div className="p-4 border-b border-theme-border flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                    <h2 className="text-lg font-bold">{mode === 'group' ? 'Listado de Alumnos' : 'Historial de Materias'}</h2>
                    <div className="flex gap-2 bg-theme-border/50 p-1 rounded-lg" role="radiogroup" aria-label="Filtrar por riesgo"
                        onKeyDown={(e) => {
                            const buttons = Array.from(e.currentTarget.querySelectorAll<HTMLButtonElement>('[role="radio"]'));
                            const currentIdx = buttons.findIndex(b => b === document.activeElement);
                            if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
                                e.preventDefault();
                                const next = (currentIdx + 1) % buttons.length;
                                buttons[next]?.focus();
                                buttons[next]?.click();
                            } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
                                e.preventDefault();
                                const prev = (currentIdx - 1 + buttons.length) % buttons.length;
                                buttons[prev]?.focus();
                                buttons[prev]?.click();
                            }
                        }}>
                        <button role="radio" aria-checked={filterRisk === 'all'} onClick={() => setFilterRisk('all')} className={cn("px-3 py-1.5 text-xs font-semibold rounded-md transition-colors", filterRisk === 'all' ? "bg-theme-card text-theme-text shadow-sm" : "text-theme-muted hover:text-theme-text")}>Todos</button>
                        <button role="radio" aria-checked={filterRisk === 'perfect'} onClick={() => setFilterRisk('perfect')} className={cn("px-3 py-1.5 text-xs font-semibold rounded-md transition-colors flex items-center gap-1", filterRisk === 'perfect' ? "bg-theme-accent2-500/20 text-theme-accent2-400 shadow border border-theme-accent2-500/30" : "text-theme-muted hover:text-theme-accent2-400")}><span className="material-icons-round text-[14px]" aria-hidden="true">star</span> Perfecta</button>
                        <button role="radio" aria-checked={filterRisk === 'risk'} onClick={() => setFilterRisk('risk')} className={cn("px-3 py-1.5 text-xs font-semibold rounded-md transition-colors flex items-center gap-1", filterRisk === 'risk' ? "bg-theme-accent1-500/20 text-theme-accent1-400 shadow border border-theme-accent1-500/30" : "text-theme-muted hover:text-theme-accent1-400")}><span className="material-icons-round text-[14px]" aria-hidden="true">warning</span> Riesgo</button>
                    </div>
                </div>
                <div className="flex gap-2 w-full sm:w-auto no-print">
                    <div className="relative flex-1 sm:flex-none sm:w-64">
                        <Input
                            placeholder={mode === 'group' ? "Buscar alumno..." : "Buscar materia..."}
                            aria-label={mode === 'group' ? 'Buscar alumno' : 'Buscar materia'}
                            value={localSearchQuery}
                            onChange={e => setLocalSearchQuery(e.target.value)}
                            className="h-9 pl-9 text-sm"
                        />
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 material-icons-round text-[18px] text-theme-muted" aria-hidden="true">search</span>
                    </div>
                    <Button onClick={onDownloadAbsenceReport} variant="outline" size="sm" className="min-h-[44px] h-9 gap-2 text-sm text-theme-accent1-400 hover:bg-theme-accent1-500/10 whitespace-nowrap">
                        <span className="material-icons-round text-[18px]">download</span> Faltas (CSV)
                    </Button>
                </div>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-theme-border/50 text-theme-muted text-xs uppercase tracking-wider select-none">
                            <th scope="col" tabIndex={0} role="columnheader" aria-sort={sortField === 'name' ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'} className="p-4 font-medium cursor-pointer hover:bg-white/5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-theme-accent1-500" onClick={() => handleSortClick('name')} onKeyDown={(e) => handleSortKeyDown(e, 'name')}>
                                <div className="flex items-center">
                                    {mode === 'group' ? 'Alumno' : 'Materia'}
                                    {renderSortIcon(sortField, 'name', sortDir)}
                                </div>
                            </th>
                            <th scope="col" tabIndex={0} role="columnheader" aria-sort={sortField === 'control' ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'} className="p-4 font-medium cursor-pointer hover:bg-white/5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-theme-accent1-500" onClick={() => handleSortClick('control')} onKeyDown={(e) => handleSortKeyDown(e, 'control')}>
                                <div className="flex items-center">
                                    {mode === 'group' ? 'Control' : 'Profesor'}
                                    {renderSortIcon(sortField, 'control', sortDir)}
                                </div>
                            </th>
                            <th scope="col" tabIndex={0} role="columnheader" aria-sort={sortField === 'classes' ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'} className="p-4 font-medium cursor-pointer hover:bg-white/5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-theme-accent1-500" onClick={() => handleSortClick('classes')} onKeyDown={(e) => handleSortKeyDown(e, 'classes')}>
                                <div className="flex items-center">
                                    Clases
                                    {renderSortIcon(sortField, 'classes', sortDir)}
                                </div>
                            </th>
                            <th scope="col" tabIndex={0} role="columnheader" aria-sort={sortField === 'percentage' ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'} className="p-4 font-medium cursor-pointer hover:bg-white/5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-theme-accent1-500" onClick={() => handleSortClick('percentage')} onKeyDown={(e) => handleSortKeyDown(e, 'percentage')}>
                                <div className="flex items-center">
                                    Progreso
                                    {renderSortIcon(sortField, 'percentage', sortDir)}
                                </div>
                            </th>
                            <th scope="col" className="p-4 font-medium text-right">Estatus</th>
                        </tr>
                    </thead>
                    <tbody className="text-sm divide-y divide-white/5">
                        {paginatedData.map((item, i) => (
                            <tr key={i} tabIndex={0} className="hover:bg-theme-border/50 transition-colors cursor-pointer group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-theme-accent1-500" onClick={() => setSelectedStudent(item)} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelectedStudent(item); } }}>
                                <td className="p-4 text-theme-text font-medium group-hover:text-theme-accent1-400 transition-colors">
                                    <div className="flex items-center gap-2">
                                        {mode === 'group' ? item['Nombre del Alumno'] : item.Materia}
                                        {mode === 'group' && selectedGroups.length > 1 && (
                                            <span className="text-[10px] bg-theme-border text-theme-text px-2 py-0.5 rounded font-bold">
                                                {item.Grupo}
                                            </span>
                                        )}
                                        {item.rachaFaltas && item.rachaFaltas >= 2 ? (
                                            <span className="relative group/tooltip inline-block">
                                                <span className={cn("text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full border shadow-sm flex items-center gap-1 whitespace-nowrap", item.rachaFaltas >= 3 ? "bg-theme-accent1-500/20 text-theme-accent1-500 border-theme-accent1-500/30" : "bg-theme-warning-500/20 text-theme-warning-500 border-theme-warning-500/30")}>
                                                    <span className="material-icons-round text-[12px]">warning</span>
                                                    {item.rachaFaltas} Faltas
                                                </span>
                                                <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover/tooltip:block group-focus-within/tooltip:block bg-theme-card text-theme-text text-xs rounded-lg p-2 whitespace-normal w-48 shadow-xl border border-theme-border z-50 text-center transition-all duration-300">
                                                    Este alumno tiene {item.rachaFaltas} faltas consecutivas al final del periodo.
                                                    <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900"></span>
                                                </span>
                                            </span>
                                        ) : null}
                                    </div>
                                </td>
                                <td className="p-4 text-theme-muted font-mono text-xs">
                                    {mode === 'group' ? item['Número de Control'] : item.Profesor}
                                </td>
                                <td className="p-4 text-theme-text">{item.Asistencias} / {item['Total de Clases']}</td>
                                <td className="p-4 w-48">
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs font-semibold w-8">{Math.round(item.Porcentaje * 100)}%</span>
                                        <div className="h-2 w-full bg-theme-border rounded-full overflow-hidden">
                                            <div className={cn("h-full transition-all duration-500", item.Porcentaje < 0.8 ? "bg-theme-accent1-500" : item.Porcentaje < 0.9 ? "bg-theme-warning-500" : "bg-theme-accent2-500")} style={{ width: `${item.Porcentaje * 100}%` }} />
                                        </div>
                                    </div>
                                </td>
                                <td className="p-4 text-right">
                                    <span className={cn("px-2.5 py-1 rounded-full text-xs font-semibold border", getRiskColor(item.Porcentaje))}>
                                        {item.Porcentaje < 0.8 ? 'Riesgo' : item.Porcentaje < 0.9 ? 'Regular' : 'Excelente'}
                                    </span>
                                </td>
                            </tr>
                        ))}
                        {paginatedData.length === 0 && (
                            <tr>
                                <td colSpan={5} className="p-8 text-center text-theme-muted/80 italic">No hay datos disponibles para estos filtros.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
            {totalPages > 1 && (
                <div className="p-4 border-t border-theme-border flex items-center justify-between text-sm no-print">
                    <span className="text-theme-muted">
                        Mostrando {((currentPage - 1) * ITEMS_PER_PAGE) + 1} - {Math.min(currentPage * ITEMS_PER_PAGE, activeData.length)} de {activeData.length} alumnos
                    </span>
                    <div className="flex gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            disabled={currentPage === 1}
                            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                            className="h-8"
                        >
                            Anterior
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            disabled={currentPage === totalPages}
                            onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                            className="h-8"
                        >
                            Siguiente
                        </Button>
                    </div>
                </div>
            )}
        </Card>
    );
}
