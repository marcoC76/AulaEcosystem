import { useState, useEffect, useRef } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import PinGuard from './PinGuard';
import { cn } from '../../lib/utils';
import { getConfig } from '../../lib/dataService';
import { heroEntrance } from '../../lib/animations';
import { ReloadPrompt } from '../ui/ReloadPrompt';
import { ThemeSelector } from '../ui/ThemeSelector';

export default function ConsultaLayout() {
    const location = useLocation();
    const [pin, setPin] = useState<string | null>(null);
    const [encoderPin, setEncoderPin] = useState<string | null>(null);
    const navigate = useNavigate();
    const navbarRef = useRef<HTMLElement>(null);
    const outletRef = useRef<HTMLDivElement>(null);
    const prevPathRef = useRef(location.pathname);

    useEffect(() => {
        getConfig().then(cfg => {
            setPin(cfg.consulta_pin);
            setEncoderPin(cfg.encoder_pin);
        });
    }, []);

    useEffect(() => {
        if (navbarRef.current) {
            const logo = navbarRef.current.querySelector<HTMLElement>('.nav-logo');
            const items = navbarRef.current.querySelectorAll<HTMLElement>('.nav-item');
            if (logo && items.length) {
                const tl = heroEntrance(logo, items[0], items[0]);
                tl.pause();
                tl.seek(tl.duration);
            }
        }
    }, []);

    useEffect(() => {
        if (outletRef.current && prevPathRef.current !== location.pathname) {
            const el = outletRef.current.firstElementChild as HTMLElement | null;
            if (el) {
                el.style.opacity = '0';
                el.style.transform = 'translateY(16px)';
                requestAnimationFrame(() => {
                    el.style.transition = 'none';
                    el.style.opacity = '1';
                    el.style.transform = 'translateY(0)';
                });
            }
            prevPathRef.current = location.pathname;
        }
    }, [location.pathname]);

    if (pin === null) {
        return (
            <div className="flex items-center justify-center min-h-[100dvh] bg-theme-base">
                <div className="flex flex-col items-center gap-4 animate-pulse">
                    <span className="material-icons-round text-theme-accent3-500 text-5xl">sync</span>
                    <span className="text-theme-muted text-sm">Cargando configuración...</span>
                </div>
            </div>
        );
    }

    return (
        <PinGuard
            authKey="consulta_auth"
            correctPin={pin}
            extraPins={encoderPin ? [{ pin: encoderPin, onMatch: () => navigate('/tools/encoder') }] : []}
            title="Acceso de Consulta"
            themeColor="purple"
            description="Ingresa el PIN de acceso para ver los reportes."
        >
            <ReloadPrompt />
            <ThemeSelector />
            <div className="flex flex-col min-h-[100dvh] bg-theme-base text-theme-text relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-b from-theme-accent3-600/[0.06] to-transparent pointer-events-none" />

                <header ref={navbarRef} className="hidden sm:flex items-center justify-between px-8 py-4 bg-theme-card/80 backdrop-blur-xl border-b border-theme-border shadow-md sticky top-0 z-40">
                    <div className="flex items-center gap-3">
                        <img src={`${import.meta.env.BASE_URL}logo.png`} alt="AulaEcosystem" className="nav-logo w-8 h-8 rounded-md" />
                        <span className="font-bold tracking-tight text-xl">AulaConsulta</span>
                    </div>
                    <nav className="flex gap-2">
                        <Link
                            to="/consulta/report"
                            className={cn(
                                "nav-item flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all duration-200 active:scale-95",
                                location.pathname.startsWith('/consulta/report')
                                    ? "bg-theme-accent3-600 text-white shadow-md shadow-purple-900/40"
                                    : "text-theme-muted hover:text-theme-text hover:bg-theme-muted/10"
                            )}
                        >
                            <span className="material-icons-round text-xl">bar_chart</span>
                            Reportes
                        </Link>
                        <button
                            onClick={(e) => {
                                e.preventDefault();
                                localStorage.removeItem('consulta_auth');
                                navigate('/');
                            }}
                            className="nav-item ml-4 flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-theme-muted hover:text-theme-text hover:bg-theme-muted/10 transition-all duration-200 active:scale-95"
                        >
                            <span className="material-icons-round text-xl">logout</span>
                            Salir
                        </button>
                    </nav>
                </header>

                <main id="main-content" className="flex-1 overflow-x-hidden pb-16 sm:pb-0">
                    <div ref={outletRef} key={location.pathname}>
                        <Outlet />
                    </div>
                </main>

                <nav className="sm:hidden fixed bottom-0 left-0 right-0 z-50 bg-theme-card/80 backdrop-blur-xl border-t border-theme-border pb-safe">
                    <div className="flex justify-around items-center h-16 px-2">
                        <Link
                            to="/consulta/report"
                            aria-label="Ver reportes"
                            className={cn(
                                "flex flex-col items-center justify-center w-full h-full gap-1 transition-colors duration-200 active:scale-95",
                                location.pathname.startsWith('/consulta/report') ? "text-theme-accent3-500" : "text-theme-muted/80 hover:text-gray-300"
                            )}
                        >
                            <span className={cn(
                                "material-icons-round transition-transform duration-200",
                                location.pathname.startsWith('/consulta/report') ? "text-2xl scale-110" : "text-xl"
                            )}>
                                bar_chart
                            </span>
                            <span className="text-[10px] font-medium">Reportes</span>
                        </Link>
                        <button
                            aria-label="Cerrar sesión"
                            onClick={(e) => {
                                e.preventDefault();
                                localStorage.removeItem('consulta_auth');
                                navigate('/');
                            }}
                            className="flex flex-col items-center justify-center w-full h-full gap-1 text-theme-muted/80 hover:text-gray-300 transition-colors duration-200 active:scale-95"
                        >
                            <span className="material-icons-round text-xl">logout</span>
                            <span className="text-[10px] font-medium">Salir</span>
                        </button>
                    </div>
                </nav>

            </div>
        </PinGuard>
    );
}
