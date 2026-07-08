import { useState, useEffect, useRef } from 'react';
import QRCode from 'react-qr-code';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { LiveClock } from '../../components/ui/LiveClock';
import { fetchStudentsDB, getConfig } from '../../lib/dataService';
import { useLocalStorage } from '../../hooks/useLocalStorage';
import { useToast } from '../../hooks/useToast';
import type { StudentDBRecord } from '../../types';

export default function AulaPass() {
    const { toast } = useToast();
    const [showLogoutModal, setShowLogoutModal] = useState(false);
    const [student, setStudent] = useLocalStorage<StudentDBRecord | null>('aulaPassData', null);
    const [db, setDb] = useState<StudentDBRecord[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isDbLoading, setIsDbLoading] = useState(true);
    const [qrVersion, setQrVersion] = useState('1');
    const credentialRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        fetchStudentsDB().then(result => {
            setDb(result);
            setIsDbLoading(false);
        });
        getConfig().then(c => setQrVersion(c.qr_version || '1'));
    }, []);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        const term = searchQuery.trim().toLowerCase();
        if (!term) return;

        const found = db.find(s => {
            const extraS = s as Record<string, any>;
            const studentId = extraS['No. Control'] || extraS['No. Control '] || '';
            return String(studentId).trim().toLowerCase() === term;
        });
        if (found) {
            setStudent(found);
        } else {
            setError('Número de control no encontrado. Verifica tus datos.');
        }
    };

    const clearIdentity = () => {
        setShowLogoutModal(true);
    };

    const getCareerColors = (career: string = '') => {
        const c = career.toLowerCase();
        if (c.includes('enfermería') || c.includes('enfermeria')) return 'from-theme-accent2-600 to-teal-800 border-theme-accent2-500/30';
        if (c.includes('radiología') || c.includes('radiologia')) return 'from-theme-accent1-600 to-indigo-800 border-theme-accent1-500/30';
        if (c.includes('sistemas')) return 'from-theme-accent3-600 to-violet-800 border-theme-accent3-500/30';
        return 'from-gray-600 to-gray-800 border-gray-500/30';
    };

    const downloadPNG = async () => {
        if (!student) return;
        setIsLoading(true);

        try {
            // Manual canvas drawing to avoid external heavy libraries like html2canvas
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            if (!ctx) return;

            canvas.width = 800;
            canvas.height = 1200;

            // Draw Background
            ctx.fillStyle = '#111827'; // gray-900
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // Draw Header colored rect
            ctx.fillStyle = student.Carrera.toLowerCase().includes('radiología') ? '#2563eb' :
                student.Carrera.toLowerCase().includes('enfermería') ? '#059669' : '#4b5563';
            ctx.fillRect(0, 0, canvas.width, 180);

            // Draw Text Info
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 50px Inter, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('AulaPass', canvas.width / 2, 100);

            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 36px Inter, sans-serif';
            const fullName = `${student['Nombre(s)']} ${student['Apellido Paterno']} ${student['Apellido Materno']}`;

            // wrap text simply (dumb wrap for names)
            ctx.fillText(fullName.substring(0, 40), canvas.width / 2, 300);

            ctx.font = '30px Inter, sans-serif';
            ctx.fillStyle = '#9ca3af';
            ctx.fillText(`No. Control: ${student['No. Control']}`, canvas.width / 2, 380);
            ctx.fillText(`Carrera: ${student.Carrera.toUpperCase()}`, canvas.width / 2, 440);
            ctx.fillText(`Grupo: ${student.Grupo}`, canvas.width / 2, 500);

            // Grab the QR SVG
            const svg = document.querySelector('#qr-code-svg');
            if (svg) {
                const svgData = new XMLSerializer().serializeToString(svg);
                const img = new Image();
                const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
                const url = URL.createObjectURL(svgBlob);

                await new Promise((resolve) => {
                    img.onload = () => {
                        ctx.fillStyle = '#ffffff';
                        ctx.fillRect((canvas.width / 2) - 220, 580, 440, 440);
                        ctx.drawImage(img, (canvas.width / 2) - 200, 600, 400, 400);
                        URL.revokeObjectURL(url);
                        resolve(null);
                    };
                    img.src = url;
                });
            }

            ctx.font = 'italic 24px Inter, sans-serif';
            ctx.fillStyle = '#6b7280';
            ctx.fillText('Pase digital generado por AulaEcosystem', canvas.width / 2, 1100);

            const link = document.createElement('a');
            link.download = `Pase_Aula_${student['No. Control']}.png`;
            link.href = canvas.toDataURL('image/png');
            link.click();

        } catch (err) {
            console.error(err);
            toast('Error generando la imagen.', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    if (!student) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[100dvh] p-4 bg-theme-base relative overflow-hidden animate-fade-in">
                <div className="absolute inset-0 bg-gradient-to-b from-theme-accent2-600/[0.06] to-transparent pointer-events-none" />
                
                <div className="w-full max-w-md z-10 relative">
                    <div className="text-center mb-8">
                        <div className="inline-flex p-4 bg-theme-card/80 backdrop-blur-xl rounded-full mb-4 border border-theme-border shadow-lg">
                            <span className="material-icons-round text-5xl text-theme-accent2-400">badge</span>
                        </div>
                        <h1 className="text-3xl font-bold text-theme-text mb-2">Generar Credencial</h1>
                        <p className="text-theme-muted">{isDbLoading ? 'Cargando base de datos de alumnos...' : 'Ingresa tu Número de Control para continuar'}</p>
                    </div>

                    <Card className="border-theme-border bg-theme-card/80 backdrop-blur-xl shadow-2xl">
                        {isDbLoading ? (
                            <div className="p-6 space-y-5 animate-pulse">
                                <div className="space-y-3">
                                    <div className="h-12 w-full bg-theme-border rounded-xl" />
                                    <div className="h-3 w-3/4 mx-auto bg-theme-border rounded-full" />
                                </div>
                                <div className="h-12 w-full bg-theme-border rounded-xl" />
                            </div>
                        ) : (
                            <form onSubmit={handleSearch} className="p-6 space-y-4">
                                <div className="space-y-2">
                                    <label htmlFor="student-search" className="sr-only">Buscar alumno por ID</label>
                                    <Input
                                        id="student-search"
                                        type="text"
                                        placeholder="Ej. 24309060760447"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="text-lg text-center font-mono tracking-widest"
                                        autoFocus
                                        aria-describedby={error ? 'student-search-error' : undefined}
                                        aria-invalid={!!error}
                                    />
                                    {error && <p id="student-search-error" className="text-red-400 text-sm text-center animate-pulse">{error}</p>}
                                </div>
                                <Button type="submit" className="w-full bg-theme-accent2-600 hover:bg-theme-accent2-700 text-theme-text shadow-emerald-900/50">
                                    Buscar Alumno
                                </Button>
                            </form>
                        )}
                    </Card>
                </div>
            </div>
        );
    }

    const fullName = `${student['Nombre(s)']} ${student['Apellido Paterno']} ${student['Apellido Materno']}`;
    const getQrValue = () => {
        const params = new URLSearchParams({
            No: fullName,
            ID: student['No. Control'] || '',
            Gr: student.Grupo || '',
            Es: student.Carrera || '',
            V: qrVersion
        });
        return params.toString();
    };

    return (
        <div className="min-h-[100dvh] bg-theme-base p-4 pb-24 sm:py-12 flex flex-col items-center animate-fade-in relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-b from-theme-accent2-600/[0.05] to-transparent pointer-events-none" />
            
            <div className="w-full max-w-md flex justify-between items-center mb-6 z-10">
                <h1 className="text-2xl font-bold text-theme-text tracking-tight flex items-center gap-2">
                    <img src={`${import.meta.env.BASE_URL}logo.png`} alt="AulaEcosystem" className="w-7 h-7" />
                    AulaPass
                </h1>
                <Button variant="ghost" size="sm" onClick={clearIdentity} className="text-theme-muted hover:text-red-400">
                    <span className="material-icons-round text-lg mr-1">logout</span>
                    Cerrar
                </Button>
            </div>

            <div
                ref={credentialRef}
                className={`w-full max-w-md rounded-3xl overflow-hidden shadow-2xl border ${getCareerColors(student.Carrera)} bg-theme-card/90 backdrop-blur-md relative z-10`}
            >
                {/* Header Color Band */}
                <div className={`h-32 bg-gradient-to-br ${getCareerColors(student.Carrera)} flex items-center justify-center relative overflow-hidden`}>
                    <div className="absolute inset-0 bg-black/20" />
                    <div className="absolute -right-4 -bottom-4 w-32 h-32 opacity-20 rotate-12 mix-blend-overlay">
                        <img src={`${import.meta.env.BASE_URL}logo.png`} alt="" className="w-full h-full object-contain filter grayscale invert" />
                    </div>
                    <h2 className="text-3xl font-black text-theme-text z-10 tracking-widest drop-shadow-md uppercase opacity-90">STUDENT</h2>
                </div>

                {/* Student Info */}
                <div className="px-6 pt-6 pb-2 text-center relative">
                    <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-24 h-24 bg-theme-card rounded-full border-4 border-theme-border flex items-center justify-center shadow-lg">
                        <span className="material-icons-round text-5xl text-theme-muted">person</span>
                    </div>

                    <div className="mt-12 mb-6 space-y-1">
                        <h3 className="text-xl sm:text-2xl font-bold text-theme-text leading-tight">
                            {fullName}
                        </h3>
                        <p className="text-theme-accent1-400 font-mono tracking-widest font-semibold">{student['No. Control']}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-6 text-sm text-left">
                        <div className="bg-theme-card/50 p-3 rounded-xl border border-theme-border">
                            <span className="block text-theme-muted/80 text-xs uppercase mb-1">Carrera</span>
                            <span className="text-theme-text font-medium capitalize block truncate">{student.Carrera}</span>
                        </div>
                        <div className="bg-theme-card/50 p-3 rounded-xl border border-theme-border">
                            <span className="block text-theme-muted/80 text-xs uppercase mb-1">Grupo</span>
                            <span className="text-theme-text font-medium block truncate">{student.Grupo}</span>
                        </div>
                    </div>
                    <div className="mb-4">
                        <LiveClock />
                    </div>
                </div>

                {/* QR Code Section */}
                <div className="bg-white p-6 pb-8 mx-4 mb-6 rounded-2xl flex flex-col items-center justify-center shadow-inner relative">
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-1 bg-gray-300 rounded-full" />
                    <QRCode
                        id="qr-code-svg"
                        value={getQrValue()}
                        size={220}
                        level="M"
                        className="h-auto max-w-full w-full"
                        viewBox={`0 0 256 256`}
                    />
                    <p className="text-theme-muted text-xs text-center mt-4 uppercase tracking-widest font-semibold">
                        Escanear para asistencia
                    </p>
                </div>
            </div>

            <div className="w-full max-w-md mt-6 z-10">
                <Button
                    variant="outline"
                    className="w-full bg-theme-card/80 backdrop-blur-lg hover:bg-[#1f2229] h-14 text-theme-text text-lg rounded-2xl border-theme-border hover:border-theme-accent1-500/50"
                    onClick={downloadPNG}
                    disabled={isLoading}
                >
                    {isLoading ? (
                        <span className="animate-spin material-icons-round mr-2">refresh</span>
                    ) : (
                        <span className="material-icons-round mr-2 text-theme-accent1-400">download</span>
                    )}
                    {isLoading ? 'Generando...' : 'Descargar Pase'}
                </Button>
            </div>

            <Modal isOpen={showLogoutModal} onClose={() => setShowLogoutModal(false)} title="Cerrar Sesión">
                <div className="space-y-4">
                    <p className="text-theme-muted">
                        ¿Estás seguro de que deseas cerrar sesión? Tendrás que buscar tu número de control nuevamente.
                    </p>
                    <div className="flex justify-end gap-3 pt-2">
                        <Button variant="outline" onClick={() => setShowLogoutModal(false)}>
                            Cancelar
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={() => {
                                setStudent(null);
                                setSearchQuery('');
                                setShowLogoutModal(false);
                            }}
                        >
                            Cerrar Sesión
                        </Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
