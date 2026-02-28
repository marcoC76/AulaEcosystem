import { useState, useEffect, useRef } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { fetchAppConfig, sendAttendance } from '../../lib/dataService';
import { useLocalStorage } from '../../hooks/useLocalStorage';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { cn } from '../../lib/utils';
import type { ConfigOption } from '../../types';

// Audio Context for Beeps
const playBeep = (type: 'success' | 'error') => {
    try {
        const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
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
    status: 'sent' | 'pending' | 'error';
    attendanceMode?: 'Asistencia' | 'Retardo';
}

export default function AulaScan() {
    const [config, setConfig] = useState<{ profesores: ConfigOption[], materias: ConfigOption[] }>({ profesores: [], materias: [] });

    // Form State
    const [selectedTeacher, setSelectedTeacher] = useLocalStorage('scan_teacher', '');
    const [selectedSubject, setSelectedSubject] = useLocalStorage('scan_subject', '');
    const [selectedParcial, setSelectedParcial] = useLocalStorage('scan_parcial', '1');
    const [isConfigured, setIsConfigured] = useState(false);

    // Scanner & Logic State
    const [scannerId] = useState('qr-reader');
    const [history, setHistory] = useLocalStorage<ScanHistoryEntry[]>('scan_session_history', []);
    const cooldownsRef = useRef<Record<string, number>>({});
    const [manualInput, setManualInput] = useState('');
    const [attendanceStatus, setAttendanceStatus] = useState<'Asistencia' | 'Retardo'>('Asistencia');
    const [lastScanMsg, setLastScanMsg] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    const scannerRef = useRef<Html5QrcodeScanner | null>(null);

    useEffect(() => {
        fetchAppConfig().then(setConfig);
    }, []);

    // Initialize Scanner when configured
    useEffect(() => {
        if (isConfigured) {
            // Must give UI a tick to render the div
            const timer = setTimeout(() => {
                if (!scannerRef.current) {
                    scannerRef.current = new Html5QrcodeScanner(
                        scannerId,
                        { fps: 10, qrbox: { width: 250, height: 250 }, rememberLastUsedCamera: true },
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
            return;
        }

        // Cooldown check (60 seconds)
        const now = Date.now();
        const lastScan = cooldownsRef.current[ID];
        if (lastScan && now - lastScan < 60000) {
            setLastScanMsg({ type: 'error', text: `Ya escaneado recientemente: ${No}` });
            playBeep('error');
            return;
        }

        // Success -> Register
        cooldownsRef.current[ID] = now;
        playBeep('success');
        setLastScanMsg({ type: 'success', text: `Registrado: ${No} (${ID})` });

        const newEntry: ScanHistoryEntry = {
            id: ID,
            name: No,
            time: new Date().toLocaleTimeString(),
            status: 'pending',
            attendanceMode: attendanceStatus // track if it was asistencia or retardo
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

    const handleManualSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (manualInput.trim()) {
            processAttendance(`ID=${manualInput}&No=${manualInput}&Gr=Manual&Es=Manual`);
            setManualInput('');
        }
    };

    const downloadCSV = () => {
        const headers = ['Control', 'Nombre', 'Hora', 'Estado'];
        const rows = history.map(h => [h.id, h.name, h.time, h.status].join(','));
        const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows].join('\n');
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement('a');
        link.setAttribute('href', encodedUri);
        link.setAttribute('download', `asistencia_sesion_${new Date().toLocaleDateString()}.csv`);
        document.body.appendChild(link);
        link.click();
        link.remove();
    };

    return (
        <div className="max-w-4xl mx-auto p-4 sm:p-6 pb-24 space-y-6 animate-fade-in">

            {!isConfigured ? (
                <Card className="border-gray-700 shadow-xl mt-4">
                    <div className="p-6 border-b border-gray-800 bg-gray-850 rounded-t-2xl flex items-center gap-3">
                        <span className="material-icons-round text-3xl text-blue-500">settings</span>
                        <h2 className="text-xl font-bold">Configuración de Clase</h2>
                    </div>
                    <div className="p-6 space-y-6">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-400 uppercase tracking-widest">Profesor</label>
                            <Select value={selectedTeacher} onChange={e => setSelectedTeacher(e.target.value)}>
                                <option value="">Selecciona un profesor...</option>
                                {config.profesores.map(p => <option key={p.value} value={p.text}>{p.text}</option>)}
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-400 uppercase tracking-widest">Materia</label>
                            <Select value={selectedSubject} onChange={e => setSelectedSubject(e.target.value)}>
                                <option value="">Selecciona una materia...</option>
                                {config.materias.map(m => <option key={m.value} value={m.text}>{m.text}</option>)}
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-400 uppercase tracking-widest">Parcial</label>
                            <Select value={selectedParcial} onChange={e => setSelectedParcial(e.target.value)}>
                                <option value="1">Parcial 1</option>
                                <option value="2">Parcial 2</option>
                                <option value="3">Parcial 3</option>
                            </Select>
                        </div>

                        <Button onClick={validateConfig} className="w-full h-12 text-lg">
                            Iniciar Escáner
                        </Button>
                    </div>
                </Card>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                    {/* Scanner view */}
                    <div className="space-y-6">
                        <Card className="border-gray-700 overflow-hidden shadow-xl">
                            <div className="flex items-center justify-between p-4 bg-gray-850 border-b border-gray-800">
                                <div className="flex items-center gap-2">
                                    <span className="material-icons-round text-blue-500 animate-pulse">videocam</span>
                                    <span className="font-semibold text-white">Escaneando...</span>
                                </div>
                                <Button variant="ghost" size="sm" onClick={() => setIsConfigured(false)}>
                                    Cambiar Clase
                                </Button>
                            </div>
                            <div className="bg-black/50 p-4">
                                {/* HTML5 QR Scanner Target */}
                                <div id={scannerId} className="w-full override-html5-qrcode rounded-xl overflow-hidden font-sans border-none" />
                            </div>

                            {/* Status Selector */}
                            <div className="p-4 bg-gray-850 border-t border-gray-800">
                                <label className="text-xs font-medium text-gray-500 uppercase tracking-widest block mb-2">Estado de Toma</label>
                                <div className="grid grid-cols-2 gap-2">
                                    <button
                                        onClick={() => setAttendanceStatus('Asistencia')}
                                        className={cn(
                                            "flex items-center justify-center gap-2 p-3 rounded-xl border transition-all",
                                            attendanceStatus === 'Asistencia'
                                                ? "bg-emerald-600/20 border-emerald-500 text-emerald-400 font-bold"
                                                : "bg-gray-800 border-gray-700 text-gray-400"
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
                                                ? "bg-yellow-600/20 border-yellow-500 text-yellow-400 font-bold"
                                                : "bg-gray-800 border-gray-700 text-gray-400"
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
                                    ? "bg-emerald-900/30 border-emerald-500/50 text-emerald-400"
                                    : "bg-red-900/30 border-red-500/50 text-red-400"
                            )}>
                                {lastScanMsg.text}
                            </div>
                        )}

                        <Card className="border-gray-700 shadow-xl">
                            <form onSubmit={handleManualSubmit} className="p-4 flex gap-2">
                                <Input
                                    placeholder="ID manual..."
                                    value={manualInput}
                                    onChange={e => setManualInput(e.target.value)}
                                />
                                <Button type="submit">Agregar</Button>
                            </form>
                        </Card>
                    </div>

                    {/* History view */}
                    <Card className="border-gray-700 shadow-xl flex flex-col max-h-[600px]">
                        <div className="flex items-center justify-between p-4 bg-gray-850 border-b border-gray-800">
                            <span className="font-semibold text-white">Sesión Actual ({history.length})</span>
                            <div className="flex gap-2">
                                <Button variant="outline" size="sm" onClick={downloadCSV} disabled={history.length === 0}>
                                    <span className="material-icons-round text-sm mr-1">download</span> CSV
                                </Button>
                                <Button variant="destructive" size="sm" onClick={() => setHistory([])}>
                                    Limpiar
                                </Button>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-2 space-y-2">
                            {history.length === 0 ? (
                                <div className="p-8 text-center text-gray-500">
                                    <span className="material-icons-round text-4xl mb-2 opacity-50">history</span>
                                    <p>No hay alumnos registrados aún.</p>
                                </div>
                            ) : (
                                history.map((entry, i) => (
                                    <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-gray-800 border border-gray-700 hover:bg-gray-750 transition-colors">
                                        <div className="truncate pr-2">
                                            <p className="font-medium text-white truncate text-sm flex items-center gap-2">
                                                {entry.name}
                                                {entry.attendanceMode === 'Retardo' && (
                                                    <span className="text-[10px] bg-yellow-500/20 text-yellow-500 px-1.5 rounded border border-yellow-500/30">RETARDO</span>
                                                )}
                                            </p>
                                            <p className="text-xs text-blue-400 font-mono">{entry.id}</p>
                                        </div>
                                        <div className="flex flex-col items-end shrink-0">
                                            <span className="text-[10px] text-gray-400 mb-1">{entry.time}</span>
                                            {entry.status === 'sent' && <span className="text-emerald-400 text-xs bg-emerald-400/10 px-2 py-0.5 rounded-full border border-emerald-400/20">Registrado</span>}
                                            {entry.status === 'pending' && <span className="text-yellow-400 text-xs flex items-center gap-1"><span className="animate-spin material-icons-round text-[10px]">refresh</span> Enviando</span>}
                                            {entry.status === 'error' && <span className="text-red-400 text-xs bg-red-400/10 px-2 py-0.5 rounded-full border border-red-400/20">Error Red</span>}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </Card>
                </div>
            )}
        </div>
    );
}
