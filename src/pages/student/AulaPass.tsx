import { useState, useEffect, useRef } from 'react';
import QRCode from 'react-qr-code';
import domtoimage from 'dom-to-image-more';
import { jsPDF } from 'jspdf';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { LiveClock } from '../../components/ui/LiveClock';
import StudentAvatar from '../../components/ui/StudentAvatar';
import { fetchStudentsDB, getConfig } from '../../lib/dataService';
import { useLocalStorage } from '../../hooks/useLocalStorage';
import { cn } from '../../lib/utils';
import { useToast } from '../../hooks/useToast';
import feedback from '../../lib/feedback';
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
    const [placeholderIndex, setPlaceholderIndex] = useState(0);
    const [isFading, setIsFading] = useState(false);
    const cardRef = useRef<HTMLDivElement>(null);

    const EXAMPLE_IDS = [
        'Ej. 24309060760447',
        'Ej. 24309060770123',
        'Ej. 24309060758901',
        'Ej. 24309060781234',
    ];

    useEffect(() => {
        fetchStudentsDB().then(result => {
            setDb(result);
            setIsDbLoading(false);
        });
        getConfig().then(c => setQrVersion(c.qr_version || '1'));
    }, []);

    useEffect(() => {
        if (searchQuery) return;
        let fadeTimeout: ReturnType<typeof setTimeout>;
        const interval = setInterval(() => {
            setIsFading(true);
            fadeTimeout = setTimeout(() => {
                setPlaceholderIndex(prev => (prev + 1) % EXAMPLE_IDS.length);
                setIsFading(false);
            }, 200);
        }, 3000);
        return () => {
            clearInterval(interval);
            clearTimeout(fadeTimeout);
        };
    }, [searchQuery]);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        const term = searchQuery.trim().toLowerCase();
        if (!term) return;

        const found = db.find(s => {
            const studentId = s['No. Control'] || '';
            return String(studentId).trim().toLowerCase() === term;
        });
        if (found) {
            feedback.medium('success');
            setStudent(found);
        } else {
            feedback.medium('error');
            setError('Número de control no encontrado. Verifica tus datos.');
        }
    };

    const clearIdentity = () => {
        setShowLogoutModal(true);
    };

    const getCareerAccent = (career: string = '') => {
        const c = career.toLowerCase();
        if (c.includes('enfermería') || c.includes('enfermeria')) return 'bg-theme-accent2-500';
        if (c.includes('radiología') || c.includes('radiologia')) return 'bg-theme-accent1-500';
        if (c.includes('sistemas')) return 'bg-theme-accent3-500';
        return 'bg-gray-500';
    };

    const getCareerBorder = (career: string = '') => {
        const c = career.toLowerCase();
        if (c.includes('enfermería') || c.includes('enfermeria')) return 'border-theme-accent2-500/30';
        if (c.includes('radiología') || c.includes('radiologia')) return 'border-theme-accent1-500/30';
        if (c.includes('sistemas')) return 'border-theme-accent3-500/30';
        return 'border-gray-500/30';
    };

    const exportCardToCanvas = async (): Promise<HTMLCanvasElement | null> => {
        const el = cardRef.current;
        if (!el) return null;
        try {
            const cardBg = getComputedStyle(el).backgroundColor || '#1A1A20';
            return await domtoimage.toCanvas(el, {
                scale: 3,
                bgcolor: cardBg,
                ignoreCSSRuleErrors: true,
            });
        } catch (err) {
            console.error('exportCardToCanvas failed:', err);
            return null;
        }
    };

    const downloadPNG = async () => {
        if (!student) return;
        setIsLoading(true);
        try {
            const canvas = await exportCardToCanvas();
            if (!canvas) return;
            const link = document.createElement('a');
            link.download = `Pase_Aula_${student['No. Control']}.png`;
            link.href = canvas.toDataURL('image/png');
            link.click();
            toast('Pase descargado como PNG.', 'success');
        } catch (err) {
            console.error(err);
            toast('Error generando la imagen.', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const downloadPDF = async () => {
        if (!student) return;
        setIsLoading(true);
        try {
            const canvas = await exportCardToCanvas();
            if (!canvas) return;
            const imgData = canvas.toDataURL('image/jpeg', 0.95);
            const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
            const pageW = 210;
            const margin = 10;
            const imgW = pageW - margin * 2;
            const imgH = (canvas.height / canvas.width) * imgW;
            pdf.addImage(imgData, 'JPEG', margin, margin, imgW, imgH);
            pdf.save(`Pase_Aula_${student['No. Control']}.pdf`);
            toast('Pase descargado como PDF.', 'success');
        } catch (err) {
            console.error(err);
            toast('Error generando el PDF.', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const handlePrint = () => {
        window.print();
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
                        <h1 className="font-display text-3xl font-bold text-theme-text mb-2">Generar Credencial</h1>
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
                                    <label htmlFor="student-search" className="sr-only">Buscar alumno por número de control</label>
                                    <Input
                                        id="student-search"
                                        type="text"
                                        placeholder={EXAMPLE_IDS[placeholderIndex]}
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className={cn(
                                            "text-lg text-center font-mono tracking-widest",
                                            "placeholder:transition-[opacity] placeholder:duration-200",
                                            isFading && "placeholder:opacity-0"
                                        )}
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
                <h1 className="font-display text-2xl font-bold text-theme-text tracking-tight flex items-center gap-2">
                    <img src={`${import.meta.env.BASE_URL}logo.png`} alt="AulaEcosystem" className="w-7 h-7" />
                    AulaPass
                </h1>
                <Button variant="ghost" size="sm" onClick={clearIdentity} className="text-theme-muted hover:text-red-400">
                    <span className="material-icons-round text-lg mr-1">logout</span>
                    Cerrar
                </Button>
            </div>

            <div
                id="student-card"
                ref={cardRef}
                className={cn(
                    "print-area pass-card w-full max-w-md rounded-3xl overflow-hidden shadow-2xl border relative z-10 bg-theme-card text-theme-text",
                    getCareerBorder(student.Carrera)
                )}
            >
                {/* Thin career accent bar */}
                <div className={cn("h-1 w-full", getCareerAccent(student.Carrera))} />

                {/* Student Info + Avatar row */}
                <div className="px-5 pt-5 pb-4">
                    <div className="flex items-center gap-4">
                        <div className="shrink-0">
                            <div className="w-16 h-16 rounded-2xl border-2 border-theme-border flex items-center justify-center overflow-hidden shadow-md bg-theme-card/70">
                                <StudentAvatar
                                    name={fullName}
                                    control={student['No. Control'] || ''}
                                    size={56}
                                />
                            </div>
                        </div>
                        <div className="min-w-0 flex-1">
                            <h3 className="font-bold text-lg leading-tight truncate text-theme-text">
                                {fullName}
                            </h3>
                            <p className="font-mono text-sm tracking-wider font-semibold mt-0.5 text-theme-accent1-500">
                                {student['No. Control']}
                            </p>
                            <p className="text-xs mt-1 text-theme-muted">
                                {student.Carrera} <span className="mx-1 opacity-50">·</span> {student.Grupo}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Divider */}
                <div className="mx-5 h-px bg-theme-border" />

                {/* QR Code Section */}
                <div className="px-5 py-5 flex flex-col items-center">
                    <div className="relative inline-flex">
                        <QRCode
                            id="qr-code-svg"
                            value={getQrValue()}
                            size={200}
                            level="M"
                            className="h-auto max-w-[200px] w-full p-2 rounded-xl bg-white"
                            viewBox={`0 0 256 256`}
                        />
                        <div className="qr-frame absolute inset-0" aria-hidden="true">
                            <div className="qr-corner qr-corner-tl" />
                            <div className="qr-corner qr-corner-tr" />
                            <div className="qr-corner qr-corner-bl" />
                            <div className="qr-corner qr-corner-br" />
                        </div>
                    </div>
                    <p className="text-[10px] text-center mt-3 uppercase tracking-widest font-semibold text-theme-muted">
                        Escanear para asistencia
                    </p>
                    <div className="mt-3">
                        <LiveClock />
                    </div>
                </div>
            </div>

            {/* Action buttons */}
            <div className="w-full max-w-md mt-5 z-10 flex gap-2 no-print">
                <Button
                    variant="outline"
                    className="flex-1 h-12 text-sm rounded-2xl border bg-theme-card/80 border-theme-border text-theme-text"
                    onClick={handlePrint}
                    aria-label="Imprimir credencial"
                >
                    <span className="material-icons-round mr-1.5 text-lg">print</span>
                    Imprimir
                </Button>
                <Button
                    variant="outline"
                    className="flex-1 h-12 text-sm rounded-2xl border bg-theme-card/80 border-theme-border text-theme-text hover:border-theme-muted"
                    onClick={downloadPNG}
                    disabled={isLoading}
                    aria-label="Descargar como PNG"
                >
                    {isLoading ? (
                        <span className="animate-spin material-icons-round mr-1.5 text-lg">refresh</span>
                    ) : (
                        <span className="material-icons-round mr-1.5 text-lg">image</span>
                    )}
                    PNG
                </Button>
                <Button
                    variant="outline"
                    className="flex-1 h-12 text-sm rounded-2xl border bg-theme-card/80 border-theme-border text-theme-text hover:border-theme-muted"
                    onClick={downloadPDF}
                    disabled={isLoading}
                    aria-label="Descargar como PDF"
                >
                    {isLoading ? (
                        <span className="animate-spin material-icons-round mr-1.5 text-lg">refresh</span>
                    ) : (
                        <span className="material-icons-round mr-1.5 text-lg">picture_as_pdf</span>
                    )}
                    PDF
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
