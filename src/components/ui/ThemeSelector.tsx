import { useEffect, useState, useRef } from 'react';
import { animate } from 'animejs';
import { spring } from 'animejs/easings';

type Theme = 'dark' | 'light' | 'sunset' | 'ocean';

const themes: { id: Theme; label: string; icon: string; color: string }[] = [
    { id: 'dark', label: 'Dark Mode', icon: 'dark_mode', color: '#0F1115' },
    { id: 'light', label: 'Light Mode', icon: 'light_mode', color: '#F8FAFC' },
    { id: 'sunset', label: 'Sunset', icon: 'wb_twilight', color: '#2D1B19' },
    { id: 'ocean', label: 'Ocean', icon: 'water_drop', color: '#0B192C' },
];

export function ThemeSelector() {
    const [theme, setTheme] = useState<Theme>('dark');
    const [isOpen, setIsOpen] = useState(false);
    const [shouldRender, setShouldRender] = useState(false);
    const popupRef = useRef<HTMLDivElement>(null);
    const toggleRef = useRef<HTMLButtonElement>(null);
    const listRef = useRef<HTMLDivElement>(null);
    const iconRef = useRef<HTMLSpanElement>(null);

    useEffect(() => {
        const savedTheme = (localStorage.getItem('app_theme') as Theme) || 'dark';
        setTheme(savedTheme);
        document.documentElement.setAttribute('data-theme', savedTheme);
    }, []);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent | TouchEvent) => {
            if (popupRef.current && !popupRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
            document.addEventListener('touchstart', handleClickOutside);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('touchstart', handleClickOutside);
        };
    }, [isOpen]);

    useEffect(() => {
        if (isOpen) {
            setShouldRender(true);
            requestAnimationFrame(() => {
                if (iconRef.current) {
                    animate(iconRef.current, {
                        rotate: [0, 90],
                        duration: 400,
                        ease: spring({ mass: 1, stiffness: 120, damping: 14 }),
                    });
                }
                if (listRef.current) {
                    animate(listRef.current, {
                        translateY: [8, 0],
                        opacity: [0, 1],
                        scale: [0.95, 1],
                        duration: 300,
                        ease: spring({ mass: 1, stiffness: 150, damping: 15 }),
                    });
                }
                listRef.current?.querySelector<HTMLButtonElement>('[aria-checked="true"]')?.focus();
            })
        } else {
            if (iconRef.current) {
                animate(iconRef.current, {
                    rotate: [90, 0],
                    duration: 300,
                    ease: 'outQuad',
                });
            }
            if (listRef.current) {
                animate(listRef.current, {
                    translateY: [0, 8],
                    opacity: [1, 0],
                    scale: [1, 0.95],
                    duration: 200,
                    ease: 'outQuad',
                    complete: () => setShouldRender(false),
                });
            } else {
                const timer = setTimeout(() => setShouldRender(false), 200);
                return () => clearTimeout(timer);
            }
        }
    }, [isOpen]);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Escape') {
            setIsOpen(false)
            toggleRef.current?.focus()
        }
    }

    const handleThemeChange = (newTheme: Theme) => {
        setTheme(newTheme);
        localStorage.setItem('app_theme', newTheme);
        document.documentElement.setAttribute('data-theme', newTheme);
        setIsOpen(false);
        toggleRef.current?.focus()
    };

    return (
        <div ref={popupRef} className="fixed top-4 right-4 z-50">
            <button
                ref={toggleRef}
                onClick={() => setIsOpen(!isOpen)}
                className="w-11 h-11 rounded-full bg-theme-card border border-theme-border flex items-center justify-center shadow-lg hover:scale-110 transition-transform focus:outline-none focus-visible:ring-2 focus-visible:ring-theme-accent1-500"
                aria-label="Seleccionar tema"
                aria-expanded={isOpen}
                aria-haspopup="menu"
            >
                <span ref={iconRef} className="material-icons-round text-theme-text opacity-80">palette</span>
            </button>

            {shouldRender && (
                <div
                    ref={listRef}
                    role="menu"
                    aria-label="Temas visuales"
                    onKeyDown={handleKeyDown}
                    className="absolute top-12 right-0 mt-2 w-48 bg-theme-card/95 backdrop-blur-xl border border-theme-border rounded-2xl shadow-2xl overflow-hidden"
                >
                    <div className="p-3 space-y-1">
                        <p className="text-[10px] uppercase tracking-widest text-theme-muted font-bold mb-2 ml-2">Temas Visuales</p>
                        {themes.map(t => (
                            <button
                                key={t.id}
                                role="menuitemradio"
                                aria-checked={theme === t.id}
                                onClick={() => handleThemeChange(t.id)}
                                className={`w-full flex items-center gap-3 px-3 py-2 text-sm rounded-xl transition-colors min-h-[44px] ${theme === t.id ? 'bg-theme-accent1/20 text-theme-accent1-500 font-semibold' : 'text-theme-text hover:bg-theme-border/50'}`}
                            >
                                <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: t.color, border: '1px solid rgba(255,255,255,0.2)' }}>
                                    {theme === t.id && <span className="material-icons-round text-[12px] text-white mix-blend-difference">check</span>}
                                </div>
                                <span className="material-icons-round text-lg opacity-80 shrink-0">{t.icon}</span>
                                {t.label}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
