// @ts-ignore
import { useRegisterSW } from 'virtual:pwa-register/react';

export function ReloadPrompt() {
    const {
        offlineReady: [offlineReady, setOfflineReady],
        needRefresh: [needRefresh, setNeedRefresh],
        updateServiceWorker,
    } = useRegisterSW({
        onRegistered(r: any) {
            console.log('SW Registered:', r);
        },
        onRegisterError(error: any) {
            console.log('SW Registration error', error);
        },
    });

    const close = () => {
        setOfflineReady(false);
        setNeedRefresh(false);
    };

    if (!offlineReady && !needRefresh) {
        return null;
    }

    return (
        <div className="fixed bottom-0 left-0 right-0 p-4 z-[9999] pointer-events-none flex justify-center">
            <div className="bg-theme-card/95 backdrop-blur-xl border border-theme-accent1-500/50 shadow-2xl rounded-2xl p-4 md:p-5 w-full max-w-sm pointer-events-auto flex flex-col gap-3 animate-fade-in-up">
                <div className="flex items-start gap-3">
                    <div className="shrink-0 w-10 h-10 rounded-full bg-theme-accent1-500/20 flex items-center justify-center">
                        <span className="material-icons-round text-theme-accent1-400">
                            {needRefresh ? 'system_update' : 'offline_pin'}
                        </span>
                    </div>
                    <div>
                        <h3 className="text-white font-bold text-base leading-tight">
                            {needRefresh ? 'Nueva actualización disponible' : 'App lista para uso offline'}
                        </h3>
                        <p className="text-theme-muted text-sm mt-1">
                            {needRefresh 
                                ? 'Hemos publicado mejoras en el sistema. Toca descargar para aplicar los cambios.' 
                                : 'Todo el sistema está descargado y funcionando sin internet.'}
                        </p>
                    </div>
                </div>

                <div className="flex gap-2 w-full mt-2">
                    {needRefresh && (
                        <button
                            className="flex-1 bg-theme-accent1-500 hover:bg-theme-accent1-600 text-white font-semibold py-2 px-4 rounded-xl transition-all shadow-lg active:scale-95"
                            onClick={() => updateServiceWorker(true)}
                        >
                            Descargar Ahora
                        </button>
                    )}
                    <button
                        className="flex-1 bg-theme-base/50 hover:bg-white/10 text-theme-muted font-medium py-2 px-4 rounded-xl border border-theme-border transition-all active:scale-95"
                        onClick={() => close()}
                    >
                        Cerrar
                    </button>
                </div>
            </div>
        </div>
    );
}
