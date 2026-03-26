import { useState, useEffect } from 'react';

export function InstallPWA() {
    const [supportsPWA, setSupportsPWA] = useState(false);
    const [promptInstall, setPromptInstall] = useState<any>(null);
    const [isDismissed, setIsDismissed] = useState(false);

    useEffect(() => {
        // Revisa si ya fue descartado
        const dismissed = localStorage.getItem('pwa_install_dismissed');
        if (dismissed === 'true') {
            setIsDismissed(true);
        }

        const handler = (e: Event) => {
            e.preventDefault();
            console.log("Install prompt activado");
            setSupportsPWA(true);
            setPromptInstall(e);
        };

        window.addEventListener('beforeinstallprompt', handler);

        return () => window.removeEventListener('beforeinstallprompt', handler);
    }, []);

    const onClickInstall = async () => {
        if (!promptInstall) return;
        
        promptInstall.prompt();
        const { outcome } = await promptInstall.userChoice;
        
        if (outcome === 'accepted') {
            console.log('El usuario aceptó instalar la PWA');
            setSupportsPWA(false); // Ocultar después de instalar
        } else {
            console.log('El usuario rechazó la instalación');
        }
    };

    const onDismiss = () => {
        setIsDismissed(true);
        localStorage.setItem('pwa_install_dismissed', 'true');
    };

    if (!supportsPWA || isDismissed) {
        return null; // No mostrar si no es soportado o fue descartado
    }

    return (
        <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:w-80 bg-[#16181D]/90 backdrop-blur-xl border border-white/10 shadow-2xl rounded-2xl p-4 z-50 animate-fade-in-up">
            <div className="flex items-start gap-4">
                <div className="bg-emerald-500/10 p-2 rounded-xl border border-emerald-500/20 shrink-0">
                    <span className="material-icons-round text-emerald-400 text-2xl">install_mobile</span>
                </div>
                <div className="flex-1">
                    <h3 className="text-white font-bold text-sm mb-1">Instalar AulaEcosystem</h3>
                    <p className="text-gray-400 text-xs mb-3">Obtén acceso rápido desde tu pantalla de inicio y mejor rendimiento.</p>
                    <div className="flex gap-2">
                        <button 
                            onClick={onClickInstall}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-4 py-2 rounded-lg transition-colors flex-1"
                        >
                            Instalar
                        </button>
                        <button 
                            onClick={onDismiss}
                            className="bg-white/5 hover:bg-white/10 text-gray-300 text-xs font-semibold px-4 py-2 rounded-lg transition-colors border border-white/5"
                        >
                            Ahora no
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
