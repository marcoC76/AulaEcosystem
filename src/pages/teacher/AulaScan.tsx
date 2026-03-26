import { useState, useEffect, useRef } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { fetchAppConfig, sendAttendance, fetchStudentsDB, fetchParcialesConfig, type ParcialConfig } from '../../lib/dataService';
import { useLocalStorage } from '../../hooks/useLocalStorage';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { cn } from '../../lib/utils';
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
}

export default function AulaScan() {
    const [config, setConfig] = useState<{ profesores: ConfigOption[], materias: ConfigOption[] }>({ profesores: [], materias: [] });
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

    const scannerRef = useRef<Html5QrcodeScanner | null>(null);

    useEffect(() => {
        fetchAppConfig().then(setConfig);
        fetchStudentsDB().then(setStudentsDB);
        fetchParcialesConfig().then(setParcialesLocal);

        // Auto-purge old history (> 14 days)
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
                            qrbox: { width: 250, height: 250 }, 
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

    const validateConfig = () => {
        if (selectedTeacher && selectedSubject && selectedParcial) {
            setIsConfigured(true);
        } else {
            alert("Por favor selecciona todos los campos.");
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
        setLastScanMsg({ type: 'success', text: `Registrado: ${No} (${ID})` });

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
            attendanceMode: attendanceStatus
        };

        // Optimistic history update
        setHistory(prev => [newEntry, ...prev]);

        // Send to server
        const success = await sendAttendance({
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

        // Update status
        setHistory(prev => prev.map(entry =>
            entry.id === ID && entry.time === newEntry.time
                ? { ...entry, status: success ? 'sent' : 'error' }
                : entry
        ));
    };

    const onScanSuccess = (decodedText: string) => {
        processAttendance(decodedText);
    };

    const onScanFailure = () => {
        // frequent, ignore.
    };

    const getSuggestions = () => {
        if (manualInput.length < 2) return [];
        const query = manualInput.toLowerCase();
        
        let matches = studentsDB.filter(student => {
            const sObj = student as any;
            const nameKey = Object.keys(sObj).find(k => k.toLowerCase().includes('nombre')) || 'Nombre(s)';
            const patKey = Object.keys(sObj).find(k => k.toLowerCase().includes('paterno')) || 'Apellido Paterno';
            const matKey = Object.keys(sObj).find(k => k.toLowerCase().includes('materno')) || 'Apellido Materno';
            const controlKey = Object.keys(sObj).find(k => k.toLowerCase().includes('control'));
            
            const fullName = `${sObj[nameKey]} ${sObj[patKey]} ${sObj[matKey]}`.toLowerCase();
            const control = controlKey ? String(sObj[controlKey]).toLowerCase() : '';
            
            return fullName.includes(query) || control.includes(query);
        });

        // Limit visually to top 5
        return matches.slice(0, 5).map(student => {
            const sObj = student as any;
            const nameKey = Object.keys(sObj).find(k => k.toLowerCase().includes('nombre')) || 'Nombre(s)';
            const patKey = Object.keys(sObj).find(k => k.toLowerCase().includes('paterno')) || 'Apellido Paterno';
            const matKey = Object.keys(sObj).find(k => k.toLowerCase().includes('materno')) || 'Apellido Materno';
            const controlKey = Object.keys(sObj).find(k => k.toLowerCase().includes('control'));
            return {
                nombre: `${sObj[nameKey]} ${sObj[patKey]} ${sObj[matKey]}`,
                control: controlKey ? String(sObj[controlKey]) : ''
            };
        });
    };

    const suggestions = getSuggestions();

    const executeManualAttendance = (input: string) => {
        if (!input) return;
        const student = studentsDB.find(s => {
            const sObj = s as any;
            const controlKey = Object.keys(sObj).find(k => k.toLowerCase().includes('control'));
            const sId = controlKey ? sObj[controlKey] : undefined;
            return sId && String(sId).trim().toLowerCase() === String(input).trim().toLowerCase();
        });

        if (student) {
            const sObj = student as any;
            const nameKey = Object.keys(sObj).find(k => k.toLowerCase().includes('nombre')) || 'Nombre(s)';
            const patKey = Object.keys(sObj).find(k => k.toLowerCase().includes('paterno')) || 'Apellido Paterno';
            const matKey = Object.keys(sObj).find(k => k.toLowerCase().includes('materno')) || 'Apellido Materno';
            const groupKey = Object.keys(sObj).find(k => k.toLowerCase().includes('grupo')) || 'Grupo';
            const careerKey = Object.keys(sObj).find(k => k.toLowerCase().includes('carrera') || k.toLowerCase().includes('especialidad')) || 'Carrera';

            const rawName = String(sObj[nameKey] || '').trim();
            const rawPat = String(sObj[patKey] || '').trim();
            const rawMat = String(sObj[matKey] || '').trim();
            const fullName = `${rawName} ${rawPat} ${rawMat}`.trim();

            const dGroup = String(sObj[groupKey] || 'Desconocido').trim();
            const dSpecialty = String(sObj[careerKey] || 'Desconocido').trim();

            const encodedName = encodeURIComponent(fullName);
            const encodedGroup = encodeURIComponent(dGroup);
            const encodedSpecialty = encodeURIComponent(dSpecialty);

            processAttendance(`ID=${input}&No=${encodedName}&Gr=${encodedGroup}&Es=${encodedSpecialty}`);
        } else {
            processAttendance(`ID=${input}&No=${input}&Gr=No Registrado&Es=No Registrado`);
        }
        setManualInput('');
        setShowSuggestions(false);
    };

    const handleManualSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        executeManualAttendance(manualInput.trim());
    };

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

    const nowObj = new Date();
    const todayStr = `${nowObj.getFullYear()}-${String(nowObj.getMonth() + 1).padStart(2, '0')}-${String(nowObj.getDate()).padStart(2, '0')}`;
    const scansToday = groupedHistory[todayStr]?.length || 0;
    const totalScans = history.length;

    return (
        <div className="max-w-4xl mx-auto p-4 sm:p-6 pb-24 space-y-6 animate-fade-in">

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
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 animate-fade-in-up">
                        <Card className="p-4 flex flex-col items-center justify-center border border-theme-border shadow-lg bg-theme-base/20">
                            <span className="material-icons-round text-theme-accent1-500 mb-1 opacity-80">today</span>
                            <span className="text-2xl font-bold text-theme-text">{scansToday}</span>
                            <span className="text-[10px] text-theme-muted uppercase tracking-widest mt-1 font-semibold">Hoy</span>
                        </Card>
                        <Card className="p-4 flex flex-col items-center justify-center border border-theme-border shadow-lg bg-theme-base/20">
                            <span className="material-icons-round text-theme-accent2-500 mb-1 opacity-80">storage</span>
                            <span className="text-2xl font-bold text-theme-text">{totalScans}</span>
                            <span className="text-[10px] text-theme-muted uppercase tracking-widest mt-1 font-semibold">En Memoria</span>
                        </Card>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Scanner view */}
                        <div className="space-y-6">
                        <Card className="border-gray-700 overflow-hidden shadow-xl">
                            <div className="flex items-center justify-between p-4 bg-theme-border/50 border-b border-theme-border">
                                <div className="flex items-center gap-2">
                                    <span className="material-icons-round text-theme-accent1-500 animate-pulse">videocam</span>
                                    <span className="font-semibold text-theme-text">Escaneando...</span>
                                </div>
                                <Button variant="ghost" size="sm" onClick={() => setIsConfigured(false)}>
                                    Cambiar Clase
                                </Button>
                            </div>
                            <div className="bg-black/30 p-4">
                                {/* HTML5 QR Scanner Target */}
                                <div id={scannerId} className="w-full override-html5-qrcode rounded-xl overflow-hidden font-sans border-none" />
                            </div>

                            {/* Status Selector */}
                            <div className="p-4 bg-gray-850 border-t border-gray-800">
                                <label className="text-xs font-medium text-theme-muted/80 uppercase tracking-widest block mb-2">Estado de Toma</label>
                                <div className="grid grid-cols-2 gap-2">
                                    <button
                                        onClick={() => setAttendanceStatus('Asistencia')}
                                        className={cn(
                                            "flex items-center justify-center gap-2 p-3 rounded-xl border transition-all",
                                            attendanceStatus === 'Asistencia'
                                                ? "bg-theme-accent2-600/20 border-theme-accent2-500/50 text-theme-accent2-400 font-bold"
                                                : "bg-theme-base/50 border-theme-border text-theme-muted hover:bg-theme-border/50"
                                        )}
                                    >
                                        <span className="material-icons-round text-lg">check_circle</span>
                                        Asistencia
                                    </button>
                                    <button
                                        onClick={() => setAttendanceStatus('Retardo')}
                                        className={cn(
                                            "flex items-center justify-center gap-2 p-3 rounded-xl border transition-all",
                                            attendanceStatus === 'Retardo'
                                                ? "bg-yellow-600/20 border-yellow-500/50 text-yellow-400 font-bold"
                                                : "bg-theme-base/50 border-theme-border text-theme-muted hover:bg-theme-border/50"
                                        )}
                                    >
                                        <span className="material-icons-round text-lg">schedule</span>
                                        Retardo
                                    </button>
                                </div>
                            </div>
                        </Card>

                        {lastScanMsg && (
                            <div className={cn(
                                "p-4 rounded-xl border animate-fade-in text-center font-medium",
                                lastScanMsg.type === 'success'
                                    ? "bg-theme-accent2-900/30 border-theme-accent2-500/50 text-theme-accent2-400"
                                    : "bg-red-900/30 border-red-500/50 text-red-400"
                            )}>
                                {lastScanMsg.text}
                            </div>
                        )}

                        <Card className="border-gray-700 shadow-xl overflow-visible">
                            <form onSubmit={handleManualSubmit} className="p-4 flex gap-2 relative">
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
                                <Button type="submit">Agregar</Button>
                            </form>
                        </Card>
                    </div>

                    {/* History view */}
                    <Card className="border-gray-700 shadow-xl flex flex-col max-h-[600px] overflow-hidden">
                        <div className="flex items-center justify-between p-4 bg-theme-border/50 border-b border-theme-border">
                            <span className="font-semibold text-theme-text">Historial Reciente</span>
                            <Button variant="destructive" size="sm" onClick={() => {
                                if(confirm('¿Seguro que deseas eliminar absolutamente todo el historial del navegador?')) setHistory([]);
                            }}>
                                Limpiar Todo
                            </Button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 space-y-4">
                            {history.length === 0 ? (
                                <div className="p-8 text-center text-theme-muted/80">
                                    <span className="material-icons-round text-4xl mb-2 opacity-50">history</span>
                                    <p>No hay alumnos registrados aún.</p>
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
                                                <Button variant="outline" size="sm" className="h-7 text-xs bg-theme-base/80 hover:bg-theme-border/100" onClick={() => downloadCSVForDay(dateKey)}>
                                                    <span className="material-icons-round text-xs mr-1 opacity-70">download</span> CSV
                                                </Button>
                                            </div>
                                            <div className="p-2 space-y-2">
                                                {displayItems.map((entry, i) => (
                                                    <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-theme-base/50 border border-theme-border">
                                                        <div className="truncate pr-2">
                                                            <p className="font-medium text-theme-text truncate text-sm flex items-center gap-2">
                                                                {entry.name}
                                                                {entry.attendanceMode === 'Retardo' && (
                                                                    <span className="text-[10px] bg-yellow-500/20 text-yellow-500 px-1.5 rounded border border-yellow-500/30">RETARDO</span>
                                                                )}
                                                            </p>
                                                            <p className="text-xs text-theme-accent1-400 font-mono">{entry.id}</p>
                                                        </div>
                                                        <div className="flex flex-col items-end shrink-0">
                                                            <span className="text-[10px] text-theme-muted mb-1">{entry.time}</span>
                                                            {entry.status === 'sent' && <span className="text-theme-accent2-400 text-xs bg-theme-accent2-400/10 px-2 py-0.5 rounded-full border border-theme-accent2-400/20">Registrado</span>}
                                                            {entry.status === 'pending' && <span className="text-yellow-400 text-xs flex items-center gap-1"><span className="animate-spin material-icons-round text-[10px]">refresh</span> Enviando</span>}
                                                            {entry.status === 'error' && <span className="text-red-400 text-xs bg-red-400/10 px-2 py-0.5 rounded-full border border-red-400/20">Error Red</span>}
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
                    </div>
                </div>
            )}
        </div>
    );
}
