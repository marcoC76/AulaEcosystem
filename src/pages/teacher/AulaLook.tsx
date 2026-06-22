import { useState, useEffect, useRef, useMemo } from 'react';
import { cn } from '../../lib/utils';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

import Fuse from 'fuse.js';
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
import type { ConfigOption, AttendanceRecord, ParcialConfig } from '../../types';

type ExtendedAttendanceRecord = AttendanceRecord & { faltasCalculadas?: string[]; apellidoPaterno?: string; rachaFaltas?: number };

export default function AulaLook({ isReadOnly = false }: { isReadOnly?: boolean }) {
    const [config, setConfig] = useState<{ profesores: ConfigOption[], materias: ConfigOption[] }>({ profesores: [], materias: [] });
    const [parciales, setParciales] = useState<ParcialConfig[]>([]);
    
    // States with LocalStorage recovery
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

    // Student Search State
    const [searchQuery, setSearchQuery] = useState(() => localStorage.getItem('aulalook_searchQuery') || '');
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [selectedSearchStudent, setSelectedSearchStudent] = useState<any>(() => {
        const saved = localStorage.getItem('aulalook_selectedSearchStudent');
        if (saved) {
            try { return JSON.parse(saved); } catch (e) {}
        }
        return null;
    });

    // Data States
    const [data, setData] = useState<ExtendedAttendanceRecord[]>([]);
    const [prevPeriodData, setPrevPeriodData] = useState<ExtendedAttendanceRecord[]>([]);
    const [studentModeData, setStudentModeData] = useState<ExtendedAttendanceRecord[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [selectedStudent, setSelectedStudent] = useState<ExtendedAttendanceRecord | null>(null);
    const [modalView, setModalView] = useState<'list' | 'sheet'>('list');
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
    const [studentsDB, setStudentsDB] = useState<any[]>([]);
    const modalRef = useRef<HTMLDivElement>(null);

    // Save state to localStorage on modification
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

    // Track Fullscreen status
    useEffect(() => {
        const handleFullscreenChange = () => {
            setIsFullscreen(!!document.fullscreenElement);
        };
        document.addEventListener('fullscreenchange', handleFullscreenChange);
        return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
    }, []);

    const toggleFullscreen = () => {
        if (!document.fullscreenElement) {
            chartsContainerRef.current?.requestFullscreen().catch(err => {
                console.error("Error al entrar a pantalla completa:", err);
            });
        } else {
            document.exitFullscreen();
        }
    };

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
        fetchParcialesConfig().then(parts => {
            setParciales(parts);
            if (parts.length > 0 && !localStorage.getItem('aulalook_selectedPeriod')) {
                setSelectedPeriod(parts[0].id);
            }
        });
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

    // Reset pagination to page 1 on filter/sort changes
    useEffect(() => {
        setCurrentPage(1);
    }, [localSearchQuery, filterRisk, sortField, sortDir]);

    const loadGroupData = async (periodId = selectedPeriod, groupsToFetch = selectedGroups) => {
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
                if (masterStudent && (masterStudent as AttendanceRecord)['Fechas y Horas de Asistencia']) {
                    try {
                        let fechasStr: any = (masterStudent as AttendanceRecord)['Fechas y Horas de Asistencia'];
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
            alert('Error al cargar los datos del grupo.');
        } finally {
            setIsLoading(false);
        }
    };

    const loadStudentData = async (periodId = selectedPeriod) => {
        if (!selectedSearchStudent) return;
        setIsLoading(true);
        try {
            const cleanStr = (s: any) => String(s || '').trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

            const groupKey = Object.keys(selectedSearchStudent).find(k => k.toLowerCase().includes('grupo')) || 'Grupo';
            const groupValue = String(selectedSearchStudent[groupKey]).trim();

            const [baseGroupPart] = groupValue.split(' - ');
            const rawGroup = baseGroupPart.trim();

            const careerKey = Object.keys(selectedSearchStudent).find(k => k.toLowerCase().includes('carrera') || k.toLowerCase().includes('especialidad'));
            const specialty = careerKey && selectedSearchStudent[careerKey] ? String(selectedSearchStudent[careerKey]).trim() : '';
            const studSpecClean = cleanStr(specialty);

            let rawRes: any[] = [];
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

            const sortedResults = studentResults.sort((a, b) => (a.Materia || '').localeCompare(b.Materia || ''));
            setStudentModeData(sortedResults);

            // Fetch previous period for student
            const currentIdx = parciales.findIndex(p => p.id === periodId);
            const prevPeriod = currentIdx > 0 ? parciales[currentIdx - 1] : null;
            if (prevPeriod) {
                let prevRawRes: any[] = [];
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
            alert('Error al cargar los datos del alumno.');
        } finally {
            setIsLoading(false);
        }
    };

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
        link.setAttribute("download", `ReporteFaltas_${mode === 'group' ? selectedGroups.join('_') : selectedSearchStudent?.nombre}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    // Native PDF exporting function
    const exportPDF = async () => {
        const element = document.getElementById('dashboard-report-content');
        if (!element) return;
        setIsLoading(true);
        try {
            // Hide buttons or elements with "no-print" class
            const noPrintElements = document.querySelectorAll('.no-print');
            noPrintElements.forEach(el => el.setAttribute('data-html2canvas-ignore', 'true'));

            const canvas = await html2canvas(element, {
                scale: 2,
                useCORS: true,
                backgroundColor: '#0b0f19' // maintain dark mode bg
            });
            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF('p', 'mm', 'a4');
            const imgWidth = 210; // A4 size page width in mm
            const pageHeight = 297; // A4 size page height in mm
            const imgHeight = (canvas.height * imgWidth) / canvas.width;
            let heightLeft = imgHeight;
            let position = 0;

            pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
            heightLeft -= pageHeight;

            while (heightLeft >= 0) {
                position = heightLeft - imgHeight;
                pdf.addPage();
                pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
                heightLeft -= pageHeight;
            }
            pdf.save(`Reporte_Asistencia_${mode === 'group' ? selectedGroups.join('_') : selectedSearchStudent?.nombre}.pdf`);
        } catch (error) {
            console.error('Error al generar PDF:', error);
            alert('Hubo un error al generar el PDF.');
        } finally {
            setIsLoading(false);
            const noPrintElements = document.querySelectorAll('.no-print');
            noPrintElements.forEach(el => el.removeAttribute('data-html2canvas-ignore'));
        }
    };

    // Generar reporte en formato sábana oficial de la SEP
    const exportSabanaPDF = async () => {
        if (data.length === 0) {
            alert("No hay datos para exportar.");
            return;
        }
        setIsLoading(true);

        try {
            // Obtener fechas únicas ordenadas cronológicamente
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

            // Crear un contenedor temporal visible pero detrás del fondo de la aplicación
            const container = document.createElement('div');
            container.style.position = 'fixed';
            container.style.top = '0';
            container.style.left = '0';
            container.style.zIndex = '-9999';
            container.style.pointerEvents = 'none';
            document.body.appendChild(container);

            // Ajustar alumnos por página para que quepa en un A4 horizontal sin desbordamiento
            const STUDENTS_PER_PAGE = 18; 
            const totalPages = Math.ceil(data.length / STUDENTS_PER_PAGE);
            const weekdays = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];

            for (let pageIdx = 0; pageIdx < totalPages; pageIdx++) {
                const pageEl = document.createElement('div');
                pageEl.className = 'sabana-pdf-page';
                pageEl.style.width = '1123px';
                pageEl.style.height = '794px';
                pageEl.style.padding = '30px 40px';
                pageEl.style.boxSizing = 'border-box';
                pageEl.style.backgroundColor = '#ffffff';
                pageEl.style.color = '#000000';
                pageEl.style.fontFamily = "'Helvetica Neue', Helvetica, Arial, sans-serif";
                pageEl.style.display = 'flex';
                pageEl.style.flexDirection = 'column';
                pageEl.style.justifyContent = 'space-between';

                const startIndex = pageIdx * STUDENTS_PER_PAGE;
                const endIndex = Math.min(startIndex + STUDENTS_PER_PAGE, data.length);
                const pageStudents = data.slice(startIndex, endIndex);

                // HTML con logos SVG y diseño oficial
                pageEl.innerHTML = `
                    <div>
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 450 80" width="350" height="60">
                                <g transform="translate(10, 5)">
                                    <circle cx="30" cy="30" r="28" fill="none" stroke="#7a1c31" stroke-width="2"/>
                                    <circle cx="30" cy="30" r="24" fill="none" stroke="#d4c19c" stroke-width="1.5"/>
                                    <path d="M 30,12 C 22,20 20,32 30,48 C 40,32 38,20 30,12 Z" fill="#d4c19c"/>
                                    <path d="M 24,25 Q 30,18 36,25 Q 30,35 24,25 Z" fill="#7a1c31"/>
                                </g>
                                <text x="85" y="38" font-family="'Lora', 'Times New Roman', serif" font-size="34" font-weight="bold" fill="#7a1c31" letter-spacing="1">SEP</text>
                                <text x="85" y="54" font-family="'Montserrat', 'Arial', sans-serif" font-size="8.5" font-weight="600" fill="#6f7276" letter-spacing="0.5">SECRETARÍA DE</text>
                                <text x="85" y="65" font-family="'Montserrat', 'Arial', sans-serif" font-size="8.5" font-weight="600" fill="#6f7276" letter-spacing="0.5">EDUCACIÓN PÚBLICA</text>
                            </svg>
                            <div style="text-align: right; font-size: 10px; color: #6f7276; font-weight: bold;">
                                <div style="font-size: 12px; color: #7a1c31;">CETIS No. 76</div>
                                <div>Control de Asistencias</div>
                            </div>
                        </div>

                        <div style="background-color: #545454; color: #ffffff; text-align: center; padding: 6px 0; font-size: 12px; font-weight: bold; letter-spacing: 1px; margin-bottom: 12px; text-transform: uppercase;">
                            REPORTE DE ASISTENCIAS
                        </div>

                        <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 20px; font-size: 9px; margin-bottom: 12px; line-height: 1.4;">
                            <div style="display: grid; grid-template-columns: auto 1fr; gap: 2px 8px;">
                                <span style="font-weight: bold; color: #333;">SUBSISTEMA:</span>
                                <span>DIRECCIÓN GENERAL DE EDUCACIÓN TECNOLÓGICA INDUSTRIAL Y DE SERVICIOS</span>
                                
                                <span style="font-weight: bold; color: #333;">PLANTEL:</span>
                                <span>CENTRO DE ESTUDIOS TECNOLÓGICOS INDUSTRIAL Y DE SERVICIOS NO. 76</span>
                                
                                <span style="font-weight: bold; color: #333;">PLAN DE ESTUDIOS:</span>
                                <span style="text-transform: uppercase;">${planEstudios}</span>
                                
                                <span style="font-weight: bold; color: #333;">CLAVE DEL CENTRO DE TRABAJO:</span>
                                <span>09DET0076M</span>
                                
                                <span style="font-weight: bold; color: #333;">ASIGNATURA O SUBMODULO:</span>
                                <span style="text-transform: uppercase; font-weight: bold; color: #7a1c31;">${selectedSubject}</span>
                            </div>
                            <div style="display: grid; grid-template-columns: auto 1fr; gap: 2px 8px; align-content: start;">
                                <span style="font-weight: bold; color: #333;">GRUPO:</span>
                                <span style="font-weight: bold;">${selectedGroups.join(', ')}</span>
                                
                                <span style="font-weight: bold; color: #333;">DOCENTE:</span>
                                <span style="text-transform: uppercase;">${selectedTeacher}</span>
                                
                                <span style="font-weight: bold; color: #333;">TURNO:</span>
                                <span>${groupTurn}</span>
                                
                                <span style="font-weight: bold; color: #333;">PERIODO:</span>
                                <span>${periodName.toUpperCase()}</span>
                            </div>
                        </div>

                        <table style="width: 100%; border-collapse: collapse; font-size: 9px; color: #000000; border: 1.5px solid #000000;">
                            <thead>
                                <tr style="background-color: #f3f4f6; font-weight: bold; text-align: center;">
                                    <th style="border: 1px solid #000000; padding: 4px; width: 30px;" rowspan="2">NUM</th>
                                    <th style="border: 1px solid #000000; padding: 4px; width: 90px;" rowspan="2">NO. CONTROL</th>
                                    <th style="border: 1px solid #000000; padding: 4px; text-align: left;" rowspan="2">NOMBRE DEL ALUMNO</th>
                                    <th style="border: 1px solid #000000; padding: 2px;" colspan="${classDates.length}">ASISTENCIAS</th>
                                    <th style="border: 1px solid #000000; padding: 4px; width: 30px;" rowspan="2">T.A</th>
                                    <th style="border: 1px solid #000000; padding: 4px; width: 30px;" rowspan="2">T.F</th>
                                </tr>
                                <tr style="background-color: #f3f4f6; font-weight: bold; text-align: center; font-size: 8px;">
                                    ${classDates.map(dateKey => {
                                        const dt = new Date(dateKey + 'T00:00:00');
                                        const dayNum = dt.getDate();
                                        const dayOfWeek = weekdays[dt.getDay()];
                                        return `
                                            <th style="border: 1px solid #000000; padding: 2px; width: 22px; line-height: 1.1;">
                                                <div style="font-size: 7px; color: #666;">${dayNum}</div>
                                                <div style="font-weight: bold;">${dayOfWeek}</div>
                                            </th>
                                        `;
                                    }).join('')}
                                </tr>
                            </thead>
                            <tbody>
                                ${pageStudents.map((student, idx) => {
                                    const num = startIndex + idx + 1;
                                    const control = student['Número de Control'] || '';
                                    const name = student['Nombre del Alumno'] || '';
                                    
                                    const studentDates = new Set<string>();
                                    const justifiedDates = new Set<string>();
                                    const historicoJustificado = new Set<string>();
                                    
                                    try {
                                        const fechas = JSON.parse(student['Fechas y Horas de Asistencia'] || '[]');
                                        fechas.forEach((fReq: any) => {
                                            const fStr = typeof fReq === 'object' ? fReq.date : fReq;
                                            const status = typeof fReq === 'object' ? fReq.status : 'Asistencia';
                                            const notes = typeof fReq === 'object' ? fReq.notes : '';
                                            const dateObj = new Date(fStr);
                                            if (!isNaN(dateObj.getTime())) {
                                                const dateKey = dateObj.toISOString().split('T')[0];
                                                studentDates.add(dateKey);
                                                if (status === 'Justificado') {
                                                    justifiedDates.add(dateKey);
                                                }
                                                
                                                if (status === 'Justificado' && typeof notes === 'string') {
                                                    const match = notes.match(/histórico \((.+?)\)/i);
                                                    if (match && match[1]) {
                                                        historicoJustificado.add(match[1]);
                                                    }
                                                }
                                            }
                                        });
                                    } catch (e) {}

                                    let ta = 0;
                                    let tf = 0;

                                    const colsHtml = classDates.map(dateKey => {
                                        let mark = '';
                                        let cellStyle = '';
                                        
                                        if (studentDates.has(dateKey) && !justifiedDates.has(dateKey)) {
                                            mark = '/';
                                            ta++;
                                        } else if (justifiedDates.has(dateKey) || historicoJustificado.has(dateKey)) {
                                            mark = 'J';
                                            cellStyle = 'color: #0ea5e9; font-weight: bold; background-color: #f0f9ff;';
                                        } else {
                                            mark = 'F';
                                            tf++;
                                            cellStyle = 'color: #ef4444; font-weight: bold; background-color: #fef2f2;';
                                        }

                                        return `<td style="border: 1px solid #000000; text-align: center; padding: 2px; ${cellStyle}">${mark}</td>`;
                                    }).join('');

                                    return `
                                        <tr>
                                            <td style="border: 1px solid #000000; text-align: center; padding: 4px;">${num}</td>
                                            <td style="border: 1px solid #000000; text-align: center; padding: 4px; font-family: monospace;">${control}</td>
                                            <td style="border: 1px solid #000000; padding: 4px; text-transform: uppercase; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 240px;">${name}</td>
                                            ${colsHtml}
                                            <td style="border: 1px solid #000000; text-align: center; padding: 4px; font-weight: bold; background-color: #f3f4f6;">${ta}</td>
                                            <td style="border: 1px solid #000000; text-align: center; padding: 4px; font-weight: bold; background-color: #fef2f2; color: #ef4444;">${tf}</td>
                                        </tr>
                                    `;
                                }).join('')}
                            </tbody>
                        </table>
                    </div>

                    <div style="display: flex; justify-content: space-between; align-items: center; font-size: 8px; color: #6f7276; border-top: 1px solid #e5e7eb; padding-top: 6px; margin-top: 10px;">
                        <div>Generado por Sistema AulaEcosystem • ${new Date().toLocaleString('es-MX')}</div>
                        <div style="font-weight: bold;">Página ${pageIdx + 1} de ${totalPages}</div>
                    </div>
                `;

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
            document.body.removeChild(container);

        } catch (error) {
            console.error('Error al generar PDF Sábana:', error);
            alert('Hubo un error al generar el PDF Sábana.');
        } finally {
            setIsLoading(false);
        }
    };

    // --- Search Helpers ---
    const suggestions = useMemo(() => {
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
    }, [studentsDB, searchQuery]);

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
    }).sort((a, b) => {
        let fieldA: any = '';
        let fieldB: any = '';

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
        } else {
            return sortDir === 'asc' ? fieldA - fieldB : fieldB - fieldA;
        }
    });

    const paginatedData = useMemo(() => {
        return activeData.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);
    }, [activeData, currentPage]);

    const totalPages = Math.ceil(activeData.length / ITEMS_PER_PAGE);

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

    const currentTimeline = Object.values(dateCounts)
        .sort((a, b) => a.date.getTime() - b.date.getTime());

    // Calculate previous period dates count
    const prevDateCounts: Record<string, { date: Date, count: number }> = {};
    prevPeriodData.forEach(d => {
        try {
            const fechas = JSON.parse(d['Fechas y Horas de Asistencia'] || '[]');
            fechas.forEach((fReq: any) => {
                const fStr = typeof fReq === 'object' ? fReq.date : fReq;
                const dateObj = new Date(fStr);
                if (isNaN(dateObj.getTime())) return;
                const dateKey = dateObj.toISOString().split('T')[0];
                if (!prevDateCounts[dateKey]) prevDateCounts[dateKey] = { date: dateObj, count: 0 };
                prevDateCounts[dateKey].count++;
            });
        } catch (e) {}
    });

    const prevTimeline = Object.values(prevDateCounts)
        .sort((a, b) => a.date.getTime() - b.date.getTime());

    // Merge current and previous timeline by index
    const timelineData = useMemo(() => {
        const maxLen = Math.max(currentTimeline.length, prevTimeline.length);
        const combined = [];
        for (let i = 0; i < maxLen; i++) {
            const currItem = currentTimeline[i];
            const prevItem = prevTimeline[i];
            combined.push({
                name: currItem ? currItem.date.toLocaleDateString('es-MX', { month: 'short', day: 'numeric' }) : `Clase ${i + 1}`,
                asistencias: currItem ? currItem.count : undefined,
                asistenciasPrev: prevItem ? prevItem.count : undefined
            });
        }
        return combined;
    }, [currentTimeline, prevTimeline]);

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

    // Calculate critical students list (absences streak >= 3)
    const criticalStudents = useMemo(() => {
        return activeData.filter(d => (d.rachaFaltas || 0) >= 3);
    }, [activeData]);

    return (
        <div className="p-4 sm:p-6 pb-24 min-h-screen bg-transparent transition-all duration-300">
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

                        <div className="min-h-[200px] flex flex-col justify-center transition-all duration-300">
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
                                            <h3 className="text-xl font-bold text-center mb-6">Selecciona los Grupos y Período</h3>
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
                                                                        "px-3 py-1.5 rounded-full border text-xs font-semibold cursor-pointer select-none transition-all duration-200 flex items-center gap-1",
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
                <div id="dashboard-report-content" className="space-y-6 max-w-7xl mx-auto animate-fade-in p-4 bg-[#0b0f19] rounded-3xl transition-all duration-300">
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
                                    onChange={e => {
                                        const newPeriod = e.target.value;
                                        setSelectedPeriod(newPeriod);
                                        if (mode === 'group') {
                                            loadGroupData(newPeriod);
                                        } else {
                                            loadStudentData(newPeriod);
                                        }
                                    }}
                                    className="h-10 text-sm w-36 bg-theme-border/50 text-theme-text border-theme-border"
                                >
                                    {parciales.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                                </Select>
                            )}
                            <Button variant="outline" onClick={() => { setStep(0); }} className="flex-1 sm:flex-none h-10">
                                <span className="material-icons-round text-sm mr-1">tune</span> Filtros
                            </Button>
                            <Button onClick={downloadReport} className="flex-1 sm:flex-none bg-theme-accent2-600 hover:bg-theme-accent2-700 h-10">
                                <span className="material-icons-round text-sm mr-1">download</span> CSV
                            </Button>
                            <Button onClick={exportPDF} className="flex-1 sm:flex-none bg-theme-accent1-600 hover:bg-theme-accent1-700 h-10">
                                <span className="material-icons-round text-sm mr-1">picture_as_pdf</span> PDF
                            </Button>
                            {mode === 'group' && (
                                <Button onClick={exportSabanaPDF} className="flex-1 sm:flex-none bg-emerald-600 hover:bg-emerald-700 h-10 text-white font-medium">
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
                                    <h4 className="font-bold text-sm">Alumnos en Riesgo Crítico</h4>
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

                            {activeData.length === 0 ? (
                                <Card className="border-theme-border bg-theme-border/20 p-12 text-center flex flex-col items-center justify-center max-w-xl mx-auto my-12">
                                    <div className="p-4 rounded-full bg-theme-border/30 text-theme-muted mb-4">
                                        <span className="material-icons-round text-5xl">analytics</span>
                                    </div>
                                    <h3 className="text-xl font-bold text-theme-text mb-2">Sin Datos Disponibles</h3>
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
                                                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
                                                        <XAxis dataKey="name" stroke="#9ca3af" tick={{ fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                                                        <YAxis domain={[0, Math.max(totalItems, 5)]} stroke="#9ca3af" tick={{ fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                                                        <RechartsTooltip contentStyle={{ backgroundColor: '#1f2937', borderColor: '#374151', borderRadius: '8px', color: '#fff' }} />
                                                        <ReferenceLine y={totalItems * 0.85} stroke="#ef4444" strokeDasharray="3 3" label={{ position: 'top', value: 'Umbral 85%', fill: '#ef4444', fontSize: 12 }} />
                                                        <Line type="monotone" name="Período Actual" dataKey="asistencias" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                                                        {prevTimeline.length > 0 && (
                                                            <Line type="monotone" name="Período Anterior" dataKey="asistenciasPrev" stroke="#a855f7" strokeWidth={2} strokeDasharray="5 5" dot={{ r: 3 }} />
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
                                        <Button onClick={downloadAbsenceReport} variant="outline" size="sm" className="h-9 gap-2 text-sm text-theme-accent1-400 hover:bg-theme-accent1-500/10 whitespace-nowrap">
                                            <span className="material-icons-round text-[18px]">download</span> Faltas (CSV)
                                        </Button>
                                    </div>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left border-collapse">
                                        <thead>
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
                                                            {mode === 'group' ? item['Nombre del Alumno'] : item.Materia}
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
                                    <div className="p-4 border-t border-theme-border flex items-center justify-between text-sm no-print">
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
