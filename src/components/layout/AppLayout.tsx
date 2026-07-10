import { useState, useEffect, useRef } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import PinGuard from './PinGuard';
import { cn } from '../../lib/utils';
import { getConfig } from '../../lib/dataService';
import { ReloadPrompt } from '../ui/ReloadPrompt';

interface NavItem {
    name: string;
    path: string;
    icon: string;
}

interface AppLayoutProps {
    authKey: string;
    title: string;
    description?: string;
    themeColor: 'blue' | 'purple';
    brandName: string;
    navItems: NavItem[];
    pinConfigKey: 'teacher_pin' | 'consulta_pin';
}

export default function AppLayout({
    authKey,
    title,
    description,
    themeColor,
    brandName,
    navItems,
    pinConfigKey,
}: AppLayoutProps) {
    const location = useLocation();
    const [pin, setPin] = useState<string | null>(null);
    const [encoderPin, setEncoderPin] = useState<string | null>(null);
    const navigate = useNavigate();
    const navbarRef = useRef<HTMLElement>(null);
    const desktopNavRef = useRef<HTMLElement>(null);
    const desktopIndicatorRef = useRef<HTMLDivElement>(null);
    const mobileNavRef = useRef<HTMLDivElement>(null);
    const mobileIndicatorRef = useRef<HTMLDivElement>(null);
    const isBlue = themeColor === 'blue';

    function updateDesktopIndicator() {
        if (!desktopIndicatorRef.current || !desktopNavRef.current) return;
        const activeItem = desktopNavRef.current.querySelector('.nav-indicator-target.active') as HTMLElement | null;
        if (!activeItem) {
            desktopIndicatorRef.current.style.opacity = '0';
            return;
        }
        const navRect = desktopNavRef.current.getBoundingClientRect();
        const itemRect = activeItem.getBoundingClientRect();
        desktopIndicatorRef.current.style.transform = `translateX(${itemRect.left - navRect.left}px)`;
        desktopIndicatorRef.current.style.width = `${itemRect.width}px`;
        desktopIndicatorRef.current.style.opacity = '1';
    }

    function updateMobileIndicator() {
        if (!mobileIndicatorRef.current || !mobileNavRef.current) return;
        const activeItem = mobileNavRef.current.querySelector('.nav-indicator-target.active') as HTMLElement | null;
        if (!activeItem) {
            mobileIndicatorRef.current.style.opacity = '0';
            return;
        }
        const navRect = mobileNavRef.current.getBoundingClientRect();
        const itemRect = activeItem.getBoundingClientRect();
        const dotSize = 8;
        const offset = (itemRect.width - dotSize) / 2;
        mobileIndicatorRef.current.style.transform = `translateX(${itemRect.left - navRect.left + offset}px)`;
        mobileIndicatorRef.current.style.opacity = '1';
    }

    useEffect(() => {
        getConfig().then(cfg => {
            setPin(cfg[pinConfigKey] as string);
            setEncoderPin(cfg.encoder_pin);
        });
    }, [pinConfigKey]);

    useEffect(() => {
        updateDesktopIndicator();
        updateMobileIndicator();
    }, [location.pathname]);

    useEffect(() => {
        if (!desktopNavRef.current) return;
        const observer = new ResizeObserver(() => {
            updateDesktopIndicator();
            updateMobileIndicator();
        });
        observer.observe(desktopNavRef.current);
        return () => observer.disconnect();
    }, []);

    if (pin === null) {
        return (
            <div className="flex items-center justify-center min-h-[100dvh] bg-theme-base">
                <div className="flex flex-col items-center gap-4 animate-pulse">
                    <span className={cn(
                        "material-icons-round text-5xl",
                        isBlue ? "text-theme-accent1-500" : "text-theme-accent3-500"
                    )}>
                        sync
                    </span>
                    <span className="text-theme-muted text-sm">Cargando configuración...</span>
                </div>
            </div>
        );
    }

    return (
        <PinGuard
            authKey={authKey}
            correctPin={pin}
            extraPins={encoderPin ? [{ pin: encoderPin, onMatch: () => navigate('/tools/encoder') }] : []}
            title={title}
            themeColor={themeColor}
            description={description}
        >
            <ReloadPrompt />
            <div className="flex flex-col min-h-[100dvh] bg-theme-base text-theme-text relative overflow-hidden">
                <div className={cn(
                    "absolute inset-0 bg-gradient-to-b to-transparent pointer-events-none",
                    isBlue ? "from-theme-accent1-600/[0.06]" : "from-theme-accent3-600/[0.06]"
                )} />

                <header ref={navbarRef} className="hidden sm:flex items-center justify-between px-8 py-4 bg-theme-card/80 backdrop-blur-xl border-b border-theme-border shadow-md sticky top-0 z-40">
                    <div className="flex items-center gap-3">
                        <img src={`${import.meta.env.BASE_URL}logo.png`} alt="AulaEcosystem" className="nav-logo w-8 h-8 rounded-md" />
                        <span className="font-bold tracking-tight text-xl">{brandName}</span>
                    </div>
                    <nav ref={desktopNavRef} className="flex gap-2 relative">
                        {navItems.map((item) => {
                            const isActive = location.pathname.startsWith(item.path);
                            return (
                                <Link
                                    key={item.path}
                                    to={item.path}
                                    className={cn(
                                        "nav-item nav-indicator-target flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all duration-200 active:scale-95",
                                        isActive && "active",
                                        isActive
                                            ? cn(
                                                "text-white shadow-md",
                                                isBlue
                                                    ? "bg-theme-accent1-600 shadow-blue-900/40"
                                                    : "bg-theme-accent3-600 shadow-purple-900/40"
                                            )
                                            : "text-theme-muted hover:text-theme-text hover:bg-theme-muted/10"
                                    )}
                                >
                                    <span className="material-icons-round text-xl">{item.icon}</span>
                                    {item.name}
                                </Link>
                            )
                        })}
                        <button
                            onClick={(e) => {
                                e.preventDefault();
                                localStorage.removeItem(authKey);
                                navigate('/');
                            }}
                            className="nav-item ml-4 flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-theme-muted hover:text-theme-text hover:bg-theme-muted/10 transition-all duration-200 active:scale-95"
                        >
                            <span className="material-icons-round text-xl">logout</span>
                            Salir
                        </button>
                        <div
                            ref={desktopIndicatorRef}
                            className="absolute bottom-0 h-[3px] rounded-full pointer-events-none"
                            style={{
                                transform: 'translateX(0)',
                                width: 0,
                                opacity: 0,
                                backgroundColor: isBlue ? 'var(--theme-accent1-500)' : 'var(--theme-accent3-500)',
                                transition: 'transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1), width 0.3s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.3s ease',
                            }}
                        />
                    </nav>
                </header>

                <main id="main-content" className="flex-1 overflow-x-hidden pb-16 sm:pb-0">
                    <Outlet />
                </main>

                <nav className="sm:hidden fixed bottom-0 left-0 right-0 z-50 bg-theme-card/80 backdrop-blur-xl border-t border-theme-border pb-safe">
                    <div ref={mobileNavRef} className="flex justify-around items-center h-16 px-2 relative">
                        {navItems.map((item) => {
                            const isActive = location.pathname.startsWith(item.path);
                            return (
                                <Link
                                    key={item.path}
                                    to={item.path}
                                    aria-label={item.name === 'Escaner' ? 'Escanear asistencia' : 'Ver reportes'}
                                    className={cn(
                                        "nav-indicator-target flex flex-col items-center justify-center w-full h-full gap-1 transition-colors duration-200 active:animate-nav-bounce",
                                        isActive && "active",
                                        isActive
                                            ? isBlue ? "text-theme-accent1-500" : "text-theme-accent3-500"
                                            : "text-theme-muted/80 hover:text-gray-300"
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
                        <button
                            aria-label="Cerrar sesión"
                            onClick={(e) => {
                                e.preventDefault();
                                localStorage.removeItem(authKey);
                                navigate('/');
                            }}
                            className="flex flex-col items-center justify-center w-full h-full gap-1 text-theme-muted/80 hover:text-gray-300 transition-colors duration-200 active:animate-nav-bounce"
                        >
                            <span className="material-icons-round text-xl">logout</span>
                            <span className="text-[10px] font-medium">Salir</span>
                        </button>
                        <div
                            ref={mobileIndicatorRef}
                            className="absolute bottom-1 w-2 h-2 rounded-full pointer-events-none"
                            style={{
                                transform: 'translateX(0)',
                                opacity: 0,
                                backgroundColor: isBlue ? 'var(--theme-accent1-500)' : 'var(--theme-accent3-500)',
                                transition: 'transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.3s ease',
                            }}
                        />
                    </div>
                </nav>

            </div>
        </PinGuard>
    );
}
