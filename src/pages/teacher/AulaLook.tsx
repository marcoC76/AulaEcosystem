import Fuse from 'fuse.js'
import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { cn, cssVar } from '../../lib/utils';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, ReferenceLine,
    PieChart, Pie, Cell, Legend, BarChart, Bar
} from 'recharts';
import { fetchAppConfig, fetchReportData, fetchStudentsDB, insertJustifiedAbsence, deleteAttendanceRecord, fetchParcialesConfig } from '../../lib/dataService';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Select } from '../../components/ui/Select';
import { Input } from '../../components/ui/Input';
import { Stepper } from '../../components/ui/Stepper';
import { Modal } from '../../components/ui/Modal';
import StudentAvatar from '../../components/ui/StudentAvatar';
import { getUniqueGroups } from '../../lib/search';
import type { StudentSearchResult } from '../../lib/search';
import type { ConfigOption, AttendanceRecord, ParcialConfig, StudentDBRecord } from '../../types';
import { useToast } from '../../hooks/useToast';

type ExtendedAttendanceRecord = AttendanceRecord & { faltasCalculadas?: string[]; apellidoPaterno?: string; rachaFaltas?: number };
type StudentSuggestion = StudentSearchResult & Record<string, string>;
type FechaAsistencia = string | { date: string; status?: string; notes?: string };

