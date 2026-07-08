import { useState, useEffect, useRef, useMemo } from 'react';
import { Html5QrcodeScanner, Html5Qrcode } from 'html5-qrcode';
import { fetchAppConfig, sendAttendanceOfflineFirst, syncOfflineQueue, getOfflineQueueLength, fetchStudentsDB, fetchParcialesConfig, type ParcialConfig, getConfig } from '../../lib/dataService';
import { useLocalStorage } from '../../hooks/useLocalStorage';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { cn } from '../../lib/utils';
import { searchStudents, findStudentByControl, getStudentName, getStudentGrupo, getStudentEspecialidad } from '../../lib/search';
import { Modal } from '../../components/ui/Modal';
import { useToast } from '../../hooks/useToast';
import { scanSuccessBurst, staggerEntrance } from '../../lib/animations';
import type { ConfigOption, StudentDBRecord } from '../../types';

// Audio Context for Beeps
const playBeep = (type: 'success' | 'error') => {
    try {
        const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
        
        // iOS Safari AudioContext resume fix
        if (ctx.state === 'suspended') {
            ctx.resume().catch(() => {});
        }

        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.connect(gain);
        gain.connect(ctx.destination);

        if (type === 'success') {
            osc.type = 'sine';
            osc.frequency.setValueAtTime(800, ctx.currentTime);
            gain.gain.setValueAtTime(0.1, ctx.currentTime);
            osc.start();
            gain.gain.exponentialRampToValueAtTime(0.00001, ctx.currentTime + 0.1);
            osc.stop(ctx.currentTime + 0.1);
        } else {
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(200, ctx.currentTime);
            osc.frequency.linearRampToValueAtTime(100, ctx.currentTime + 0.3);
            gain.gain.setValueAtTime(0.1, ctx.currentTime);
            osc.start();
            gain.gain.exponentialRampToValueAtTime(0.00001, ctx.currentTime + 0.3);
            osc.stop(ctx.currentTime + 0.3);
        }
    } catch (e) {
        console.error("Audio beep failed", e);
    }
};

interface ScanHistoryEntry {
    id: string; // control number
    name: string;
    time: string;
    date?: string; // e.g. '2023-10-25', optional for legacy fallback
    status: 'sent' | 'pending' | 'error';
    attendanceMode?: 'Asistencia' | 'Retardo';
    group?: string;
    specialty?: string;
    queueId?: string;
}

