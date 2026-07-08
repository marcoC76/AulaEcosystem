import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { cn } from '../../lib/utils';

import { fetchAppConfig, fetchReportData, fetchStudentsDB, insertJustifiedAbsence, deleteAttendanceRecord, fetchParcialesConfig } from '../../lib/dataService';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { useToast } from '../../hooks/useToast';
import { searchStudents, getUniqueGroups, getStudentName, getStudentControl, getStudentEspecialidad } from '../../lib/search';
import type { StudentSearchResult } from '../../lib/search';
import type { ConfigOption, AttendanceRecord, ParcialConfig, ExtendedAttendanceRecord } from '../../types';

import AulaLookFilters from './AulaLookFilters';
import AulaLookDashboard from './AulaLookDashboard';
import AulaLookCharts from './AulaLookCharts';
import AulaLookTable from './AulaLookTable';
import * as PDF from './AulaLookPDF';

function cssVar(name: string): string {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

export default function AulaLook({ isReadOnly = false }: { isReadOnly?: boolean }) {
    const { toast } = useToast();
    const [confirmAction, setConfirmAction] = useState<{ message: string; onConfirm: () => void } | null>(null);
    const [config, setConfig] = useState<{ profesores: ConfigOption[], materias: ConfigOption[] }>({ profesores: [], materias: [] });
    const [parciales, setParciales] = useState<ParcialConfig[]>([]);

    const [selectedPeriod, setSelectedPeriod] = useState<string>(() => localStorage.getItem('aulalook_selectedPeriod') || '1');
    const [mode, setMode] = useState<'group' | 'student'>(() => (localStorage.getItem('aulalook_mode') as 'group' | 'student') || 'group');
    const [step, setStep] = useState<number>(() => {
        const saved = localStorage.getItem('aulalook_step');
        return saved !== null ? Number(saved) : 0;
    });
    const [selectedTeacher, setSelectedTeacher] = useState<string>(() => localStorage.getItem('aulalook_selectedTeacher') || '');
    const [selectedSubject, setSelectedSubject] = useState<string>(() => localStorage.getItem('aulalook_selectedSubject') || '');
    const [selectedGroups, setSelectedGroups] = useState<string[]>(() => {
        const saved = localStorage.getItem('aulalook_selectedGroups');
        if (saved) {
            try { return JSON.parse(saved); } catch (e) {}
        }
        return [];
    });

    const [searchQuery, setSearchQuery] = useState(() => localStorage.getItem('aulalook_searchQuery') || '');
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [selectedSearchStudent, setSelectedSearchStudent] = useState<StudentSearchResult | null>(() => {
        const saved = localStorage.getItem('aulalook_selectedSearchStudent');
        if (saved) {
            try { return JSON.parse(saved); } catch (e) {}
        }
        return null;
    });

    const [data, setData] = useState<ExtendedAttendanceRecord[]>([]);
    const [prevPeriodData, setPrevPeriodData] = useState<ExtendedAttendanceRecord[]>([]);
    const [studentModeData, setStudentModeData] = useState<ExtendedAttendanceRecord[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [selectedStudent, setSelectedStudent] = useState<ExtendedAttendanceRecord | null>(null);
    const [modalView, setModalView] = useState<'list' | 'sheet' | 'calendar'>('list');
    const [localSearchQuery, setLocalSearchQuery] = useState('');
    const [filterRisk, setFilterRisk] = useState<'all' | 'perfect' | 'risk'>('all');
    const [sortField, setSortField] = useState<string>('name');
    const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 20;

    const [isFullscreen, setIsFullscreen] = useState(false);
    const chartsContainerRef = useRef<HTMLDivElement>(null);

    const [showCriticalAlert, setShowCriticalAlert] = useState(true);

    const [availableGroups, setAvailableGroups] = useState<string[]>([]);
    const [studentsDB, setStudentsDB] = useState<any[]>([]);
    const modalRef = useRef<HTMLDivElement>(null);
    const initialLoadRef = useRef(false);

    // ── Persist state ──
    useEffect(() => {
        localStorage.setItem('aulalook_selectedPeriod', selectedPeriod);
        localStorage.setItem('aulalook_mode', mode);
        localStorage.setItem('aulalook_step', String(step));
        localStorage.setItem('aulalook_selectedTeacher', selectedTeacher);
        localStorage.setItem('aulalook_selectedSubject', selectedSubject);
        localStorage.setItem('aulalook_selectedGroups', JSON.stringify(selectedGroups));
        localStorage.setItem('aulalook_searchQuery', searchQuery);
        localStorage.setItem('aulalook_selectedSearchStudent', selectedSearchStudent ? JSON.stringify(selectedSearchStudent) : '');
    }, [selectedPeriod, mode, step, selectedTeacher, selectedSubject, selectedGroups, searchQuery, selectedSearchStudent]);

    useEffect(() => {
        const handleFullscreenChange = () => {
            setIsFullscreen(!!document.fullscreenElement);
        };
        document.addEventListener('fullscreenchange', handleFullscreenChange);
        return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
    }, []);

    const toggleFullscreen = useCallback(() => {
        if (!document.fullscreenElement) {
            chartsContainerRef.current?.requestFullscreen().catch((err) => console.error('AulaLook: requestFullscreen failed:', err));
        } else {
            document.exitFullscreen();
        }
    }, []);

    // ── Data fetchers ──
    useEffect(() => {
        fetchAppConfig().then(setConfig).catch((err) => {
            console.error('AulaLook: fetchAppConfig failed:', err);
            toast('Error al cargar configuración remota.', 'error');
        });
        fetchParcialesConfig().then(parts => {
            setParciales(parts);
            if (parts.length > 0 && !localStorage.getItem('aulalook_selectedPeriod')) {
                setSelectedPeriod(parts[0].id);
            }
        }).catch((err) => {
            console.error('AulaLook: fetchParcialesConfig failed:', err);
            toast('Error al cargar configuración de parciales.', 'error');
        });
        fetchStudentsDB().then(students => {
            setStudentsDB(students);
            setAvailableGroups(getUniqueGroups(students));
        }).catch((err) => {
            console.error('AulaLook: fetchStudentsDB failed:', err);
            toast('Error al cargar base de datos de alumnos.', 'error');
        });
    }, []);

    useEffect(() => {
        setCurrentPage(1);
    }, [localSearchQuery, filterRisk, sortField, sortDir]);

    // ── Core data loading functions (hoisted) ──
    async function loadGroupData(periodId = selectedPeriod, groupsToFetch = selectedGroups) {
        setIsLoading(true);
        try {
            if (groupsToFetch.length === 0) {
                setData([]);
                setPrevPeriodData([]);
                setIsLoading(false);
                return;
            }

            const allMergedRes: ExtendedAttendanceRecord[] = [];
            for (const groupName of groupsToFetch) {
                const [rawGroup, ...specParts] = groupName.split(' - ');
                const baseGroup = rawGroup.trim();
                const specialtyFilter = specParts.join(' - ').trim();

                const res = await fetchReportData({ teacher: selectedTeacher, subject: selectedSubject, group: baseGroup, parcial: periodId });
                const filteredRes = res.filter(r => !specialtyFilter || String(r.Especialidad || '').trim() === specialtyFilter);

                let maxAsistencias = 0;
                let masterStudent: AttendanceRecord | null = null;
                filteredRes.forEach(d => {
                    const asis = Number(d.Asistencias);
                    if (asis > maxAsistencias) { maxAsistencias = asis; masterStudent = d; }
                });

                const groupStudents = studentsDB.filter(s => {
                    if (String(s.Grupo).trim() !== baseGroup) return false;
                    return !specialtyFilter || getStudentEspecialidad(s).trim() === specialtyFilter;
                });
                const mergedRes: ExtendedAttendanceRecord[] = [];
                groupStudents.forEach(gs => {
                    const formattedName = getStudentName(gs);
                    const sControl = getStudentControl(gs);
                    const serverRecord = filteredRes.find(r => String(r['Número de Control']).trim() === sControl) as ExtendedAttendanceRecord | undefined;
                    if (serverRecord) {
                        serverRecord.apellidoPaterno = gs['Apellido Paterno'];
                        serverRecord['Nombre del Alumno'] = formattedName;
                        mergedRes.push(serverRecord);
                    } else {
                        mergedRes.push({
                            "Número de Control": sControl || '000',
                            "Nombre del Alumno": formattedName,
                            "Profesor": selectedTeacher,
                            "Materia": selectedSubject,
                            "Grupo": baseGroup,
                            "Periodo": 1,
                            "Asistencias": 0,
                            "Total de Clases": maxAsistencias > 0 ? maxAsistencias : 1,
                            "Porcentaje": 0,
                            "Fechas y Horas de Asistencia": '[]',
                            "Especialidad": getStudentEspecialidad(gs) || 'Desconocido',
                            apellidoPaterno: gs['Apellido Paterno']
                        });
                    }
                });
                filteredRes.forEach(r => {
                    if (!mergedRes.some(m => String(m['Número de Control']).trim() === String(r['Número de Control']).trim())) {
                        mergedRes.push(r);
                    }
                });

                const masterDates = new Set<string>();
                if (masterStudent && (masterStudent as AttendanceRecord)['Fechas y Horas de Asistencia']) {
                    try {
                        let fechasStr: any = (masterStudent as AttendanceRecord)['Fechas y Horas de Asistencia'];
                        if (Array.isArray(fechasStr)) fechasStr = JSON.stringify(fechasStr);
                        JSON.parse(fechasStr).forEach((fReq: any) => {
                            const dateObj = new Date(typeof fReq === 'object' ? fReq.date : fReq);
                            if (!isNaN(dateObj.getTime())) masterDates.add(dateObj.toISOString().split('T')[0]);
                        });
                    } catch (e) {}
                }

                const processedData = mergedRes.map(d => {
                    const newTotal = maxAsistencias > 0 ? maxAsistencias : 1;
                    const studentDates = new Set<string>();
                    const historicoJustificado = new Set<string>();
                    try {
                        let fechasStr: any = d['Fechas y Horas de Asistencia'];
                        if (Array.isArray(fechasStr)) fechasStr = JSON.stringify(fechasStr);
                        JSON.parse(fechasStr || '[]').forEach((fReq: any) => {
                            const fStr = typeof fReq === 'object' ? fReq.date : fReq;
                            const status = typeof fReq === 'object' ? fReq.status : 'Asistencia';
                            const notes = typeof fReq === 'object' ? fReq.notes : '';
                            const dateObj = new Date(fStr);
                            if (!isNaN(dateObj.getTime())) studentDates.add(dateObj.toISOString().split('T')[0]);
                            if (status === 'Justificado' && typeof notes === 'string') {
                                const match = notes.match(/histórico \((.+?)\)/i);
                                if (match && match[1]) historicoJustificado.add(match[1]);
                            }
                        });
                    } catch (e) {}
                    const faltas: string[] = [];
                    Array.from(masterDates).sort().forEach(md => {
                        if (!studentDates.has(md) && !historicoJustificado.has(md)) faltas.push(md);
                    });
                    let racha = 0;
                    const sortedMasterDates = Array.from(masterDates).sort();
                    for (let i = sortedMasterDates.length - 1; i >= 0; i--) {
                        if (!studentDates.has(sortedMasterDates[i]) && !historicoJustificado.has(sortedMasterDates[i])) {
                            racha++;
                        } else break;
                    }
                    return { ...d, 'Total de Clases': newTotal, Porcentaje: Number(d.Asistencias) / newTotal, faltasCalculadas: faltas, rachaFaltas: racha };
                });
                allMergedRes.push(...processedData);
            }

            setData(allMergedRes.sort((a, b) => (a['Nombre del Alumno'] || '').localeCompare(b['Nombre del Alumno'] || '', 'es', { sensitivity: 'base' })));

            const currentIdx = parciales.findIndex(p => p.id === periodId);
            const prevPeriod = currentIdx > 0 ? parciales[currentIdx - 1] : null;
            if (prevPeriod) {
                const prevResults: ExtendedAttendanceRecord[] = [];
                for (const groupName of groupsToFetch) {
                    const [rawGroup, ...specParts] = groupName.split(' - ');
                    const baseGroup = rawGroup.trim();
                    const specialtyFilter = specParts.join(' - ').trim();
                    const res = await fetchReportData({ teacher: selectedTeacher, subject: selectedSubject, group: baseGroup, parcial: prevPeriod.id });
                    prevResults.push(...res.filter(r => !specialtyFilter || String(r.Especialidad || '').trim() === specialtyFilter));
                }
                setPrevPeriodData(prevResults);
            } else setPrevPeriodData([]);
        } catch (error) {
            console.error('Error cargando datos de grupo:', error);
            toast('Error al cargar los datos del grupo.', 'error');
        } finally { setIsLoading(false); }
    }

    async function loadStudentData(periodId = selectedPeriod) {
        if (!selectedSearchStudent) return;
        setIsLoading(true);
        try {
            const sControl = selectedSearchStudent.control;
            let rawRes: any[] = [];
            const chunkSize = 4;
            for (let i = 0; i < config.materias.length; i += chunkSize) {
                const chunk = config.materias.slice(i, i + chunkSize);
                (await Promise.all(chunk.map(m => fetchReportData({ group: '', subject: m.text, parcial: periodId })))).forEach(resArray => {
                    if (Array.isArray(resArray)) rawRes = rawRes.concat(resArray);
                });
            }

            const materiasMap = new Map<string, ExtendedAttendanceRecord[]>();
            rawRes.forEach(r => {
                const m = r.Materia || 'Desconocida';
                if (!materiasMap.has(m)) materiasMap.set(m, []);
                materiasMap.get(m)!.push(r);
            });

            const studentResults: ExtendedAttendanceRecord[] = [];
            materiasMap.forEach((records, materiaName) => {
                let maxAsistencias = 0;
                let masterStudent: any = null;
                records.forEach(d => { const a = Number(d.Asistencias); if (a > maxAsistencias) { maxAsistencias = a; masterStudent = d; } });
                const newTotal = maxAsistencias > 0 ? maxAsistencias : 1;
                const serverRecord = records.find(r => String(r['Número de Control']).trim() === sControl) as ExtendedAttendanceRecord | undefined;
                const finalRecord: ExtendedAttendanceRecord = serverRecord
                    ? { ...serverRecord, 'Total de Clases': newTotal, Porcentaje: Number(serverRecord.Asistencias) / newTotal }
                    : { "Número de Control": sControl, "Nombre del Alumno": selectedSearchStudent.nombre, "Profesor": masterStudent?.Profesor || "Varios", "Materia": materiaName, "Grupo": '', "Periodo": 1, "Asistencias": 0, "Total de Clases": newTotal, "Porcentaje": 0, "Fechas y Horas de Asistencia": '[]', "Especialidad": '', apellidoPaterno: '' };

                const masterDates = new Set<string>();
                if (masterStudent?.['Fechas y Horas de Asistencia']) {
                    try {
                        let fs: any = masterStudent['Fechas y Horas de Asistencia'];
                        if (Array.isArray(fs)) fs = JSON.stringify(fs);
                        JSON.parse(fs).forEach((fReq: any) => { const d = new Date(typeof fReq === 'object' ? fReq.date : fReq); if (!isNaN(d.getTime())) masterDates.add(d.toISOString().split('T')[0]); });
                    } catch (e) {}
                }
                const studentDates = new Set<string>();
                const historicoJustificado = new Set<string>();
                if (finalRecord['Fechas y Horas de Asistencia']) {
                    try {
                        let fs: any = finalRecord['Fechas y Horas de Asistencia'];
                        if (Array.isArray(fs)) fs = JSON.stringify(fs);
                        JSON.parse(fs).forEach((fReq: any) => {
                            const fStr = typeof fReq === 'object' ? fReq.date : fReq;
                            const status = typeof fReq === 'object' ? fReq.status : 'Asistencia';
                            const notes = typeof fReq === 'object' ? fReq.notes : '';
                            const d = new Date(fStr);
                            if (!isNaN(d.getTime())) studentDates.add(d.toISOString().split('T')[0]);
                            if (status === 'Justificado' && typeof notes === 'string') { const m = notes.match(/histórico \((.+?)\)/i); if (m?.[1]) historicoJustificado.add(m[1]); }
                        });
                    } catch (e) {}
                }
                const faltas = Array.from(masterDates).sort().filter(md => !studentDates.has(md) && !historicoJustificado.has(md));
                const sortedMD = Array.from(masterDates).sort();
                let racha = 0;
                for (let i = sortedMD.length - 1; i >= 0; i--) { if (!studentDates.has(sortedMD[i]) && !historicoJustificado.has(sortedMD[i])) racha++; else break; }
                finalRecord.faltasCalculadas = faltas;
                finalRecord.rachaFaltas = racha;
                studentResults.push(finalRecord);
            });

            setStudentModeData(studentResults.sort((a, b) => (a.Materia || '').localeCompare(b.Materia || '')));

            const currentIdx = parciales.findIndex(p => p.id === periodId);
            const prevPeriod = currentIdx > 0 ? parciales[currentIdx - 1] : null;
            if (prevPeriod) {
                let prevRawRes: any[] = [];
                for (let i = 0; i < config.materias.length; i += chunkSize) {
                    (await Promise.all(config.materias.slice(i, i + chunkSize).map(m => fetchReportData({ group: '', subject: m.text, parcial: prevPeriod.id })))).forEach(resArray => {
                        if (Array.isArray(resArray)) prevRawRes = prevRawRes.concat(resArray);
                    });
                }
                setPrevPeriodData(prevRawRes.filter(r => String(r['Número de Control']).trim() === sControl));
            } else setPrevPeriodData([]);
        } catch (error) {
            console.error('Error cargando datos de alumno:', error);
            toast('Error al cargar los datos del alumno.', 'error');
        } finally { setIsLoading(false); }
    }

    // Trigger initial load if step is already 3 (e.g. state loaded from localStorage)
    useEffect(() => {
        if (step === 3 && studentsDB.length > 0 && parciales.length > 0 && !initialLoadRef.current) {
            initialLoadRef.current = true;
            if (mode === 'group') {
                if (selectedTeacher && selectedSubject && selectedGroups.length > 0) {
                    loadGroupData(selectedPeriod, selectedGroups);
                }
            } else {
                if (selectedSearchStudent) {
                    loadStudentData(selectedPeriod);
                }
            }
        }
    }, [step, studentsDB, parciales, mode, selectedTeacher, selectedSubject, selectedGroups, selectedSearchStudent, selectedPeriod]);

    // ── Action callbacks ──
    const handleJustifyAbsence = useCallback(async (dateStr: string) => {
        if (!selectedStudent) return;
        setConfirmAction({
            message: `¿Estás seguro de justificar la falta del ${dateStr}?`,
            onConfirm: async () => {
                try {
                    setIsLoading(true);
                    await insertJustifiedAbsence({
                        No: String(selectedStudent['Nombre del Alumno'] || ''),
                        ID: String(selectedStudent['Número de Control']),
                        Gr: String(selectedStudent.Grupo || (selectedGroups[0] || '')),
                        Es: String(selectedStudent.Especialidad || ''),
                        Pe: 1,
                        Pro: String(selectedStudent.Profesor || selectedTeacher),
                        Ma: String(selectedStudent.Materia || selectedSubject),
                        date: dateStr
                    });
                    setSelectedStudent(null);
                    mode === 'group' ? await loadGroupData() : await loadStudentData();
                } catch (error) {
                    console.error('Error justificando falta:', error);
                    toast('Error al justificar la falta.', 'error');
                    setIsLoading(false);
                }
            }
        });
    }, [selectedStudent, selectedGroups, selectedTeacher, selectedSubject, mode]);

    const handleDeleteAttendance = useCallback(async (dateStr: string) => {
        if (!selectedStudent) return;
        setConfirmAction({
            message: `¿Estás seguro de borrar la asistencia del ${new Date(dateStr).toLocaleString('es-MX')}?`,
            onConfirm: async () => {
                try {
                    setIsLoading(true);
                    await deleteAttendanceRecord(selectedStudent.Materia || selectedSubject, String(selectedStudent['Número de Control']), dateStr);
                    setSelectedStudent(null);
                    mode === 'group' ? await loadGroupData() : await loadStudentData();
                } catch (error) {
                    console.error('Error borrando asistencia:', error);
                    toast('Error al borrar la asistencia.', 'error');
                    setIsLoading(false);
                }
            }
        });
    }, [selectedStudent, selectedSubject, mode]);

    const handleNext = async () => {
        if (mode === 'group') {
            if (step === 0 && !selectedTeacher) return;
            if (step === 1 && !selectedSubject) return;
            if (step === 2 && selectedGroups.length === 0) return;
            if (step === 2) { setStep(3); setLocalSearchQuery(''); loadGroupData(); }
            else setStep(s => s + 1);
        } else {
            if (!selectedSearchStudent) { toast("Por favor selecciona un alumno primero.", "error"); return; }
            setStep(3); setLocalSearchQuery(''); loadStudentData();
        }
    };
    const handleBack = () => setStep(s => Math.max(0, s - 1));

    // ── Derived data (useMemo) ──
    const suggestions = useMemo(() => searchQuery.length < 2 ? [] : searchStudents(studentsDB, searchQuery, 5), [studentsDB, searchQuery]);

    const activeData = useMemo(() => {
        return (mode === 'group' ? data : studentModeData).filter(item => {
            let matchSearch = true;
            if (localSearchQuery) {
                const q = localSearchQuery.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
                if (mode === 'group') {
                    const n = (item['Nombre del Alumno'] || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
                    matchSearch = n.includes(q) || (item['Número de Control'] || '').toLowerCase().includes(q);
                } else {
                    const m = (item.Materia || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
                    const p = (item.Profesor || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
                    matchSearch = m.includes(q) || p.includes(q);
                }
            }
            if (!matchSearch) return false;
            if (filterRisk === 'perfect' && item.Porcentaje < 1.0) return false;
            if (filterRisk === 'risk' && item.Porcentaje >= 0.8) return false;
            return true;
        }).sort((a, b) => {
            let fA: string | number = '', fB: string | number = '';
            if (sortField === 'name') { fA = mode === 'group' ? (a['Nombre del Alumno'] || '') : (a.Materia || ''); fB = mode === 'group' ? (b['Nombre del Alumno'] || '') : (b.Materia || ''); }
            else if (sortField === 'control') { fA = mode === 'group' ? (a['Número de Control'] || '') : (a.Profesor || ''); fB = mode === 'group' ? (b['Número de Control'] || '') : (b.Profesor || ''); }
            else if (sortField === 'classes') { fA = a.Asistencias; fB = b.Asistencias; }
            else if (sortField === 'percentage') { fA = a.Porcentaje; fB = b.Porcentaje; }
            return typeof fA === 'string' && typeof fB === 'string' ? (sortDir === 'asc' ? fA.localeCompare(fB, 'es', { sensitivity: 'base' }) : fB.localeCompare(fA, 'es', { sensitivity: 'base' })) : sortDir === 'asc' ? (fA as number) - (fB as number) : (fB as number) - (fA as number);
        });
    }, [mode, data, studentModeData, localSearchQuery, filterRisk, sortField, sortDir]);

    const paginatedData = useMemo(() => activeData.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE), [activeData, currentPage]);
    const totalPages = Math.ceil(activeData.length / ITEMS_PER_PAGE);

    const stats = useMemo(() => {
        let sumAsistencias = 0;
        const dc: Record<string, { date: Date; count: number }> = {};
        const wd = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
        activeData.forEach(d => {
            sumAsistencias += d.Asistencias;
            try { JSON.parse(d['Fechas y Horas de Asistencia'] || '[]').forEach((fReq: any) => { const dateObj = new Date(typeof fReq === 'object' ? fReq.date : fReq); if (!isNaN(dateObj.getTime())) { const k = dateObj.toISOString().split('T')[0]; if (!dc[k]) dc[k] = { date: dateObj, count: 0 }; dc[k].count++; } }); } catch (e) {}
            if (d.faltasCalculadas) d.faltasCalculadas.forEach(f => { const dt = new Date(parseInt(f.split('-')[0]), parseInt(f.split('-')[1]) - 1, parseInt(f.split('-')[2])); const day = dt.getDay(); if (day >= 1 && day <= 5) wd[day as keyof typeof wd]++; });
        });
        const total = activeData.length;
        const avg = total ? activeData.reduce((a, c) => a + c.Porcentaje, 0) / total : 0;
        const risk = activeData.filter(d => d.Porcentaje < 0.8).length;
        const perf = activeData.filter(d => d.Porcentaje === 1.0).length;
        return {
            totalItems: total, totalAsistencias: sumAsistencias, avgAttendance: avg, atRisk: risk, perfect: perf,
            statusData: [
                { name: 'Riesgo (<80%)', value: risk, color: cssVar('--theme-accent1-500') || '#ef4444' },
                { name: 'Regular', value: total - risk - perf, color: cssVar('--theme-warning-500') || '#eab308' },
                { name: 'Perfecta', value: perf, color: cssVar('--theme-accent2-500') || '#10b981' },
            ],
            currentTimeline: Object.values(dc).sort((a, b) => a.date.getTime() - b.date.getTime()),
            weekdayData: [
                { name: 'Lun', faltas: wd[1] }, { name: 'Mar', faltas: wd[2] }, { name: 'Mié', faltas: wd[3] },
                { name: 'Jue', faltas: wd[4] }, { name: 'Vie', faltas: wd[5] },
            ],
            dateCounts: dc,
        };
    }, [activeData]);

    const { totalItems, totalAsistencias, avgAttendance, atRisk, statusData, weekdayData, dateCounts } = stats;

    const prevTimelineData = useMemo(() => {
        const pdc: Record<string, { date: Date; count: number }> = {};
        prevPeriodData.forEach(d => {
            try { JSON.parse(d['Fechas y Horas de Asistencia'] || '[]').forEach((fReq: any) => { const dateObj = new Date(typeof fReq === 'object' ? fReq.date : fReq); if (!isNaN(dateObj.getTime())) { const k = dateObj.toISOString().split('T')[0]; if (!pdc[k]) pdc[k] = { date: dateObj, count: 0 }; pdc[k].count++; } }); } catch (e) {}
        });
        return Object.values(pdc).sort((a, b) => a.date.getTime() - b.date.getTime());
    }, [prevPeriodData]);

    const timelineData = useMemo(() => {
        const maxLen = Math.max(stats.currentTimeline.length, prevTimelineData.length);
        return Array.from({ length: maxLen }, (_, i) => ({
            name: stats.currentTimeline[i] ? stats.currentTimeline[i].date.toLocaleDateString('es-MX', { month: 'short', day: 'numeric' }) : `Clase ${i + 1}`,
            asistencias: stats.currentTimeline[i]?.count,
            asistenciasPrev: prevTimelineData[i]?.count,
        }));
    }, [stats.currentTimeline, prevTimelineData]);

    const criticalStudents = useMemo(() => activeData.filter(d => (d.rachaFaltas || 0) >= 3), [activeData]);

    // ── Export wrappers ──
    const handleDownloadReport = useCallback(() => {
        PDF.downloadReportCSV(mode, data, studentModeData, selectedGroups, selectedSubject, selectedSearchStudent);
    }, [mode, data, studentModeData, selectedGroups, selectedSubject, selectedSearchStudent]);

    const handleDownloadAbsenceReport = useCallback(() => {
        PDF.downloadAbsenceReportCSV(mode, data, studentModeData, selectedGroups, selectedSearchStudent);
    }, [mode, data, studentModeData, selectedGroups, selectedSearchStudent]);

    const handleExportPDF = useCallback(async () => {
        if ((mode === 'group' ? data : studentModeData).length === 0) { toast('No hay datos para exportar.', 'error'); return; }
        setIsLoading(true);
        try {
            await PDF.exportPDFReport(mode, data, studentModeData, selectedGroups, selectedSearchStudent, selectedTeacher, selectedSubject, selectedPeriod, parciales);
        } catch (error) {
            console.error('Error al generar PDF:', error);
            toast('Hubo un error al generar el PDF.', 'error');
        } finally { setIsLoading(false); }
    }, [mode, data, studentModeData, selectedGroups, selectedSearchStudent, selectedTeacher, selectedSubject, selectedPeriod, parciales]);

    const handleExportSabanaPDF = useCallback(async () => {
        if (data.length === 0) { toast("No hay datos para exportar.", "error"); return; }
        setIsLoading(true);
        try {
            await PDF.exportSabanaPDF(data, selectedGroups, selectedSubject, selectedTeacher, selectedPeriod, parciales, studentsDB, dateCounts);
        } catch (error) {
            console.error('Error al generar PDF Sábana:', error);
            toast('Hubo un error al generar el PDF Sábana.', 'error');
        } finally { setIsLoading(false); }
    }, [data, selectedGroups, selectedSubject, selectedTeacher, selectedPeriod, parciales, studentsDB, dateCounts]);

    const handleExportStudentDetailPDF = useCallback(async (student: ExtendedAttendanceRecord) => {
        setIsLoading(true);
        try {
            await PDF.exportStudentDetailPDF(student, studentsDB, selectedGroups, selectedSubject, selectedTeacher, selectedPeriod, parciales);
        } catch (error) {
            console.error('Error al generar PDF detalle:', error);
            toast('Hubo un error al generar el PDF.', 'error');
        } finally { setIsLoading(false); }
    }, [studentsDB, selectedGroups, selectedSubject, selectedTeacher, selectedPeriod, parciales]);

    const handlePeriodChange = useCallback((newPeriod: string) => {
        setSelectedPeriod(newPeriod);
        mode === 'group' ? loadGroupData(newPeriod) : loadStudentData(newPeriod);
    }, [mode]);

    const handleBackToFilters = useCallback(() => setStep(0), []);

    // ── Render ──
    return (
        <div className="p-4 sm:p-6 pb-24 min-h-[100dvh] bg-transparent transition-all duration-300">
            {step < 3 ? (
                <AulaLookFilters
                    mode={mode} setMode={setMode} step={step} config={config}
                    selectedTeacher={selectedTeacher} setSelectedTeacher={setSelectedTeacher}
                    selectedSubject={selectedSubject} setSelectedSubject={setSelectedSubject}
                    selectedGroups={selectedGroups} setSelectedGroups={setSelectedGroups}
                    selectedPeriod={selectedPeriod} setSelectedPeriod={setSelectedPeriod}
                    parciales={parciales}
                    searchQuery={searchQuery} setSearchQuery={setSearchQuery}
                    showSuggestions={showSuggestions} setShowSuggestions={setShowSuggestions}
                    selectedSearchStudent={selectedSearchStudent} setSelectedSearchStudent={setSelectedSearchStudent}
                    suggestions={suggestions} studentsDB={studentsDB} availableGroups={availableGroups}
                    handleNext={handleNext} handleBack={handleBack}
                />
            ) : (
                <div id="dashboard-report-content" className="space-y-6 max-w-7xl mx-auto animate-fade-in p-4 bg-theme-base rounded-3xl transition-all duration-300">
                    <AulaLookDashboard
                        mode={mode} selectedTeacher={selectedTeacher} selectedSubject={selectedSubject}
                        selectedGroups={selectedGroups} selectedSearchStudent={selectedSearchStudent}
                        parciales={parciales} selectedPeriod={selectedPeriod}
                        onPeriodChange={handlePeriodChange} onBackToFilters={handleBackToFilters}
                        onDownloadReport={handleDownloadReport} onExportPDF={handleExportPDF}
                        onExportSabanaPDF={mode === 'group' ? handleExportSabanaPDF : undefined}
                        criticalStudents={criticalStudents} showCriticalAlert={showCriticalAlert}
                        onDismissCriticalAlert={() => setShowCriticalAlert(false)}
                        totalItems={totalItems} totalAsistencias={totalAsistencias}
                        avgAttendance={avgAttendance} atRisk={atRisk}
                        isEmpty={activeData.length === 0} isLoading={isLoading}
                    />

                    {!isLoading && activeData.length > 0 && (
                        <>
                            <AulaLookCharts
                                timelineData={timelineData} prevTimelineData={prevTimelineData}
                                totalItems={totalItems} statusData={statusData} weekdayData={weekdayData}
                                isFullscreen={isFullscreen} toggleFullscreen={toggleFullscreen}
                                chartsContainerRef={chartsContainerRef}
                            />
                            <AulaLookTable
                                mode={mode} selectedGroups={selectedGroups}
                                paginatedData={paginatedData} activeData={activeData}
                                currentPage={currentPage} setCurrentPage={setCurrentPage}
                                totalPages={totalPages} ITEMS_PER_PAGE={ITEMS_PER_PAGE}
                                localSearchQuery={localSearchQuery} setLocalSearchQuery={setLocalSearchQuery}
                                filterRisk={filterRisk} setFilterRisk={setFilterRisk}
                                sortField={sortField} setSortField={setSortField}
                                sortDir={sortDir} setSortDir={setSortDir}
                                setSelectedStudent={setSelectedStudent}
                                onDownloadAbsenceReport={handleDownloadAbsenceReport}
                            />
                        </>
                    )}

                    <Modal isOpen={!!confirmAction} onClose={() => setConfirmAction(null)} title="Confirmar Acción">
                        <div className="space-y-4">
                            <p className="text-theme-muted">{confirmAction?.message}</p>
                            <div className="flex justify-end gap-3 pt-2">
                                <Button variant="outline" onClick={() => setConfirmAction(null)}>Cancelar</Button>
                                <Button variant="destructive" onClick={() => { confirmAction?.onConfirm(); setConfirmAction(null); }}>Confirmar</Button>
                            </div>
                        </div>
                    </Modal>

                    <Modal isOpen={!!selectedStudent} onClose={() => setSelectedStudent(null)}
                        title={selectedStudent ? (mode === 'group' ? selectedStudent['Nombre del Alumno'] : `${selectedStudent.Materia} - Detalles`) : 'Detalles'}
                        fullScreenOnMobile>
                        {selectedStudent && (
                            <div className="space-y-6" ref={modalRef}>
                                <div className="flex gap-2 p-1 bg-theme-border/50 rounded-lg no-print">
                                    <div role="tablist" className="flex w-full">
                                        <button role="tab" aria-selected={modalView === 'list'}
                                            className={cn("flex-1 py-1.5 text-sm font-medium rounded-md", modalView === 'list' ? "bg-theme-border/100 text-theme-text shadow" : "text-theme-muted")}
                                            onClick={() => setModalView('list')}>Lista Histórica</button>
                                        <button role="tab" aria-selected={modalView === 'sheet'}
                                            className={cn("flex-1 py-1.5 text-sm font-medium rounded-md", modalView === 'sheet' ? "bg-theme-border/100 text-theme-text shadow" : "text-theme-muted")}
                                            onClick={() => setModalView('sheet')}>Vista Mes</button>
                                        <button role="tab" aria-selected={modalView === 'calendar'}
                                            className={cn("flex-1 py-1.5 text-sm font-medium rounded-md", modalView === 'calendar' ? "bg-theme-border/100 text-theme-text shadow" : "text-theme-muted")}
                                            onClick={() => setModalView('calendar')}>Gráfico de Actividad</button>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 bg-theme-border/50 rounded-2xl border border-theme-border shadow-inner">
                                    <div><span className="text-xs text-theme-muted/80 uppercase">Asistencias</span><p className="font-bold text-lg">{selectedStudent.Asistencias} <span className="text-sm font-normal text-theme-muted">/ {selectedStudent['Total de Clases']}</span></p></div>
                                    <div><span className="text-xs text-theme-muted/80 uppercase">Promedio</span><p className={cn("font-bold text-lg", selectedStudent.Porcentaje < 0.8 ? "text-theme-accent1-400" : "text-theme-accent2-400")}>{(selectedStudent.Porcentaje * 100).toFixed(0)}%</p></div>
                                    {mode === 'student' && <div className="col-span-2"><span className="text-xs text-theme-muted/80 uppercase">Profesor</span><p className="font-medium text-sm truncate">{selectedStudent.Profesor}</p></div>}
                                </div>
                                {modalView === 'list' && (
                                    <div className="space-y-3 mt-4 max-h-[40vh] overflow-y-auto pr-2">
                                        <p className="font-medium mb-2 border-b border-theme-border pb-2">Registro Cronológico</p>
                                        {selectedStudent.faltasCalculadas && selectedStudent.faltasCalculadas.length > 0 && (
                                            <div className="mb-4">
                                                <p className="text-sm text-theme-accent1-500 font-semibold mb-2 flex items-center gap-1">
                                                    <span className="material-icons-round text-sm">warning</span> Faltas Detectadas ({selectedStudent.faltasCalculadas.length})</p>
                                                {selectedStudent.faltasCalculadas.map((falta, i) => {
                                                    const parts = falta.split('-');
                                                    const date = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
                                                    return (
                                                        <div key={`f-${i}`} className="flex justify-between items-center p-3 mb-2 bg-theme-accent1-500/10 rounded-lg border border-theme-accent1-500/20 gap-3">
                                                            <div className="flex flex-col">
                                                                <span className="text-theme-accent1-400 font-medium">{date.toLocaleDateString('es-MX', { weekday: 'long', day: '2-digit', month: 'long' })}</span>
                                                                <span className="text-xs text-theme-accent1-500/70">Asistencia grupal sin registro personal.</span>
                                                            </div>
                                                            {!isReadOnly && <Button onClick={() => handleJustifyAbsence(falta)} size="sm" variant="ghost" className="text-theme-accent2-400 hover:text-theme-accent2-300 hover:bg-theme-accent2-500/10 h-8 text-xs font-semibold px-3 animate-pulse">Justificar</Button>}
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
                                                            histDateStr = parts.length === 3 ? new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2])).toLocaleDateString('es-MX', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' }) : match[1];
                                                        }
                                                    }
                                                    return (
                                                        <div key={i} className={cn("flex flex-col sm:flex-row justify-between items-start sm:items-center p-3 rounded-xl border gap-3", isJustificado ? "bg-[#0ea5e9]/10 border-[#0ea5e9]/20 shadow-inner" : "bg-theme-border/50 border-theme-border")}>
                                                            <div className="flex flex-col gap-1.5">
                                                                <div className="flex items-center gap-2">
                                                                    <span className="text-theme-text font-medium">{date.toLocaleDateString('es-MX', { weekday: 'long', day: '2-digit', month: 'long' })}</span>
                                                                    {isJustificado && <span className="text-[10px] bg-[#0ea5e9] text-white px-2 py-0.5 rounded uppercase font-bold tracking-wider shadow-sm">Justificada</span>}
                                                                </div>
                                                                {isJustificado && histDateStr ? <span className="text-xs text-[#0ea5e9] font-medium">Registrado el: {date.toLocaleDateString('es-MX')} • Cubre falta del: {histDateStr}</span>
                                                                    : <span className="text-xs text-theme-muted/80 font-mono">{date.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}</span>}
                                                            </div>
                                                            {!isReadOnly && <Button onClick={() => handleDeleteAttendance(dateStr)} size="sm" variant="ghost" className="text-theme-accent1-400 hover:brightness-110 hover:bg-theme-accent1-500/10 h-8 text-xs font-semibold px-3 ml-auto"><span className="material-icons-round text-[16px] mr-1">delete</span> Borrar</Button>}
                                                        </div>
                                                    )
                                                });
                                            } catch (e) { return <p>Error cargando fechas.</p>; }
                                        })()}
                                    </div>
                                )}
                                {modalView === 'sheet' && (
                                    <div className="overflow-x-auto mt-4 p-4 bg-theme-border/50 border border-theme-border rounded-2xl max-h-[40vh]">
                                        <p className="font-medium mb-4 flex items-center gap-2"><span className="material-icons-round text-theme-accent1-400">calendar_month</span> Vista Mensual</p>
                                        {(() => {
                                            let rawAsistencias: { date: Date, isJustificado: boolean, isHist: boolean, histDate: Date | null }[] = [];
                                            try {
                                                const parsed = JSON.parse(selectedStudent['Fechas y Horas de Asistencia'] || '[]');
                                                if (Array.isArray(parsed)) rawAsistencias = parsed.map(d => {
                                                    const dateStr = typeof d === 'string' ? d : d.date;
                                                    const status = typeof d === 'object' ? d.status : 'Asistencia';
                                                    const notes = typeof d === 'object' ? d.notes : '';
                                                    let histDate: Date | null = null;
                                                    if (status === 'Justificado' && typeof notes === 'string') { const m = notes.match(/histórico \((.+?)\)/i); if (m?.[1]) { const p = m[1].split('-'); histDate = new Date(parseInt(p[0]), parseInt(p[1]) - 1, parseInt(p[2])); } }
                                                    return { date: new Date(dateStr), isJustificado: status === 'Justificado', isHist: histDate !== null, histDate };
                                                 }).filter(x => !isNaN(x.date.getTime()));
                                            } catch (e) {}
                                            const rawFaltas: Date[] = (selectedStudent.faltasCalculadas || []).map(f => { const p = f.split('-'); return new Date(parseInt(p[0]), parseInt(p[1]) - 1, parseInt(p[2])); });
                                            const allRecords = [...rawAsistencias.map(x => ({ date: x.isHist && x.histDate ? x.histDate : x.date, type: (x.isJustificado ? 'justificado' as const : 'asistencia' as const) })), ...rawFaltas.map(x => ({ date: x, type: 'falta' as const }))].sort((a, b) => a.date.getTime() - b.date.getTime());
                                            if (allRecords.length === 0) return <p className="text-theme-muted/80 text-sm">No hay registro en este periodo.</p>;
                                            const numFormat = new Intl.DateTimeFormat('es-MX', { month: 'long', year: 'numeric' });
                                            const groups: Record<string, typeof allRecords> = {};
                                            allRecords.forEach(rec => { const mk = numFormat.format(rec.date); if (!groups[mk]) groups[mk] = []; groups[mk].push(rec); });
                                            return Object.entries(groups).map(([monthName, records], idx) => (
                                                <div key={idx} className="mb-6 last:mb-0">
                                                    <div className="grid grid-cols-[auto_1fr] gap-4 items-center mb-3">
                                                        <div className="font-medium text-theme-muted uppercase text-xs tracking-wider border-r border-theme-border pr-4 w-28 text-right">{monthName}</div>
                                                        <div className="flex gap-2 flex-wrap">
                                                            {records.map((rec, rIdx) => {
                                                                const isA = rec.type === 'asistencia';
                                                                const isJ = rec.type === 'justificado';
                                                                return <div key={rIdx} className={cn("w-[2.5rem] h-[3rem] rounded-lg flex flex-col items-center justify-center text-xs font-mono shadow-sm border transition-shadow", isJ ? "bg-theme-accent1-500/10 border-theme-accent1-500/20 text-theme-accent1-400" : isA ? "bg-theme-accent2-500/10 border-theme-accent2-500/20 text-theme-accent2-400" : "bg-theme-accent1-500/10 border-theme-accent1-500/20 text-theme-accent1-400")}>
                                                                    <span className="font-bold mb-1">{rec.date.getDate()}</span>
                                                                    <span className="material-icons-round text-[14px]">{isJ ? 'info' : isA ? 'check_circle' : 'close'}</span>
                                                                </div>
                                                            })}
                                                        </div>
                                                    </div>
                                                </div>
                                            ));
                                        })()}
                                    </div>
                                )}
                                {modalView === 'calendar' && (
                                    <div className="overflow-x-auto mt-4 p-4 bg-theme-border/50 border border-theme-border rounded-2xl">
                                        <p className="font-medium mb-4 flex items-center gap-2">
                                            <span className="material-icons-round text-theme-accent1-400">grid_on</span>
                                            Gráfico de Actividad
                                        </p>
                                        {(() => {
                                            let rawAsistencias: { date: Date; isJustificado: boolean; isHist: boolean; histDate: Date | null }[] = [];
                                            try {
                                                const parsed = JSON.parse(selectedStudent['Fechas y Horas de Asistencia'] || '[]');
                                                if (Array.isArray(parsed)) {
                                                    rawAsistencias = parsed.map(d => {
                                                        const dateStr = typeof d === 'string' ? d : d.date;
                                                        const status = typeof d === 'object' ? d.status : 'Asistencia';
                                                        const notes = typeof d === 'object' ? d.notes : '';
                                                        let histDate: Date | null = null;
                                                        if (status === 'Justificado' && typeof notes === 'string') {
                                                            const m = notes.match(/histórico \((.+?)\)/i);
                                                            if (m?.[1]) {
                                                                const p = m[1].split('-');
                                                                histDate = new Date(parseInt(p[0]), parseInt(p[1]) - 1, parseInt(p[2]));
                                                            }
                                                        }
                                                        return {
                                                            date: new Date(dateStr),
                                                            isJustificado: status === 'Justificado',
                                                            isHist: histDate !== null,
                                                            histDate
                                                        };
                                                    }).filter(x => !isNaN(x.date.getTime()));
                                                }
                                            } catch (e) {}

                                            const rawFaltas: Date[] = (selectedStudent.faltasCalculadas || []).map(f => {
                                                const p = f.split('-');
                                                return new Date(parseInt(p[0]), parseInt(p[1]) - 1, parseInt(p[2]));
                                            });

                                            const allRecords = [
                                                ...rawAsistencias.map(x => ({
                                                    date: x.isHist && x.histDate ? x.histDate : x.date,
                                                    type: (x.isJustificado ? 'justificado' as const : 'asistencia' as const)
                                                })),
                                                ...rawFaltas.map(x => ({ date: x, type: 'falta' as const }))
                                            ].sort((a, b) => a.date.getTime() - b.date.getTime());

                                            // Determine start & end date of period
                                            const currentParcial = parciales.find(p => p.id === selectedPeriod);
                                            let startDate = currentParcial?.inicio ? new Date(currentParcial.inicio) : null;
                                            let endDate = currentParcial?.fin ? new Date(currentParcial.fin) : null;

                                            if (!startDate || isNaN(startDate.getTime()) || !endDate || isNaN(endDate.getTime())) {
                                                if (allRecords.length > 0) {
                                                    const dates = allRecords.map(r => r.date.getTime());
                                                    startDate = new Date(Math.min(...dates));
                                                    endDate = new Date(Math.max(...dates));
                                                } else {
                                                    endDate = new Date();
                                                    startDate = new Date();
                                                    startDate.setDate(endDate.getDate() - 30);
                                                }
                                            }

                                            // Align to Monday-Sunday weeks
                                            const sDay = startDate.getDay();
                                            const diffToMon = sDay === 0 ? 6 : sDay - 1;
                                            const calStart = new Date(startDate);
                                            calStart.setDate(calStart.getDate() - diffToMon);
                                            calStart.setHours(0, 0, 0, 0);

                                            const eDay = endDate.getDay();
                                            const diffToSun = eDay === 0 ? 0 : 7 - eDay;
                                            const calEnd = new Date(endDate);
                                            calEnd.setDate(calEnd.getDate() + diffToSun);
                                            calEnd.setHours(23, 59, 59, 999);

                                            // Create records lookup map
                                            const lookup = new Map<string, 'asistencia' | 'justificado' | 'falta'>();
                                            allRecords.forEach(rec => {
                                                const k = rec.date.toISOString().split('T')[0];
                                                lookup.set(k, rec.type);
                                            });

                                            // Group days into weeks (columns of 7 days: Mon-Sun)
                                            const weeks: Date[][] = [];
                                            let currentWeek: Date[] = [];
                                            let curr = new Date(calStart);

                                            while (curr <= calEnd) {
                                                currentWeek.push(new Date(curr));
                                                if (currentWeek.length === 7) {
                                                    weeks.push(currentWeek);
                                                    currentWeek = [];
                                                }
                                                curr.setDate(curr.getDate() + 1);
                                            }
                                            if (currentWeek.length > 0) {
                                                while (currentWeek.length < 7) {
                                                    const nextDay = new Date(currentWeek[currentWeek.length - 1]);
                                                    nextDay.setDate(nextDay.getDate() + 1);
                                                    currentWeek.push(nextDay);
                                                }
                                                weeks.push(currentWeek);
                                            }

                                            // Helper to get month label position
                                            const monthLabels: { text: string; colIndex: number }[] = [];
                                            let lastMonthStr = '';
                                            weeks.forEach((wk, wIdx) => {
                                                const firstDay = wk[0];
                                                const mName = firstDay.toLocaleDateString('es-MX', { month: 'short' });
                                                if (mName !== lastMonthStr) {
                                                    monthLabels.push({ text: mName, colIndex: wIdx });
                                                    lastMonthStr = mName;
                                                }
                                            });

                                            return (
                                                <div className="flex flex-col gap-4 select-none">
                                                    {/* Months Row */}
                                                    <div className="flex text-[10px] text-theme-muted font-semibold pl-8 gap-[1px]">
                                                        {weeks.map((_, wIdx) => {
                                                            const label = monthLabels.find(ml => ml.colIndex === wIdx);
                                                            return (
                                                                <div key={wIdx} className="w-[18px] text-center shrink-0">
                                                                    {label ? label.text : ''}
                                                                </div>
                                                            );
                                                        })}
                                                    </div>

                                                    <div className="flex gap-2">
                                                        {/* Day Labels Column */}
                                                        <div className="flex flex-col text-[10px] text-theme-muted font-semibold justify-between h-[123px] w-6 pr-1 pt-[2px]">
                                                            <span>Lun</span>
                                                            <span>Mié</span>
                                                            <span>Vie</span>
                                                            <span>Dom</span>
                                                        </div>

                                                        {/* Grid */}
                                                        <div className="flex gap-[3px] overflow-x-auto pb-2 shrink-0">
                                                            {weeks.map((week, wIdx) => (
                                                                <div key={wIdx} className="flex flex-col gap-[3px] shrink-0">
                                                                    {week.map((day, dIdx) => {
                                                                        const isWeekend = day.getDay() === 0 || day.getDay() === 6;
                                                                        const dateKey = day.toISOString().split('T')[0];
                                                                        const type = lookup.get(dateKey);
                                                                        const isOutRange = day < startDate || day > endDate;

                                                                        let cellColorClass = 'bg-theme-border/20'; // default weekday empty
                                                                        let statusText = 'Sin registro / Clase';

                                                                        if (isWeekend) {
                                                                            cellColorClass = 'bg-theme-border/5';
                                                                            statusText = 'Fin de semana';
                                                                        }
                                                                        if (isOutRange) {
                                                                            cellColorClass = 'opacity-20 bg-theme-border/5';
                                                                            statusText = 'Fuera del parcial';
                                                                        }

                                                                        if (type === 'asistencia') {
                                                                            cellColorClass = 'bg-theme-accent2-500 hover:ring-2 hover:ring-theme-accent2-400';
                                                                            statusText = 'Asistencia';
                                                                        } else if (type === 'justificado') {
                                                                            cellColorClass = 'bg-sky-500 hover:ring-2 hover:ring-sky-400';
                                                                            statusText = 'Falta Justificada';
                                                                        } else if (type === 'falta') {
                                                                            cellColorClass = 'bg-rose-500 hover:ring-2 hover:ring-rose-400';
                                                                            statusText = 'Falta';
                                                                        }

                                                                        const dayFormatted = day.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'short' });
                                                                        const tooltipText = `${dayFormatted}: ${statusText}`;

                                                                        return (
                                                                            <div
                                                                                key={dIdx}
                                                                                title={tooltipText}
                                                                                className={cn(
                                                                                    "w-[15px] h-[15px] rounded-[2px] transition-all cursor-pointer relative group/cell",
                                                                                    cellColorClass
                                                                                )}
                                                                            />
                                                                        );
                                                                    })}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>

                                                    {/* Legend */}
                                                    <div className="flex flex-wrap gap-4 items-center text-xs text-theme-muted mt-2 border-t border-theme-border/50 pt-3">
                                                        <div className="flex items-center gap-1.5">
                                                            <div className="w-[12px] h-[12px] rounded-[2px] bg-theme-border/20" />
                                                            <span>Sin registro</span>
                                                        </div>
                                                        <div className="flex items-center gap-1.5">
                                                            <div className="w-[12px] h-[12px] rounded-[2px] bg-theme-accent2-500" />
                                                            <span>Asistencia</span>
                                                        </div>
                                                        <div className="flex items-center gap-1.5">
                                                            <div className="w-[12px] h-[12px] rounded-[2px] bg-sky-500" />
                                                            <span>Justificada</span>
                                                        </div>
                                                        <div className="flex items-center gap-1.5">
                                                            <div className="w-[12px] h-[12px] rounded-[2px] bg-rose-500" />
                                                            <span>Falta</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })()}
                                    </div>
                                )}
                                <div className="mt-8 pt-6 border-t border-theme-border flex flex-wrap items-center justify-between gap-3 no-print">
                                    <Button onClick={() => setSelectedStudent(null)} className="flex-1 min-w-[120px] bg-theme-border/50 hover:bg-theme-border/100 text-theme-text h-11" variant="outline"><span className="material-icons-round mr-2 text-sm">arrow_back</span> Regresar</Button>
                                    <Button onClick={() => handleExportStudentDetailPDF(selectedStudent)} disabled={isLoading} className="flex-1 min-w-[120px] bg-theme-accent2-600 hover:bg-theme-accent2-700 h-11"><span className="material-icons-round mr-2 text-sm">{isLoading ? 'hourglass_top' : 'picture_as_pdf'}</span> {isLoading ? 'Generando...' : 'Imprimir PDF'}</Button>
                                </div>
                            </div>
                        )}
                    </Modal>
                </div>
            )}
        </div>
    );
}
