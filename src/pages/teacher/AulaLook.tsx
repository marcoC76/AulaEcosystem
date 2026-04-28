import { useState, useEffect, useRef } from 'react';
import { cn } from '../../lib/utils';

import Fuse from 'fuse.js';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, ReferenceLine,
    PieChart, Pie, Cell, Legend, BarChart, Bar
} from 'recharts';
import { fetchAppConfig, fetchReportData, fetchStudentsDB, insertJustifiedAbsence, deleteAttendanceRecord } from '../../lib/dataService';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Select } from '../../components/ui/Select';
import { Input } from '../../components/ui/Input';
import { Stepper } from '../../components/ui/Stepper';
import { Modal } from '../../components/ui/Modal';
import type { ConfigOption, AttendanceRecord } from '../../types';

type ExtendedAttendanceRecord = AttendanceRecord & { faltasCalculadas?: string[]; apellidoPaterno?: string; rachaFaltas?: number };

export default function AulaLook({ isReadOnly = false }: { isReadOnly?: boolean }) {
    const [config, setConfig] = useState<{ profesores: ConfigOption[], materias: ConfigOption[] }>({ profesores: [], materias: [] });

    // Mode State
    const [mode, setMode] = useState<'group' | 'student'>('group');

    // Wizard State
    const [step, setStep] = useState(0);
    const [selectedTeacher, setSelectedTeacher] = useState('');
    const [selectedSubject, setSelectedSubject] = useState('');
    const [selectedGroup, setSelectedGroup] = useState('');

    // Student Search State
    const [searchQuery, setSearchQuery] = useState('');
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [selectedSearchStudent, setSelectedSearchStudent] = useState<any>(null);
    const [studentModeData, setStudentModeData] = useState<ExtendedAttendanceRecord[]>([]);

    // Data State
    const [data, setData] = useState<ExtendedAttendanceRecord[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [selectedStudent, setSelectedStudent] = useState<ExtendedAttendanceRecord | null>(null);
    const [modalView, setModalView] = useState<'list' | 'sheet'>('list');
    const [localSearchQuery, setLocalSearchQuery] = useState('');
    const [filterRisk, setFilterRisk] = useState<'all' | 'perfect' | 'risk'>('all');

    const [availableGroups, setAvailableGroups] = useState<string[]>([]);
    const [studentsDB, setStudentsDB] = useState<any[]>([]);
    const modalRef = useRef<HTMLDivElement>(null);

    const handleJustifyAbsence = async (dateStr: string) => {
        if (!selectedStudent) return;
        const confirmMsg = `¿Estás seguro de justificar la falta del ${dateStr}?`;
        if (!window.confirm(confirmMsg)) return;

        try {
            setIsLoading(true);
            const control = selectedStudent['Número de Control'];
            const { Grupo, Especialidad, Profesor, Materia } = selectedStudent;

            await insertJustifiedAbsence({
                No: String(selectedStudent['Nombre del Alumno'] || ''),
                ID: String(control),
                Gr: String(Grupo || selectedGroup),
                Es: String(Especialidad || ''),
                Pe: 1,
                Pro: String(Profesor || selectedTeacher),
                Ma: String(Materia || selectedSubject),
                date: dateStr
            });

            setSelectedStudent(null);
            if (mode === 'group') {
                await loadGroupData();
            } else {
                await loadStudentData();
            }
        } catch (error) {
            console.error('Error justificando falta:', error);
            alert('Error al justificar la falta.');
            setIsLoading(false);
        }
    };

    const handleDeleteAttendance = async (dateStr: string) => {
        if (!selectedStudent) return;
        const confirmMsg = `¿Estás seguro de borrar la asistencia del ${new Date(dateStr).toLocaleString('es-MX')}?`;
        if (!window.confirm(confirmMsg)) return;

        try {
            setIsLoading(true);
            const materia = selectedStudent.Materia || selectedSubject;
            await deleteAttendanceRecord(materia, String(selectedStudent['Número de Control']), dateStr);

            setSelectedStudent(null);
            if (mode === 'group') {
                await loadGroupData();
            } else {
                await loadStudentData();
            }
        } catch (error) {
            console.error('Error borrando asistencia:', error);
            alert('Error al borrar la asistencia.');
            setIsLoading(false);
        }
    };

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
        const mergedRes: ExtendedAttendanceRecord[] = [];

        groupStudents.forEach(gs => {
            const nameKey = Object.keys(gs).find(k => k.toLowerCase().includes('nombre')) || 'Nombre(s)';
            const patKey = Object.keys(gs).find(k => k.toLowerCase().includes('paterno')) || 'Apellido Paterno';
            const matKey = Object.keys(gs).find(k => k.toLowerCase().includes('materno')) || 'Apellido Materno';
            const careerKey = Object.keys(gs).find(k => k.toLowerCase().includes('carrera') || k.toLowerCase().includes('especialidad')) || 'Carrera';
            const sControlKey = Object.keys(gs).find(k => k.toLowerCase().includes('control'));

            const rawName = String(gs[nameKey] || '').trim();
            const rawPat = String(gs[patKey] || '').trim();
            const rawMat = String(gs[matKey] || '').trim();
            const formattedName = `${rawPat} ${rawMat} ${rawName}`.trim();

            const serverRecord = filteredRes.find(r => {
                const rControl = String(r['Número de Control']).trim();
                const sControl = sControlKey ? String(gs[sControlKey]).trim() : '';
                return rControl === sControl;
            }) as ExtendedAttendanceRecord | undefined;

            if (serverRecord) {
                serverRecord.apellidoPaterno = rawPat;
                serverRecord['Nombre del Alumno'] = formattedName; // Standardize format
                mergedRes.push(serverRecord);
            } else {
                mergedRes.push({
                    "Número de Control": sControlKey ? String(gs[sControlKey]) : '000',
                    "Nombre del Alumno": formattedName,
                    "Profesor": selectedTeacher,
                    "Materia": selectedSubject,
                    "Grupo": baseGroup,
                    "Periodo": 1,
                    "Asistencias": 0,
                    "Total de Clases": maxAsistencias > 0 ? maxAsistencias : 1,
                    "Porcentaje": 0,
                    "Fechas y Horas de Asistencia": '[]',
                    "Especialidad": careerKey ? String(gs[careerKey]) : 'Desconocido',
                    apellidoPaterno: rawPat
                });
            }
        });

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
                fechas.forEach((fReq: any) => {
                    const fStr = typeof fReq === 'object' ? fReq.date : fReq;
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
            const historicoJustificado = new Set<string>();
            try {
                let fechasStr: any = d['Fechas y Horas de Asistencia'];
                if (Array.isArray(fechasStr)) fechasStr = JSON.stringify(fechasStr);
                const fechas = JSON.parse(fechasStr || '[]');
                fechas.forEach((fReq: any) => {
                    const fStr = typeof fReq === 'object' ? fReq.date : fReq;
                    const status = typeof fReq === 'object' ? fReq.status : 'Asistencia';
                    const notes = typeof fReq === 'object' ? fReq.notes : '';

                    const dateObj = new Date(fStr);
                    if (!isNaN(dateObj.getTime())) {
                        studentDates.add(dateObj.toISOString().split('T')[0]);
                    }

                    if (status === 'Justificado' && typeof notes === 'string') {
                        const match = notes.match(/histórico \((.+?)\)/i);
                        if (match && match[1]) {
                            historicoJustificado.add(match[1]);
                        }
                    }
                });
            } catch (e) { }

            const faltas: string[] = [];
            const sortedMasterDates = Array.from(masterDates).sort();
            sortedMasterDates.forEach(md => {
                if (!studentDates.has(md) && !historicoJustificado.has(md)) {
                    faltas.push(md);
                }
            });

            let racha = 0;
            for (let i = sortedMasterDates.length - 1; i >= 0; i--) {
                if (!studentDates.has(sortedMasterDates[i]) && !historicoJustificado.has(sortedMasterDates[i])) {
                    racha++;
                } else {
                    break;
                }
            }

            return {
                ...d,
                'Total de Clases': newTotal,
                Porcentaje: Number(d.Asistencias) / newTotal,
                faltasCalculadas: faltas,
                rachaFaltas: racha
            };
        });

        const sortedData = processedData.sort((a, b) => {
            const nameA = a['Nombre del Alumno'] || '';
            const nameB = b['Nombre del Alumno'] || '';
            return nameA.localeCompare(nameB, 'es', { sensitivity: 'base' });
        });

        setData(sortedData);
        setIsLoading(false);
    };

    const loadStudentData = async () => {
        if (!selectedSearchStudent) return;
        setIsLoading(true);

        const cleanStr = (s: any) => String(s || '').trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

        const groupKey = Object.keys(selectedSearchStudent).find(k => k.toLowerCase().includes('grupo')) || 'Grupo';
        const groupValue = String(selectedSearchStudent[groupKey]).trim();

        // IMPORTANT: Split group to get the base group (e.g. "1A") and ignore specialty suffix if present
        const [baseGroupPart] = groupValue.split(' - ');
        const rawGroup = baseGroupPart.trim();

        const careerKey = Object.keys(selectedSearchStudent).find(k => k.toLowerCase().includes('carrera') || k.toLowerCase().includes('especialidad'));
        const specialty = careerKey && selectedSearchStudent[careerKey] ? String(selectedSearchStudent[careerKey]).trim() : '';
        const studSpecClean = cleanStr(specialty);

        console.log(`[StudentReport] Buscando para Grupo Base: ${rawGroup}, Especialidad: ${specialty}`);

        // El backend de Apps Script exige la Materia (Ma) para filtrar.
        // Haremos las peticiones agrupadas para evitar tasa límite (429 Too Many Requests).
        let rawRes: any[] = [];
        const chunkSize = 4;

        for (let i = 0; i < config.materias.length; i += chunkSize) {
            const chunk = config.materias.slice(i, i + chunkSize);
            const promises = chunk.map(m => fetchReportData({ group: rawGroup, subject: m.text }));
            const results = await Promise.all(promises);
            results.forEach(resArray => {
                if (Array.isArray(resArray)) {
                    // Evitar que el MOCK fallback duplique datos si llega a fallar uno,
                    // Si trae los mismos atributos que el mock, no los concatenamos 30 veces.
                    if (resArray.length > 0 && resArray[0]['Número de Control'] === '20304050') {
                        if (rawRes.length === 0) rawRes = rawRes.concat(resArray);
                    } else {
                        rawRes = rawRes.concat(resArray);
                    }
                }
            });
        }

        console.log(`[StudentReport] Recibidos ${rawRes.length} registros totales del servidor (cruzando todas las materias).`);

        // FILTER: Incluir si la especialidad coincide O si el registro no tiene especialidad (materia común)
        const groupRes = rawRes.filter(r => {
            const rowSpecClean = cleanStr(r.Especialidad);
            if (!studSpecClean) return true;
            return rowSpecClean === studSpecClean || rowSpecClean === "";
        });

        console.log(`[StudentReport] Filtrados a ${groupRes.length} registros (después de validar especialidad/comunes).`);

        const materiasMap = new Map<string, ExtendedAttendanceRecord[]>();
        groupRes.forEach(r => {
            const m = r.Materia || 'Desconocida';
            if (!materiasMap.has(m)) materiasMap.set(m, []);
            materiasMap.get(m)!.push(r);
        });

        console.log(`[StudentReport] Materias encontradas en el grupo:`, Array.from(materiasMap.keys()));

        const studentResults: ExtendedAttendanceRecord[] = [];
        const sControlKey = Object.keys(selectedSearchStudent).find(k => k.toLowerCase().includes('control'));
        const sControl = sControlKey ? String(selectedSearchStudent[sControlKey]).trim() : '';

        materiasMap.forEach((records, materiaName) => {
            let maxAsistencias = 0;
            let masterStudent: AttendanceRecord | null = null;

            records.forEach(d => {
                const asis = Number(d.Asistencias);
                if (asis > maxAsistencias) {
                    maxAsistencias = asis;
                    masterStudent = d;
                }
            });

            const newTotal = maxAsistencias > 0 ? maxAsistencias : 1;
            const serverRecord = records.find(r => String(r['Número de Control']).trim() === sControl) as ExtendedAttendanceRecord | undefined;

            let finalRecord: ExtendedAttendanceRecord;

            if (serverRecord) {
                finalRecord = { ...serverRecord, 'Total de Clases': newTotal, Porcentaje: Number(serverRecord.Asistencias) / newTotal };
            } else {
                finalRecord = {
                    "Número de Control": sControl || '000',
                    "Nombre del Alumno": selectedSearchStudent.nombre,
                    "Profesor": masterStudent ? (masterStudent as any).Profesor : "Varios",
                    "Materia": materiaName,
                    "Grupo": rawGroup,
                    "Periodo": 1,
                    "Asistencias": 0,
                    "Total de Clases": newTotal,
                    "Porcentaje": 0,
                    "Fechas y Horas de Asistencia": '[]',
                    "Especialidad": specialty,
                    apellidoPaterno: ''
                };
            }

            const masterDates = new Set<string>();
            if (masterStudent && (masterStudent as any)['Fechas y Horas de Asistencia']) {
                try {
                    let fechasStr: any = (masterStudent as any)['Fechas y Horas de Asistencia'];
                    if (Array.isArray(fechasStr)) fechasStr = JSON.stringify(fechasStr);
                    JSON.parse(fechasStr).forEach((fReq: any) => {
                        const fStr = typeof fReq === 'object' ? fReq.date : fReq;
                        const dateObj = new Date(fStr);
                        if (!isNaN(dateObj.getTime())) masterDates.add(dateObj.toISOString().split('T')[0]);
                    });
                } catch (e) { }
            }

            const studentDates = new Set<string>();
            const historicoJustificado = new Set<string>();
            if (finalRecord['Fechas y Horas de Asistencia']) {
                try {
                    let fechasStr: any = finalRecord['Fechas y Horas de Asistencia'];
                    if (Array.isArray(fechasStr)) fechasStr = JSON.stringify(fechasStr);
                    JSON.parse(fechasStr).forEach((fReq: any) => {
                        const fStr = typeof fReq === 'object' ? fReq.date : fReq;
                        const status = typeof fReq === 'object' ? fReq.status : 'Asistencia';
                        const notes = typeof fReq === 'object' ? fReq.notes : '';

                        const dateObj = new Date(fStr);
                        if (!isNaN(dateObj.getTime())) studentDates.add(dateObj.toISOString().split('T')[0]);

                        if (status === 'Justificado' && typeof notes === 'string') {
                            const match = notes.match(/histórico \((.+?)\)/i);
                            if (match && match[1]) {
                                historicoJustificado.add(match[1]);
                            }
                        }
                    });
                } catch (e) { }
            }

            const faltas: string[] = [];
            const sortedMasterDates = Array.from(masterDates).sort();
            sortedMasterDates.forEach(md => {
                if (!studentDates.has(md) && !historicoJustificado.has(md)) faltas.push(md);
            });

            let racha = 0;
            for (let i = sortedMasterDates.length - 1; i >= 0; i--) {
                if (!studentDates.has(sortedMasterDates[i]) && !historicoJustificado.has(sortedMasterDates[i])) {
                    racha++;
                } else {
                    break;
                }
            }

            finalRecord.faltasCalculadas = faltas;
            finalRecord.rachaFaltas = racha;
            studentResults.push(finalRecord);
        });

        console.log(`[StudentReport] Kárdex final generado con ${studentResults.length} materias.`);

        const sortedResults = studentResults.sort((a, b) => (a.Materia || '').localeCompare(b.Materia || ''));
        setStudentModeData(sortedResults);
        setIsLoading(false);
    };

    const handleNext = async () => {
        if (mode === 'group') {
            if (step === 0 && !selectedTeacher) return;
            if (step === 1 && !selectedSubject) return;
            if (step === 2 && !selectedGroup) return;

            if (step === 2) {
                setStep(3);
                setLocalSearchQuery('');
                loadGroupData();
            } else {
                setStep(s => s + 1);
            }
        } else {
            if (!selectedSearchStudent) {
                alert("Por favor selecciona un alumno primero.");
                return;
            }
            setStep(3);
            setLocalSearchQuery('');
            loadStudentData();
        }
    };

    const handleBack = () => setStep(s => Math.max(0, s - 1));

    const downloadReport = () => {
        const d = mode === 'group' ? data : studentModeData;
        const headers = mode === 'group'
            ? ['Control', 'Nombre', 'Clases Totales', 'Asistencias', 'Porcentaje']
            : ['Materia', 'Profesor', 'Clases Totales', 'Asistencias', 'Porcentaje'];

        const rows = d.map(item => {
            if (mode === 'group') {
                return [item['Número de Control'], item['Nombre del Alumno'], item['Total de Clases'], item['Asistencias'], `${(item.Porcentaje * 100).toFixed(0)}%`];
            } else {
                return [item['Materia'], item['Profesor'], item['Total de Clases'], item['Asistencias'], `${(item.Porcentaje * 100).toFixed(0)}%`];
            }
        });

        const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement('a');
        link.href = encodedUri;
        link.download = mode === 'group'
            ? `Reporte_${selectedGroup}_${selectedSubject.substring(0, 10)}.csv`
            : `Reporte_${selectedSearchStudent?.nombre}_Múltiple.csv`;
        document.body.appendChild(link);
        link.click();
        link.remove();
    };

    const downloadAbsenceReport = () => {
        const d = mode === 'group' ? data : studentModeData;
        if (d.length === 0) return alert("No hay datos para exportar.");

        const headers = mode === 'group'
            ? ["Control", "Alumno", "Grupo", "Clases Impartidas", "Asistencias", "Porcentaje (%)", "Total Faltas", "Fechas Ausentes"]
            : ["Materia", "Profesor", "Grupo", "Clases Impartidas", "Asistencias", "Porcentaje (%)", "Total Faltas", "Fechas Ausentes"];

        const rows = d.map(item => {
            const faltasArr = item.faltasCalculadas || [];
            const fechasFaltas = faltasArr.join(" | ");
            const porcentaje = Math.round((item.Porcentaje || 0) * 100);

            if (mode === 'group') {
                return [
                    item['Número de Control'],
                    `"${item['Nombre del Alumno']}"`,
                    item.Grupo,
                    item['Total de Clases'] || 0,
                    item.Asistencias || 0,
                    porcentaje,
                    faltasArr.length,
                    `"${fechasFaltas}"`
                ].join(",");
            } else {
                return [
                    `"${item.Materia}"`,
                    `"${item.Profesor}"`,
                    item.Grupo,
                    item['Total de Clases'] || 0,
                    item.Asistencias || 0,
                    porcentaje,
                    faltasArr.length,
                    `"${fechasFaltas}"`
                ].join(",");
            }
        });

        const csvContent = [headers.join(","), ...rows].join("\n");
        const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.setAttribute("download", `ReporteFaltas_${mode === 'group' ? selectedGroup : selectedSearchStudent?.nombre}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    // --- Search Helpers ---
    const getSuggestions = () => {
        if (searchQuery.length < 2) return [];

        const cleanStudents = studentsDB.map(student => {
            const sObj = student as any;
            const nameKey = Object.keys(sObj).find(k => k.toLowerCase().includes('nombre')) || 'Nombre(s)';
            const patKey = Object.keys(sObj).find(k => k.toLowerCase().includes('paterno')) || 'Apellido Paterno';
            const matKey = Object.keys(sObj).find(k => k.toLowerCase().includes('materno')) || 'Apellido Materno';
            const controlKey = Object.keys(sObj).find(k => k.toLowerCase().includes('control'));

            return {
                ...student,
                nombre: `${sObj[nameKey]} ${sObj[patKey]} ${sObj[matKey]}`.trim(),
                control: controlKey ? String(sObj[controlKey]) : ''
            };
        });

        const fuse = new Fuse(cleanStudents, {
            keys: ['nombre', 'control'],
            threshold: 0.4,
            ignoreLocation: true
        });

        return fuse.search(searchQuery).slice(0, 5).map(r => r.item);
    };

    const suggestions = getSuggestions();

    // --- Derived Metrics ---
    const baseActiveData = mode === 'group' ? data : studentModeData;
    const activeData = baseActiveData.filter(item => {
        let matchSearch = true;
        if (localSearchQuery) {
            const query = localSearchQuery.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
            if (mode === 'group') {
                const name = (item['Nombre del Alumno'] || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
                const isControl = (item['Número de Control'] || '').toLowerCase().includes(query);
                matchSearch = name.includes(query) || isControl;
            } else {
                const materia = (item.Materia || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
                const prof = (item.Profesor || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
                matchSearch = materia.includes(query) || prof.includes(query);
            }
        }

        if (!matchSearch) return false;
        if (filterRisk === 'perfect' && item.Porcentaje < 1.0) return false;
        if (filterRisk === 'risk' && item.Porcentaje >= 0.8) return false;

        return true;
    });

    const totalItems = activeData.length;
    let totalAsistencias = 0;
    const dateCounts: Record<string, { date: Date, count: number }> = {};
    const wdCounts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }; // Mon-Fri

    activeData.forEach(d => {
        totalAsistencias += d.Asistencias;
        try {
            const fechas = JSON.parse(d['Fechas y Horas de Asistencia'] || '[]');
            fechas.forEach((fReq: any) => {
                const fStr = typeof fReq === 'object' ? fReq.date : fReq;
                const dateObj = new Date(fStr);
                if (isNaN(dateObj.getTime())) return;
                const dateKey = dateObj.toISOString().split('T')[0];
                if (!dateCounts[dateKey]) dateCounts[dateKey] = { date: dateObj, count: 0 };
                dateCounts[dateKey].count++;
            });
        } catch (e) { }

        if (d.faltasCalculadas) {
            d.faltasCalculadas.forEach(f => {
                const parts = f.split('-');
                const dt = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
                const wd = dt.getDay();
                if (wd >= 1 && wd <= 5) {
                    wdCounts[wd as keyof typeof wdCounts]++;
                }
            });
        }
    });

    const avgAttendance = totalItems ? activeData.reduce((acc, curr) => acc + curr.Porcentaje, 0) / totalItems : 0;
    const atRisk = activeData.filter(d => d.Porcentaje < 0.8).length;
    const perfect = activeData.filter(d => d.Porcentaje === 1.0).length;

    const statusData = [
        { name: 'Riesgo (<80%)', value: atRisk, color: '#ef4444' },
        { name: 'Regular', value: totalItems - atRisk - perfect, color: '#eab308' },
        { name: 'Perfecta', value: perfect, color: '#10b981' }
    ];

    const timelineData = Object.values(dateCounts)
        .sort((a, b) => a.date.getTime() - b.date.getTime())
        .map(item => ({
            name: item.date.toLocaleDateString('es-MX', { month: 'short', day: 'numeric' }),
            asistencias: item.count
        }));

    const weekdayData = [
        { name: 'Lun', faltas: wdCounts[1] },
        { name: 'Mar', faltas: wdCounts[2] },
        { name: 'Mié', faltas: wdCounts[3] },
        { name: 'Jue', faltas: wdCounts[4] },
        { name: 'Vie', faltas: wdCounts[5] },
    ];


    const getRiskColor = (percent: number) => {
        if (percent < 0.8) return 'text-red-500 bg-red-500/10 border-red-500/20';
        if (percent < 0.9) return 'text-yellow-500 bg-yellow-500/10 border-yellow-500/20';
        return 'text-theme-accent2-500 bg-theme-accent2-500/10 border-theme-accent2-500/20';
    };

    return (
        <div className="p-4 sm:p-6 pb-24 min-h-screen bg-transparent">
            {step < 3 ? (
                <div className="max-w-2xl mx-auto mt-6 animate-fade-in-up">
                    {step === 0 && (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                            <Card className="border-theme-border flex items-center gap-4 bg-theme-border/20 p-4">
                                <div className="p-3 rounded-xl bg-white/5 border border-theme-border text-theme-accent1-400">
                                    <span className="material-icons-round text-2xl">school</span>
                                </div>
                                <div>
                                    <p className="text-xs text-theme-muted uppercase tracking-wider font-semibold">Alumnos</p>
                                    <p className="text-xl font-bold">{studentsDB.length}</p>
                                </div>
                            </Card>
                            <Card className="border-theme-border flex items-center gap-4 bg-theme-border/20 p-4">
                                <div className="p-3 rounded-xl bg-white/5 border border-theme-border text-theme-accent2-400">
                                    <span className="material-icons-round text-2xl">groups</span>
                                </div>
                                <div>
                                    <p className="text-xs text-theme-muted uppercase tracking-wider font-semibold">Grupos</p>
                                    <p className="text-xl font-bold">{availableGroups.length}</p>
                                </div>
                            </Card>
                            <Card className="border-theme-border flex items-center gap-4 bg-theme-border/20 p-4">
                                <div className="p-3 rounded-xl bg-white/5 border border-theme-border text-yellow-400">
                                    <span className="material-icons-round text-2xl">auto_stories</span>
                                </div>
                                <div>
                                    <p className="text-xs text-theme-muted uppercase tracking-wider font-semibold">Materias</p>
                                    <p className="text-xl font-bold">{config.materias.length}</p>
                                </div>
                            </Card>
                            <Card className="border-theme-border flex items-center gap-4 bg-theme-border/20 p-4">
                                <div className="p-3 rounded-xl bg-white/5 border border-theme-border text-emerald-400">
                                    <span className="material-icons-round text-2xl">person_4</span>
                                </div>
                                <div>
                                    <p className="text-xs text-theme-muted uppercase tracking-wider font-semibold">Profesores</p>
                                    <p className="text-xl font-bold">{config.profesores.length}</p>
                                </div>
                            </Card>
                        </div>
                    )}

                    <Card className="border-theme-border shadow-2xl p-6 sm:p-8">
                        {step === 0 && (
                            <div className="mb-8 flex gap-2 p-1 bg-black/20 rounded-lg">
                                <button
                                    className={cn("flex-1 py-2 text-sm font-bold rounded-md transition-all flex items-center justify-center gap-2", mode === 'group' ? "bg-theme-accent1-600 text-white shadow" : "text-theme-muted hover:bg-theme-border/50")}
                                    onClick={() => { setMode('group'); setSelectedSearchStudent(null); }}
                                >
                                    <span className="material-icons-round text-[18px]">groups</span> Por Grupo
                                </button>
                                <button
                                    className={cn("flex-1 py-2 text-sm font-bold rounded-md transition-all flex items-center justify-center gap-2", mode === 'student' ? "bg-theme-accent1-600 text-white shadow" : "text-theme-muted hover:bg-theme-border/50")}
                                    onClick={() => { setMode('student'); setStep(0); }}
                                >
                                    <span className="material-icons-round text-[18px]">person_search</span> Por Alumno
                                </button>
                            </div>
                        )}

                        {mode === 'group' && (
                            <div className="mb-8">
                                <Stepper steps={['Profesor', 'Materia', 'Grupo', 'Resultados']} currentStep={step} />
                            </div>
                        )}

                        <div className="min-h-[200px] flex flex-col justify-center">
                            {mode === 'group' && (
                                <>
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
                                </>
                            )}

                            {mode === 'student' && step === 0 && (
                                <div className="space-y-4 animate-fade-in">
                                    <h3 className="text-xl font-bold text-center mb-6">Búsqueda de Alumno</h3>
                                    <p className="text-sm text-theme-muted text-center mb-4">Ingresa el nombre o número de control para ver su historial en todas sus materias.</p>

                                    <div className="relative">
                                        <Input
                                            placeholder="Ej. Juan Pérez o 203040..."
                                            value={searchQuery}
                                            onChange={e => setSearchQuery(e.target.value)}
                                            onFocus={() => setShowSuggestions(true)}
                                            onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                                            className="h-14 text-lg pl-12"
                                        />
                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 material-icons-round text-theme-muted">search</span>

                                        {showSuggestions && searchQuery.length > 1 && (
                                            <div className="absolute top-full mt-2 left-0 right-0 bg-theme-card border border-theme-border rounded-xl shadow-2xl z-50 overflow-hidden max-h-60 overflow-y-auto">
                                                {suggestions.length > 0 ? suggestions.map(s => (
                                                    <button
                                                        key={(s as any).control}
                                                        type="button"
                                                        className="w-full text-left p-4 hover:bg-theme-base border-b border-theme-border flex flex-col transition-colors cursor-pointer"
                                                        onClick={() => {
                                                            setSelectedSearchStudent(s);
                                                            setSearchQuery((s as any).nombre);
                                                            setShowSuggestions(false);
                                                        }}
                                                    >
                                                        <span className="text-lg text-theme-text font-medium">{(s as any).nombre}</span>
                                                        <span className="text-sm text-theme-accent1-400 font-mono mt-1">{(s as any).control}</span>
                                                    </button>
                                                )) : (
                                                    <div className="p-4 text-theme-muted text-center italic">No se encontraron alumnos.</div>
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    {selectedSearchStudent && (
                                        <div className="mt-6 p-4 bg-theme-accent1-500/10 border border-theme-accent1-500/20 rounded-xl flex items-center gap-4 animate-fade-in">
                                            <div className="p-3 bg-theme-accent1-500/20 rounded-full text-theme-accent1-400">
                                                <span className="material-icons-round">account_circle</span>
                                            </div>
                                            <div>
                                                <p className="text-sm font-medium text-theme-text">{selectedSearchStudent.nombre}</p>
                                                <p className="text-xs text-theme-muted mt-1">Control: <span className="font-mono text-theme-accent1-300">{selectedSearchStudent.control}</span></p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        <div className="flex justify-between mt-8 pt-6 border-t border-theme-border">
                            <Button variant="ghost" onClick={handleBack} disabled={step === 0} className="w-24 text-theme-muted hover:text-theme-text hover:bg-theme-border/50">
                                Atrás
                            </Button>
                            <Button onClick={handleNext} className="w-32 bg-theme-accent1-600 hover:bg-theme-accent1-700">
                                {mode === 'group' && step === 2 ? 'Generar' : mode === 'student' && step === 0 ? 'Generar' : 'Siguiente'}
                            </Button>
                        </div>
                    </Card>
                </div>
            ) : (
                <div className="space-y-6 max-w-7xl mx-auto animate-fade-in">
                    {/* Dashboard Header */}
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-theme-card/80 backdrop-blur-xl p-4 sm:p-6 rounded-3xl border border-theme-border shadow-md">
                        <div>
                            <h1 className="text-2xl font-bold text-theme-text mb-1">
                                {mode === 'group' ? 'Reporte de Asistencia' : 'Kárdex de Asistencia (Alumno)'}
                            </h1>
                            <p className="text-theme-muted text-sm">
                                {mode === 'group'
                                    ? `${selectedTeacher} • ${selectedSubject} • ${selectedGroup}`
                                    : `${selectedSearchStudent?.nombre} • Control: ${selectedSearchStudent?.control}`
                                }
                            </p>
                        </div>
                        <div className="flex gap-2 w-full sm:w-auto">
                            <Button variant="outline" onClick={() => { setStep(0); setMode('group'); }} className="flex-1 sm:flex-none">
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
                            <p className="font-medium animate-pulse">Procesando Analytics desde Base de Datos...</p>
                        </div>
                    ) : (
                        <>
                            {/* KPIs - Tarjetones Elegantes */}
                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-2">
                                {[
                                    { title: mode === 'group' ? "Alumnos en Grupo" : "Materias Cursadas", value: totalItems, subtitle: mode === 'group' ? `Registrados` : 'En kárdex', icon: mode === 'group' ? "groups" : "auto_stories", color: "text-theme-accent1-400", bg: "bg-theme-accent1-400/10" },
                                    { title: "Asistencias (Suma)", value: totalAsistencias, subtitle: "Acumulado global", icon: "fact_check", color: "text-theme-accent2-400", bg: "bg-theme-accent2-400/10" },
                                    { title: "Índice de Asistencia", value: `${(avgAttendance * 100).toFixed(1)}%`, subtitle: "Promedio del grupo", icon: "timeline", color: "text-emerald-400", bg: "bg-emerald-400/10" },
                                    { title: "Foco Rojo (<80%)", value: atRisk, subtitle: mode === 'group' ? "Alumnos clave" : "Materias de alerta", icon: "warning", color: "text-red-400", bg: "bg-red-400/10" }
                                ].map((kpi, i) => (
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

                            {/* Charts */}
                            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
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
                                                <YAxis domain={[0, Math.max(totalItems, 5)]} stroke="#9ca3af" tick={{ fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                                                <RechartsTooltip contentStyle={{ backgroundColor: '#1f2937', borderColor: '#374151', borderRadius: '8px', color: '#fff' }} />
                                                <ReferenceLine y={totalItems * 0.85} stroke="#ef4444" strokeDasharray="3 3" label={{ position: 'top', value: 'Umbral 85%', fill: '#ef4444', fontSize: 12 }} />
                                                <Line type="monotone" dataKey="asistencias" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                                            </LineChart>
                                        </ResponsiveContainer>
                                    </div>
                                </Card>
                                <Card className="border-theme-border bg-theme-border/50 p-6">
                                    <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
                                        <span className="material-icons-round text-theme-accent2-400">pie_chart</span>
                                        Estatus
                                    </h3>
                                    <div className="h-[250px] w-full mt-4">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                                <Pie data={statusData} cx="50%" cy="50%" innerRadius={50} outerRadius={70} paddingAngle={5} dataKey="value" stroke="none">
                                                    {statusData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                                                </Pie>
                                                <RechartsTooltip contentStyle={{ backgroundColor: '#1f2937', borderColor: '#374151', borderRadius: '8px', color: '#fff' }} />
                                                <Legend verticalAlign="bottom" height={36} iconType="circle" />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    </div>
                                </Card>
                                <Card className="border-theme-border bg-theme-border/50 p-6">
                                    <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
                                        <span className="material-icons-round text-red-400">warning</span>
                                        Patrón
                                    </h3>
                                    <div className="h-[250px] w-full">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={weekdayData}>
                                                <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
                                                <XAxis dataKey="name" stroke="#9ca3af" tick={{ fill: '#9ca3af', fontSize: 12 }} axisLine={false} tickLine={false} />
                                                <YAxis hide />
                                                <RechartsTooltip cursor={{ fill: '#374151', opacity: 0.4 }} contentStyle={{ backgroundColor: '#1f2937', borderColor: '#374151', borderRadius: '8px', color: '#fff' }} />
                                                <Bar dataKey="faltas" fill="#ef4444" radius={[4, 4, 0, 0]} />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                </Card>
                            </div>


                            {/* Data Table */}
                            <Card className="border-theme-border bg-theme-border/50 overflow-hidden">
                                <div className="p-4 border-b border-theme-border flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                                    <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                                        <h3 className="text-lg font-bold">{mode === 'group' ? 'Listado de Alumnos' : 'Historial de Materias'}</h3>
                                        <div className="flex gap-2 bg-black/20 p-1 rounded-lg">
                                            <button onClick={() => setFilterRisk('all')} className={cn("px-3 py-1.5 text-xs font-semibold rounded-md transition-colors", filterRisk === 'all' ? "bg-theme-border/100 text-theme-text shadow" : "text-theme-muted hover:text-theme-text")}>Todos</button>
                                            <button onClick={() => setFilterRisk('perfect')} className={cn("px-3 py-1.5 text-xs font-semibold rounded-md transition-colors flex items-center gap-1", filterRisk === 'perfect' ? "bg-emerald-500/20 text-emerald-400 shadow border border-emerald-500/30" : "text-theme-muted hover:text-emerald-400")}><span className="material-icons-round text-[14px]">star</span> Perfecta</button>
                                            <button onClick={() => setFilterRisk('risk')} className={cn("px-3 py-1.5 text-xs font-semibold rounded-md transition-colors flex items-center gap-1", filterRisk === 'risk' ? "bg-red-500/20 text-red-400 shadow border border-red-500/30" : "text-theme-muted hover:text-red-400")}><span className="material-icons-round text-[14px]">warning</span> Riesgo</button>
                                        </div>
                                    </div>
                                    <div className="flex gap-2 w-full sm:w-auto">
                                        <div className="relative flex-1 sm:flex-none sm:w-64">
                                            <Input
                                                placeholder={mode === 'group' ? "Buscar alumno..." : "Buscar materia..."}
                                                value={localSearchQuery}
                                                onChange={e => setLocalSearchQuery(e.target.value)}
                                                className="h-9 pl-9 text-sm"
                                            />
                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 material-icons-round text-[18px] text-theme-muted">search</span>
                                        </div>
                                        <Button onClick={downloadAbsenceReport} variant="outline" size="sm" className="h-9 gap-2 text-sm text-theme-accent1-400 hover:bg-theme-accent1-500/10 whitespace-nowrap">
                                            <span className="material-icons-round text-[18px]">download</span> Faltas (CSV)
                                        </Button>
                                    </div>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left border-collapse">
                                        <thead>
                                            <tr className="bg-black/20 text-theme-muted text-xs uppercase tracking-wider">
                                                <th className="p-4 font-medium">{mode === 'group' ? 'Alumno' : 'Materia'}</th>
                                                <th className="p-4 font-medium">{mode === 'group' ? 'Control' : 'Profesor'}</th>
                                                <th className="p-4 font-medium">Clases</th>
                                                <th className="p-4 font-medium">Progreso</th>
                                                <th className="p-4 font-medium text-right">Estatus</th>
                                            </tr>
                                        </thead>
                                        <tbody className="text-sm divide-y divide-white/5">
                                            {activeData.map((item, i) => (
                                                <tr key={i} className="hover:bg-theme-border/50 transition-colors cursor-pointer group" onClick={() => setSelectedStudent(item)}>
                                                    <td className="p-4 text-theme-text font-medium group-hover:text-theme-accent1-400 transition-colors">
                                                        <div className="flex items-center gap-2">
                                                            {mode === 'group' ? item['Nombre del Alumno'] : item.Materia}
                                                            {item.rachaFaltas && item.rachaFaltas >= 2 ? (
                                                                <span className={cn("text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full border shadow-sm flex items-center gap-1 whitespace-nowrap", item.rachaFaltas >= 3 ? "bg-red-500/20 text-red-500 border-red-500/30" : "bg-yellow-500/20 text-yellow-500 border-yellow-500/30")}>
                                                                    <span className="material-icons-round text-[12px]">warning</span>
                                                                    {item.rachaFaltas} Faltas
                                                                </span>
                                                            ) : null}
                                                        </div>
                                                    </td>
                                                    <td className="p-4 text-theme-muted font-mono text-xs">
                                                        {mode === 'group' ? item['Número de Control'] : item.Profesor}
                                                    </td>
                                                    <td className="p-4 text-gray-300">{item.Asistencias} / {item['Total de Clases']}</td>
                                                    <td className="p-4 w-48">
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-xs font-semibold w-8">{Math.round(item.Porcentaje * 100)}%</span>
                                                            <div className="h-2 w-full bg-black/40 rounded-full overflow-hidden">
                                                                <div className={cn("h-full transition-all duration-500", item.Porcentaje < 0.8 ? "bg-red-500" : item.Porcentaje < 0.9 ? "bg-yellow-500" : "bg-theme-accent2-500")} style={{ width: `${item.Porcentaje * 100}%` }} />
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
                                            {activeData.length === 0 && (
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

                    {/* Detailed Modal remains mostly unchanged structurally */}
                    <Modal isOpen={!!selectedStudent} onClose={() => setSelectedStudent(null)} title={selectedStudent ? (mode === 'group' ? selectedStudent['Nombre del Alumno'] : `${selectedStudent.Materia} - Detalles`) : 'Detalles'} fullScreenOnMobile>
                        {selectedStudent && (
                            <div className="space-y-6" ref={modalRef}>
                                <div className="flex gap-2 p-1 bg-black/20 rounded-lg no-print">
                                    <button className={cn("flex-1 py-1.5 text-sm font-medium rounded-md", modalView === 'list' ? "bg-theme-border/100 text-theme-text shadow" : "text-theme-muted")} onClick={() => setModalView('list')}>Lista Histórica</button>
                                    <button className={cn("flex-1 py-1.5 text-sm font-medium rounded-md", modalView === 'sheet' ? "bg-theme-border/100 text-theme-text shadow" : "text-theme-muted")} onClick={() => setModalView('sheet')}>Vista Mes</button>
                                </div>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 bg-theme-border/50 rounded-2xl border border-theme-border shadow-inner">
                                    <div>
                                        <span className="text-xs text-theme-muted/80 uppercase">Asistencias</span>
                                        <p className="font-bold text-lg">{selectedStudent.Asistencias} <span className="text-sm font-normal text-theme-muted">/ {selectedStudent['Total de Clases']}</span></p>
                                    </div>
                                    <div>
                                        <span className="text-xs text-theme-muted/80 uppercase">Promedio</span>
                                        <p className={cn("font-bold text-lg", selectedStudent.Porcentaje < 0.8 ? "text-red-400" : "text-theme-accent2-400")}>{(selectedStudent.Porcentaje * 100).toFixed(0)}%</p>
                                    </div>
                                    {mode === 'student' && (
                                        <div className="col-span-2">
                                            <span className="text-xs text-theme-muted/80 uppercase">Profesor</span>
                                            <p className="font-medium text-sm truncate">{selectedStudent.Profesor}</p>
                                        </div>
                                    )}
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
                                                    return (
                                                        <div key={`f-${i}`} className="flex justify-between items-center p-3 mb-2 bg-red-500/10 rounded-lg border border-red-500/20 gap-3">
                                                            <div className="flex flex-col">
                                                                <span className="text-red-400 font-medium">{date.toLocaleDateString('es-MX', { weekday: 'long', day: '2-digit', month: 'long' })}</span>
                                                                <span className="text-xs text-red-500/70">Asistencia grupal sin registro personal.</span>
                                                            </div>
                                                            {!isReadOnly && (
                                                                <Button onClick={() => handleJustifyAbsence(falta)} size="sm" variant="ghost" className="text-theme-accent2-400 hover:text-theme-accent2-300 hover:bg-theme-accent2-500/10 h-8 text-xs font-semibold px-3">
                                                                    Justificar
                                                                </Button>
                                                            )}
                                                        </div>
                                                    )
                                                })}
                                            </div>
                                        )}
                                        {(() => {
                                            try {
                                                const dates = JSON.parse(selectedStudent['Fechas y Horas de Asistencia'] || '[]');
                                                if (!Array.isArray(dates) || dates.length === 0) return <p className="text-theme-muted/80 text-sm">Sin registros.</p>;
                                                return dates.map((d: any, i: number) => {
                                                    const dateStr = typeof d === 'string' ? d : d.date;
                                                    const status = typeof d === 'object' ? d.status : 'Asistencia';
                                                    const notes = typeof d === 'object' ? d.notes : '';
                                                    const date = new Date(dateStr);

                                                    const isJustificado = status === 'Justificado';
                                                    let histDateStr = '';
                                                    if (isJustificado && notes) {
                                                        const match = notes.match(/histórico \((.+?)\)/i);
                                                        if (match && match[1]) {
                                                            const parts = match[1].split('-');
                                                            if (parts.length === 3) {
                                                                histDateStr = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2])).toLocaleDateString('es-MX', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
                                                            } else {
                                                                histDateStr = match[1];
                                                            }
                                                        }
                                                    }

                                                    return (
                                                        <div key={i} className={cn("flex flex-col sm:flex-row justify-between items-start sm:items-center p-3 rounded-xl border gap-3", isJustificado ? "bg-[#0ea5e9]/10 border-[#0ea5e9]/20 shadow-inner" : "bg-theme-border/50 border-theme-border")}>
                                                            <div className="flex flex-col gap-1.5">
                                                                <div className="flex items-center gap-2">
                                                                    <span className="text-gray-200 font-medium">{date.toLocaleDateString('es-MX', { weekday: 'long', day: '2-digit', month: 'long' })}</span>
                                                                    {isJustificado && <span className="text-[10px] bg-[#0ea5e9] text-white px-2 py-0.5 rounded uppercase font-bold tracking-wider shadow-sm">Justificada</span>}
                                                                </div>
                                                                {isJustificado && histDateStr ? (
                                                                    <span className="text-xs text-[#0ea5e9] font-medium">Registrado el: {date.toLocaleDateString('es-MX')} • Cubre falta del: {histDateStr}</span>
                                                                ) : (
                                                                    <span className="text-xs text-theme-muted/80 font-mono">{date.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}</span>
                                                                )}
                                                            </div>
                                                            {!isReadOnly && (
                                                                <Button onClick={() => handleDeleteAttendance(dateStr)} size="sm" variant="ghost" className="text-red-400 hover:text-red-300 hover:bg-red-500/10 h-8 text-xs font-semibold px-3 ml-auto">
                                                                    <span className="material-icons-round text-[16px] mr-1">delete</span> Borrar
                                                                </Button>
                                                            )}
                                                        </div>
                                                    )
                                                });
                                            } catch (e) { return <p>Error cargando fechas.</p>; }
                                        })()}
                                    </div>
                                ) : (
                                    <div className="overflow-x-auto mt-4 p-4 bg-theme-border/50 border border-theme-border rounded-2xl max-h-[40vh]">
                                        <p className="font-medium mb-4 flex items-center gap-2"><span className="material-icons-round text-theme-accent1-400">calendar_month</span> Vista Mensual</p>
                                        {(() => {
                                            let rawAsistencias: { date: Date, isJustificado: boolean, isHist: boolean, histDate: Date | null }[] = [];
                                            try {
                                                const parsed = JSON.parse(selectedStudent['Fechas y Horas de Asistencia'] || '[]');
                                                if (Array.isArray(parsed)) {
                                                    rawAsistencias = parsed.map(d => {
                                                        const dateStr = typeof d === 'string' ? d : d.date;
                                                        const status = typeof d === 'object' ? d.status : 'Asistencia';
                                                        const notes = typeof d === 'object' ? d.notes : '';
                                                        let histDate: Date | null = null;
                                                        if (status === 'Justificado' && typeof notes === 'string') {
                                                            const match = notes.match(/histórico \((.+?)\)/i);
                                                            if (match && match[1]) {
                                                                const parts = match[1].split('-');
                                                                histDate = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
                                                            }
                                                        }
                                                        return {
                                                            date: new Date(dateStr),
                                                            isJustificado: status === 'Justificado',
                                                            isHist: histDate !== null,
                                                            histDate: histDate
                                                        };
                                                    }).filter(d => !isNaN(d.date.getTime()));
                                                }
                                            } catch (e) { }

                                            const rawFaltas: Date[] = (selectedStudent.faltasCalculadas || []).map(f => {
                                                const parts = f.split('-');
                                                return new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
                                            });

                                            // Si hay justificantes historicos, mostramos su caja azul en el dia historico en vez del dia registrado para mantener el orden cronologico real
                                            const allRecords: { date: Date, type: 'asistencia' | 'falta' | 'justificado' }[] = [
                                                ...rawAsistencias.map(d => ({ date: d.isHist && d.histDate ? d.histDate : d.date, type: (d.isJustificado ? 'justificado' as const : 'asistencia' as const) })),
                                                ...rawFaltas.map(d => ({ date: d, type: 'falta' as const }))
                                            ].sort((a, b) => a.date.getTime() - b.date.getTime());

                                            if (allRecords.length === 0) return <p className="text-theme-muted/80 text-sm">No hay registro en este periodo.</p>;

                                            const numFormat = new Intl.DateTimeFormat('es-MX', { month: 'long', year: 'numeric' });
                                            const groups: Record<string, { date: Date, type: 'asistencia' | 'falta' | 'justificado' }[]> = {};
                                            allRecords.forEach(rec => {
                                                const monthKey = numFormat.format(rec.date);
                                                if (!groups[monthKey]) groups[monthKey] = [];
                                                groups[monthKey].push(rec);
                                            });

                                            return Object.entries(groups).map(([monthName, records], idx) => (
                                                <div key={idx} className="mb-6 last:mb-0">
                                                    <div className="grid grid-cols-[auto_1fr] gap-4 items-center mb-3">
                                                        <div className="font-medium text-theme-muted uppercase text-xs tracking-wider border-r border-theme-border pr-4 w-28 text-right">{monthName}</div>
                                                        <div className="flex gap-2 flex-wrap">
                                                            {records.map((rec, rIdx) => {
                                                                const isAsistencia = rec.type === 'asistencia';
                                                                const isJustificado = rec.type === 'justificado';
                                                                return (
                                                                    <div key={rIdx} className={cn("w-[2.5rem] h-[3rem] rounded-lg flex flex-col items-center justify-center text-xs font-mono shadow-sm border transition-shadow", isJustificado ? "bg-[#0ea5e9]/10 border-[#0ea5e9]/30 text-[#0ea5e9]" : isAsistencia ? "bg-theme-accent2-500/10 border-theme-accent2-500/20 text-theme-accent2-400" : "bg-red-500/10 border-red-500/20 text-red-400")}>
                                                                        <span className="font-bold mb-1">{rec.date.getDate()}</span>
                                                                        <span className="material-icons-round text-[14px]">{isJustificado ? 'info' : isAsistencia ? 'check_circle' : 'close'}</span>
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
                                <div className="mt-8 pt-6 border-t border-theme-border flex flex-wrap items-center justify-between gap-3 no-print">
                                    <Button onClick={() => setSelectedStudent(null)} className="flex-1 min-w-[120px] bg-theme-border/50 hover:bg-theme-border/100 text-theme-text h-11" variant="outline">
                                        <span className="material-icons-round mr-2 text-sm">arrow_back</span> Regresar
                                    </Button>
                                    <Button onClick={() => window.print()} className="flex-1 min-w-[120px] bg-theme-accent2-600 hover:bg-theme-accent2-700 h-11">
                                        <span className="material-icons-round mr-2 text-sm">picture_as_pdf</span> Imprimir PDF
                                    </Button>
                                </div>
                            </div>
                        )}
                    </Modal>

                </div>
            )}
        </div>
    );
}
