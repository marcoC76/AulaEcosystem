import { useState, useEffect } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import PinGuard from './PinGuard';
import { cn } from '../../lib/utils';
import { getConfig } from '../../lib/dataService';

export default function TeacherLayout() {
    const location = useLocation();
    const [pin, setPin] = useState<string | null>(null);
    const [encoderPin, setEncoderPin] = useState<string | null>(null);
    const navigate = useNavigate();

    useEffect(() => {
        getConfig().then(cfg => {
            setPin(cfg.teacher_pin);
            setEncoderPin(cfg.encoder_pin);
        });
    }, []);

    const navItems = [
        { name: 'Escanear', path: '/teacher/scan', icon: 'qr_code_scanner' },
        { name: 'Reportes', path: '/teacher/report', icon: 'bar_chart' },
    ];

    // Mostrar loading mientras se carga el PIN del config remoto
    if (pin === null) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-theme-base">
                <div className="flex flex-col items-center gap-4 animate-pulse">
                    <span className="material-icons-round text-theme-accent1-500 text-5xl">sync</span>
                    <span className="text-theme-muted text-sm">Cargando configuración...</span>
                </div>
            </div>
        );
    }

    return (
        <PinGuard
            authKey="teacher_auth"
            correctPin={pin}
            extraPins={encoderPin ? [{ pin: encoderPin, onMatch: () => navigate('/tools/encoder') }] : []}
            title="Acceso Docente"
            themeColor="blue"
        >
            <div className="flex flex-col min-h-screen bg-theme-base text-theme-text relative overflow-hidden">
                {/* Ambient Background Glows */}
                <div className="absolute top-[10%] left-[-10%] w-[40rem] h-[40rem] bg-theme-accent1-600/10 rounded-full blur-[120px] pointer-events-none" />
                <div className="absolute bottom-[10%] right-[-10%] w-[40rem] h-[40rem] bg-theme-accent1-600/10 rounded-full blur-[120px] pointer-events-none" />

                {/* Desktop Top Navbar */}
                <header className="hidden sm:flex items-center justify-between px-8 py-4 bg-theme-card/80 backdrop-blur-xl border-b border-theme-border shadow-md sticky top-0 z-40">
                    <div className="flex items-center gap-3">
                        <img src={`${import.meta.env.BASE_URL}logo.png`} alt="Logo" className="w-8 h-8 rounded-md" />
                        <span className="font-bold tracking-tight text-xl">AulaDocente</span>
                    </div>
                    <nav className="flex gap-2">
                        {navItems.map((item) => {
                            const isActive = location.pathname.startsWith(item.path);
                            return (
                                <Link
                                    key={item.path}
                                    to={item.path}
                                    className={cn(
                                        "flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all duration-200",
                                        isActive
                                            ? "bg-theme-accent1-600 text-white shadow-md shadow-blue-900/40"
                                            : "text-theme-muted hover:text-theme-text hover:bg-theme-muted/10"
                                    )}
                                >
                                    <span className="material-icons-round text-xl">{item.icon}</span>
                                    {item.name}
                                </Link>
                            )
                        })}
                        <Link
                            to="/"
                            onClick={() => localStorage.removeItem('teacher_auth')}
                            className="ml-4 flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-theme-muted hover:text-theme-text hover:bg-theme-muted/10 transition-all duration-200"
                        >
                            <span className="material-icons-round text-xl">logout</span>
                            Salir
                        </Link>
                    </nav>
                </header>

                {/* Main Content Area */}
                <main className="flex-1 overflow-x-hidden pb-16 sm:pb-0">
                    <Outlet />
                </main>

                {/* Mobile Bottom Navbar */}
                <nav className="sm:hidden fixed bottom-0 left-0 right-0 z-50 bg-theme-card/80 backdrop-blur-xl border-t border-theme-border pb-safe">
                    <div className="flex justify-around items-center h-16 px-2">
                        {navItems.map((item) => {
                            const isActive = location.pathname.startsWith(item.path);
                            return (
                                <Link
                                    key={item.path}
                                    to={item.path}
                                    className={cn(
                                        "flex flex-col items-center justify-center w-full h-full gap-1 transition-colors duration-200",
                                        isActive ? "text-theme-accent1-500" : "text-theme-muted/80 hover:text-gray-300"
                                    )}
                                >
                                    <span className={cn(
                                        "material-icons-round transition-transform duration-200",
                                        isActive ? "text-2xl scale-110" : "text-xl"
                                    )}>
                                        {item.icon}
                                    </span>
                                    <span className="text-[10px] font-medium">{item.name}</span>
                                </Link>
                            )
                        })}
                        <Link
                            to="/"
                            onClick={() => localStorage.removeItem('teacher_auth')}
                            className="flex flex-col items-center justify-center w-full h-full gap-1 text-theme-muted/80 hover:text-gray-300 transition-colors duration-200"
                        >
                            <span className="material-icons-round text-xl">logout</span>
                            <span className="text-[10px] font-medium">Salir</span>
                        </Link>
                    </div>
                </nav>

            </div>
        </PinGuard>
    );
}