export default function AulaLook({ isReadOnly = false }: { isReadOnly?: boolean }) {
    const [config, setConfig] = useState<{ profesores: ConfigOption[], materias: ConfigOption[] }>({ profesores: [], materias: [] });
    const [parciales, setParciales] = useState<ParcialConfig[]>([]);
    
    // States (initialized to default, no persistence)
    const [selectedPeriod, setSelectedPeriod] = useState<string>('1');
    const [mode, setMode] = useState<'group' | 'student'>('group');
    const [step, setStep] = useState<number>(0);
    const [selectedTeacher, setSelectedTeacher] = useState<string>('');
    const [selectedSubject, setSelectedSubject] = useState<string>('');
    const [selectedGroups, setSelectedGroups] = useState<string[]>([]);

    // Student Search State
    const [searchQuery, setSearchQuery] = useState('');
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [selectedSearchStudent, setSelectedSearchStudent] = useState<StudentSuggestion | null>(null);

    // Data States
    const [data, setData] = useState<ExtendedAttendanceRecord[]>([]);
    const [prevPeriodData, setPrevPeriodData] = useState<ExtendedAttendanceRecord[]>([]);
    const [studentModeData, setStudentModeData] = useState<ExtendedAttendanceRecord[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [selectedStudent, setSelectedStudent] = useState<ExtendedAttendanceRecord | null>(null);
    const [modalView, setModalView] = useState<'list' | 'sheet' | 'calendar'>('list');
    const [localSearchQuery, setLocalSearchQuery] = useState('');
    const [filterRisk, setFilterRisk] = useState<'all' | 'perfect' | 'risk'>('all');
    const [sortField, setSortField] = useState<string>('name'); // 'name', 'control', 'classes', 'percentage'
    const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 20;

    // Fullscreen presentation
    const [isFullscreen, setIsFullscreen] = useState(false);
    const chartsContainerRef = useRef<HTMLDivElement>(null);

    // Critical Alert banner state
    const [showCriticalAlert, setShowCriticalAlert] = useState(true);

    const [availableGroups, setAvailableGroups] = useState<string[]>([]);
    const [studentsDB, setStudentsDB] = useState<StudentDBRecord[]>([]);
    const modalRef = useRef<HTMLDivElement>(null);
    const [confirmAction, setConfirmAction] = useState<{ message: string; onConfirm: () => void } | null>(null);
    const { toast } = useToast();
    const tooltipStyle = {
        backgroundColor: cssVar('--theme-card') || '#1f2937',
        borderColor: cssVar('--theme-border') || '#374151',
        borderRadius: '8px',
        color: cssVar('--theme-text') || '#fff',
        fontSize: 12,
    };

    // Clear reports selections from localStorage on mount (so they are not saved/restored)
    useEffect(() => {
        const keys = [
            'aulalook_selectedPeriod',
            'aulalook_mode',
            'aulalook_step',
            'aulalook_selectedTeacher',
            'aulalook_selectedSubject',
            'aulalook_selectedGroups',
            'aulalook_searchQuery',
            'aulalook_selectedSearchStudent'
        ];
        keys.forEach(key => localStorage.removeItem(key));
    }, []);

    // Track Fullscreen status
    useEffect(() => {
        const handleFullscreenChange = () => {
            setIsFullscreen(!!document.fullscreenElement);
        };
        document.addEventListener('fullscreenchange', handleFullscreenChange);
        return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
    }, []);

    const toggleFullscreen = useCallback(() => {
        if (!document.fullscreenElement) {
            chartsContainerRef.current?.requestFullscreen().catch(() => {});
        } else {
            document.exitFullscreen();
        }
    }, []);

    // Reset pagination to page 1 on filter/sort changes
    useEffect(() => {
        fetchAppConfig().then(setConfig).catch(() => {});
        fetchParcialesConfig().then(parts => {
            setParciales(parts);
            if (parts.length > 0) {
                setSelectedPeriod(parts[0].id);
            }
        }).catch(() => {});
        fetchStudentsDB().then(students => {
            setStudentsDB(students);
            setAvailableGroups(getUniqueGroups(students));
        }).catch(() => {});
    }, []);

    // Reset pagination to page 1 on filter/sort changes
    useEffect(() => {
        setCurrentPage(1);
    }, [localSearchQuery, filterRisk, sortField, sortDir]);

    const loadGroupData = useCallback(async (periodId = selectedPeriod, groupsToFetch = selectedGroups) => {
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
                    const sObj = s as unknown as Record<string, string>;
                    const careerKey = Object.keys(sObj).find(k => k.toLowerCase().includes('carrera') || k.toLowerCase().includes('especialidad'));
                    return careerKey && String(sObj[careerKey]).trim() === specialtyFilter;
                });
                const mergedRes: ExtendedAttendanceRecord[] = [];

                groupStudents.forEach(gs => {
                    const gsObj = gs as unknown as Record<string, string>;
                    const nameKey = Object.keys(gsObj).find(k => k.toLowerCase().includes('nombre')) || 'Nombre(s)';
                    const patKey = Object.keys(gsObj).find(k => k.toLowerCase().includes('paterno')) || 'Apellido Paterno';
                    const matKey = Object.keys(gsObj).find(k => k.toLowerCase().includes('materno')) || 'Apellido Materno';
                    const careerKey = Object.keys(gsObj).find(k => k.toLowerCase().includes('carrera') || k.toLowerCase().includes('especialidad')) || 'Carrera';
                    const sControlKey = Object.keys(gsObj).find(k => k.toLowerCase().includes('control'));

                    const rawName = String(gsObj[nameKey] || '').trim();
                    const rawPat = String(gsObj[patKey] || '').trim();
                    const rawMat = String(gsObj[matKey] || '').trim();
                    const formattedName = `${rawPat} ${rawMat} ${rawName}`.trim();

                    const serverRecord = filteredRes.find(r => {
                        const rControl = String(r['Número de Control']).trim();
                        const sControl = sControlKey ? String(gsObj[sControlKey]).trim() : '';
                        return rControl === sControl;
                    }) as ExtendedAttendanceRecord | undefined;

                    if (serverRecord) {
                        serverRecord.apellidoPaterno = rawPat;
                        serverRecord['Nombre del Alumno'] = formattedName; // Standardize format
                        mergedRes.push(serverRecord);
                    } else {
                        mergedRes.push({
                            "Número de Control": sControlKey ? String(gsObj[sControlKey]) : '000',
                            "Nombre del Alumno": formattedName,
                            "Profesor": selectedTeacher,
                            "Materia": selectedSubject,
                            "Grupo": baseGroup,
                            "Periodo": 1,
                            "Asistencias": 0,
                            "Total de Clases": maxAsistencias > 0 ? maxAsistencias : 1,
                            "Porcentaje": 0,
                            "Fechas y Horas de Asistencia": '[]',
                            "Especialidad": careerKey ? String(gsObj[careerKey]) : 'Desconocido',
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
                        let fechasStr: string | FechaAsistencia[] = masterStudent['Fechas y Horas de Asistencia'];
                        if (Array.isArray(fechasStr)) fechasStr = JSON.stringify(fechasStr);
                        const fechas: FechaAsistencia[] = JSON.parse(fechasStr);
                        fechas.forEach((fReq) => {
                            const fStr = typeof fReq === 'object' ? fReq.date : fReq;
                            const dateObj = new Date(fStr);
                            if (!isNaN(dateObj.getTime())) {
                                masterDates.add(dateObj.toISOString().split('T')[0]);
                            }
                        });
                    } catch { /* ignored */ }
                }

                // 3. Process data against merged records
                const processedData = mergedRes.map(d => {
                    const newTotal = maxAsistencias > 0 ? maxAsistencias : 1;
                    const studentDates = new Set<string>();
                    const historicoJustificado = new Set<string>();
                    try {
                        let fechasStr: string | FechaAsistencia[] = d['Fechas y Horas de Asistencia'];
                        if (Array.isArray(fechasStr)) fechasStr = JSON.stringify(fechasStr);
                        const fechas: FechaAsistencia[] = JSON.parse(fechasStr || '[]');
                        fechas.forEach((fReq) => {
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
                    } catch { /* ignored */ }

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

                allMergedRes.push(...processedData);
            }

            const sortedData = allMergedRes.sort((a, b) => {
                const nameA = a['Nombre del Alumno'] || '';
                const nameB = b['Nombre del Alumno'] || '';
                return nameA.localeCompare(nameB, 'es', { sensitivity: 'base' });
            });

            setData(sortedData);

            // Fetch Previous Period Data if it exists
            const currentIdx = parciales.findIndex(p => p.id === periodId);
            const prevPeriod = currentIdx > 0 ? parciales[currentIdx - 1] : null;
            if (prevPeriod) {
                const prevResults: ExtendedAttendanceRecord[] = [];
                for (const groupName of groupsToFetch) {
                    const [rawGroup, ...specParts] = groupName.split(' - ');
                    const baseGroup = rawGroup.trim();
                    const specialtyFilter = specParts.join(' - ').trim();
                    const res = await fetchReportData({ teacher: selectedTeacher, subject: selectedSubject, group: baseGroup, parcial: prevPeriod.id });
                    const filteredRes = res.filter(r => !specialtyFilter || String(r.Especialidad || '').trim() === specialtyFilter);
                    prevResults.push(...filteredRes);
                }
                setPrevPeriodData(prevResults);
            } else {
                setPrevPeriodData([]);
            }
        } catch (error) {
            console.error('Error cargando datos de grupo:', error);
            toast('Error al cargar los datos del grupo.', 'error');
        } finally {
            setIsLoading(false);
        }
    }, [selectedTeacher, selectedSubject, selectedGroups, studentsDB, parciales, selectedPeriod]);

    const loadStudentData = useCallback(async (periodId = selectedPeriod) => {
        if (!selectedSearchStudent) return;
        setIsLoading(true);
        try {
            const cleanStr = (s: string | undefined | null) => String(s || '').trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

            const groupKey = Object.keys(selectedSearchStudent).find(k => k.toLowerCase().includes('grupo')) || 'Grupo';
            const groupValue = String(selectedSearchStudent[groupKey]).trim();

            const [baseGroupPart] = groupValue.split(' - ');
            const rawGroup = baseGroupPart.trim();

            const careerKey = Object.keys(selectedSearchStudent).find(k => k.toLowerCase().includes('carrera') || k.toLowerCase().includes('especialidad'));
            const specialty = careerKey && selectedSearchStudent[careerKey] ? String(selectedSearchStudent[careerKey]).trim() : '';
            const studSpecClean = cleanStr(specialty);

            let rawRes: AttendanceRecord[] = [];
            const chunkSize = 4;

            for (let i = 0; i < config.materias.length; i += chunkSize) {
                const chunk = config.materias.slice(i, i + chunkSize);
                const promises = chunk.map(m => fetchReportData({ group: rawGroup, subject: m.text, parcial: periodId }));
                const results = await Promise.all(promises);
                results.forEach(resArray => {
                    if (Array.isArray(resArray)) {
                        if (resArray.length > 0 && resArray[0]['Número de Control'] === '20304050') {
                            if (rawRes.length === 0) rawRes = rawRes.concat(resArray);
                        } else {
                            rawRes = rawRes.concat(resArray);
                        }
                    }
                });
            }

            const groupRes = rawRes.filter(r => {
                const rowSpecClean = cleanStr(r.Especialidad);
                if (!studSpecClean) return true;
                return rowSpecClean === studSpecClean || rowSpecClean === "";
            });

            const materiasMap = new Map<string, ExtendedAttendanceRecord[]>();
            groupRes.forEach(r => {
                const m = r.Materia || 'Desconocida';
                if (!materiasMap.has(m)) materiasMap.set(m, []);
                materiasMap.get(m)!.push(r);
            });

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
                        "Profesor": masterStudent ? (masterStudent as AttendanceRecord).Profesor : "Varios",
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
                if (masterStudent && masterStudent['Fechas y Horas de Asistencia']) {
                    try {
                        let fechasStr: string | FechaAsistencia[] = masterStudent['Fechas y Horas de Asistencia'];
                        if (Array.isArray(fechasStr)) fechasStr = JSON.stringify(fechasStr);
                        const fechas: FechaAsistencia[] = JSON.parse(fechasStr);
                        fechas.forEach((fReq) => {
                            const fStr = typeof fReq === 'object' ? fReq.date : fReq;
                            const dateObj = new Date(fStr);
                            if (!isNaN(dateObj.getTime())) masterDates.add(dateObj.toISOString().split('T')[0]);
                        });
                    } catch { /* ignored */ }
                }

                const studentDates = new Set<string>();
                const historicoJustificado = new Set<string>();
                if (finalRecord['Fechas y Horas de Asistencia']) {
                    try {
                        let fechasStr: string | FechaAsistencia[] = finalRecord['Fechas y Horas de Asistencia'];
                        if (Array.isArray(fechasStr)) fechasStr = JSON.stringify(fechasStr);
                        const fechas: FechaAsistencia[] = JSON.parse(fechasStr);
                        fechas.forEach((fReq) => {
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
                    } catch { /* ignored */ }
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

            const sortedResults = studentResults.sort((a, b) => (a.Materia || '').localeCompare(b.Materia || ''));
            setStudentModeData(sortedResults);

            // Fetch previous period for student
            const currentIdx = parciales.findIndex(p => p.id === periodId);
            const prevPeriod = currentIdx > 0 ? parciales[currentIdx - 1] : null;
            if (prevPeriod) {
                let prevRawRes: AttendanceRecord[] = [];
                for (let i = 0; i < config.materias.length; i += chunkSize) {
                    const chunk = config.materias.slice(i, i + chunkSize);
                    const promises = chunk.map(m => fetchReportData({ group: rawGroup, subject: m.text, parcial: prevPeriod.id }));
                    const results = await Promise.all(promises);
                    results.forEach(resArray => {
                        if (Array.isArray(resArray)) {
                            prevRawRes = prevRawRes.concat(resArray);
                        }
                    });
                }
                const prevGroupRes = prevRawRes.filter(r => {
                    const rowSpecClean = cleanStr(r.Especialidad);
                    return !studSpecClean || rowSpecClean === studSpecClean || rowSpecClean === "";
                });
                const prevStudentResults = prevGroupRes.filter(r => String(r['Número de Control']).trim() === sControl);
                setPrevPeriodData(prevStudentResults);
            } else {
                setPrevPeriodData([]);
            }
        } catch (error) {
            console.error('Error cargando datos de alumno:', error);
            toast('Error al cargar los datos del alumno.', 'error');
        } finally {
            setIsLoading(false);
        }
    }, [selectedSearchStudent, config, parciales, selectedPeriod]);

    const handleJustifyAbsence = useCallback(async (dateStr: string) => {
        if (!selectedStudent) return;
        setConfirmAction({
            message: `¿Estás seguro de justificar la falta del ${dateStr}?`,
            onConfirm: async () => {
                try {
                    setIsLoading(true);
                    const control = selectedStudent['Número de Control'];
                    const { Grupo, Especialidad, Profesor, Materia } = selectedStudent;

                    await insertJustifiedAbsence({
                        No: String(selectedStudent['Nombre del Alumno'] || ''),
                        ID: String(control),
                        Gr: String(Grupo || (selectedGroups[0] || '')),
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
                    toast('Error al justificar la falta.', 'error');
                    setIsLoading(false);
                }
            }
        });
    }, [selectedStudent, selectedGroups, selectedTeacher, selectedSubject, mode, loadGroupData, loadStudentData]);

    const handleDeleteAttendance = useCallback(async (dateStr: string) => {
        if (!selectedStudent) return;
        setConfirmAction({
            message: `¿Estás seguro de borrar la asistencia del ${new Date(dateStr).toLocaleString('es-MX')}?`,
            onConfirm: async () => {
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
                    toast('Error al borrar la asistencia.', 'error');
                    setIsLoading(false);
                }
            }
        });
    }, [selectedStudent, selectedSubject, mode, loadGroupData, loadStudentData]);

    const handleNext = async () => {
        if (mode === 'group') {
            if (step === 0 && !selectedTeacher) return;
            if (step === 1 && !selectedSubject) return;
            if (step === 2 && selectedGroups.length === 0) return;

            if (step === 2) {
                setStep(3);
                setLocalSearchQuery('');
                loadGroupData();
            } else {
                setStep(s => s + 1);
            }
        } else {
            if (!selectedSearchStudent) {
                toast("Por favor selecciona un alumno primero.", "error");
                return;
            }
            setStep(3);
            setLocalSearchQuery('');
            loadStudentData();
        }
    };

    const handleBack = () => setStep(s => Math.max(0, s - 1));

    const downloadReport = useCallback(() => {
        const d = mode === 'group' ? data : studentModeData;
        const headers = mode === 'group'
            ? ['Control', 'Nombre', 'Grupo', 'Clases Totales', 'Asistencias', 'Porcentaje']
            : ['Materia', 'Profesor', 'Clases Totales', 'Asistencias', 'Porcentaje'];

        const rows = d.map(item => {
            if (mode === 'group') {
                return [item['Número de Control'], item['Nombre del Alumno'], item.Grupo, item['Total de Clases'], item.Asistencias, `${(item.Porcentaje * 100).toFixed(0)}%`];
            } else {
                return [item['Materia'], item['Profesor'], item['Total de Clases'], item.Asistencias, `${(item.Porcentaje * 100).toFixed(0)}%`];
            }
        });

        const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement('a');
        link.href = encodedUri;
        link.download = mode === 'group'
            ? `Reporte_${selectedGroups.join('_')}_${selectedSubject.substring(0, 10)}.csv`
            : `Reporte_${selectedSearchStudent?.nombre}_Multiple.csv`;
        document.body.appendChild(link);
        link.click();
        link.remove();
    }, [mode, data, studentModeData, selectedGroups, selectedSubject, selectedSearchStudent]);

    const downloadAbsenceReport = useCallback(() => {
        const d = mode === 'group' ? data : studentModeData;
        if (d.length === 0) {
            toast("No hay datos para exportar.", "error");
            return;
        }

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
        const blobUrl = URL.createObjectURL(blob);
        link.href = blobUrl;
        link.setAttribute("download", `ReporteFaltas_${mode === 'group' ? selectedGroups.join('_') : selectedSearchStudent?.nombre}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(blobUrl);
    }, [mode, data, studentModeData, selectedGroups, selectedSearchStudent]);

    async function exportGroupPDF() {
        const { jsPDF } = await import('jspdf');
        const pdf = new jsPDF('p', 'mm', 'a4');
        const ml = 15, cw = 180;
        let y = 20;

        const periodName = parciales.find(p => p.id === selectedPeriod)?.nombre || `Parcial ${selectedPeriod}`;
        const groupLabel = mode === 'group' ? selectedGroups.join(', ') : '';

        const drawPageTitle = () => {
            pdf.setFontSize(16); pdf.setTextColor('#7a1c31');
            pdf.text('Reporte de Asistencia - Grupo Completo', ml, y); y += 6;
            pdf.setFontSize(9); pdf.setTextColor('#6b7280');
            pdf.text(`${groupLabel} | ${periodName}`, ml, y); y += 4;
            pdf.setDrawColor('#7a1c31'); pdf.line(ml, y, ml + cw, y); y += 8;
        };

        const checkPage = (needed: number) => {
            if (y + needed > 275) { pdf.addPage(); y = 20; drawPageTitle(); return true; }
            return false;
        };

        const cols = [
            { label: '#', w: 7 }, { label: 'Alumno', w: 40 },
            { label: 'Control', w: 20 }, { label: 'Grupo', w: 11 },
            { label: 'Materia', w: 18 }, { label: 'Clases', w: 10 },
            { label: 'Asist.', w: 11 }, { label: '%', w: 9 },
            { label: 'A', w: 7 }, { label: 'R', w: 7 },
            { label: 'J', w: 7 }, { label: 'F', w: 7 },
            { label: 'Estatus', w: 14 },
        ];
        const rh = 5.5;

        drawPageTitle();
        checkPage(rh + 4);

        const drawHeader = () => {
            pdf.setFillColor('#7a1c31'); pdf.rect(ml, y, cw, rh, 'F');
            pdf.setTextColor('#ffffff'); pdf.setFontSize(6);
            let cx = ml + 2;
            cols.forEach(c => { pdf.text(c.label, cx, y + 3.5); cx += c.w; });
            y += rh + 1;
        };
        drawHeader();

        let rowNum = 0;
        let sumClases = 0, sumAsist = 0, sumA = 0, sumR = 0, sumJ = 0, sumF = 0;

        for (const student of activeData) {
            const pct = (student.Porcentaje ?? 0) * 100;
            let a = 0, r = 0, j = 0;
            try {
                const fechas: FechaAsistencia[] = JSON.parse(student['Fechas y Horas de Asistencia'] || '[]');
                fechas.forEach(fReq => {
                    const st = typeof fReq === 'object' ? (fReq.status || 'Asistencia') : 'Asistencia';
                    if (st === 'Asistencia') a++; else if (st === 'Retardo') r++; else if (st === 'Justificado') j++;
                });
            } catch { /* ignore */ }
            const f = student.faltasCalculadas?.length || 0;

            sumClases += student['Total de Clases'];
            sumAsist += student.Asistencias;
            sumA += a; sumR += r; sumJ += j; sumF += f;

            if (checkPage(rh + 2)) drawHeader();
            if (rowNum % 2 === 0) { pdf.setFillColor('#f9fafb'); pdf.rect(ml, y - rh + 0.5, cw, rh + 2, 'F'); }

            pdf.setFontSize(6); pdf.setTextColor('#374151');
            let cx = ml + 2;
            pdf.text(String(rowNum + 1), cx, y + 1.5); cx += cols[0].w;
            pdf.text((student['Nombre del Alumno'] || '').substring(0, 26), cx, y + 1.5); cx += cols[1].w;
            pdf.text(student['Número de Control'] || '', cx, y + 1.5); cx += cols[2].w;
            pdf.text(student.Grupo || '', cx, y + 1.5); cx += cols[3].w;
            pdf.text((student.Materia || '').substring(0, 12), cx, y + 1.5); cx += cols[4].w;
            pdf.text(String(student['Total de Clases']), cx, y + 1.5); cx += cols[5].w;
            pdf.text(String(student.Asistencias), cx, y + 1.5); cx += cols[6].w;
            const pctColor = pct < 80 ? '#ef4444' : pct < 90 ? '#eab308' : '#10b981';
            pdf.setTextColor(pctColor); pdf.text(`${pct.toFixed(0)}%`, cx, y + 1.5); cx += cols[7].w;
            pdf.setTextColor('#374151');
            pdf.text(String(a), cx, y + 1.5); cx += cols[8].w;
            pdf.text(String(r), cx, y + 1.5); cx += cols[9].w;
            pdf.text(String(j), cx, y + 1.5); cx += cols[10].w;
            pdf.text(String(f), cx, y + 1.5); cx += cols[11].w;
            const stxt = pct < 80 ? 'Riesgo' : pct < 90 ? 'Regular' : 'Excelente';
            pdf.setTextColor(stxt === 'Riesgo' ? '#ef4444' : stxt === 'Regular' ? '#eab308' : '#10b981');
            pdf.text(stxt, cx, y + 1.5);

            y += rh + 1;
            rowNum++;
        }

        // Summary row
        checkPage(rh + 3);
        pdf.setFillColor('#d1d5db'); pdf.rect(ml, y - rh + 0.5, cw, rh + 2, 'F');
        pdf.setFontSize(6); pdf.setTextColor('#7a1c31');
        let cx = ml + 2;
        pdf.text('TOTALES', cx, y + 1.5); cx += cols[0].w + cols[1].w + cols[2].w + cols[3].w + cols[4].w;
        pdf.text(String(sumClases), cx, y + 1.5); cx += cols[5].w;
        pdf.text(String(sumAsist), cx, y + 1.5); cx += cols[6].w;
        const tPct = sumClases > 0 ? (sumAsist / sumClases * 100) : 0;
        pdf.setTextColor(tPct < 80 ? '#ef4444' : tPct < 90 ? '#eab308' : '#10b981');
        pdf.text(`${tPct.toFixed(0)}%`, cx, y + 1.5); cx += cols[7].w;
        pdf.setTextColor('#7a1c31');
        pdf.text(String(sumA), cx, y + 1.5); cx += cols[8].w;
        pdf.text(String(sumR), cx, y + 1.5); cx += cols[9].w;
        pdf.text(String(sumJ), cx, y + 1.5); cx += cols[10].w;
        pdf.text(String(sumF), cx, y + 1.5);
        y += rh + 4;

        pdf.setFontSize(8); pdf.setTextColor('#6b7280');
        y = Math.max(y, 275);
        pdf.text(`Generado el: ${new Date().toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}`, ml, y);
        pdf.save(`reporte-grupo-${selectedGroups.join('_') || 'completo'}.pdf`);
    }

    async function exportStudentDetailPDF(student: ExtendedAttendanceRecord) {
        const { jsPDF } = await import('jspdf');
        const pdf = new jsPDF('p', 'mm', 'a4');
        const ml = 15, cw = 180;
        let y = 20;

        pdf.setFontSize(18);
        pdf.setTextColor('#7a1c31');
        pdf.text(student['Nombre del Alumno'], ml, y); y += 8;
        pdf.setFontSize(11);
        pdf.setTextColor('#374151');
        pdf.text(`Control: ${student['Número de Control']}`, ml, y); y += 14;

        pdf.setDrawColor('#e5e7eb'); pdf.setFillColor('#f9fafb');
        pdf.roundedRect(ml, y, cw, 36, 3, 3, 'FD');
        pdf.setFontSize(10); pdf.setTextColor('#374151');
        pdf.text(`Materia: ${student.Materia}`, ml + 5, y + 7);
        pdf.text(`Grupo: ${student.Grupo}`, ml + 5, y + 14);
        pdf.text(`Profesor: ${student.Profesor}`, ml + 5, y + 21);
        const periodName = parciales.find(p => p.id === selectedPeriod)?.nombre || `Parcial ${selectedPeriod}`;
        pdf.text(`Período: ${periodName}`, ml + cw / 2, y + 7);
        pdf.text(`Total de Clases: ${student['Total de Clases']}`, ml + cw / 2, y + 14);
        y += 46;

        pdf.setFontSize(14); pdf.setTextColor('#7a1c31');
        pdf.text('Resumen de Asistencia', ml, y); y += 9;
        const pct = (student.Porcentaje ?? 0) * 100;
        pdf.setFontSize(11); pdf.setTextColor('#374151');
        pdf.text(`Asistencias: ${student.Asistencias} / ${student['Total de Clases']}  (${pct.toFixed(1)}%)`, ml, y); y += 8;

        const bh = 7;
        pdf.setFillColor('#e5e7eb');
        pdf.roundedRect(ml, y, cw, bh, 2, 2, 'F');
        const fillW = (cw * Math.min(pct, 100)) / 100;
        const barC = pct >= 80 ? '#10b981' : pct >= 60 ? '#eab308' : '#ef4444';
        if (fillW > 2) { pdf.setFillColor(barC); pdf.roundedRect(ml, y, fillW, bh, 2, 2, 'F'); }
        y += bh + 12;

        pdf.setFontSize(14); pdf.setTextColor('#7a1c31');
        pdf.text('Registro Cronológico', ml, y); y += 10;

        const entries: { date: Date; dateStr: string; day: string; status: string }[] = [];
        try {
            const fechas: FechaAsistencia[] = JSON.parse(student['Fechas y Horas de Asistencia'] || '[]');
            fechas.forEach(f => {
                const fStr = typeof f === 'object' ? f.date : f;
                const st = typeof f === 'object' ? (f.status || 'Asistencia') : 'Asistencia';
                const d = new Date(fStr);
                if (!isNaN(d.getTime())) entries.push({ date: d, dateStr: d.toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' }), day: d.toLocaleDateString('es-MX', { weekday: 'long' }), status: st });
            });
        } catch { /* ignore */ }

        if (student.faltasCalculadas) {
            student.faltasCalculadas.forEach(f => {
                const p = f.split('-'); const d = new Date(Number(p[0]), Number(p[1]) - 1, Number(p[2]));
                if (!isNaN(d.getTime()) && !entries.some(e => e.date.toISOString().split('T')[0] === d.toISOString().split('T')[0]))
                    entries.push({ date: d, dateStr: d.toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' }), day: d.toLocaleDateString('es-MX', { weekday: 'long' }), status: 'Falta' });
            });
        }
        entries.sort((a, b) => a.date.getTime() - b.date.getTime());

        const colW = [58, 48, cw - 106], rh = 6;
        const drawHeader = (yy: number) => {
            pdf.setFillColor('#7a1c31'); pdf.rect(ml, yy, cw, rh, 'F');
            pdf.setTextColor('#ffffff'); pdf.setFontSize(8);
            pdf.text('Fecha', ml + 3, yy + 4);
            pdf.text('Día', ml + colW[0] + 3, yy + 4);
            pdf.text('Estado', ml + colW[0] + colW[1] + 3, yy + 4);
        };
        drawHeader(y); y += rh + 2;

        let rowN = 0;
        const maxRow = Math.floor((270 - y) / (rh + 2));

        entries.forEach((e, i) => {
            if (rowN >= maxRow) { pdf.addPage(); y = 20; rowN = 0; drawHeader(y); y += rh + 2; }
            if (i % 2 === 0) { pdf.setFillColor('#f9fafb'); pdf.rect(ml, y - rh + 0.5, cw, rh + 2, 'F'); }
            pdf.setTextColor('#374151'); pdf.setFontSize(8);
            pdf.text(e.dateStr, ml + 3, y + 1);
            pdf.text(e.day.charAt(0).toUpperCase() + e.day.slice(1), ml + colW[0] + 3, y + 1);
            const sC = e.status === 'Asistencia' ? '#10b981' : e.status === 'Retardo' ? '#eab308' : e.status === 'Justificado' ? '#3b82f6' : '#ef4444';
            pdf.setTextColor(sC); pdf.text(e.status, ml + colW[0] + colW[1] + 3, y + 1);
            y += rh + 2; rowN++;
        });

        y = Math.max(y + 6, 270);
        if (y > 270) { pdf.addPage(); y = 20; }
        pdf.setFontSize(8); pdf.setTextColor('#6b7280');
        pdf.text(`Generado el: ${new Date().toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}`, ml, y);

        pdf.save(`detalle-${student['Número de Control']}.pdf`);
    }

    // --- Search Helpers ---
    const suggestions = useMemo(() => {
        if (searchQuery.length < 2) return [];

        const cleanStudents = studentsDB.map(student => {
            const sObj = student as unknown as Record<string, string>;
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

        return fuse.search(searchQuery).slice(0, 5).map(r => r.item as unknown as StudentSuggestion);
    }, [studentsDB, searchQuery]);

    // --- Derived Metrics ---
    const activeData = useMemo(() => {
        const base = mode === 'group' ? data : studentModeData;
        return base.filter(item => {
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
        }).sort((a, b) => {
            let fieldA: string | number = '';
            let fieldB: string | number = '';
            if (sortField === 'name') {
                fieldA = mode === 'group' ? (a['Nombre del Alumno'] || '') : (a.Materia || '');
                fieldB = mode === 'group' ? (b['Nombre del Alumno'] || '') : (b.Materia || '');
            } else if (sortField === 'control') {
                fieldA = mode === 'group' ? (a['Número de Control'] || '') : (a.Profesor || '');
                fieldB = mode === 'group' ? (b['Número de Control'] || '') : (b.Profesor || '');
            } else if (sortField === 'classes') {
                fieldA = a.Asistencias;
                fieldB = b.Asistencias;
            } else if (sortField === 'percentage') {
                fieldA = a.Porcentaje;
                fieldB = b.Porcentaje;
            }
            if (typeof fieldA === 'string' && typeof fieldB === 'string') {
                return sortDir === 'asc'
                    ? fieldA.localeCompare(fieldB, 'es', { sensitivity: 'base' })
                    : fieldB.localeCompare(fieldA, 'es', { sensitivity: 'base' });
            }
            return sortDir === 'asc' ? (fieldA as number) - (fieldB as number) : (fieldB as number) - (fieldA as number);
        });
    }, [mode, data, studentModeData, localSearchQuery, filterRisk, sortField, sortDir]);

    const paginatedData = useMemo(() => {
        return activeData.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);
    }, [activeData, currentPage]);

    const totalPages = Math.ceil(activeData.length / ITEMS_PER_PAGE);

    const stats = useMemo(() => {
        let totalAsistencias = 0;
        const dateCounts: Record<string, { date: Date; count: number }> = {};
        const wdCounts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
        let markAsistencia = 0, markRetardo = 0, markJustificado = 0, markFalta = 0;
        const histo = [0, 0, 0, 0, 0];
        const streakCounts: Record<number, number> = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

        activeData.forEach(d => {
            totalAsistencias += d.Asistencias;
            try {
                const fechas: FechaAsistencia[] = JSON.parse(d['Fechas y Horas de Asistencia'] || '[]');
                fechas.forEach((fReq) => {
                    const fStr = typeof fReq === 'object' ? fReq.date : fReq;
                    const status = typeof fReq === 'object' ? fReq.status : 'Asistencia';
                    const dateObj = new Date(fStr);
                    if (isNaN(dateObj.getTime())) return;
                    const dateKey = dateObj.toISOString().split('T')[0];
                    if (!dateCounts[dateKey]) dateCounts[dateKey] = { date: dateObj, count: 0 };
                    dateCounts[dateKey].count++;

                    if (status === 'Asistencia') markAsistencia++;
                    else if (status === 'Retardo') markRetardo++;
                    else if (status === 'Justificado') markJustificado++;
                });
            } catch { /* ignored */ }

            if (d.faltasCalculadas) {
                d.faltasCalculadas.forEach(f => {
                    markFalta++;
                    const parts = f.split('-');
                    const dt = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
                    const wd = dt.getDay();
                    if (wd >= 1 && wd <= 5) {
                        wdCounts[wd as keyof typeof wdCounts]++;
                    }
                });
            }

            const pct = (d.Porcentaje ?? 0) * 100;
            const bucket = Math.min(Math.floor(pct / 20), 4);
            histo[bucket]++;

            const racha = Math.min(d.rachaFaltas ?? 0, 5);
            streakCounts[racha] = (streakCounts[racha] || 0) + 1;
        });

        const totalItems = activeData.length;
        const avgAttendance = totalItems ? activeData.reduce((acc, curr) => acc + curr.Porcentaje, 0) / totalItems : 0;
        const atRisk = activeData.filter(d => d.Porcentaje < 0.8).length;
        const perfect = activeData.filter(d => d.Porcentaje === 1.0).length;

        const statusData = [
            { name: 'Riesgo (<80%)', value: atRisk, color: cssVar('--theme-accent1-500') || '#ef4444' },
            { name: 'Regular', value: totalItems - atRisk - perfect, color: cssVar('--theme-warning-500') || '#eab308' },
            { name: 'Perfecta', value: perfect, color: cssVar('--theme-accent2-500') || '#10b981' },
        ];

        const currentTimeline = Object.values(dateCounts).sort((a, b) => a.date.getTime() - b.date.getTime());

        const weekdayData = [
            { name: 'Lun', faltas: wdCounts[1] },
            { name: 'Mar', faltas: wdCounts[2] },
            { name: 'Mié', faltas: wdCounts[3] },
            { name: 'Jue', faltas: wdCounts[4] },
            { name: 'Vie', faltas: wdCounts[5] },
        ];

        const markTypeData = [
            { name: 'Asistencia', value: markAsistencia, color: cssVar('--theme-accent2-500') || '#10b981' },
            { name: 'Retardo', value: markRetardo, color: cssVar('--theme-warning-500') || '#eab308' },
            { name: 'Justificado', value: markJustificado, color: cssVar('--theme-accent3-500') || '#3b82f6' },
            { name: 'Falta', value: markFalta, color: cssVar('--theme-accent1-500') || '#ef4444' },
        ];

        const histogramData = [
            { name: '0-20%', alumnos: histo[0], color: '#ef4444' },
            { name: '20-40%', alumnos: histo[1], color: '#f97316' },
            { name: '40-60%', alumnos: histo[2], color: '#eab308' },
            { name: '60-80%', alumnos: histo[3], color: '#22c55e' },
            { name: '80-100%', alumnos: histo[4], color: '#10b981' },
        ];

        const streakData = [0, 1, 2, 3, 4, 5].map(i => ({
            label: i === 5 ? '5+' : String(i),
            alumnos: streakCounts[i] || 0,
            color: i <= 1 ? '#10b981' : i <= 3 ? '#eab308' : '#ef4444',
        }));

        return { totalItems, totalAsistencias, avgAttendance, atRisk, perfect, statusData, currentTimeline, weekdayData, dateCounts, markTypeData, histogramData, streakData };
    }, [activeData]);

    const prevTimelineData = useMemo(() => {
        const prevDateCounts: Record<string, { date: Date; count: number }> = {};
        prevPeriodData.forEach(d => {
            try {
                const fechas: FechaAsistencia[] = JSON.parse(d['Fechas y Horas de Asistencia'] || '[]');
                fechas.forEach((fReq) => {
                    const fStr = typeof fReq === 'object' ? fReq.date : fReq;
                    const dateObj = new Date(fStr);
                    if (isNaN(dateObj.getTime())) return;
                    const dateKey = dateObj.toISOString().split('T')[0];
                    if (!prevDateCounts[dateKey]) prevDateCounts[dateKey] = { date: dateObj, count: 0 };
                    prevDateCounts[dateKey].count++;
                });
            } catch { /* ignored */ }
        });
        return Object.values(prevDateCounts).sort((a, b) => a.date.getTime() - b.date.getTime());
    }, [prevPeriodData]);

    const timelineData = useMemo(() => {
        const maxLen = Math.max(stats.currentTimeline.length, prevTimelineData.length);
        const combined = [];
        for (let i = 0; i < maxLen; i++) {
            const currItem = stats.currentTimeline[i];
            const prevItem = prevTimelineData[i];
            combined.push({
                name: currItem ? currItem.date.toLocaleDateString('es-MX', { month: 'short', day: 'numeric' }) : `Clase ${i + 1}`,
                asistencias: currItem ? currItem.count : undefined,
                asistenciasPrev: prevItem ? prevItem.count : undefined,
            });
        }
        return combined;
    }, [stats.currentTimeline, prevTimelineData]);

    const { totalItems, totalAsistencias, avgAttendance, atRisk, statusData, weekdayData, dateCounts, markTypeData, histogramData, streakData } = stats;

    const exportSabanaPDF = async () => {
        if (data.length === 0) {
            toast("No hay datos para exportar.", "error");
            return;
        }
        setIsLoading(true);
        let container: HTMLDivElement | null = null;

        try {
            const classDates = Object.keys(dateCounts).sort();
            const periodName = parciales.find(p => p.id === selectedPeriod)?.nombre || `Parcial ${selectedPeriod}`;
            const studentInfo = data[0] || {};
            const planEstudios = studentInfo.Especialidad || 'RADIOLOGÍA E IMAGEN';

            let groupTurn = 'VESPERTINO';
            if (selectedGroups.length > 0) {
                const baseGroup = selectedGroups[0].split(' - ')[0].trim();
                const matchingStudent = studentsDB.find(s => String(s.Grupo).trim() === baseGroup);
                if (matchingStudent && matchingStudent.Turno) {
                    groupTurn = matchingStudent.Turno.toUpperCase();
                }
            }

            container = document.createElement('div');
            container.style.position = 'fixed';
            container.style.top = '0';
            container.style.left = '0';
            container.style.zIndex = '-9999';
            container.style.pointerEvents = 'none';
            document.body.appendChild(container);

                const STUDENTS_PER_PAGE = 20;
                const totalPages = Math.ceil(data.length / STUDENTS_PER_PAGE);
                const weekdays = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

                for (let pageIdx = 0; pageIdx < totalPages; pageIdx++) {
                    const pageEl = document.createElement('div');
                    pageEl.className = 'sabana-pdf-page';
                    pageEl.style.width = '1123px';
                    pageEl.style.height = '794px';
                    pageEl.style.padding = '28px 36px';
                    pageEl.style.boxSizing = 'border-box';
                    pageEl.style.backgroundColor = '#ffffff';
                    pageEl.style.color = '#1f2937';
                    pageEl.style.fontFamily = "'Helvetica Neue', Helvetica, Arial, sans-serif";
                    pageEl.style.position = 'relative';

                    const startIndex = pageIdx * STUDENTS_PER_PAGE;
                    const endIndex = Math.min(startIndex + STUDENTS_PER_PAGE, data.length);
                    const pageStudents = data.slice(startIndex, endIndex);

                    const dateColW = Math.max(26, Math.min(34, Math.floor((1040 - 240) / Math.max(classDates.length, 1))));
                    const nameColW = 1040 - classDates.length * dateColW - 240;
                    const taColW = 28, tfColW = 28;

                    let pageHtml = '';

                    // ── HEADER ──
                    pageHtml += `
                    <div style="margin-bottom: 14px;">
                        <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                            <div style="display: flex; align-items: center; gap: 14px;">
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 450 80" width="320" height="55">
                                    <g transform="translate(10, 5)">
                                        <circle cx="30" cy="30" r="28" fill="none" stroke="#7a1c31" stroke-width="2.5"/>
                                        <circle cx="30" cy="30" r="24" fill="none" stroke="#d4c19c" stroke-width="1.8"/>
                                        <path d="M 30,12 C 22,20 20,32 30,48 C 40,32 38,20 30,12 Z" fill="#d4c19c"/>
                                        <path d="M 24,25 Q 30,18 36,25 Q 30,35 24,25 Z" fill="#7a1c31"/>
                                    </g>
                                    <text x="85" y="36" font-family="'Lora', 'Times New Roman', serif" font-size="32" font-weight="bold" fill="#7a1c31" letter-spacing="0.8">SEP</text>
                                    <text x="85" y="50" font-family="'Helvetica Neue', Arial, sans-serif" font-size="8" font-weight="600" fill="#6f7276" letter-spacing="0.3">SECRETARÍA DE</text>
                                    <text x="85" y="60" font-family="'Helvetica Neue', Arial, sans-serif" font-size="8" font-weight="600" fill="#6f7276" letter-spacing="0.3">EDUCACIÓN PÚBLICA</text>
                                </svg>
                                <div style="border-left: 2px solid #d4c19c; height: 40px; margin: 0 4px;"></div>
                                <div>
                                    <div style="font-size: 13px; color: #7a1c31; font-weight: bold; letter-spacing: 0.3px;">CETIS No. 76</div>
                                    <div style="font-size: 9px; color: #6f7276;">Control de Asistencias</div>
                                </div>
                            </div>
                            <div style="text-align: right;">
                                <div style="font-size: 20px; font-weight: bold; color: #7a1c31; letter-spacing: 1px;">REPORTE DE ASISTENCIAS</div>
                                <div style="font-size: 10px; color: #6f7276; font-weight: 600; margin-top: 2px;">${periodName.toUpperCase()}</div>
                            </div>
                        </div>
                    </div>`;

                    // ── INFO BAR ──
                    pageHtml += `
                    <div style="background: linear-gradient(135deg, #f8f6f3 0%, #f3f0eb 100%); border: 1px solid #e5ddd0; border-radius: 6px; padding: 10px 14px; margin-bottom: 12px; display: flex; gap: 24px; font-size: 9px; line-height: 1.6;">
                        <div style="flex: 2; display: grid; grid-template-columns: auto 1fr; gap: 1px 10px; align-content: start;">
                            <span style="font-weight: bold; color: #7a1c31;">PLANTEL:</span>
                            <span>CENTRO DE ESTUDIOS TECNOLÓGICOS INDUSTRIAL Y DE SERVICIOS NO. 76</span>
                            <span style="font-weight: bold; color: #7a1c31;">ASIGNATURA:</span>
                            <span style="font-weight: bold; text-transform: uppercase;">${selectedSubject}</span>
                            <span style="font-weight: bold; color: #7a1c31;">PLAN:</span>
                            <span style="text-transform: uppercase;">${planEstudios}</span>
                            <span style="font-weight: bold; color: #7a1c31;">C.C.T.:</span>
                            <span>09DET0076M</span>
                        </div>
                        <div style="flex: 1; display: grid; grid-template-columns: auto 1fr; gap: 1px 10px; align-content: start;">
                            <span style="font-weight: bold; color: #7a1c31;">GRUPO:</span>
                            <span style="font-weight: bold;">${selectedGroups.join(', ')}</span>
                            <span style="font-weight: bold; color: #7a1c31;">DOCENTE:</span>
                            <span style="text-transform: uppercase;">${selectedTeacher}</span>
                            <span style="font-weight: bold; color: #7a1c31;">TURNO:</span>
                            <span>${groupTurn}</span>
                        </div>
                    </div>`;

                    // ── TABLE ──
                    const headerStyle = 'background: #7a1c31; color: white; font-weight: bold; font-size: 8px; text-align: center; border: 0.5px solid #5a1424;';
                    const subHeaderStyle = 'background: #8a2a3a; color: white; font-size: 7px; text-align: center; border: 0.5px solid #5a1424;';

                    pageHtml += `<table style="width: 100%; border-collapse: collapse; border: 1px solid #7a1c31;">
                        <thead>
                            <tr>
                                <th style="${headerStyle} padding: 5px; width: 28px;" rowspan="2">NUM</th>
                                <th style="${headerStyle} padding: 5px; width: 80px;" rowspan="2">NO. CONTROL</th>
                                <th style="${headerStyle} padding: 5px 8px; text-align: left; width: ${nameColW}px;" rowspan="2">NOMBRE DEL ALUMNO</th>
                                <th style="${headerStyle} padding: 3px;" colspan="${classDates.length}">ASISTENCIAS</th>
                                <th style="${headerStyle} padding: 5px; width: ${taColW}px;" rowspan="2">T.A</th>
                                <th style="${headerStyle} padding: 5px; width: ${tfColW}px;" rowspan="2">T.F</th>
                            </tr>
                            <tr>
                                ${classDates.map(dateKey => {
                                    const dt = new Date(dateKey + 'T00:00:00');
                                    const dayNum = dt.getDate();
                                    const dayOfWeek = weekdays[dt.getDay()] || '';
                                    const month = dt.toLocaleDateString('es-MX', { month: 'short' });
                                    return `<th style="${subHeaderStyle} padding: 2px; width: ${dateColW}px; line-height: 1.15;">
                                        <div style="font-size: 9px; font-weight: bold;">${dayNum}</div>
                                        <div style="font-size: 6.5px; font-weight: 500; opacity: 0.85;">${dayOfWeek}</div>
                                        <div style="font-size: 6px; opacity: 0.7;">${month}</div>
                                    </th>`;
                                }).join('')}
                            </tr>
                        </thead>
                        <tbody>
                            ${pageStudents.map((student, idx) => {
                                const num = startIndex + idx + 1;
                                const control = student['Número de Control'] || '';
                                const name = student['Nombre del Alumno'] || '';

                                const dateStatusMap = new Map<string, string>();
                                const justifiedDates = new Set<string>();
                                const historicoJustificado = new Set<string>();

                                try {
                                    const fechas: FechaAsistencia[] = JSON.parse(student['Fechas y Horas de Asistencia'] || '[]');
                                    fechas.forEach((fReq) => {
                                        const fStr = typeof fReq === 'object' ? fReq.date : fReq;
                                        const status = typeof fReq === 'object' ? (fReq.status || 'Asistencia') : 'Asistencia';
                                        const notes = typeof fReq === 'object' ? fReq.notes : '';
                                        const dateObj = new Date(fStr);
                                        if (!isNaN(dateObj.getTime())) {
                                            const dk = dateObj.toISOString().split('T')[0];
                                            dateStatusMap.set(dk, status);
                                            if (status === 'Justificado') justifiedDates.add(dk);
                                            if (status === 'Justificado' && typeof notes === 'string') {
                                                const match = notes.match(/histórico \((.+?)\)/i);
                                                if (match && match[1]) historicoJustificado.add(match[1]);
                                            }
                                        }
                                    });
                                } catch { /* ignore */ }

                                let ta = 0, tf = 0;
                                const rowBg = idx % 2 === 0 ? '#ffffff' : '#faf8f5';

                                const colsHtml = classDates.map(dateKey => {
                                    const status = dateStatusMap.get(dateKey);
                                    let mark = '', cellBg = '', cellColor = '', cellFw = '';

                                    if (status === 'Retardo') {
                                        mark = 'R';
                                        cellBg = '#fef3c7';
                                        cellColor = '#d97706';
                                        cellFw = 'bold';
                                        ta++;
                                    } else if (status === 'Justificado' || historicoJustificado.has(dateKey)) {
                                        mark = 'J';
                                        cellBg = '#eff6ff';
                                        cellColor = '#2563eb';
                                        cellFw = 'bold';
                                        ta++;
                                    } else if (status === 'Asistencia') {
                                        mark = '✓';
                                        cellBg = '#f0fdf4';
                                        cellColor = '#16a34a';
                                        ta++;
                                    } else {
                                        mark = '✗';
                                        cellBg = '#fef2f2';
                                        cellColor = '#dc2626';
                                        cellFw = 'bold';
                                        tf++;
                                    }

                                    return `<td style="border: 0.5px solid #d4c19c; text-align: center; padding: 3px 1px; font-size: 10px; color: ${cellColor}; font-weight: ${cellFw}; background-color: ${cellBg};">${mark}</td>`;
                                }).join('');

                                return `
                                    <tr style="background-color: ${rowBg};">
                                        <td style="border: 0.5px solid #d4c19c; text-align: center; padding: 4px; font-size: 8px; color: #6f7276;">${num}</td>
                                        <td style="border: 0.5px solid #d4c19c; text-align: center; padding: 4px; font-family: 'Courier New', monospace; font-size: 8px;">${control}</td>
                                        <td style="border: 0.5px solid #d4c19c; padding: 4px 8px; font-size: 9px; text-transform: uppercase; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: ${nameColW}px;">${name}</td>
                                        ${colsHtml}
                                        <td style="border: 0.5px solid #d4c19c; text-align: center; padding: 4px; font-size: 9px; font-weight: bold; background-color: #f0fdf4; color: #16a34a;">${ta}</td>
                                        <td style="border: 0.5px solid #d4c19c; text-align: center; padding: 4px; font-size: 9px; font-weight: bold; background-color: #fef2f2; color: #dc2626;">${tf}</td>
                                    </tr>
                                `;
                            }).join('')}
                        </tbody>
                    </table>`;

                    // ── LEGEND + FOOTER ──
                    pageHtml += `
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 10px; font-size: 8px;">
                        <div style="display: flex; gap: 16px; color: #6f7276;">
                            <span><span style="display: inline-block; width: 10px; height: 10px; background: #f0fdf4; border: 1px solid #d4c19c; border-radius: 2px; margin-right: 4px; vertical-align: middle;"></span> Asistencia (✓)</span>
                            <span><span style="display: inline-block; width: 10px; height: 10px; background: #fef3c7; border: 1px solid #d4c19c; border-radius: 2px; margin-right: 4px; vertical-align: middle;"></span> Retardo (R)</span>
                            <span><span style="display: inline-block; width: 10px; height: 10px; background: #eff6ff; border: 1px solid #d4c19c; border-radius: 2px; margin-right: 4px; vertical-align: middle;"></span> Justificado (J)</span>
                            <span><span style="display: inline-block; width: 10px; height: 10px; background: #fef2f2; border: 1px solid #d4c19c; border-radius: 2px; margin-right: 4px; vertical-align: middle;"></span> Falta (✗)</span>
                        </div>
                        <div style="color: #9ca3af; display: flex; gap: 20px;">
                            <span>Generado por AulaEcosystem</span>
                            <span style="font-weight: bold;">Página ${pageIdx + 1} de ${totalPages}</span>
                        </div>
                    </div>`;

                    pageEl.innerHTML = pageHtml;
                    container.appendChild(pageEl);
                }

            const pdf = new jsPDF({
                orientation: 'landscape',
                unit: 'mm',
                format: 'a4'
            });

            const pageElements = container.querySelectorAll('.sabana-pdf-page');
            for (let i = 0; i < pageElements.length; i++) {
                if (i > 0) {
                    pdf.addPage();
                }
                const canvas = await html2canvas(pageElements[i] as HTMLElement, {
                    scale: 2,
                    useCORS: true,
                    logging: false,
                    backgroundColor: '#ffffff'
                });
                const imgData = canvas.toDataURL('image/jpeg', 0.95);
                pdf.addImage(imgData, 'JPEG', 0, 0, 297, 210);
            }

            pdf.save(`Sabana_Asistencias_${selectedGroups.join('_')}_${selectedSubject.substring(0, 15)}.pdf`);

        } catch (error) {
            console.error('Error al generar PDF Sábana:', error);
            toast('Hubo un error al generar el PDF Sábana.', 'error');
        } finally {
            if (container && document.body.contains(container)) {
                document.body.removeChild(container);
            }
            setIsLoading(false);
        }
    };

    const getRiskColor = (percent: number) => {
        if (percent < 0.8) return 'text-red-500 bg-red-500/10 border-red-500/20';
        if (percent < 0.9) return 'text-yellow-500 bg-yellow-500/10 border-yellow-500/20';
        return 'text-theme-accent2-500 bg-theme-accent2-500/10 border-theme-accent2-500/20';
    };

    // Calculate critical students list (absences streak >= 3)
    const criticalStudents = useMemo(() => {
        return activeData.filter(d => (d.rachaFaltas || 0) >= 3);
    }, [activeData]);

    return (
        <div className="p-4 sm:p-6 pb-24 min-h-[100dvh] bg-transparent transition-all duration-300">
            {step < 3 ? (
                <div className="max-w-2xl mx-auto mt-6 animate-fade-in-up transition-all duration-500">
                    {step === 0 && (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                            <Card className="border-theme-border flex items-center gap-4 bg-theme-border/20 p-4">
                                <div className="p-3 rounded-xl bg-white/5 border border-theme-border text-theme-accent1-400">
                                    <span className="material-icons-round text-2xl">school</span>
                                </div>
                                <div>
                                    <p className="text-xs text-theme-muted uppercase tracking-wider font-semibold">Alumnos</p>
                                    <p className="font-mono text-xl font-bold">{studentsDB.length}</p>
                                </div>
                            </Card>
                            <Card className="border-theme-border flex items-center gap-4 bg-theme-border/20 p-4">
                                <div className="p-3 rounded-xl bg-white/5 border border-theme-border text-theme-accent2-400">
                                    <span className="material-icons-round text-2xl">groups</span>
                                </div>
                                <div>
                                    <p className="text-xs text-theme-muted uppercase tracking-wider font-semibold">Grupos</p>
                                    <p className="font-mono text-xl font-bold">{availableGroups.length}</p>
                                </div>
                            </Card>
                            <Card className="border-theme-border flex items-center gap-4 bg-theme-border/20 p-4">
                                <div className="p-3 rounded-xl bg-white/5 border border-theme-border text-yellow-400">
                                    <span className="material-icons-round text-2xl">auto_stories</span>
                                </div>
                                <div>
                                    <p className="text-xs text-theme-muted uppercase tracking-wider font-semibold">Materias</p>
                                    <p className="font-mono text-xl font-bold">{config.materias.length}</p>
                                </div>
                            </Card>
                            <Card className="border-theme-border flex items-center gap-4 bg-theme-border/20 p-4">
                                <div className="p-3 rounded-xl bg-white/5 border border-theme-border text-emerald-400">
                                    <span className="material-icons-round text-2xl">person_4</span>
                                </div>
                                <div>
                                    <p className="text-xs text-theme-muted uppercase tracking-wider font-semibold">Profesores</p>
                                    <p className="font-mono text-xl font-bold">{config.profesores.length}</p>
                                </div>
                            </Card>
                        </div>
                    )}

                    <Card id="report-filters" className="border-theme-border shadow-2xl p-6 sm:p-8">
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

                        <div className="min-h-[200px] flex flex-col justify-center transition-all duration-300">
                            {mode === 'group' && (
                                <>
                                    {step === 0 && (
                                        <div className="space-y-4 animate-fade-in">
                                            <h3 className="font-display text-xl font-bold text-center mb-6">Selecciona el Profesor</h3>
                                            <Select value={selectedTeacher} onChange={e => setSelectedTeacher(e.target.value)} className="h-12 text-lg">
                                                <option value="">-- Elige un profesor --</option>
                                                {config.profesores.map(p => <option key={p.value} value={p.text}>{p.text}</option>)}
                                            </Select>
                                        </div>
                                    )}
                                    {step === 1 && (
                                        <div className="space-y-4 animate-fade-in">
                                            <h3 className="font-display text-xl font-bold text-center mb-6">Selecciona la Materia</h3>
                                            <Select value={selectedSubject} onChange={e => setSelectedSubject(e.target.value)} className="h-12 text-lg">
                                                <option value="">-- Elige una materia --</option>
                                                {config.materias.map(m => <option key={m.value} value={m.text}>{m.text}</option>)}
                                            </Select>
                                        </div>
                                    )}
                                    {step === 2 && (
                                        <div className="space-y-4 animate-fade-in">
                                            <h3 className="font-display text-xl font-bold text-center mb-6">Selecciona los Grupos y Período</h3>
                                            <div className="space-y-2">
                                                <label className="text-sm font-semibold text-theme-text">Grupos (Selecciona uno o más)</label>
                                                <div className="flex flex-wrap gap-2 p-3 bg-black/25 rounded-2xl border border-theme-border">
                                                    {(() => {
                                                        const badgeColors = [
                                                            { active: "bg-blue-500/20 border-blue-500 text-blue-300", hover: "hover:bg-blue-500/10 hover:text-blue-200" },
                                                            { active: "bg-emerald-500/20 border-emerald-500 text-emerald-300", hover: "hover:bg-emerald-500/10 hover:text-emerald-200" },
                                                            { active: "bg-purple-500/20 border-purple-500 text-purple-300", hover: "hover:bg-purple-500/10 hover:text-purple-200" },
                                                            { active: "bg-amber-500/20 border-amber-500 text-amber-300", hover: "hover:bg-amber-500/10 hover:text-amber-200" },
                                                            { active: "bg-rose-500/20 border-rose-500 text-rose-300", hover: "hover:bg-rose-500/10 hover:text-rose-200" },
                                                            { active: "bg-cyan-500/20 border-cyan-500 text-cyan-300", hover: "hover:bg-cyan-500/10 hover:text-cyan-200" },
                                                            { active: "bg-indigo-500/20 border-indigo-500 text-indigo-300", hover: "hover:bg-indigo-500/10 hover:text-indigo-200" },
                                                            { active: "bg-teal-500/20 border-teal-500 text-teal-300", hover: "hover:bg-teal-500/10 hover:text-teal-200" },
                                                            { active: "bg-orange-500/20 border-orange-500 text-orange-300", hover: "hover:bg-orange-500/10 hover:text-orange-200" },
                                                            { active: "bg-pink-500/20 border-pink-500 text-pink-300", hover: "hover:bg-pink-500/10 hover:text-pink-200" }
                                                        ];
                                                        const formatGroupLabel = (label: string) => {
                                                            return label
                                                                .replace(/radiolog[íi]a/gi, 'RAD')
                                                                .replace(/enfermer[íi]a/gi, 'ENF')
                                                                .replace(/programaci[óo]n/gi, 'PROG')
                                                                .replace(/mantenimiento/gi, 'MANT')
                                                                .replace(/electricidad/gi, 'ELEC')
                                                                .replace(/administraci[óo]n/gi, 'ADM');
                                                        };
                                                        return availableGroups.map((g, idx) => {
                                                            const isSelected = selectedGroups.includes(g);
                                                            const colorScheme = badgeColors[idx % badgeColors.length];
                                                            return (
                                                                <button
                                                                    key={g}
                                                                    type="button"
                                                                    onClick={() => {
                                                                        setSelectedGroups(prev =>
                                                                            prev.includes(g) ? prev.filter(x => x !== g) : [...prev, g]
                                                                        );
                                                                    }}
                                                                    className={cn(
                                                                        "px-3 min-h-[44px] rounded-full border text-xs font-semibold cursor-pointer select-none transition-all duration-200 flex items-center gap-1",
                                                                        isSelected
                                                                            ? cn("shadow-md scale-[1.02]", colorScheme.active)
                                                                            : cn("bg-theme-border/20 border-theme-border text-theme-muted hover:bg-theme-border/40 hover:text-theme-text", colorScheme.hover)
                                                                    )}
                                                                >
                                                                    {isSelected && <span className="material-icons-round text-xs">check</span>}
                                                                    <span className="truncate">{formatGroupLabel(g)}</span>
                                                                </button>
                                                            );
                                                        });
                                                    })()}
                                                </div>
                                            </div>
                                            {parciales.length > 0 && (
                                                <div className="space-y-2">
                                                    <label className="text-sm font-semibold text-theme-text">Periodo / Parcial</label>
                                                    <Select value={selectedPeriod} onChange={e => setSelectedPeriod(e.target.value)} className="h-12 text-lg">
                                                        {parciales.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                                                    </Select>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </>
                            )}

                            {mode === 'student' && step === 0 && (
                                <div className="space-y-4 animate-fade-in">
                                    <h3 className="font-display text-xl font-bold text-center mb-6">Búsqueda de Alumno</h3>
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
                                                        key={s.control}
                                                        type="button"
                                                        className="w-full text-left p-4 hover:bg-theme-base border-b border-theme-border flex flex-col transition-colors cursor-pointer"
                                                        onClick={() => {
                                                            setSelectedSearchStudent(s);
                                                            setSearchQuery(s.nombre);
                                                            setShowSuggestions(false);
                                                        }}
                                                    >
                                                        <span className="text-lg text-theme-text font-medium">{s.nombre}</span>
                                                        <span className="text-sm text-theme-accent1-400 font-mono mt-1">{s.control}</span>
                                                    </button>
                                                )) : (
                                                    <div className="p-4 text-theme-muted text-center italic">No se encontraron alumnos.</div>
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    {selectedSearchStudent && (
                                        <div className="space-y-4 mt-6 animate-fade-in">
                                            <div className="p-4 bg-theme-accent1-500/10 border border-theme-accent1-500/20 rounded-xl flex items-center gap-4">
                                                <div className="p-3 bg-theme-accent1-500/20 rounded-full text-theme-accent1-400">
                                                    <span className="material-icons-round">account_circle</span>
                                                </div>
                                                <div>
                                                    <p className="text-sm font-medium text-theme-text">{selectedSearchStudent.nombre}</p>
                                                    <p className="text-xs text-theme-muted mt-1">Control: <span className="font-mono text-theme-accent1-300">{selectedSearchStudent.control}</span></p>
                                                </div>
                                            </div>
                                            {parciales.length > 0 && (
                                                <div className="space-y-2">
                                                    <label className="text-sm font-semibold text-theme-text">Periodo / Parcial</label>
                                                    <Select value={selectedPeriod} onChange={e => setSelectedPeriod(e.target.value)} className="h-12 text-lg">
                                                        {parciales.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                                                    </Select>
                                                </div>
                                            )}
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
                <div id="dashboard-report-content" className="space-y-6 max-w-7xl mx-auto animate-fade-in p-4 bg-theme-base rounded-3xl transition-all duration-300">
                    {/* Dashboard Header */}
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-theme-card/80 backdrop-blur-xl p-4 sm:p-6 rounded-3xl border border-theme-border shadow-md">
                        <div>
                            <h1 className="font-display text-2xl font-bold text-theme-text mb-1 tracking-wide">
                                {mode === 'group' ? 'Reporte de Asistencia' : 'Kárdex de Asistencia (Alumno)'}
                            </h1>
                            <p className="text-theme-muted text-sm tracking-wide">
                                {mode === 'group'
                                    ? `${selectedTeacher} • ${selectedSubject} • ${selectedGroups.join(', ')}`
                                    : `${selectedSearchStudent?.nombre} • Control: ${selectedSearchStudent?.control}`
                                }
                                {parciales.length > 0 && ` • ${parciales.find(p => p.id === selectedPeriod)?.nombre || ''}`}
                            </p>
                        </div>
                        <div id="export-actions" className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-3 w-full sm:w-auto no-print">
                            {parciales.length > 0 && (
                                <div className="relative col-span-2 sm:col-span-1">
                                    <Select
                                        value={selectedPeriod}
                                        onChange={e => {
                                            const newPeriod = e.target.value;
                                            setSelectedPeriod(newPeriod);
                                            if (mode === 'group') {
                                                loadGroupData(newPeriod);
                                            } else {
                                                loadStudentData(newPeriod);
                                            }
                                        }}
                                        className="h-10 text-sm w-full sm:w-36 bg-theme-border/50 text-theme-text border-theme-border"
                                    >
                                    {parciales.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                                 </Select>
                                </div>
                            )}
                            <Button variant="outline" onClick={() => { setStep(0); }} className="w-full sm:w-auto min-h-[44px]">
                                <span className="material-icons-round text-sm mr-1">tune</span> Filtros
                            </Button>
                            <Button onClick={downloadReport} className="w-full sm:w-auto bg-theme-accent2-600 hover:bg-theme-accent2-700 min-h-[44px]">
                                <span className="material-icons-round text-sm mr-1">download</span> CSV
                            </Button>
                            <button onClick={exportGroupPDF} className="inline-flex items-center justify-center whitespace-nowrap rounded-lg font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-theme-accent1-500/40 focus-visible:ring-offset-2 focus-visible:ring-offset-theme-base disabled:pointer-events-none disabled:opacity-50 active:scale-[0.97] overflow-hidden relative text-white hover:brightness-110 shadow-[var(--shadow-button-default)] h-12 px-5 w-full sm:w-auto bg-theme-accent1-600 hover:bg-theme-accent1-700 min-h-[44px]">
                                <span className="material-icons-round text-sm mr-1">picture_as_pdf</span> PDF
                            </button>
                            {mode === 'group' && (
                                <Button onClick={exportSabanaPDF} className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 min-h-[44px] text-white font-medium">
                                    <span className="material-icons-round text-sm mr-1">grid_on</span> Sábana PDF
                                </Button>
                            )}
                        </div>
                    </div>

                    {/* Critical Absences Banner */}
                    {criticalStudents.length > 0 && showCriticalAlert && (
                        <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-3xl flex items-center justify-between gap-4 shadow-lg animate-fade-in no-print">
                            <div className="flex items-center gap-3">
                                <span className="material-icons-round text-red-500 text-2xl animate-pulse">error_outline</span>
                                <div>
                                    <h4 className="font-display font-bold text-sm">Alumnos en Riesgo Crítico</h4>
                                    <p className="text-xs text-red-400/80">
                                        {criticalStudents.length === 1 
                                            ? `El alumno ${criticalStudents[0]['Nombre del Alumno']} tiene una racha de ${criticalStudents[0].rachaFaltas} faltas consecutivas.`
                                            : `${criticalStudents.length} alumnos tienen una racha de 3 o más faltas consecutivas al final del periodo.`
                                        }
                                    </p>
                                </div>
                            </div>
                            <button onClick={() => setShowCriticalAlert(false)} className="text-red-400 hover:text-red-300">
                                <span className="material-icons-round text-lg">close</span>
                            </button>
                        </div>
                    )}

                    {isLoading ? (
                        <div className="h-64 flex flex-col items-center justify-center text-theme-accent1-500">
                            <span className="animate-spin material-icons-round text-5xl mb-4">settings</span>
                            <p className="font-medium animate-pulse">Procesando Analytics desde Base de Datos...</p>
                        </div>
                    ) : (
                        <>
                            {/* KPIs */}
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
                                            <span className={cn("font-mono text-3xl sm:text-4xl font-black tracking-tight", kpi.color)}>{kpi.value}</span>
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

                            {activeData.length === 0 ? (
                                <Card className="border-theme-border bg-theme-border/20 p-12 text-center flex flex-col items-center justify-center max-w-xl mx-auto my-12">
                                    <div className="p-4 rounded-full bg-theme-border/30 text-theme-muted mb-4">
                                        <span className="material-icons-round text-5xl">analytics</span>
                                    </div>
                                    <h3 className="font-display text-xl font-bold text-theme-text mb-2">Sin Datos Disponibles</h3>
                                    <p className="text-theme-muted text-sm max-w-md">
                                        No se encontraron registros de asistencia para el período o filtros seleccionados. Intenta cambiar de período o ajustar la búsqueda.
                                    </p>
                                </Card>
                            ) : (
                                <>
                                    {/* Charts with fullscreen capability */}
                                    <div ref={chartsContainerRef} className={cn("grid grid-cols-1 lg:grid-cols-4 gap-6 transition-all duration-300", isFullscreen && "p-8 bg-slate-900 overflow-y-auto w-full h-full z-[9999]")}>
                                        <Card className="lg:col-span-2 border-theme-border bg-theme-border/50 p-6 relative">
                                            <div className="absolute top-4 right-4 flex items-center gap-2 z-10 no-print">
                                                <Button variant="ghost" size="sm" onClick={toggleFullscreen} className="text-theme-muted hover:text-theme-text h-8 w-8 p-0">
                                                    <span className="material-icons-round text-lg">{isFullscreen ? 'fullscreen_exit' : 'fullscreen'}</span>
                                                </Button>
                                            </div>
                                            <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
                                                <span className="material-icons-round text-theme-accent1-400">insights</span>
                                                Tendencia de Asistencia
                                            </h3>
                                            <div className="h-[250px] w-full">
                                                <ResponsiveContainer width="100%" height="100%">
                                                    <LineChart data={timelineData}>
                                                        <CartesianGrid strokeDasharray="3 3" stroke={cssVar('--theme-border') || '#374151'} vertical={false} />
                                                        <XAxis dataKey="name" stroke={cssVar('--theme-muted') || '#9ca3af'} tick={{ fill: cssVar('--theme-muted') || '#9ca3af' }} axisLine={false} tickLine={false} />
                                                        <YAxis domain={[0, Math.max(totalItems, 5)]} stroke={cssVar('--theme-muted') || '#9ca3af'} tick={{ fill: cssVar('--theme-muted') || '#9ca3af' }} axisLine={false} tickLine={false} />
                                                        <RechartsTooltip contentStyle={tooltipStyle} />
                                                        <ReferenceLine y={totalItems * 0.85} stroke={cssVar('--theme-accent1-500') || '#ef4444'} strokeDasharray="3 3" label={{ position: 'top', value: 'Umbral 85%', fill: cssVar('--theme-accent1-500') || '#ef4444', fontSize: 12 }} />
                                                        <Line type="monotone" name="Período Actual" dataKey="asistencias" stroke={cssVar('--theme-accent3-500') || '#3b82f6'} strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                                                        {prevTimelineData.length > 0 && (
                                                            <Line type="monotone" name="Período Anterior" dataKey="asistenciasPrev" stroke={cssVar('--theme-accent3-500') || '#a855f7'} strokeWidth={2} strokeDasharray="5 5" dot={{ r: 3 }} />
                                                        )}
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
                                                        <RechartsTooltip contentStyle={tooltipStyle} />
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
                                                        <CartesianGrid strokeDasharray="3 3" stroke={cssVar('--theme-border') || '#374151'} vertical={false} />
                                                        <XAxis dataKey="name" stroke={cssVar('--theme-muted') || '#9ca3af'} tick={{ fill: cssVar('--theme-muted') || '#9ca3af', fontSize: 12 }} axisLine={false} tickLine={false} />
                                                        <YAxis hide />
                                                        <RechartsTooltip cursor={{ fill: cssVar('--theme-border') || '#374151', opacity: 0.4 }} contentStyle={tooltipStyle} />
                                                        <Bar dataKey="faltas" fill={cssVar('--theme-accent1-500') || '#ef4444'} radius={[4, 4, 0, 0]} />
                                                    </BarChart>
                                                </ResponsiveContainer>
                                            </div>
                                        </Card>
                                        <Card className="border-theme-border bg-theme-border/50 p-6">
                                            <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
                                                <span className="material-icons-round text-theme-accent3-400">fact_check</span>
                                                Tipos de Marca
                                            </h3>
                                            <div className="h-[250px] w-full mt-4">
                                                <ResponsiveContainer width="100%" height="100%">
                                                    <PieChart>
                                                        <Pie data={markTypeData} cx="50%" cy="50%" innerRadius={50} outerRadius={70} paddingAngle={5} dataKey="value" stroke="none">
                                                            {markTypeData.map((entry, index) => <Cell key={`mt-${index}`} fill={entry.color} />)}
                                                        </Pie>
                                                        <RechartsTooltip contentStyle={tooltipStyle} />
                                                        <Legend verticalAlign="bottom" height={36} iconType="circle" />
                                                    </PieChart>
                                                </ResponsiveContainer>
                                            </div>
                                        </Card>
                                        <Card className="border-theme-border bg-theme-border/50 p-6">
                                            <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
                                                <span className="material-icons-round text-theme-warning-400">trending_up</span>
                                                Rachas
                                            </h3>
                                            <div className="h-[250px] w-full">
                                                <ResponsiveContainer width="100%" height="100%">
                                                    <BarChart data={streakData} margin={{ top: 4, right: 4, bottom: 4, left: 0 }}>
                                                        <CartesianGrid strokeDasharray="3 3" stroke={cssVar('--theme-border') || '#374151'} vertical={false} />
                                                        <XAxis dataKey="label" stroke={cssVar('--theme-muted') || '#9ca3af'} tick={{ fill: cssVar('--theme-muted') || '#9ca3af', fontSize: 12 }} axisLine={false} tickLine={false} interval={0} />
                                                        <YAxis hide />
                                                        <RechartsTooltip cursor={{ fill: cssVar('--theme-border') || '#374151', opacity: 0.4 }} contentStyle={tooltipStyle} />
                                                        <Bar dataKey="alumnos" radius={[4, 4, 0, 0]}>
                                                            {streakData.map((entry, index) => <Cell key={`sr-${index}`} fill={entry.color} />)}
                                                        </Bar>
                                                    </BarChart>
                                                </ResponsiveContainer>
                                            </div>
                                        </Card>
                                        <Card className="lg:col-span-2 border-theme-border bg-theme-border/50 p-6">
                                            <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
                                                <span className="material-icons-round text-theme-accent1-400">bar_chart</span>
                                                Distribución
                                            </h3>
                                            <div className="h-[250px] w-full">
                                                <ResponsiveContainer width="100%" height="100%">
                                                    <BarChart data={histogramData} margin={{ top: 4, right: 4, bottom: 4, left: 0 }}>
                                                        <CartesianGrid strokeDasharray="3 3" stroke={cssVar('--theme-border') || '#374151'} vertical={false} />
                                                        <XAxis dataKey="name" stroke={cssVar('--theme-muted') || '#9ca3af'} tick={{ fill: cssVar('--theme-muted') || '#9ca3af', fontSize: 11 }} axisLine={false} tickLine={false} interval={0} />
                                                        <YAxis hide />
                                                        <RechartsTooltip cursor={{ fill: cssVar('--theme-border') || '#374151', opacity: 0.4 }} contentStyle={tooltipStyle} />
                                                        <Bar dataKey="alumnos" radius={[4, 4, 0, 0]}>
                                                            {histogramData.map((entry, index) => <Cell key={`hd-${index}`} fill={entry.color} />)}
                                                        </Bar>
                                                    </BarChart>
                                                </ResponsiveContainer>
                                            </div>
                                        </Card>
                                    </div>
                                </>
                            )}

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
                                    <div className="flex gap-2 w-full sm:w-auto no-print">
                                        <div className="relative flex-1 sm:flex-none sm:w-64">
                                            <Input
                                                placeholder={mode === 'group' ? "Buscar alumno..." : "Buscar materia..."}
                                                value={localSearchQuery}
                                                onChange={e => setLocalSearchQuery(e.target.value)}
                                                className="h-9 pl-9 text-sm"
                                            />
                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 material-icons-round text-[18px] text-theme-muted">search</span>
                                        </div>
                                        <Button onClick={downloadAbsenceReport} variant="outline" size="sm" className="min-h-[44px] h-9 gap-2 text-sm text-theme-accent1-400 hover:bg-theme-accent1-500/10 whitespace-nowrap">
                                            <span className="material-icons-round text-[18px]">download</span> Faltas (CSV)
                                        </Button>
                                    </div>
                                </div>
                                <div className="overflow-x-auto dense">
                                    <table className="w-full text-left border-collapse">
                                        <thead className="sticky top-0 z-10 backdrop-blur-md">
                                            <tr className="bg-black/20 text-theme-muted text-xs uppercase tracking-wider select-none">
                                                {(() => {
                                                    const handleSortClick = (field: string) => {
                                                        if (sortField === field) {
                                                            setSortDir(prev => prev === 'asc' ? 'desc' : 'asc');
                                                        } else {
                                                            setSortField(field);
                                                            setSortDir('asc');
                                                        }
                                                    };

                                                    const renderSortIcon = (field: string) => {
                                                        if (sortField !== field) return <span className="material-icons-round text-sm text-theme-muted/40 ml-1">sort</span>;
                                                        return sortDir === 'asc'
                                                            ? <span className="material-icons-round text-sm text-theme-accent1-400 ml-1">arrow_upward</span>
                                                            : <span className="material-icons-round text-sm text-theme-accent1-400 ml-1">arrow_downward</span>;
                                                    };

                                                    return (
                                                        <>
                                                            <th className="p-4 font-medium cursor-pointer hover:bg-white/5 transition-colors" onClick={() => handleSortClick('name')}>
                                                                <div className="flex items-center">
                                                                    {mode === 'group' ? 'Alumno' : 'Materia'}
                                                                    {renderSortIcon('name')}
                                                                </div>
                                                            </th>
                                                            <th className="p-4 font-medium cursor-pointer hover:bg-white/5 transition-colors" onClick={() => handleSortClick('control')}>
                                                                <div className="flex items-center">
                                                                    {mode === 'group' ? 'Control' : 'Profesor'}
                                                                    {renderSortIcon('control')}
                                                                </div>
                                                            </th>
                                                            <th className="p-4 font-medium cursor-pointer hover:bg-white/5 transition-colors" onClick={() => handleSortClick('classes')}>
                                                                <div className="flex items-center">
                                                                    Clases
                                                                    {renderSortIcon('classes')}
                                                                </div>
                                                            </th>
                                                            <th className="p-4 font-medium cursor-pointer hover:bg-white/5 transition-colors" onClick={() => handleSortClick('percentage')}>
                                                                <div className="flex items-center">
                                                                    Progreso
                                                                    {renderSortIcon('percentage')}
                                                                </div>
                                                            </th>
                                                            <th className="p-4 font-medium text-right">Estatus</th>
                                                        </>
                                                    );
                                                })()}
                                            </tr>
                                        </thead>
                                        <tbody className="text-sm divide-y divide-white/5">
                                            {paginatedData.map((item, i) => (
                                                <tr key={i} className="hover:bg-theme-border/50 transition-colors cursor-pointer group" onClick={() => setSelectedStudent(item)}>
                                                    <td className="p-4 text-theme-text font-medium group-hover:text-theme-accent1-400 transition-colors">
                                                        <div className="flex items-center gap-2">
                                                            {mode === 'group' ? (
                                                                <>
                                                                    <StudentAvatar name={item['Nombre del Alumno']} control={item['Número de Control']} size={36} />
                                                                    {item['Nombre del Alumno']}
                                                                </>
                                                            ) : item.Materia}
                                                            {mode === 'group' && selectedGroups.length > 1 && (
                                                                <span className="text-[10px] bg-theme-border text-theme-text px-2 py-0.5 rounded font-bold">
                                                                    {item.Grupo}
                                                                </span>
                                                            )}
                                                            {item.rachaFaltas && item.rachaFaltas >= 2 ? (
                                                                <span className="relative group/tooltip inline-block">
                                                                    <span className={cn("text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full border shadow-sm flex items-center gap-1 whitespace-nowrap", item.rachaFaltas >= 3 ? "bg-red-500/20 text-red-500 border-red-500/30" : "bg-yellow-500/20 text-yellow-500 border-yellow-500/30")}>
                                                                        <span className="material-icons-round text-[12px]">warning</span>
                                                                        {item.rachaFaltas} Faltas
                                                                    </span>
                                                                    <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover/tooltip:block bg-gray-900 text-white text-xs rounded-lg p-2 whitespace-normal w-48 shadow-xl border border-theme-border z-50 text-center transition-all duration-300">
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
                                            {paginatedData.length === 0 && (
                                                <tr>
                                                    <td colSpan={5} className="p-8 text-center text-theme-muted/80 italic">No hay datos disponibles para estos filtros.</td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                                {totalPages > 1 && (
                                    <div className="p-4 border-t border-theme-border flex flex-col sm:flex-row items-center justify-between gap-2 text-sm no-print">
                                        <span className="text-theme-muted">
                                            Mostrando {((currentPage - 1) * ITEMS_PER_PAGE) + 1} - {Math.min(currentPage * ITEMS_PER_PAGE, activeData.length)} de {activeData.length} alumnos
                                        </span>
                                        <div className="flex gap-2">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                disabled={currentPage === 1}
                                                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                                className="h-8"
                                            >
                                                Anterior
                                            </Button>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                disabled={currentPage === totalPages}
                                                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                                                className="h-8"
                                            >
                                                Siguiente
                                            </Button>
                                        </div>
                                    </div>
                                )}
                            </Card>
                        </>
                    )}

                    {/* Detailed Modal */}
                    <Modal isOpen={!!selectedStudent} onClose={() => setSelectedStudent(null)} title={selectedStudent ? (mode === 'group' ? selectedStudent['Nombre del Alumno'] : `${selectedStudent.Materia} - Detalles`) : 'Detalles'} fullScreenOnMobile>
                        {selectedStudent && (
                            <div className="space-y-6" ref={modalRef}>
                                <div className="flex flex-wrap gap-1 sm:gap-2 p-1 bg-black/20 rounded-lg no-print">
                                    <button className={cn("flex-1 py-1.5 text-xs sm:text-sm font-medium rounded-md", modalView === 'list' ? "bg-theme-border/100 text-theme-text shadow" : "text-theme-muted")} onClick={() => setModalView('list')}>Lista Histórica</button>
                                    <button className={cn("flex-1 py-1.5 text-xs sm:text-sm font-medium rounded-md", modalView === 'sheet' ? "bg-theme-border/100 text-theme-text shadow" : "text-theme-muted")} onClick={() => setModalView('sheet')}>Vista Mes</button>
                                    <button className={cn("flex-1 py-1.5 text-xs sm:text-sm font-medium rounded-md", modalView === 'calendar' ? "bg-theme-border/100 text-theme-text shadow" : "text-theme-muted")} onClick={() => setModalView('calendar')}>Gráfico de Actividad</button>
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
                                                                <Button onClick={() => handleJustifyAbsence(falta)} size="sm" variant="ghost" className="text-theme-accent2-400 hover:text-theme-accent2-300 hover:bg-theme-accent2-500/10 h-8 text-xs font-semibold px-3 animate-pulse">
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
                                                const dates: FechaAsistencia[] = JSON.parse(selectedStudent['Fechas y Horas de Asistencia'] || '[]');
                                                if (!Array.isArray(dates) || dates.length === 0) return <p className="text-theme-muted/80 text-sm">Sin registros.</p>;
                                                return dates.map((d, i) => {
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
                                                        <div key={i} className={cn("flex flex-col sm:flex-row justify-between items-start sm:items-center p-3 rounded-xl border gap-3", isJustificado ? "bg-theme-accent1-400/10 border-theme-accent1-400/20 shadow-inner" : "bg-theme-border/50 border-theme-border")}>
                                                            <div className="flex flex-col gap-1.5">
                                                                <div className="flex items-center gap-2">
                                                                    <span className="text-theme-text font-medium">{date.toLocaleDateString('es-MX', { weekday: 'long', day: '2-digit', month: 'long' })}</span>
                                                                    {isJustificado && <span className="text-[10px] bg-theme-accent1-400 text-white px-2 py-0.5 rounded uppercase font-bold tracking-wider shadow-sm">Justificada</span>}
                                                                </div>
                                                                {isJustificado && histDateStr ? (
                                                                    <span className="text-xs text-theme-accent1-400 font-medium">Registrado el: {date.toLocaleDateString('es-MX')} • Cubre falta del: {histDateStr}</span>
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
                                            } catch { return <p>Error cargando fechas.</p>; }
                                        })()}
                                    </div>
                                ) : modalView === 'sheet' ? (
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
                                            } catch { /* ignored */ }

                                            const rawFaltas: Date[] = (selectedStudent.faltasCalculadas || []).map(f => {
                                                const parts = f.split('-');
                                                return new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
                                            });

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
                                                                    <div key={rIdx} className={cn("w-[2.5rem] h-[3rem] rounded-lg flex flex-col items-center justify-center text-xs font-mono shadow-sm border transition-shadow", isJustificado ? "bg-theme-accent1-400/10 border-theme-accent1-400/30 text-theme-accent1-400" : isAsistencia ? "bg-theme-accent2-500/10 border-theme-accent2-500/20 text-theme-accent2-400" : "bg-red-500/10 border-red-500/20 text-red-400")}>
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
                                ) : (
                                    <div className="overflow-x-auto mt-4 p-4 bg-theme-border/50 border border-theme-border rounded-2xl max-h-[40vh]">
                                        <p className="font-medium mb-4 flex items-center gap-2"><span className="material-icons-round text-theme-accent1-400">grid_view</span> Gráfico de Actividad</p>
                                        {(() => {
                                            const rawAsistencias: { date: Date; isJustificado: boolean; isHist: boolean; histDate: Date | null }[] = [];
                                            try {
                                                const parsed = JSON.parse(selectedStudent['Fechas y Horas de Asistencia'] || '[]');
                                                if (Array.isArray(parsed)) {
                                                    parsed.forEach(d => {
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
                                                        rawAsistencias.push({
                                                            date: new Date(dateStr),
                                                            isJustificado: status === 'Justificado',
                                                            isHist: histDate !== null,
                                                            histDate,
                                                        });
                                                    });
                                                }
                                            } catch { /* ignored */ }
                                            const rawFaltas: Date[] = (selectedStudent.faltasCalculadas || []).map(f => {
                                                const parts = f.split('-');
                                                return new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
                                            });
                                            const dateInfo = new Map<string, { status: 'asistencia' | 'falta' | 'justificado'; originalDate?: Date }>();
                                            rawAsistencias.forEach(a => {
                                                const key = a.date.toISOString().split('T')[0];
                                                if (a.isHist && a.histDate) {
                                                    dateInfo.set(a.histDate.toISOString().split('T')[0], { status: 'justificado', originalDate: a.date });
                                                } else {
                                                    dateInfo.set(key, { status: a.isJustificado ? 'justificado' : 'asistencia', originalDate: a.date });
                                                }
                                            });
                                            rawFaltas.forEach(f => {
                                                const key = f.toISOString().split('T')[0];
                                                if (!dateInfo.has(key)) dateInfo.set(key, { status: 'falta' });
                                            });
                                            const currentPeriod = parciales.find(p => p.id === selectedPeriod);
                                            let start: Date;
                                            let end: Date;
                                            if (currentPeriod?.inicio && currentPeriod?.fin) {
                                                start = new Date(currentPeriod.inicio);
                                                end = new Date(currentPeriod.fin);
                                            } else {
                                                const allKeys = [...dateInfo.keys()].sort();
                                                if (allKeys.length === 0) return <p className="text-theme-muted/80 text-sm">Sin registros en este periodo.</p>;
                                                start = new Date(allKeys[0] + 'T00:00:00');
                                                end = new Date(allKeys[allKeys.length - 1] + 'T00:00:00');
                                            }
                                            const dow = start.getDay();
                                            const mondayOff = dow === 0 ? -6 : 1 - dow;
                                            const gridStart = new Date(start);
                                            gridStart.setDate(gridStart.getDate() + mondayOff);
                                            const weeks: { date: Date; status?: 'asistencia' | 'falta' | 'justificado'; isWeekend: boolean; isOutside: boolean; originalDate?: Date }[][] = [];
                                            const cur = new Date(gridStart);
                                            while (cur <= end) {
                                                const week: { date: Date; status?: 'asistencia' | 'falta' | 'justificado'; isWeekend: boolean; isOutside: boolean; originalDate?: Date }[] = [];
                                                for (let d = 0; d < 7; d++) {
                                                    const key = cur.toISOString().split('T')[0];
                                                    const info = dateInfo.get(key);
                                                    week.push({
                                                        date: new Date(cur),
                                                        status: info?.status,
                                                        originalDate: info?.originalDate,
                                                        isWeekend: cur.getDay() === 0 || cur.getDay() === 6,
                                                        isOutside: cur < start || cur > end,
                                                    });
                                                    cur.setDate(cur.getDate() + 1);
                                                }
                                                weeks.push(week);
                                            }
                                            if (weeks.length === 0) return <p className="text-theme-muted/80 text-sm">Sin registros en este periodo.</p>;
                                            const monthLabels: { label: string; col: number }[] = [];
                                            weeks.forEach((w, wi) => {
                                                const m = w[0].date.toLocaleDateString('es-MX', { month: 'short' });
                                                if (wi === 0 || w[0].date.getMonth() !== weeks[wi - 1][0].date.getMonth()) {
                                                    monthLabels.push({ label: m, col: wi });
                                                }
                                            });
                                            const CELL = 15;
                                            const GAP = 2;
                                            const cellColor = (item: typeof weeks[0][0]) => {
                                                if (item.isOutside) return 'bg-theme-border/20';
                                                if (item.isWeekend) return 'bg-theme-muted/10';
                                                if (item.status === 'asistencia') return 'bg-emerald-500';
                                                if (item.status === 'justificado') return 'bg-sky-500';
                                                if (item.status === 'falta') return 'bg-red-500';
                                                return 'bg-theme-border/30';
                                            };
                                            const tooltipText = (item: typeof weeks[0][0]) => {
                                                const ds = item.date.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
                                                const ts = item.originalDate?.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
                                                if (item.isOutside) return '';
                                                if (item.isWeekend) return `${ds} (fin de semana)`;
                                                if (item.status === 'asistencia') return `${ds}${ts ? ` ${ts}` : ''} - Asistencia`;
                                                if (item.status === 'justificado') return `${ds} - Justificado`;
                                                if (item.status === 'falta') return `${ds} - Falta`;
                                                return `${ds} - Sin registro`;
                                            };
                                            const dayLabels = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
                                            return (
                                                <div className="space-y-4">
                                                    <div className="overflow-x-auto pb-2">
                                                        <div className="inline-flex flex-col gap-1">
                                                            <div className="flex gap-[2px] text-[10px] text-theme-muted leading-none" style={{ marginLeft: 28 }}>
                                                                {monthLabels.map((ml, i) => {
                                                                    const w = i < monthLabels.length - 1 ? (monthLabels[i + 1].col - ml.col) * (CELL + GAP) : (weeks.length - ml.col) * (CELL + GAP);
                                                                    return <span key={ml.label} style={{ width: w }} className="truncate">{ml.label}</span>;
                                                                })}
                                                            </div>
                                                            {dayLabels.map((dl, di) => (
                                                                <div key={di} className="flex gap-[2px] items-center">
                                                                    <span className="w-7 text-right text-[10px] text-theme-muted/70 font-mono leading-none">{dl}</span>
                                                                    {weeks.map((week, wi) => {
                                                                        const day = week[di];
                                                                        return (
                                                                            <div
                                                                                key={wi}
                                                                                title={tooltipText(day)}
                                                                                className={`rounded-sm animate-fade-in transition-all duration-150 ease-out cursor-default hover:scale-[1.6] hover:ring-2 hover:ring-white/40 hover:z-10 hover:shadow-lg ${cellColor(day)}`}
                                                                                style={{ width: CELL, height: CELL, animationDelay: `${(di * weeks.length + wi) * 5}ms` }}
                                                                            />
                                                                        );
                                                                    })}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                    <div className="flex flex-wrap items-center gap-4 text-xs text-theme-muted pt-2 border-t border-theme-border">
                                                        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-emerald-500" /> Asistencia</span>
                                                        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-sky-500" /> Justificado</span>
                                                        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-red-500" /> Falta</span>
                                                        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-theme-border/30" /> Sin registro</span>
                                                        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-theme-muted/10" /> Fin de semana</span>
                                                    </div>
                                                </div>
                                            );
                                        })()}
                                    </div>
                                )}
                                <div className="mt-8 pt-6 border-t border-theme-border flex flex-wrap items-center justify-between gap-3 no-print">
                                    <Button onClick={() => setSelectedStudent(null)} className="flex-1 sm:flex-none sm:min-w-[120px] bg-theme-border/50 hover:bg-theme-border/100 text-theme-text h-11" variant="outline">
                                        <span className="material-icons-round mr-2 text-sm">arrow_back</span> Regresar
                                    </Button>
                                    <button onClick={() => exportStudentDetailPDF(selectedStudent)} className="inline-flex items-center justify-center whitespace-nowrap rounded-lg font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-theme-accent1-500/40 focus-visible:ring-offset-2 focus-visible:ring-offset-theme-base disabled:pointer-events-none disabled:opacity-50 active:scale-[0.97] overflow-hidden relative text-white hover:brightness-110 shadow-[var(--shadow-button-default)] h-12 px-5 flex-1 sm:flex-none bg-theme-accent1-600 hover:bg-theme-accent1-700 min-h-[44px]">
                                        <span className="material-icons-round text-sm mr-1">picture_as_pdf</span> PDF
                                    </button>
                                </div>
                            </div>
                        )}
                    </Modal>
                </div>
            )}

            {confirmAction && (
                <Modal isOpen={!!confirmAction} onClose={() => setConfirmAction(null)} title="Confirmar Acción">
                    <div className="space-y-4">
                        <p className="text-theme-muted">{confirmAction.message}</p>
                        <div className="flex justify-end gap-3 pt-2">
                            <Button variant="outline" onClick={() => setConfirmAction(null)}>
                                Cancelar
                            </Button>
                            <Button
                                variant="destructive"
                                onClick={() => {
                                    const fn = confirmAction.onConfirm;
                                    setConfirmAction(null);
                                    fn();
                                }}
                            >
                                Confirmar
                            </Button>
                        </div>
                    </div>
                </Modal>
            )}
        </div>
    );
}