export default function AulaScan() {
    const { toast } = useToast();
    const [showClearModal, setShowClearModal] = useState(false);
    const [config, setConfig] = useState<{ profesores: ConfigOption[], materias: ConfigOption[] }>({ profesores: [], materias: [] });
    const [masterQrVersion, setMasterQrVersion] = useState<string>('1');
    const [parcialesLocal, setParcialesLocal] = useState<ParcialConfig[]>([]);
    const [studentsDB, setStudentsDB] = useState<StudentDBRecord[]>([]);

    // Form State
    const [selectedTeacher, setSelectedTeacher] = useLocalStorage('scan_teacher', '');
    const [selectedSubject, setSelectedSubject] = useLocalStorage('scan_subject', '');
    const [selectedParcial, setSelectedParcial] = useLocalStorage('scan_parcial', '1');
    const [isConfigured, setIsConfigured] = useState(false);

    // Scanner & Logic State
    const [scannerId] = useState('qr-reader');
    const [history, setHistory] = useLocalStorage<ScanHistoryEntry[]>('scan_session_history', []);
    const [expandedDays, setExpandedDays] = useState<Record<string, boolean>>({});
    const cooldownsRef = useRef<Record<string, number>>({});
    const [manualInput, setManualInput] = useState('');
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [attendanceStatus, setAttendanceStatus] = useState<'Asistencia' | 'Retardo'>('Asistencia');
    const [lastScanMsg, setLastScanMsg] = useState<{ type: 'success' | 'error', text: string } | null>(null);
    const [isKioskMode, setIsKioskMode] = useState(false);
    const [queueCount, setQueueCount] = useState(getOfflineQueueLength());

    const scannerRef = useRef<Html5QrcodeScanner | null>(null);

    const todayStr = useMemo(() => {
        const n = new Date();
        return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-${String(n.getDate()).padStart(2, '0')}`;
    }, []);

    useEffect(() => {
        fetchAppConfig().then(setConfig).catch(() => {});
        getConfig().then(c => setMasterQrVersion(c.qr_version || '1')).catch(() => {});
        fetchStudentsDB().then(setStudentsDB).catch(() => {
            setLastScanMsg({ type: 'error', text: 'Error al cargar base de datos de alumnos.' });
        });
        fetchParcialesConfig().then((parciales) => {
            setParcialesLocal(parciales);

            // Auto-seleccionar el parcial activo basado en la fecha
            const today = new Date();
            let activeParcialId = '';
            for (const p of parciales) {
                if (p.inicio && p.fin) {
                    const dInicio = new Date(`${p.inicio}T00:00:00`);
                    const dFin = new Date(`${p.fin}T23:59:59`);
                    if (today >= dInicio && today <= dFin) {
                        activeParcialId = String(p.id);
                        break;
                    }
                }
            }
            if (activeParcialId) {
                const lsSetter = window.localStorage;
                lsSetter.setItem('scan_parcial', JSON.stringify(activeParcialId));
                setSelectedParcial(activeParcialId);
            }
        });
        try {
            const rawRaw = localStorage.getItem('scan_session_history');
            if (rawRaw) {
                const parsed: ScanHistoryEntry[] = JSON.parse(rawRaw);
                const limit = Date.now() - 14 * 24 * 60 * 60 * 1000;
                let changed = false;
                const purged = parsed.filter(item => {
                    if (!item.date) return true; // keep legacy
                    const d = new Date(item.date);
                    if (!isNaN(d.getTime()) && d.getTime() < limit) {
                        changed = true;
                        return false;
                    }
                    return true;
                });
                if (changed) {
                    setHistory(purged); // triggers useLocalStorage write
                }
            }
        } catch(e) {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Initialize Scanner when configured
    useEffect(() => {
        if (isConfigured) {
            // Must give UI a tick to render the div
            const timer = setTimeout(() => {
                if (!scannerRef.current) {
                    scannerRef.current = new Html5QrcodeScanner(
                        scannerId,
                        { 
                            fps: 10, 
                            qrbox: { width: 180, height: 180 }, 
                            rememberLastUsedCamera: false,
                            videoConstraints: {
                                facingMode: "environment" // Force back camera for iOS compatibility
                            },
                            supportedScanTypes: [0] // Html5QrcodeScanType.QR_CODE = 0
                        },
            /* verbose= */ false
                    );

                    scannerRef.current.render(onScanSuccess, onScanFailure);
                }
            }, 100);
            return () => clearTimeout(timer);
        } else {
            if (scannerRef.current) {
                scannerRef.current.clear().catch(console.error);
                scannerRef.current = null;
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isConfigured]);

    // Translate English scanner texts to Spanish
    useEffect(() => {
        if (!isConfigured) return;
        const interval = setInterval(() => {
            const btnPerm = document.getElementById('html5-qrcode-button-camera-permission');
            if (btnPerm && btnPerm.innerText === 'Request Camera Permissions') {
                btnPerm.innerText = 'Solicitar Permisos de Cámara';
            }
            const btnStart = document.getElementById('html5-qrcode-button-camera-start');
            if (btnStart && btnStart.innerText === 'Start Scanning') {
                btnStart.innerText = 'Iniciar Escáner';
            }
            const btnStop = document.getElementById('html5-qrcode-button-camera-stop');
            if (btnStop && btnStop.innerText === 'Stop Scanning') {
                btnStop.innerText = 'Detener Escáner';
            }
            const btnChoose = document.getElementById('html5-qrcode-button-file-selection');
            if (btnChoose && btnChoose.innerText === 'Choose Image') {
                btnChoose.innerText = 'Elegir Imagen';
            }
            const aScanFile = document.getElementById('html5-qrcode-anchor-scan-type-change');
            if (aScanFile) {
                if (aScanFile.innerText.includes('Scan an Image File')) {
                    aScanFile.innerText = 'Escanear una Imagen (Archivo)';
                } else if (aScanFile.innerText.includes('Scan using camera directly')) {
                    aScanFile.innerText = 'Escanear con Cámara Directamente';
                }
            }
        }, 300);
        return () => clearInterval(interval);
    }, [isConfigured]);

    const validateConfig = () => {
        if (selectedTeacher && selectedSubject && selectedParcial) {
            setIsConfigured(true);
        } else {
            toast("Por favor selecciona todos los campos.", "error");
        }
    };

    const processAttendance = async (qrData: string) => {
        if (!isConfigured) return;

        // Parse URL encoded parameters
        const params = new URLSearchParams(qrData);
        const No = params.get('No') || manualInput; // Name or manual fallback
        const ID = params.get('ID') || manualInput; // Control Number
        const Gr = params.get('Gr') || 'N/A';
        const Es = params.get('Es') || 'N/A';
        const V = params.get('V');

        if (V !== masterQrVersion && !manualInput) {
            setLastScanMsg({ type: 'error', text: 'Credencial expirada o ciclo inválido. Genera una nueva.' });
            playBeep('error');
            if (navigator.vibrate) navigator.vibrate([300, 150, 300]);
            return;
        }

        if (!ID) {
            setLastScanMsg({ type: 'error', text: 'Formato QR inválido.' });
            playBeep('error');
            if (navigator.vibrate) navigator.vibrate([300, 150, 300]);
            return;
        }

        const now = Date.now();
        const lastScan = cooldownsRef.current[ID];

        if (lastScan && now - lastScan < 60000) {
            setLastScanMsg({ type: 'error', text: `Ya escaneado recientemente: ${No}` });
            playBeep('error');
            if (navigator.vibrate) navigator.vibrate([300, 150, 300]);
            return;
        }

        // ---

        cooldownsRef.current[ID] = now;
        playBeep('success');
        if (navigator.vibrate) navigator.vibrate([100]);
        setLastScanMsg({ type: 'success', text: `Registrando: ${No} (${ID})...` });

        const nowObj = new Date();
        const yyyy = nowObj.getFullYear();
        const mm = String(nowObj.getMonth() + 1).padStart(2, '0');
        const dd = String(nowObj.getDate()).padStart(2, '0');

        const newEntry: ScanHistoryEntry = {
            id: ID,
            name: No,
            time: nowObj.toLocaleTimeString(),
            date: `${yyyy}-${mm}-${dd}`,
            status: 'pending',
            attendanceMode: attendanceStatus,
            group: Gr,
            specialty: Es
        };

        // Optimistic history update
        setHistory(prev => [newEntry, ...prev]);

        // Offline-first: send or queue
        const { wasSent, wasQueued, queueId } = await sendAttendanceOfflineFirst({
            Time: new Date(),
            No,
            ID,
            Gr,
            Es,
            Pe: selectedParcial,
            Pro: selectedTeacher,
            Ma: selectedSubject,
            status: attendanceStatus
        });

        if (wasSent) {
            setLastScanMsg({ type: 'success', text: `Completado: ${No} OK` });
            setTimeout(() => setLastScanMsg(null), 3000);
        } else if (wasQueued) {
            setLastScanMsg({ type: 'success', text: `Guardado localmente: ${No} (sin conexión)` });
            setTimeout(() => setLastScanMsg(null), 3000);
        }

        // Update status
        setHistory(prev => prev.map(entry =>
            entry.id === ID && entry.time === newEntry.time
                ? { ...entry, status: wasSent ? 'sent' : 'pending', queueId }
                : entry
        ));

        setQueueCount(getOfflineQueueLength());
    };

    const onScanSuccess = (decodedText: string) => {
        processAttendance(decodedText);
    };

    const onScanFailure = () => {
        // frequent, ignore.
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const file = e.target.files[0];
            setLastScanMsg({ type: 'success', text: 'Analizando imagen...' });
            
            try {
                const html5QrCode = new Html5Qrcode("file-scanner-hidden");
                const decodedText = await html5QrCode.scanFile(file, true);
                processAttendance(decodedText);
            } catch (err) {
                setLastScanMsg({ type: 'error', text: 'No se detectó ningún código QR en la imagen.' });
                playBeep('error');
            }
            e.target.value = '';
        }
    };

    const suggestions = useMemo(
        () => searchStudents(studentsDB, manualInput, 5),
        [studentsDB, manualInput]
    );

    const executeManualAttendance = (input: string) => {
        if (!input) return;
        const student = findStudentByControl(studentsDB, input);

        if (student) {
            const sObj = student as any;
            const fullName = getStudentName(sObj);
            const dGroup = getStudentGrupo(sObj) || 'Desconocido';
            const dSpecialty = getStudentEspecialidad(sObj) || 'Desconocido';

            const encodedName = encodeURIComponent(fullName);
            const encodedGroup = encodeURIComponent(dGroup);
            const encodedSpecialty = encodeURIComponent(dSpecialty);

            processAttendance(`ID=${input}&No=${encodedName}&Gr=${encodedGroup}&Es=${encodedSpecialty}`);
        } else {
            setLastScanMsg({ type: 'error', text: 'Alumno no encontrado. Selecciona uno de la lista.' });
            playBeep('error');
        }
        setManualInput('');
        setShowSuggestions(false);
    };


    // Sincroniza la cola offline + actualiza el historial visual
    const syncAndUpdate = async (): Promise<number> => {
        const { sentIds } = await syncOfflineQueue();

        // Marcar como 'sent' los history entries cuyo queueId fue enviado
        if (sentIds.length > 0) {
            setHistory(prev => prev.map(entry =>
                entry.queueId && sentIds.includes(entry.queueId)
                    ? { ...entry, status: 'sent' }
                    : entry
            ));
        }

        setQueueCount(getOfflineQueueLength());
        return sentIds.length;
    };

    // Reintenta escaneos locales que quedaron pendientes
    const retryFailedScans = async () => {
        const n = new Date();
        const todayStr = `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-${String(n.getDate()).padStart(2, '0')}`;
        const todayItems = history.filter(h => h.date === todayStr && h.status === 'error');

        if (todayItems.length === 0 && getOfflineQueueLength() === 0) return;

        setLastScanMsg({ type: 'success', text: 'Sincronizando...' });

        // 1. Sincronizar cola offline
        const sentFromQueue = await syncAndUpdate();

        // 2. Reintentar los que están marcados como 'error' hoy
        let successCount = 0;
        for (const item of todayItems) {
            try {
                let gr = item.group || 'N/A';
                let es = item.specialty || 'N/A';
                if (!item.group || !item.specialty) {
                    const student = studentsDB.find(s => {
                        const sObj = s as any;
                        const controlKey = Object.keys(sObj).find(k => k.toLowerCase().includes('control'));
                        return controlKey && String(sObj[controlKey]).trim() === item.id;
                    });
                    if (student) {
                        const sObj = student as any;
                        const groupKey = Object.keys(sObj).find(k => k.toLowerCase().includes('grupo')) || 'Grupo';
                        const careerKey = Object.keys(sObj).find(k => k.toLowerCase().includes('carrera') || k.toLowerCase().includes('especialidad')) || 'Carrera';
                        gr = String(sObj[groupKey] || 'Desconocido').trim();
                        es = String(sObj[careerKey] || 'Desconocido').trim();
                    }
                }

                const { wasSent } = await sendAttendanceOfflineFirst({
                    Time: new Date(),
                    No: item.name,
                    ID: item.id,
                    Gr: gr,
                    Es: es,
                    Pe: selectedParcial,
                    Pro: selectedTeacher,
                    Ma: selectedSubject,
                    status: item.attendanceMode || 'Asistencia'
                });

                if (!wasSent) continue;

                successCount++;
                setHistory(prev => prev.map(entry =>
                    entry.id === item.id && entry.time === item.time && entry.date === item.date
                        ? { ...entry, status: 'sent', group: gr, specialty: es }
                        : entry
                ));
            } catch {
                // leave as error
            }
        }

        setQueueCount(getOfflineQueueLength());

        const totalSent = sentFromQueue + successCount;
        setLastScanMsg({
            type: totalSent > 0 ? 'success' : 'error',
            text: totalSent > 0
                ? `Sincronizados: ${totalSent} registro${totalSent !== 1 ? 's' : ''}`
                : 'Sin cambios pendientes'
        });
        setTimeout(() => setLastScanMsg(null), 4000);
    };

    // Auto-sincronizar cuando el dispositivo vuelva a estar en línea
    const retryRef = useRef(retryFailedScans)
    retryRef.current = retryFailedScans

    useEffect(() => {
        const handleOnline = () => {
            if (import.meta.env.DEV) console.log("Internet connection restored. Autosyncing...")
            retryRef.current()
        };
        window.addEventListener('online', handleOnline);
        return () => window.removeEventListener('online', handleOnline);
    }, []);

    // Group history
    const groupedHistory = history.reduce((acc, curr) => {
        const d = curr.date || 'Desconocido';
        if (!acc[d]) acc[d] = [];
        acc[d].push(curr);
        return acc;
    }, {} as Record<string, ScanHistoryEntry[]>);
    
    const sortedDates = Object.keys(groupedHistory).sort((a,b) => b.localeCompare(a));

    const downloadCSVForDay = (dateKey: string) => {
        const items = groupedHistory[dateKey] || [];
        const headers = ['Control', 'Nombre', 'Hora', 'Fecha', 'Estado'];
        const rows = items.map(h => [h.id, h.name, h.time, dateKey, h.status].join(','));
        const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows].join('\n');
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement('a');
        link.setAttribute('href', encodedUri);
        link.setAttribute('download', `asistencia_${dateKey}.csv`);
        document.body.appendChild(link);
        link.click();
        link.remove();
    };

    const toggleKiosk = async () => {
        if (!document.fullscreenElement) {
            await document.documentElement.requestFullscreen().catch(() => {});
            setIsKioskMode(true);
        } else {
            await document.exitFullscreen().catch(() => {});
            setIsKioskMode(false);
        }
    };

    const scansToday = useMemo(() => {
        const n = new Date();
        const ts = `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-${String(n.getDate()).padStart(2, '0')}`;
        return groupedHistory[ts]?.length || 0;
    }, [groupedHistory]);
    const totalScans = history.length;
    const metricsRef = useRef<HTMLDivElement>(null);
    const historyRef = useRef<HTMLDivElement>(null);
    const hasAnimatedMetrics = useRef(false);

    useEffect(() => {
        if (isConfigured && metricsRef.current && !hasAnimatedMetrics.current) {
            const cards = metricsRef.current.querySelectorAll<HTMLElement>('.metrics-card');
            if (cards.length) {
                staggerEntrance(cards, { fromY: 24, staggerDelay: 80, scale: [0.95, 1] });
                hasAnimatedMetrics.current = true;
            }
        }
    }, [isConfigured]);

    useEffect(() => {
        if (lastScanMsg?.type === 'success' && metricsRef.current) {
            const cards = metricsRef.current.querySelectorAll<HTMLElement>('.metrics-card');
            cards.forEach(card => scanSuccessBurst(card));
        }
    }, [lastScanMsg]);

    return (
        <div className="max-w-4xl mx-auto p-4 sm:p-6 pb-24 space-y-6">

            {!isConfigured ? (
                <Card className="border-gray-700 shadow-xl mt-4">
                    <div className="p-6 border-b border-theme-border bg-theme-border/50 flex items-center gap-3">
                        <span className="material-icons-round text-3xl text-theme-accent1-500">settings</span>
                        <h2 className="text-xl font-bold">Configuración de Clase</h2>
                    </div>
                    <div className="p-6 space-y-6">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-theme-muted uppercase tracking-widest">Profesor</label>
                            <Select value={selectedTeacher} onChange={e => setSelectedTeacher(e.target.value)}>
                                <option value="">Selecciona un profesor...</option>
                                {config.profesores.map(p => <option key={p.value} value={p.text}>{p.text}</option>)}
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-theme-muted uppercase tracking-widest">Materia</label>
                            <Select value={selectedSubject} onChange={e => setSelectedSubject(e.target.value)}>
                                <option value="">Selecciona una materia...</option>
                                {config.materias.map(m => <option key={m.value} value={m.text}>{m.text}</option>)}
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-theme-muted uppercase tracking-widest">Parcial</label>
                            <Select value={selectedParcial} onChange={e => setSelectedParcial(e.target.value)}>
                                {parcialesLocal.map(p => (
                                    <option key={p.id} value={p.id}>{p.nombre}</option>
                                ))}
                            </Select>
                        </div>

                        <Button onClick={validateConfig} className="w-full h-12 text-lg">
                            Iniciar Escáner
                        </Button>
                    </div>
                </Card>
            ) : (
                <div className="flex flex-col gap-6 mt-4">
                    {/* Metrics Dashboard */}
                    <div ref={metricsRef} className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <Card className="metrics-card p-4 flex flex-col items-center justify-center border border-theme-border shadow-lg bg-theme-base/20">
                            <span className="material-icons-round text-theme-accent1-500 mb-1 opacity-80">today</span>
                            <span className="text-2xl font-bold text-theme-text">{scansToday}</span>
                            <span className="text-[10px] text-theme-muted uppercase tracking-widest mt-1 font-semibold">Hoy</span>
                        </Card>
                        <Card className="metrics-card p-4 flex flex-col items-center justify-center border border-theme-border shadow-lg bg-theme-base/20">
                            <span className="material-icons-round text-theme-accent2-500 mb-1 opacity-80">storage</span>
                            <span className="text-2xl font-bold text-theme-text">{totalScans}</span>
                            <span className="text-[10px] text-theme-muted uppercase tracking-widest mt-1 font-semibold">En Memoria</span>
                        </Card>
                        {queueCount > 0 && (
                            <Card className="metrics-card p-4 flex flex-col items-center justify-center border border-amber-500/30 shadow-lg bg-amber-500/10">
                                <span className="material-icons-round text-amber-400 mb-1 opacity-80">sync</span>
                                <span className="text-2xl font-bold text-amber-400">{queueCount}</span>
                                <span className="text-[10px] text-amber-400/80 uppercase tracking-widest mt-1 font-semibold">Pendientes</span>
                            </Card>
                        )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Scanner view */}
                        <div className="space-y-6">
                        <Card className="border-0 overflow-hidden shadow-xl bg-slate-900 text-white rounded-2xl">
                            <div className="flex items-center justify-between p-4 bg-slate-800/50 border-b border-slate-700/50">
                                <div className="flex items-center gap-2">
                                    <span className="material-icons-round text-blue-500 animate-pulse">videocam</span>
                                    <span className="font-semibold text-slate-100">Escaneando...</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <input type="file" id="qr-upload" accept="image/*" className="hidden" onChange={handleFileUpload} />
                                    <Button variant="outline" size="sm" onClick={() => document.getElementById('qr-upload')?.click()} className="bg-slate-700/50 hover:bg-slate-600 text-slate-200 border-0">
                                        <span className="material-icons-round text-sm mr-1">upload_file</span>
                                        <span className="hidden sm:inline">Foto</span>
                                    </Button>
                                    <Button variant="outline" size="sm" onClick={toggleKiosk} className="bg-slate-700/50 hover:bg-slate-600 text-slate-200 border-0">
                                        <span className="material-icons-round text-sm mr-1">{isKioskMode ? 'fullscreen_exit' : 'fullscreen'}</span>
                                        <span className="hidden sm:inline">Kiosco</span>
                                    </Button>
                                    <Button variant="secondary" size="sm" onClick={() => { if(isKioskMode) toggleKiosk(); setIsConfigured(false); }} className="bg-slate-700 hover:bg-slate-600 text-white border-0 hidden sm:flex">
                                        Clase
                                    </Button>
                                </div>
                            </div>
                            <div className={cn("bg-slate-950 p-4 min-h-[180px] flex flex-col justify-center items-center relative transition-all duration-300", isKioskMode ? "h-[70vh]" : "")}>
                                <div id="file-scanner-hidden" className="hidden"></div>
                                {/* HTML5 QR Scanner Target */}
                                <div id={scannerId} className="w-full max-w-[260px] mx-auto override-html5-qrcode rounded-xl overflow-hidden font-sans border-none" />
                                <div className="absolute bottom-6 text-center w-full px-4 text-sm font-medium text-white/90">
                                    Alinea el código QR con el marco
                                </div>
                            </div>

                            {/* Status Selector */}
                            <div className="p-4 bg-slate-900 border-t border-slate-800 rounded-b-2xl">
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-3">Estado de Toma</label>
                                <div className="grid grid-cols-2 gap-3">
                                    <button
                                        onClick={() => setAttendanceStatus('Asistencia')}
                                        className={cn(
                                            "flex items-center justify-center gap-2 p-3 rounded-xl border-2 transition-all font-semibold",
                                            attendanceStatus === 'Asistencia'
                                                ? "bg-emerald-500/20 border-emerald-500/50 text-emerald-400"
                                                : "bg-slate-800/50 border-slate-700/50 text-slate-400 hover:bg-slate-800"
                                        )}
                                    >
                                        <span className="material-icons-round text-lg">check_circle</span>
                                        Asistencia
                                    </button>
                                    <button
                                        onClick={() => setAttendanceStatus('Retardo')}
                                        className={cn(
                                            "flex items-center justify-center gap-2 p-3 rounded-xl border-2 transition-all font-semibold",
                                            attendanceStatus === 'Retardo'
                                                ? "bg-orange-500/20 border-orange-500/50 text-orange-400"
                                                : "bg-slate-800/50 border-slate-700/50 text-slate-400 hover:bg-slate-800"
                                        )}
                                    >
                                        <span className="material-icons-round text-lg">schedule</span>
                                        Retardo
                                    </button>
                                </div>
                            </div>
                        </Card>

                        {lastScanMsg && (
                            isKioskMode ? (
                                <div className="fixed inset-0 z-50 flex items-center justify-center p-6 animate-fade-in pointer-events-none">
                                    <div className={cn(
                                        "absolute inset-0 backdrop-blur-md transition-all duration-300",
                                        lastScanMsg.type === 'success' ? "bg-emerald-950/80" : "bg-red-950/80"
                                    )} />
                                    <div className={cn(
                                        "relative z-10 px-8 py-6 rounded-2xl border shadow-2xl text-center pointer-events-auto",
                                        lastScanMsg.type === 'success'
                                            ? "bg-emerald-900/60 border-emerald-500/20 text-white"
                                            : "bg-red-900/60 border-red-500/20 text-white"
                                    )}>
                                        <p className="text-xl font-semibold">{lastScanMsg.text}</p>
                                    </div>
                                </div>
                            ) : (
                                <div className="fixed top-24 left-1/2 -translate-x-1/2 w-[90%] max-w-md z-50 animate-fade-in pointer-events-none">
                                    <div className={cn(
                                        "px-4 py-3 rounded-xl shadow-2xl text-center font-semibold pointer-events-auto",
                                        lastScanMsg.type === 'success'
                                            ? "bg-emerald-900/90 backdrop-blur-md border border-emerald-500/20 text-emerald-200"
                                            : "bg-red-900/90 backdrop-blur-md border border-red-500/20 text-red-200"
                                    )}>
                                        {lastScanMsg.text}
                                    </div>
                                </div>
                            )
                        )}

                        <Card className="border-gray-700 shadow-xl overflow-visible relative z-50">
                            <div className="p-4 flex gap-2 relative">
                                <div className="relative flex-1">
                                    <Input
                                        placeholder="Buscar nombre o ID..."
                                        value={manualInput}
                                        onChange={e => setManualInput(e.target.value)}
                                        onFocus={() => setShowSuggestions(true)}
                                        onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                                    />
                                    {showSuggestions && manualInput.length > 1 && (
                                        <div className="absolute top-full left-0 right-0 mt-2 bg-theme-card border border-theme-border rounded-xl shadow-2xl z-50 overflow-hidden max-h-48 overflow-y-auto">
                                            {suggestions.length > 0 ? suggestions.map(s => (
                                                <button
                                                    key={s.control}
                                                    type="button"
                                                    className="w-full text-left p-3 hover:bg-theme-base border-b border-theme-border flex flex-col transition-colors"
                                                    onClick={() => executeManualAttendance(s.control)}
                                                >
                                                    <span className="text-sm text-theme-text font-medium truncate">{s.nombre}</span>
                                                    <span className="text-xs text-theme-accent1-400 font-mono">{s.control}</span>
                                                </button>
                                            )) : (
                                                <div className="p-3 text-sm text-theme-muted text-center">Sin resultados locales</div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </Card>
                    </div>

                    {/* History view (Hidden in Kiosk) */}
                    {!isKioskMode && (
                        <Card ref={historyRef} className="border-gray-700 shadow-xl flex flex-col max-h-[600px] overflow-hidden">
                            <div className="flex items-center justify-between p-4 bg-theme-border/50 border-b border-theme-border">
                            <span className="font-semibold text-theme-text">Historial Reciente</span>
                            <div className="flex gap-2">
                                {(queueCount > 0 || history.some(h => h.date === todayStr && h.status === 'error')) && (
                                    <Button variant="outline" size="sm" className="bg-amber-500/10 text-amber-400 border-amber-500/30 hover:bg-amber-500/20" onClick={retryFailedScans}>
                                        <span className="material-icons-round text-sm mr-1">sync</span>
                                        Sincronizar{queueCount > 0 ? ` (${queueCount})` : ''}
                                    </Button>
                                )}
                                <Button variant="destructive" size="sm" onClick={() => setShowClearModal(true)}>
                                    Limpiar Todo
                                </Button>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 space-y-4">
                            {history.length === 0 ? (
                                <div className="p-12 text-center flex flex-col items-center justify-center">
                                    <div className="p-4 rounded-full bg-theme-border/30 text-theme-muted mb-4">
                                        <span className="material-icons-round text-5xl">qr_code_scanner</span>
                                    </div>
                                    <h3 className="text-lg font-bold text-theme-text mb-2">Sin Registros</h3>
                                    <p className="text-sm text-theme-muted max-w-xs">
                                        Escanea códigos QR o busca alumnos manualmente para registrar asistencia. Los registros aparecerán aquí.
                                    </p>
                                </div>
                            ) : (
                                sortedDates.map(dateKey => {
                                    const dayItems = groupedHistory[dateKey];
                                    const isExpanded = expandedDays[dateKey];
                                    const displayItems = isExpanded ? dayItems : dayItems.slice(0, 5);
                                    const hasMore = dayItems.length > 5;
                                    
                                    return (
                                        <div key={dateKey} className="bg-theme-card rounded-xl border border-theme-border overflow-hidden shadow-sm">
                                            <div className="flex items-center justify-between p-3 bg-theme-border/50 border-b border-theme-border">
                                                <span className="font-medium text-theme-accent2-400 text-sm flex items-center gap-2">
                                                    <span className="material-icons-round text-sm opacity-80">event</span>
                                                    {dateKey} <span className="text-theme-muted/80 text-xs font-normal">({dayItems.length})</span>
                                                </span>
                                                <Button variant="outline" size="sm" className="min-h-[44px] h-7 text-xs bg-theme-base/80 hover:bg-theme-border/100" onClick={() => downloadCSVForDay(dateKey)}>
                                                    <span className="material-icons-round text-xs mr-1 opacity-70">download</span> CSV
                                                </Button>
                                            </div>
                                            <div>
                                                {displayItems.map((entry, i) => (
                                                    <div key={i} className="data-row">
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-sm text-theme-text truncate flex items-center gap-2">
                                                                {entry.name}
                                                                {entry.attendanceMode === 'Retardo' && (
                                                                    <span className="text-[10px] font-semibold text-yellow-500 bg-yellow-500/10 px-1.5 rounded">RETARDO</span>
                                                                )}
                                                            </p>
                                                            <p className="text-xs text-theme-accent1-400 font-mono">{entry.id}</p>
                                                        </div>
                                                        <div className="flex items-center gap-3 shrink-0">
                                                            <span className="text-xs text-theme-muted tabular-nums">{entry.time}</span>
                                                            {entry.status === 'sent' && <span className="text-[11px] font-medium text-theme-accent2-400">Registrado</span>}
                                                            {entry.status === 'pending' && <span className="text-[11px] font-medium text-yellow-400 flex items-center gap-1"><span className="animate-spin material-icons-round text-[12px]">refresh</span> Enviando</span>}
                                                            {entry.status === 'error' && <span className="text-[11px] font-medium text-red-400">Error Red</span>}
                                                        </div>
                                                    </div>
                                                ))}
                                                {hasMore && (
                                                    <Button 
                                                        variant="ghost" 
                                                        className="w-full text-xs text-theme-muted hover:text-theme-text mt-2 h-8"
                                                        onClick={() => setExpandedDays(prev => ({...prev, [dateKey]: !isExpanded}))}
                                                    >
                                                        {isExpanded ? 'Ocultar recientes' : `Visualizar los ${dayItems.length} escaneos`}
                                                    </Button>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </Card>
                    )}
                    </div>
                </div>
            )}

            <Modal isOpen={showClearModal} onClose={() => setShowClearModal(false)} title="Limpiar Historial">
                <div className="space-y-4">
                    <p className="text-theme-muted">
                        ¿Seguro que deseas eliminar absolutamente todo el historial del navegador? Esta acción no se puede deshacer.
                    </p>
                    <div className="flex justify-end gap-3 pt-2">
                        <Button variant="outline" onClick={() => setShowClearModal(false)}>
                            Cancelar
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={() => {
                                setHistory([]);
                                setShowClearModal(false);
                                toast('Historial eliminado.', 'info');
                            }}
                        >
                            Eliminar Todo
                        </Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
