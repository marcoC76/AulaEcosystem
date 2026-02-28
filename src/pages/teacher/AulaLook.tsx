import { useState, useEffect } from 'react';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
    BarChart, Bar, Cell
} from 'recharts';
import { fetchAppConfig, fetchReportData, updateAttendanceRecord, deleteAttendanceRecord } from '../../lib/dataService';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Select } from '../../components/ui/Select';
import { Stepper } from '../../components/ui/Stepper';
import { Modal } from '../../components/ui/Modal';
import { cn } from '../../lib/utils';
import type { ConfigOption, AttendanceRecord } from '../../types';

export default function AulaLook() {
    const [config, setConfig] = useState<{ profesores: ConfigOption[], materias: ConfigOption[] }>({ profesores: [], materias: [] });

    // Wizard State
    const [step, setStep] = useState(0);
    const [selectedTeacher, setSelectedTeacher] = useState('');
    const [selectedSubject, setSelectedSubject] = useState('');
    const [selectedGroup, setSelectedGroup] = useState('');

    // Data State
    const [data, setData] = useState<AttendanceRecord[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [selectedStudent, setSelectedStudent] = useState<AttendanceRecord | null>(null);
    const [modalView, setModalView] = useState<'list' | 'sheet'>('list');

    const groups = ['2A', '2B', '2E', '4A', '4B']; // Mock groups derived from DB

    useEffect(() => {
        fetchAppConfig().then(setConfig);
    }, []);

    const handleNext = async () => {
        if (step === 0 && !selectedTeacher) return;
        if (step === 1 && !selectedSubject) return;
        if (step === 2 && !selectedGroup) return;

        if (step === 2) {
            // Transitioning to Results
            setIsLoading(true);
            setStep(3);
            const res = await fetchReportData({ teacher: selectedTeacher, subject: selectedSubject, group: selectedGroup });
            setData(res);
            setIsLoading(false);
        } else {
            setStep(s => s + 1);
        }
    };

    const handleBack = () => setStep(s => Math.max(0, s - 1));

    const downloadReport = () => {
        const headers = ['Control', 'Nombre', 'Clases Totales', 'Asistencias', 'Porcentaje'];
        const rows = data.map(d => [d['Número de Control'], d['Nombre del Alumno'], d['Total de Clases'], d['Asistencias'], `${(d.Porcentaje * 100).toFixed(0)}%`]);
        const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement('a');
        link.href = encodedUri;
        link.download = `Reporte_${selectedGroup}_${selectedSubject.substring(0, 10)}.csv`;
        document.body.appendChild(link);
        link.click();
        link.remove();
    };

    // --- Derived Metrics ---
    const totalStudents = data.length;
    const avgAttendance = totalStudents ? data.reduce((acc, curr) => acc + curr.Porcentaje, 0) / totalStudents : 0;
    const atRisk = data.filter(d => d.Porcentaje < 0.8).length;
    const perfect = data.filter(d => d.Porcentaje === 1.0).length;

    const statusData = [
        { name: 'Riesgo (<80%)', value: atRisk, color: '#ef4444' }, // red-500
        { name: 'Regular', value: totalStudents - atRisk - perfect, color: '#eab308' }, // yellow-500
        { name: 'Perfecta', value: perfect, color: '#10b981' } // emerald-500
    ];

    // Mock line chart data building
    const timelineData = [
        { name: 'Lun', asistencias: Math.floor(totalStudents * 0.9) },
        { name: 'Mar', asistencias: Math.floor(totalStudents * 0.85) },
        { name: 'Mié', asistencias: Math.floor(totalStudents * 0.95) },
        { name: 'Jue', asistencias: Math.floor(totalStudents * 0.8) },
        { name: 'Vie', asistencias: Math.floor(totalStudents * 1.0) }
    ];

    // Rendering Helper
    const getRiskColor = (percent: number) => {
        if (percent < 0.8) return 'text-red-500 bg-red-500/10 border-red-500/20';
        if (percent < 0.9) return 'text-yellow-500 bg-yellow-500/10 border-yellow-500/20';
        return 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20';
    };

    // Wizard Views
    const WizardContent = () => (
        <Card className="max-w-xl mx-auto border-gray-700 shadow-2xl p-6 sm:p-8 mt-12 animate-fade-in-up">
            <div className="mb-8">
                <Stepper steps={['Profesor', 'Materia', 'Grupo', 'Resultados']} currentStep={step} />
            </div>

            <div className="min-h-[200px] flex flex-col justify-center">
                {step === 0 && (
                    <div className="space-y-4 animate-fade-in">
                        <h3 className="text-xl font-bold text-center mb-6">Selecciona el Profesor</h3>
                        <Select value={selectedTeacher} onChange={e => setSelectedTeacher(e.target.value)} className="h-12 text-lg">
                            <option value="">-- Elige un profesor --</option>
                            {config.profesores.map(p => <option key={p.value} value={p.text}>{p.text}</option>)}
                        </Select>
                    </div>
                )}
                {step === 1 && (
                    <div className="space-y-4 animate-fade-in">
                        <h3 className="text-xl font-bold text-center mb-6">Selecciona la Materia</h3>
                        <Select value={selectedSubject} onChange={e => setSelectedSubject(e.target.value)} className="h-12 text-lg">
                            <option value="">-- Elige una materia --</option>
                            {config.materias.map(m => <option key={m.value} value={m.text}>{m.text}</option>)}
                        </Select>
                    </div>
                )}
                {step === 2 && (
                    <div className="space-y-4 animate-fade-in">
                        <h3 className="text-xl font-bold text-center mb-6">Selecciona el Grupo</h3>
                        <Select value={selectedGroup} onChange={e => setSelectedGroup(e.target.value)} className="h-12 text-lg">
                            <option value="">-- Elige un grupo --</option>
                            {groups.map(g => <option key={g} value={g}>{g}</option>)}
                        </Select>
                    </div>
                )}
            </div>

            <div className="flex justify-between mt-8 pt-6 border-t border-gray-800">
                <Button variant="ghost" onClick={handleBack} disabled={step === 0} className="w-24">
                    Atrás
                </Button>
                <Button onClick={handleNext} className="w-32 bg-blue-600 hover:bg-blue-700">
                    {step === 2 ? 'Generar' : 'Siguiente'}
                </Button>
            </div>
        </Card>
    );

    return (
        <div className="p-4 sm:p-6 pb-24 min-h-screen bg-gray-900">
            {step < 3 ? (
                <WizardContent />
            ) : (
                <div className="space-y-6 max-w-7xl mx-auto animate-fade-in">
                    {/* Dashboard Header */}
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-gray-850 p-4 sm:p-6 rounded-2xl border border-gray-800 shadow-md">
                        <div>
                            <h1 className="text-2xl font-bold text-white mb-1">Reporte de Asistencia</h1>
                            <p className="text-gray-400 text-sm">
                                {selectedTeacher} &bull; {selectedSubject} &bull; {selectedGroup}
                            </p>
                        </div>
                        <div className="flex gap-2 w-full sm:w-auto">
                            <Button variant="outline" onClick={() => setStep(0)} className="flex-1 sm:flex-none">
                                <span className="material-icons-round text-sm mr-1">tune</span> Filtros
                            </Button>
                            <Button onClick={downloadReport} className="flex-1 sm:flex-none bg-emerald-600 hover:bg-emerald-700">
                                <span className="material-icons-round text-sm mr-1">download</span> Exportar
                            </Button>
                        </div>
                    </div>

                    {isLoading ? (
                        <div className="h-64 flex flex-col items-center justify-center text-blue-500">
                            <span className="animate-spin material-icons-round text-5xl mb-4">settings</span>
                            <p className="font-medium animate-pulse">Procesando Analytics...</p>
                        </div>
                    ) : (
                        <>
                            {/* KPIs */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                {[
                                    { title: "Total Alumnos", value: totalStudents, icon: "groups", color: "text-blue-400" },
                                    { title: "Asistencia Promedio", value: `${(avgAttendance * 100).toFixed(1)}%`, icon: "timeline", color: "text-emerald-400" },
                                    { title: "En Riesgo (<80%)", value: atRisk, icon: "warning", color: "text-red-400" },
                                    { title: "Asistencia Perfecta", value: perfect, icon: "workspace_premium", color: "text-yellow-400" }
                                ].map((kpi, i) => (
                                    <Card key={i} className="border-gray-800 bg-gray-850 p-4 flex items-center gap-4">
                                        <div className={cn("p-3 rounded-xl bg-gray-900 shadow-inner border border-gray-800", kpi.color)}>
                                            <span className="material-icons-round text-2xl">{kpi.icon}</span>
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold">{kpi.title}</p>
                                            <p className="text-xl font-bold text-white">{kpi.value}</p>
                                        </div>
                                    </Card>
                                ))}
                            </div>

                            {/* Charts */}
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                <Card className="lg:col-span-2 border-gray-800 bg-gray-850 p-6">
                                    <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
                                        <span className="material-icons-round text-blue-400">insights</span>
                                        Tendencia de Asistencia
                                    </h3>
                                    <div className="h-[250px] w-full">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <LineChart data={timelineData}>
                                                <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
                                                <XAxis dataKey="name" stroke="#9ca3af" tick={{ fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                                                <YAxis stroke="#9ca3af" tick={{ fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                                                <RechartsTooltip
                                                    contentStyle={{ backgroundColor: '#1f2937', borderColor: '#374151', borderRadius: '8px', color: '#fff' }}
                                                    itemStyle={{ color: '#60a5fa' }}
                                                />
                                                <Line type="monotone" dataKey="asistencias" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4, fill: '#3b82f6' }} activeDot={{ r: 6 }} />
                                            </LineChart>
                                        </ResponsiveContainer>
                                    </div>
                                </Card>
                                <Card className="border-gray-800 bg-gray-850 p-6">
                                    <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
                                        <span className="material-icons-round text-emerald-400">pie_chart</span>
                                        Distribución de Estatus
                                    </h3>
                                    <div className="h-[250px] w-full mt-4">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={statusData} layout="vertical" margin={{ top: 0, right: 30, left: 40, bottom: 0 }}>
                                                <CartesianGrid strokeDasharray="3 3" stroke="#374151" horizontal={false} />
                                                <XAxis type="number" hide />
                                                <YAxis dataKey="name" type="category" stroke="#9ca3af" axisLine={false} tickLine={false} />
                                                <RechartsTooltip
                                                    cursor={{ fill: '#374151', opacity: 0.4 }}
                                                    contentStyle={{ backgroundColor: '#1f2937', borderColor: '#374151', borderRadius: '8px', color: '#fff' }}
                                                />
                                                <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={20}>
                                                    {statusData.map((entry, index) => (
                                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                                    ))}
                                                </Bar>
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                </Card>
                            </div>

                            {/* Data Table */}
                            <Card className="border-gray-800 bg-gray-850 overflow-hidden">
                                <div className="p-4 border-b border-gray-800 flex justify-between items-center">
                                    <h3 className="text-lg font-bold">Listado de Alumnos</h3>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left border-collapse">
                                        <thead>
                                            <tr className="bg-gray-900/50 text-gray-400 text-xs uppercase tracking-wider">
                                                <th className="p-4 font-medium">Alumno</th>
                                                <th className="p-4 font-medium">Control</th>
                                                <th className="p-4 font-medium">Clases</th>
                                                <th className="p-4 font-medium">Progreso</th>
                                                <th className="p-4 font-medium text-right">Estatus</th>
                                            </tr>
                                        </thead>
                                        <tbody className="text-sm divide-y divide-gray-800">
                                            {data.map((student, i) => (
                                                <tr
                                                    key={i}
                                                    className="hover:bg-gray-800 transition-colors cursor-pointer group"
                                                    onClick={() => setSelectedStudent(student)}
                                                >
                                                    <td className="p-4 text-white font-medium group-hover:text-blue-400 transition-colors">
                                                        {student['Nombre del Alumno']}
                                                    </td>
                                                    <td className="p-4 text-gray-400 font-mono text-xs">{student['Número de Control']}</td>
                                                    <td className="p-4 text-gray-300">{student.Asistencias} / {student['Total de Clases']}</td>
                                                    <td className="p-4 w-48">
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-xs font-semibold w-8">{Math.round(student.Porcentaje * 100)}%</span>
                                                            <div className="h-2 w-full bg-gray-700 rounded-full overflow-hidden">
                                                                <div
                                                                    className={cn("h-full transition-all duration-500", student.Porcentaje < 0.8 ? "bg-red-500" : student.Porcentaje < 0.9 ? "bg-yellow-500" : "bg-emerald-500")}
                                                                    style={{ width: `${student.Porcentaje * 100}%` }}
                                                                />
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="p-4 text-right">
                                                        <span className={cn("px-2.5 py-1 rounded-full text-xs font-semibold border", getRiskColor(student.Porcentaje))}>
                                                            {student.Porcentaje < 0.8 ? 'Riesgo' : student.Porcentaje < 0.9 ? 'Regular' : 'Excelente'}
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))}
                                            {data.length === 0 && (
                                                <tr>
                                                    <td colSpan={5} className="p-8 text-center text-gray-500 italic">No hay datos disponibles para estos filtros.</td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </Card>
                        </>
                    )}

                    {/* Student Detailed Modal */}
                    <Modal
                        isOpen={!!selectedStudent}
                        onClose={() => setSelectedStudent(null)}
                        title={selectedStudent ? selectedStudent['Nombre del Alumno'] : 'Detalles'}
                        fullScreenOnMobile
                    >
                        {selectedStudent && (
                            <div className="space-y-6">
                                <div className="flex gap-2 p-1 bg-gray-800 rounded-lg">
                                    <button
                                        className={cn("flex-1 py-1.5 text-sm font-medium rounded-md transition-colors", modalView === 'list' ? "bg-gray-700 text-white shadow" : "text-gray-400")}
                                        onClick={() => setModalView('list')}
                                    >
                                        Lista Histórica
                                    </button>
                                    <button
                                        className={cn("flex-1 py-1.5 text-sm font-medium rounded-md transition-colors", modalView === 'sheet' ? "bg-gray-700 text-white shadow" : "text-gray-400")}
                                        onClick={() => setModalView('sheet')}
                                    >
                                        Vista Mes (Hoja)
                                    </button>
                                </div>

                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 bg-gray-850 rounded-xl border border-gray-800">
                                    <div>
                                        <span className="text-xs text-gray-500 uppercase">Control</span>
                                        <p className="font-mono text-sm">{selectedStudent['Número de Control']}</p>
                                    </div>
                                    <div>
                                        <span className="text-xs text-gray-500 uppercase">Asistencias</span>
                                        <p className="font-bold text-lg">{selectedStudent.Asistencias} <span className="text-sm font-normal text-gray-400">/ {selectedStudent['Total de Clases']}</span></p>
                                    </div>
                                    <div>
                                        <span className="text-xs text-gray-500 uppercase">Promedio</span>
                                        <p className={cn("font-bold text-lg", selectedStudent.Porcentaje < 0.8 ? "text-red-400" : "text-emerald-400")}>{(selectedStudent.Porcentaje * 100).toFixed(0)}%</p>
                                    </div>
                                </div>

                                {modalView === 'list' ? (
                                    <div className="space-y-3 mt-4 max-h-[40vh] overflow-y-auto">
                                        <p className="font-medium mb-2 border-b border-gray-800 pb-2">Registro Cronológico</p>
                                        {/* Parse JSON string array of dates as specified */}
                                        {(() => {
                                            try {
                                                const dates = JSON.parse(selectedStudent['Fechas y Horas de Asistencia'] || '[]');
                                                if (!Array.isArray(dates) || dates.length === 0) return <p className="text-gray-500 text-sm">Sin registros.</p>;

                                                const handleJustify = async (dateStr: string) => {
                                                    if (!confirm('¿Marcar esta falta como Justificada?')) return;
                                                    const success = await updateAttendanceRecord(selectedSubject, selectedStudent['Número de Control'], dateStr, 'Justificado');
                                                    if (success) {
                                                        alert('Registro actualizado correctamente.');
                                                        // Update local data state optimistically
                                                        setData(prev => prev.map(s => {
                                                            if (s['Número de Control'] === selectedStudent['Número de Control']) {
                                                                // In a real app we'd fetch fresh data, or update this student's count
                                                                return { ...s, status: 'Justificado' };
                                                            }
                                                            return s;
                                                        }));
                                                    } else {
                                                        alert('Error al actualizar registro en el servidor.');
                                                    }
                                                };

                                                const handleDelete = async (dateStr: string) => {
                                                    if (!confirm('¿Estás seguro de ELIMINAR permanentemente esta asistencia?')) return;
                                                    const success = await deleteAttendanceRecord(selectedSubject, selectedStudent['Número de Control'], dateStr);
                                                    if (success) {
                                                        alert('Registro eliminado.');
                                                        // Update local view
                                                        setSelectedStudent(null);
                                                        // Trigger a re-fetch since stats changed
                                                        fetchReportData({ subject: selectedSubject, teacher: selectedTeacher, group: selectedGroup }).then(setData);
                                                    }
                                                };

                                                return dates.map((d: string, i: number) => {
                                                    const date = new Date(d);
                                                    return (
                                                        <div key={i} className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-3 bg-gray-800 rounded-lg border border-gray-700 gap-3">
                                                            <div className="flex flex-col">
                                                                <span className="text-gray-200 font-medium">{date.toLocaleDateString('es-MX', { weekday: 'long', day: '2-digit', month: 'long' })}</span>
                                                                <span className="text-xs text-gray-500 font-mono">{date.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}</span>
                                                            </div>
                                                            <div className="flex gap-2 w-full sm:w-auto">
                                                                <Button
                                                                    variant="outline"
                                                                    size="sm"
                                                                    className="h-8 text-xs py-0 flex-1 sm:flex-none border-yellow-500/50 text-yellow-500 hover:bg-yellow-500/10"
                                                                    onClick={() => handleJustify(d)}
                                                                >
                                                                    Justificar
                                                                </Button>
                                                                <Button
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    className="h-8 text-xs py-0 flex-1 sm:flex-none text-red-400 hover:bg-red-400/10"
                                                                    onClick={() => handleDelete(d)}
                                                                >
                                                                    Eliminar
                                                                </Button>
                                                            </div>
                                                        </div>
                                                    )
                                                });
                                            } catch (e) {
                                                return <p className="text-gray-500 text-sm">Error cargando fechas.</p>
                                            }
                                        })()}
                                    </div>
                                ) : (
                                    <div className="overflow-x-auto mt-4 p-4 bg-gray-800 rounded-xl max-h-[40vh]">
                                        <p className="font-medium mb-4">Vista Tabular Mensual</p>
                                        {/* Simplified representation for sheet view */}
                                        <div className="grid grid-cols-[auto_1fr] gap-4">
                                            <div className="font-medium text-gray-400 rotate-180" style={{ writingMode: 'vertical-rl' }}>Febrero 2026</div>
                                            <div className="flex gap-2 flex-wrap">
                                                {Array.from({ length: 28 }).map((_, i) => (
                                                    <div key={i} className="w-8 h-8 rounded-md flex items-center justify-center text-xs font-mono bg-gray-900 border border-gray-700">
                                                        {i + 1}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </Modal>

                </div>
            )}
        </div>
    );
}
