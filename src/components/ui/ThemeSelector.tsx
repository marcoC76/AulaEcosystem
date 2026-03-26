import { useEffect, useState, useRef } from 'react';

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
    const popupRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const savedTheme = (localStorage.getItem('app_theme') as Theme) || 'dark';
        setTheme(savedTheme);
        document.documentElement.setAttribute('data-theme', savedTheme);
        
        const handleClickOutside = (event: MouseEvent) => {
            if (popupRef.current && !popupRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleThemeChange = (newTheme: Theme) => {
        setTheme(newTheme);
        localStorage.setItem('app_theme', newTheme);
        document.documentElement.setAttribute('data-theme', newTheme);
        setIsOpen(false);
    };

    return (
        <div ref={popupRef} className="fixed top-4 right-4 z-50">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-10 h-10 rounded-full bg-theme-card border border-theme-border flex items-center justify-center shadow-lg hover:scale-110 transition-transform focus:outline-none"
                aria-label="Seleccionar tema"
            >
                <span className="material-icons-round text-theme-text opacity-80">palette</span>
            </button>

            {isOpen && (
                <div className="absolute top-12 right-0 mt-2 w-48 bg-theme-card/95 backdrop-blur-xl border border-theme-border rounded-2xl shadow-2xl overflow-hidden animate-fade-in-up">
                    <div className="p-3 space-y-1">
                        <p className="text-[10px] uppercase tracking-widest text-theme-muted font-bold mb-2 ml-2">Temas Visuales</p>
                        {themes.map(t => (
                            <button
                                key={t.id}
                                onClick={() => handleThemeChange(t.id)}
                                className={`w-full flex items-center gap-3 px-3 py-2 text-sm rounded-xl transition-colors ${theme === t.id ? 'bg-theme-accent1/20 text-theme-accent1-500 font-semibold' : 'text-theme-text hover:bg-theme-border/50'}`}
                            >
                                <div className="w-5 h-5 rounded-full flex items-center justify-center" style={{ backgroundColor: t.color, border: '1px solid rgba(255,255,255,0.2)' }}>
                                    {theme === t.id && <span className="material-icons-round text-[12px] text-white mix-blend-difference">check</span>}
                                </div>
                                <span className="material-icons-round text-lg opacity-80">{t.icon}</span>
                                {t.label}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
