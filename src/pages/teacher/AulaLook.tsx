import { useState, useEffect } from 'react';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
    BarChart, Bar, Cell
} from 'recharts';
import { fetchAppConfig, fetchReportData, fetchStudentsDB, deleteAttendanceRecord, insertJustifiedAbsence } from '../../lib/dataService';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Select } from '../../components/ui/Select';
import { Stepper } from '../../components/ui/Stepper';
import { Modal } from '../../components/ui/Modal';
import { cn } from '../../lib/utils';
import type { ConfigOption, AttendanceRecord } from '../../types';

type ExtendedAttendanceRecord = AttendanceRecord & { faltasCalculadas?: string[] };

export default function AulaLook({ role = 'teacher' }: { role?: 'teacher' | 'consulta' }) {
    const [config, setConfig] = useState<{ profesores: ConfigOption[], materias: ConfigOption[] }>({ profesores: [], materias: [] });

    // Wizard State
    const [step, setStep] = useState(0);
    const [selectedTeacher, setSelectedTeacher] = useState('');
    const [selectedSubject, setSelectedSubject] = useState('');
    const [selectedGroup, setSelectedGroup] = useState('');

    // Data State
    const [data, setData] = useState<ExtendedAttendanceRecord[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [selectedStudent, setSelectedStudent] = useState<ExtendedAttendanceRecord | null>(null);
    const [modalView, setModalView] = useState<'list' | 'sheet'>('list');

    const [availableGroups, setAvailableGroups] = useState<string[]>([]);
    const [studentsDB, setStudentsDB] = useState<any[]>([]);

    useEffect(() => {
        fetchAppConfig().then(setConfig);
        fetchStudentsDB().then(students => {
            setStudentsDB(students);
            const uniqueGroups = Array.from(new Set(students.map(s => {
                const sObj = s as any;
                const careerKey = Object.keys(sObj).find(k => k.toLowerCase().includes('carrera') || k.toLowerCase().includes('especialidad'));
                const specialty = careerKey && sObj[careerKey] ? String(sObj[careerKey]).trim() : '';
                return specialty ? `${s.Grupo} - ${specialty}` : String(s.Grupo);
            }))).filter(Boolean).sort();
            setAvailableGroups(uniqueGroups);
        });
    }, []);

    const loadGroupData = async () => {
        setIsLoading(true);
        const [rawGroup, ...specParts] = selectedGroup.split(' - ');
        const baseGroup = rawGroup.trim();
        const specialtyFilter = specParts.join(' - ').trim();

        const res = await fetchReportData({ teacher: selectedTeacher, subject: selectedSubject, group: baseGroup });

        // FILTER Server Results by Specialty FIRST
        const filteredRes = res.filter(r => {
            if (!specialtyFilter) return true;
            return String(r.Especialidad || '').trim() === specialtyFilter;
        });

        // 1. Find maxAsistencias and master student from server response
        let maxAsistencias = 0;
        let masterStudent: AttendanceRecord | null = null;
        filteredRes.forEach(d => {
            const asis = Number(d.Asistencias);
            if (asis > maxAsistencias) {
                maxAsistencias = asis;
                masterStudent = d;
            }
        });

        // 1.5. Prepare complete group list
        const groupStudents = studentsDB.filter(s => {
            if (String(s.Grupo).trim() !== baseGroup) return false;
            if (!specialtyFilter) return true;
            const sObj = s as any;
            const careerKey = Object.keys(sObj).find(k => k.toLowerCase().includes('carrera') || k.toLowerCase().includes('especialidad'));
            return careerKey && String(sObj[careerKey]).trim() === specialtyFilter;
        });
        const mergedRes: AttendanceRecord[] = [];

        groupStudents.forEach(gs => {
            // Find matching student in server response
            const serverRecord = filteredRes.find(r => {
                const rControl = String(r['Número de Control']).trim();
                const sControlKey = Object.keys(gs).find(k => k.toLowerCase().includes('control'));
                const sControl = sControlKey ? String(gs[sControlKey]).trim() : '';
                return rControl === sControl;
            });

            if (serverRecord) {
                mergedRes.push(serverRecord);
            } else {
                // Create empty dummy record
                const nameKey = Object.keys(gs).find(k => k.toLowerCase().includes('nombre')) || 'Nombre(s)';
                const patKey = Object.keys(gs).find(k => k.toLowerCase().includes('paterno')) || 'Apellido Paterno';
                const matKey = Object.keys(gs).find(k => k.toLowerCase().includes('materno')) || 'Apellido Materno';
                const careerKey = Object.keys(gs).find(k => k.toLowerCase().includes('carrera') || k.toLowerCase().includes('especialidad')) || 'Carrera';
                const sControlKey = Object.keys(gs).find(k => k.toLowerCase().includes('control'));

                const rawName = String(gs[nameKey] || '').trim();
                const rawPat = String(gs[patKey] || '').trim();
                const rawMat = String(gs[matKey] || '').trim();

                mergedRes.push({
                    "Número de Control": sControlKey ? String(gs[sControlKey]) : '000',
                    "Nombre del Alumno": `${rawName} ${rawPat} ${rawMat}`.trim(),
                    "Profesor": selectedTeacher,
                    "Materia": selectedSubject,
                    "Grupo": baseGroup,
                    "Periodo": 1,
                    "Asistencias": 0,
                    "Total de Clases": maxAsistencias > 0 ? maxAsistencias : 1, // Will be overridden
                    "Porcentaje": 0,
                    "Fechas y Horas de Asistencia": '[]',
                    "Especialidad": careerKey ? String(gs[careerKey]) : 'Desconocido'
                });
            }
        });

        // If we have some anomalous server records not in DB, push them too
        filteredRes.forEach(r => {
            if (!mergedRes.some(m => String(m['Número de Control']).trim() === String(r['Número de Control']).trim())) {
                mergedRes.push(r);
            }
        });

        // 2. Extract master dates
        const masterDates = new Set<string>();
        if (masterStudent && masterStudent['Fechas y Horas de Asistencia']) {
            try {
                let fechasStr: any = masterStudent['Fechas y Horas de Asistencia'];
                if (Array.isArray(fechasStr)) fechasStr = JSON.stringify(fechasStr);
                const fechas = JSON.parse(fechasStr);
                fechas.forEach((fStr: string) => {
                    const dateObj = new Date(fStr);
                    if (!isNaN(dateObj.getTime())) {
                        masterDates.add(dateObj.toISOString().split('T')[0]);
                    }
                });
            } catch (e) { }
        }

        // 3. Process data against merged records
        const processedData = mergedRes.map(d => {
            const newTotal = maxAsistencias > 0 ? maxAsistencias : 1;
            const studentDates = new Set<string>();
            try {
                let fechasStr: any = d['Fechas y Horas de Asistencia'];
                if (Array.isArray(fechasStr)) fechasStr = JSON.stringify(fechasStr);
                const fechas = JSON.parse(fechasStr || '[]');
                fechas.forEach((fStr: string) => {
                    const dateObj = new Date(fStr);
                    if (!isNaN(dateObj.getTime())) {
                        studentDates.add(dateObj.toISOString().split('T')[0]);
                    }
                });
            } catch (e) { }

            const faltas: string[] = [];
            masterDates.forEach(md => {
                if (!studentDates.has(md)) {
                    faltas.push(md);
                }
            });

            return {
                ...d,
                'Total de Clases': newTotal,
                Porcentaje: Number(d.Asistencias) / newTotal,
                faltasCalculadas: faltas.sort()
            };
        });

        setData(processedData);
        setIsLoading(false);
    };

    const handleNext = async () => {
        if (step === 0 && !selectedTeacher) return;
        if (step === 1 && !selectedSubject) return;
        if (step === 2 && !selectedGroup) return;

        if (step === 2) {
            // Transitioning to Results
            setStep(3);
            loadGroupData();
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
    // Exportar CSV
    const downloadAbsenceReport = () => {
        if (data.length === 0) {
            alert("No hay datos para exportar.");
            return;
        }

        // CSV Header
        const headers = ["Control", "Alumno", "Grupo", "Clases Impartidas", "Asistencias", "Porcentaje (%)", "Total Faltas", "Fechas Ausentes"];

        const rows = data.map(student => {
            const control = student['Número de Control'];
            const nombre = student['Nombre del Alumno'];
            const grupo = student.Grupo;
            const clases = student['Total de Clases'] || 0;
            const asistencias = student.Asistencias || 0;
            const porcentaje = Math.round((student.Porcentaje || 0) * 100);

            const faltasArr = student.faltasCalculadas || [];
            const totalFaltas = faltasArr.length;
            const fechasFaltas = faltasArr.join(" | ");

            return [
                control,
                `"${nombre}"`,
                grupo,
                clases,
                asistencias,
                porcentaje,
                totalFaltas,
                `"${fechasFaltas}"`
            ].join(",");
        });

        const csvContent = [headers.join(","), ...rows].join("\n");
        const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });

        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", `ReporteFaltas_${selectedSubject}_${selectedGroup}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const totalStudents = data.length;
    let totalAsistencias = 0;
    const dateCounts: Record<string, { date: Date, count: number }> = {};

    data.forEach(d => {
        totalAsistencias += d.Asistencias;
        try {
            const fechas = JSON.parse(d['Fechas y Horas de Asistencia'] || '[]');
            fechas.forEach((fStr: string) => {
                const dateObj = new Date(fStr);
                if (isNaN(dateObj.getTime())) return;
                const dateKey = dateObj.toISOString().split('T')[0];
                if (!dateCounts[dateKey]) {
                    dateCounts[dateKey] = { date: dateObj, count: 0 };
                }
                dateCounts[dateKey].count++;
            });
        } catch (e) { }
    });

    const avgAttendance = totalStudents ? data.reduce((acc, curr) => acc + curr.Porcentaje, 0) / totalStudents : 0;
    const atRisk = data.filter(d => d.Porcentaje < 0.8).length;
    const perfect = data.filter(d => d.Porcentaje === 1.0).length;

    const statusData = [
        { name: 'Riesgo (<80%)', value: atRisk, color: '#ef4444' }, // red-500
        { name: 'Regular', value: totalStudents - atRisk - perfect, color: '#eab308' }, // yellow-500
        { name: 'Perfecta', value: perfect, color: '#10b981' } // emerald-500
    ];

    // Real line chart data building
    const timelineData = Object.values(dateCounts)
        .sort((a, b) => a.date.getTime() - b.date.getTime())
        .map(item => ({
            name: item.date.toLocaleDateString('es-MX', { month: 'short', day: 'numeric' }),
            asistencias: item.count
        }));

    // Rendering Helper
    const getRiskColor = (percent: number) => {
        if (percent < 0.8) return 'text-red-500 bg-red-500/10 border-red-500/20';
        if (percent < 0.9) return 'text-yellow-500 bg-yellow-500/10 border-yellow-500/20';
        return 'text-theme-accent2-500 bg-theme-accent2-500/10 border-theme-accent2-500/20';
    };

    // Wizard Views
    const WizardContent = () => (
        <Card className="max-w-xl mx-auto border-theme-border shadow-2xl p-6 sm:p-8 mt-12 animate-fade-in-up">
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
                            {availableGroups.map(g => <option key={g} value={g}>{g}</option>)}
                        </Select>
                    </div>
                )}
            </div>

            <div className="flex justify-between mt-8 pt-6 border-t border-theme-border">
                <Button variant="ghost" onClick={handleBack} disabled={step === 0} className="w-24 text-theme-muted hover:text-theme-text hover:bg-theme-border/50">
                    Atrás
                </Button>
                <Button onClick={handleNext} className="w-32 bg-theme-accent1-600 hover:bg-theme-accent1-700">
                    {step === 2 ? 'Generar' : 'Siguiente'}
                </Button>
            </div>
        </Card>
    );

    return (
        <div className="p-4 sm:p-6 pb-24 min-h-screen bg-transparent">
            {step < 3 ? (
                <WizardContent />
            ) : (
                <div className="space-y-6 max-w-7xl mx-auto animate-fade-in">
                    {/* Dashboard Header */}
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-theme-card/80 backdrop-blur-xl p-4 sm:p-6 rounded-3xl border border-theme-border shadow-md">
                        <div>
                            <h1 className="text-2xl font-bold text-theme-text mb-1">Reporte de Asistencia</h1>
                            <p className="text-theme-muted text-sm">
                                {selectedTeacher} &bull; {selectedSubject} &bull; {selectedGroup}
                            </p>
                        </div>
                        <div className="flex gap-2 w-full sm:w-auto">
                            <Button variant="outline" onClick={() => setStep(0)} className="flex-1 sm:flex-none">
                                <span className="material-icons-round text-sm mr-1">tune</span> Filtros
                            </Button>
                            <Button onClick={downloadReport} className="flex-1 sm:flex-none bg-theme-accent2-600 hover:bg-theme-accent2-700">
                                <span className="material-icons-round text-sm mr-1">download</span> Exportar
                            </Button>
                        </div>
                    </div>

                    {isLoading ? (
                        <div className="h-64 flex flex-col items-center justify-center text-theme-accent1-500">
                            <span className="animate-spin material-icons-round text-5xl mb-4">settings</span>
                            <p className="font-medium animate-pulse">Procesando Analytics...</p>
                        </div>
                    ) : (
                        <>
                            {/* KPIs */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                {[
                                    { title: "Total Alumnos", value: totalStudents, icon: "groups", color: "text-theme-accent1-400" },
                                    { title: "Total Asistencias", value: totalAsistencias, icon: "fact_check", color: "text-theme-accent2-400" },
                                    { title: "Asistencia Promedio", value: `${(avgAttendance * 100).toFixed(1)}%`, icon: "timeline", color: "text-yellow-400" },
                                    { title: "En Riesgo (<80%)", value: atRisk, icon: "warning", color: "text-red-400" }
                                ].map((kpi, i) => (
                                    <Card key={i} className="border-theme-border bg-theme-border/50 p-4 flex items-center gap-4">
                                        <div className={cn("p-3 rounded-xl bg-black/20 shadow-inner border border-theme-border", kpi.color)}>
                                            <span className="material-icons-round text-2xl">{kpi.icon}</span>
                                        </div>
                                        <div>
                                            <p className="text-xs text-theme-muted uppercase tracking-wider font-semibold">{kpi.title}</p>
                                            <p className="text-xl font-bold text-theme-text">{kpi.value}</p>
                                        </div>
                                    </Card>
                                ))}
                            </div>

                            {/* Charts */}
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                <Card className="lg:col-span-2 border-theme-border bg-theme-border/50 p-6">
                                    <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
                                        <span className="material-icons-round text-theme-accent1-400">insights</span>
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
                                <Card className="border-theme-border bg-theme-border/50 p-6">
                                    <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
                                        <span className="material-icons-round text-theme-accent2-400">pie_chart</span>
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
                            <Card className="border-theme-border bg-theme-border/50 overflow-hidden">
                                <div className="p-4 border-b border-theme-border flex justify-between items-center">
                                    <h3 className="text-lg font-bold">Listado de Alumnos</h3>
                                    <Button
                                        onClick={downloadAbsenceReport}
                                        variant="outline"
                                        size="sm"
                                        className="h-9 gap-2 text-sm border-theme-accent1-500/50 text-theme-accent1-400 hover:bg-theme-accent1-500/10"
                                        disabled={isLoading || data.length === 0}
                                    >
                                        <span className="material-icons-round text-[18px]">download</span>
                                        Descargar Faltas (CSV)
                                    </Button>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left border-collapse">
                                        <thead>
                                            <tr className="bg-black/20 text-theme-muted text-xs uppercase tracking-wider">
                                                <th className="p-4 font-medium">Alumno</th>
                                                <th className="p-4 font-medium">Control</th>
                                                <th className="p-4 font-medium">Clases</th>
                                                <th className="p-4 font-medium">Progreso</th>
                                                <th className="p-4 font-medium text-right">Estatus</th>
                                            </tr>
                                        </thead>
                                        <tbody className="text-sm divide-y divide-white/5">
                                            {data.map((student, i) => (
                                                <tr
                                                    key={i}
                                                    className="hover:bg-theme-border/50 transition-colors cursor-pointer group"
                                                    onClick={() => setSelectedStudent(student)}
                                                >
                                                    <td className="p-4 text-theme-text font-medium group-hover:text-theme-accent1-400 transition-colors">
                                                        {student['Nombre del Alumno']}
                                                    </td>
                                                    <td className="p-4 text-theme-muted font-mono text-xs">{student['Número de Control']}</td>
                                                    <td className="p-4 text-gray-300">{student.Asistencias} / {student['Total de Clases']}</td>
                                                    <td className="p-4 w-48">
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-xs font-semibold w-8">{Math.round(student.Porcentaje * 100)}%</span>
                                                            <div className="h-2 w-full bg-black/40 rounded-full overflow-hidden">
                                                                <div
                                                                    className={cn("h-full transition-all duration-500", student.Porcentaje < 0.8 ? "bg-red-500" : student.Porcentaje < 0.9 ? "bg-yellow-500" : "bg-theme-accent2-500")}
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
                                                    <td colSpan={5} className="p-8 text-center text-theme-muted/80 italic">No hay datos disponibles para estos filtros.</td>
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
                                <div className="flex gap-2 p-1 bg-black/20 rounded-lg">
                                    <button
                                        className={cn("flex-1 py-1.5 text-sm font-medium rounded-md transition-colors", modalView === 'list' ? "bg-theme-border/100 text-theme-text shadow backdrop-blur-sm" : "text-theme-muted hover:bg-theme-border/50")}
                                        onClick={() => setModalView('list')}
                                    >
                                        Lista Histórica
                                    </button>
                                    <button
                                        className={cn("flex-1 py-1.5 text-sm font-medium rounded-md transition-colors", modalView === 'sheet' ? "bg-theme-border/100 text-theme-text shadow backdrop-blur-sm" : "text-theme-muted hover:bg-theme-border/50")}
                                        onClick={() => setModalView('sheet')}
                                    >
                                        Vista Mes (Hoja)
                                    </button>
                                </div>

                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 bg-theme-border/50 rounded-2xl border border-theme-border shadow-inner">
                                    <div>
                                        <span className="text-xs text-theme-muted/80 uppercase">Control</span>
                                        <p className="font-mono text-sm">{selectedStudent['Número de Control']}</p>
                                    </div>
                                    <div>
                                        <span className="text-xs text-theme-muted/80 uppercase">Asistencias</span>
                                        <p className="font-bold text-lg">{selectedStudent.Asistencias} <span className="text-sm font-normal text-theme-muted">/ {selectedStudent['Total de Clases']}</span></p>
                                    </div>
                                    <div>
                                        <span className="text-xs text-theme-muted/80 uppercase">Promedio</span>
                                        <p className={cn("font-bold text-lg", selectedStudent.Porcentaje < 0.8 ? "text-red-400" : "text-theme-accent2-400")}>{(selectedStudent.Porcentaje * 100).toFixed(0)}%</p>
                                    </div>
                                </div>

                                {modalView === 'list' ? (
                                    <div className="space-y-3 mt-4 max-h-[40vh] overflow-y-auto pr-2">
                                        <p className="font-medium mb-2 border-b border-theme-border pb-2">Registro Cronológico</p>

                                        {selectedStudent.faltasCalculadas && selectedStudent.faltasCalculadas.length > 0 && (
                                            <div className="mb-4">
                                                <p className="text-sm text-red-500 font-semibold mb-2 flex items-center gap-1">
                                                    <span className="material-icons-round text-sm">warning</span> Faltas Detectadas ({selectedStudent.faltasCalculadas.length})
                                                </p>
                                                {selectedStudent.faltasCalculadas.map((falta, i) => {
                                                    const parts = falta.split('-');
                                                    const date = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));

                                                    const handleJustifyMissing = async () => {
                                                        if (!confirm('¿Deseas registrar esta falta como Justificada en la base de datos?')) return;

                                                        const success = await insertJustifiedAbsence({
                                                            No: selectedStudent['Nombre del Alumno'],
                                                            ID: selectedStudent['Número de Control'],
                                                            Gr: selectedStudent.Grupo,
                                                            Es: selectedStudent.Especialidad || 'Desconocido',
                                                            Pe: selectedStudent.Periodo || 1,
                                                            Pro: selectedTeacher,
                                                            Ma: selectedSubject,
                                                            date: falta
                                                        });

                                                        if (success) {
                                                            alert('Falta justificada y reportada al servidor como nuevo registro.');
                                                            setSelectedStudent(null);
                                                            // Trigger a full re-fetch to reflect the new justified status
                                                            loadGroupData();
                                                        } else {
                                                            alert('Error al insertar el registro en el servidor.');
                                                        }
                                                    };

                                                    return (
                                                        <div key={`f-${i}`} className="flex justify-between items-center p-3 mb-2 bg-red-500/10 rounded-lg border border-red-500/20 gap-3">
                                                            <div className="flex flex-col">
                                                                <span className="text-red-400 font-medium">{date.toLocaleDateString('es-MX', { weekday: 'long', day: '2-digit', month: 'long' })}</span>
                                                                <span className="text-xs text-red-500/70">Asistencia registrada para el grupo, pero no para este alumno.</span>
                                                            </div>
                                                            {role !== 'consulta' && (
                                                                <Button
                                                                    variant="outline"
                                                                    size="sm"
                                                                    className="h-8 text-xs py-0 shrink-0 border-yellow-500/50 text-yellow-500 hover:bg-yellow-500/10"
                                                                    onClick={handleJustifyMissing}
                                                                >
                                                                    Justificar
                                                                </Button>
                                                            )}
                                                        </div>
                                                    )
                                                })}
                                            </div>
                                        )}

                                        {/* Parse JSON string array of dates as specified */}
                                        {(() => {
                                            try {
                                                const dates = JSON.parse(selectedStudent['Fechas y Horas de Asistencia'] || '[]');
                                                if (!Array.isArray(dates) || dates.length === 0) return <p className="text-theme-muted/80 text-sm">Sin registros.</p>;

                                                const handleDelete = async (dateStr: string) => {
                                                    if (!confirm('¿Estás seguro de ELIMINAR permanentemente esta asistencia?')) return;
                                                    const success = await deleteAttendanceRecord(selectedSubject, selectedStudent['Número de Control'], dateStr);
                                                    if (success) {
                                                        alert('Registro eliminado.');
                                                        // Update local view
                                                        setSelectedStudent(null);
                                                        // Trigger a re-fetch since stats changed
                                                        loadGroupData();
                                                    }
                                                };

                                                return dates.map((d: string, i: number) => {
                                                    const date = new Date(d);
                                                    return (
                                                        <div key={i} className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-3 bg-theme-border/50 rounded-xl border border-theme-border gap-3">
                                                            <div className="flex flex-col">
                                                                <span className="text-gray-200 font-medium">{date.toLocaleDateString('es-MX', { weekday: 'long', day: '2-digit', month: 'long' })}</span>
                                                                <span className="text-xs text-theme-muted/80 font-mono">{date.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}</span>
                                                            </div>
                                                            <div className="flex gap-2 w-full sm:w-auto">
                                                                {role !== 'consulta' && (
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="sm"
                                                                        className="h-8 text-xs py-0 flex-1 sm:flex-none text-red-400 hover:bg-red-400/10"
                                                                        onClick={() => handleDelete(d)}
                                                                    >
                                                                        Eliminar
                                                                    </Button>
                                                                )}
                                                            </div>
                                                        </div>
                                                    )
                                                });
                                            } catch (e) {
                                                return <p className="text-theme-muted/80 text-sm">Error cargando fechas.</p>
                                            }
                                        })()}
                                    </div>
                                ) : (
                                    <div className="overflow-x-auto mt-4 p-4 bg-theme-border/50 border border-theme-border rounded-2xl max-h-[40vh]">
                                        <p className="font-medium mb-4 flex items-center gap-2">
                                            <span className="material-icons-round text-theme-accent1-400">calendar_month</span> Vista Mensual de Periodo
                                        </p>

                                        {(() => {
                                            // 1. Recolectar todas las fechas (Asistencias + Faltas)
                                            let rawAsistencias: Date[] = [];
                                            try {
                                                const parsed = JSON.parse(selectedStudent['Fechas y Horas de Asistencia'] || '[]');
                                                if (Array.isArray(parsed)) {
                                                    rawAsistencias = parsed.map(d => new Date(d)).filter(d => !isNaN(d.getTime()));
                                                }
                                            } catch (e) { }

                                            const faltasArr = selectedStudent.faltasCalculadas || [];
                                            const rawFaltas: Date[] = faltasArr.map(f => {
                                                const parts = f.split('-');
                                                return new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
                                            });

                                            // 2. Unificar y estructurar
                                            const allRecords: { date: Date, type: 'asistencia' | 'falta' }[] = [
                                                ...rawAsistencias.map(d => ({ date: d, type: 'asistencia' as const })),
                                                ...rawFaltas.map(d => ({ date: d, type: 'falta' as const }))
                                            ];

                                            // Ordenar cronológicamente
                                            allRecords.sort((a, b) => a.date.getTime() - b.date.getTime());

                                            if (allRecords.length === 0) {
                                                return <p className="text-theme-muted/80 text-sm">No hay registro en este periodo.</p>;
                                            }

                                            // 3. Agrupar por Mes
                                            const numFormat = new Intl.DateTimeFormat('es-MX', { month: 'long', year: 'numeric' });
                                            const groups: Record<string, { date: Date, type: 'asistencia' | 'falta' }[]> = {};

                                            allRecords.forEach(rec => {
                                                const monthKey = numFormat.format(rec.date);
                                                if (!groups[monthKey]) groups[monthKey] = [];
                                                groups[monthKey].push(rec);
                                            });

                                            // 4. Renderizar grupos
                                            return Object.entries(groups).map(([monthName, records], idx) => (
                                                <div key={idx} className="mb-6 last:mb-0">
                                                    <div className="grid grid-cols-[auto_1fr] gap-4 items-center mb-3">
                                                        <div className="font-medium text-theme-muted uppercase text-xs tracking-wider border-r border-theme-border pr-4 w-28 text-right">
                                                            {monthName}
                                                        </div>
                                                        <div className="flex gap-2 flex-wrap">
                                                            {records.map((rec, rIdx) => {
                                                                const isAsistencia = rec.type === 'asistencia';
                                                                return (
                                                                    <div
                                                                        key={rIdx}
                                                                        className={cn(
                                                                            "w-[2.5rem] h-[3rem] rounded-lg flex flex-col items-center justify-center text-xs font-mono shadow-sm border",
                                                                            isAsistencia ? "bg-theme-accent2-500/10 border-theme-accent2-500/20 text-theme-accent2-400" : "bg-red-500/10 border-red-500/20 text-red-400"
                                                                        )}
                                                                        title={`${rec.date.toLocaleDateString('es-MX')}: ${isAsistencia ? 'Asistió' : 'Faltó'}`}
                                                                    >
                                                                        <span className="font-bold mb-1">{rec.date.getDate()}</span>
                                                                        {isAsistencia
                                                                            ? <span className="material-icons-round text-[14px]">check_circle</span>
                                                                            : <span className="material-icons-round text-[14px]">close</span>
                                                                        }
                                                                    </div>
                                                                )
                                                            })}
                                                        </div>
                                                    </div>
                                                </div>
                                            ));

                                        })()}
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
