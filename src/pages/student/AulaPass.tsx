import { useState, useEffect, useRef } from 'react';
import QRCode from 'react-qr-code';
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
    const credentialRef = useRef<HTMLDivElement>(null);

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

    function generateAvatarSvgForCanvas(name: string, control: string): string {
        function hashStr(s: string): number {
            let hash = 0;
            for (let i = 0; i < s.length; i++) {
                hash = ((hash << 5) - hash) + s.charCodeAt(i);
                hash |= 0;
            }
            return Math.abs(hash);
        }
        const seed = hashStr((name || '') + String(control || ''));
        const skinColors = ['#FDE3C8', '#E8C39E', '#D4A574', '#C68642', '#8D5524', '#A0714F', '#C68642', '#E8C39E'];
        const hairColors = ['#1C1C1C', '#3B2F2F', '#5C4033', '#B5651D', '#D4A017', '#F5D06C', '#8B4513', '#4A4A4A', '#2B1B17', '#6B3A2A', '#1A1A2E', '#16213E'];
        const shirtColors = ['#E74C3C', '#3498DB', '#2ECC71', '#9B59B6', '#F39C12', '#1ABC9C', '#E67E22', '#FF6B6B', '#00CEC9', '#6C5CE7', '#FD79A8', '#0984E3'];
        const eyeColors = ['#1C1C1C', '#3B2F2F', '#4A3728', '#2C1810', '#1C1C1C', '#3B3028'];
        const mouthColors = ['#E74C3C', '#C0392B', '#FF6B6B', '#E8A0A8', '#E74C3C', '#D63031'];
        const bgColors = ['#FFEAA7', '#DFE6E9', '#B8E994', '#F8C291', '#A29BFE', '#FD79A8', '#74B9FF', '#55EFC4', '#FFEAA7', '#81ECEC', '#FAB1A0', '#DDA0DD'];
        const skinColor = skinColors[seed % skinColors.length];
        const hairColor = hairColors[(seed >> 2) % hairColors.length];
        const shirtColor = shirtColors[(seed >> 4) % shirtColors.length];
        const eyeColor = eyeColors[(seed >> 6) % eyeColors.length];
        const mouthColor = mouthColors[(seed >> 8) % mouthColors.length];
        const bgColor = bgColors[(seed >> 10) % bgColors.length];

        const hairStyle = seed % 5; const eyeStyle = (seed >> 3) % 3; const mouthStyle = (seed >> 5) % 3;
        const hat = ((seed >> 7) & 1) === 0; const blush = ((seed >> 8) & 1) === 1; const glasses = ((seed >> 9) & 1) === 0 && !hat;
        const grid: string[][] = Array.from({ length: 8 }, () => Array(8).fill(skinColor));
        const colorMap: Record<string, string> = { A: skinColor, B: hairColor, C: eyeColor, D: mouthColor, E: shirtColor, F: hairColor, G: '#F1C40F', H: '#FF6B6B' };
        if (hat) {
            for (let r = 0; r < 3; r++) for (let c = 0; c < 8; c++) grid[r][c] = 'B';
            grid[0][0] = 'A'; grid[0][7] = 'A';
        } else if (hairStyle === 0) {
            for (let c = 0; c < 8; c++) { grid[0][c] = 'B'; grid[1][c] = 'B'; }
            grid[2][0] = 'B'; grid[2][1] = 'B'; grid[2][6] = 'B'; grid[2][7] = 'B';
        } else if (hairStyle === 1) {
            for (let r = 0; r < 3; r++) for (let c = 2; c <= 5; c++) grid[r][c] = 'B';
        } else if (hairStyle === 2) {
            for (let c = 0; c < 8; c++) { grid[0][c] = 'B'; grid[1][c] = 'B'; }
            grid[2][0] = 'B'; grid[2][1] = 'B'; grid[2][6] = 'B'; grid[2][7] = 'B';
            grid[3][0] = 'B'; grid[3][7] = 'B'; grid[4][0] = 'B'; grid[4][7] = 'B';
        } else if (hairStyle === 3) {
            for (let r = 0; r < 2; r++) for (let c = 0; c < 8; c++) grid[r][c] = 'B';
            for (let c = 0; c < 8; c++) grid[2][c] = 'B';
            grid[0][2] = 'A'; grid[0][5] = 'A';
        } else {
            for (let r = 0; r < 2; r++) for (let c = 0; c < 8; c++) grid[r][c] = 'B';
            grid[2][0] = 'B'; grid[2][1] = 'B'; grid[2][2] = 'B'; grid[2][5] = 'B'; grid[2][6] = 'B'; grid[2][7] = 'B';
        }
        if (glasses) {
            grid[3][1] = 'G'; grid[3][2] = 'G'; grid[3][3] = 'G'; grid[3][4] = 'G'; grid[3][5] = 'G'; grid[3][6] = 'G';
            grid[4][2] = 'C'; grid[4][5] = 'C';
        } else if (eyeStyle === 0) { grid[3][2] = 'C'; grid[3][5] = 'C'; }
        else if (eyeStyle === 1) { for (let c = 2; c <= 5; c++) grid[3][c] = 'C'; }
        else { grid[4][2] = 'C'; grid[4][5] = 'C'; }
        if (blush) { grid[4][1] = 'H'; grid[4][6] = 'H'; }
        if (mouthStyle === 0) { grid[5][3] = 'D'; grid[5][4] = 'D'; grid[6][2] = 'D'; grid[6][5] = 'D'; }
        else if (mouthStyle === 1) { grid[5][3] = 'D'; grid[5][4] = 'D'; }
        else { grid[5][3] = 'D'; }
        for (let c = 2; c <= 5; c++) grid[6][c] = 'E';
        for (let c = 0; c < 8; c++) grid[7][c] = 'E';

        const PIXEL = 6; const SIZE = PIXEL * 8; const GAP = 0.5;
        const cells = grid.map((row, r) =>
            row.map((cell, c) => `<rect x="${c * PIXEL + GAP}" y="${r * PIXEL + GAP}" width="${PIXEL - GAP * 2}" height="${PIXEL - GAP * 2}" rx="1" fill="${colorMap[cell]}"/>`).join('')
        ).join('');
        return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${SIZE} ${SIZE}" width="120" height="120">
            <rect width="${SIZE}" height="${SIZE}" rx="12" fill="${bgColor}"/>${cells}</svg>`;
    }

    const drawAvatarOnCanvas = async (ctx: CanvasRenderingContext2D, x: number, y: number, size: number, name: string, control: string) => {
        const svgStr = generateAvatarSvgForCanvas(name, control);
        const svgBlob = new Blob([svgStr], { type: 'image/svg+xml;charset=utf-8' });
        const url = URL.createObjectURL(svgBlob);
        const img = new Image();
        await new Promise<void>((resolve) => {
            img.onload = () => { ctx.drawImage(img, x, y, size, size); URL.revokeObjectURL(url); resolve(); };
            img.onerror = () => resolve();
            img.src = url;
        });
    };

    const downloadPNG = async () => {
        if (!student) return;
        setIsLoading(true);

        try {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            if (!ctx) return;

            canvas.width = 800;
            canvas.height = 1200;

            // Background
            ctx.fillStyle = '#111827';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // Header
            const headerColor = student.Carrera.toLowerCase().includes('radiología') ? '#2563eb' :
                student.Carrera.toLowerCase().includes('enfermería') ? '#059669' : '#4b5563';
            ctx.fillStyle = headerColor;
            ctx.fillRect(0, 0, canvas.width, 180);

            // Title
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 50px Inter, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('AulaPass', canvas.width / 2, 100);

            const fullName = `${student['Nombre(s)']} ${student['Apellido Paterno']} ${student['Apellido Materno']}`;

            // Avatar
            await drawAvatarOnCanvas(ctx, (canvas.width / 2) - 60, 200, 120, fullName, student['No. Control'] || '');

            // Info
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 36px Inter, sans-serif';
            ctx.fillText(fullName.substring(0, 40), canvas.width / 2, 370);

            ctx.font = '30px Inter, sans-serif';
            ctx.fillStyle = '#9ca3af';
            ctx.fillText(`No. Control: ${student['No. Control']}`, canvas.width / 2, 430);
            ctx.fillText(`Carrera: ${student.Carrera.toUpperCase()}`, canvas.width / 2, 480);
            ctx.fillText(`Grupo: ${student.Grupo}`, canvas.width / 2, 530);

            // QR
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
                    <div className="absolute -top-14 left-1/2 -translate-x-1/2">
                        <div className="w-28 h-28 bg-theme-card rounded-full border-4 border-theme-border flex items-center justify-center shadow-lg overflow-hidden">
                            <StudentAvatar
                                name={fullName}
                                control={student['No. Control'] || ''}
                                size={100}
                            />
                        </div>
                    </div>

                    <div className="mt-16 mb-6 space-y-1">
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
                <div className="qr-frame bg-white p-6 pb-8 mx-4 mb-6 rounded-2xl flex flex-col items-center justify-center shadow-inner relative">
                    <span className="qr-corner qr-corner-tl" aria-hidden="true" />
                    <span className="qr-corner qr-corner-tr" aria-hidden="true" />
                    <span className="qr-corner qr-corner-bl" aria-hidden="true" />
                    <span className="qr-corner qr-corner-br" aria-hidden="true" />
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
