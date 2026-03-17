import { useState, useEffect, type ReactNode } from 'react';
import { Button } from '../ui/Button';

interface PinGuardProps {
    children: ReactNode;
    authKey: string;
    correctPin: string;
    title: string;
    description?: string;
    themeColor?: 'blue' | 'purple';
}

export default function PinGuard({
    children,
    authKey,
    correctPin,
    title,
    description = "Ingresa tu PIN de seguridad para continuar.",
    themeColor = 'blue'
}: PinGuardProps) {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [pin, setPin] = useState('');
    const [error, setError] = useState('');

    useEffect(() => {
        const auth = localStorage.getItem(authKey);
        if (auth === 'true') {
            setIsAuthenticated(true);
        }
    }, [authKey]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (pin === correctPin) {
            localStorage.setItem(authKey, 'true');
            setIsAuthenticated(true);
        } else {
            setError('PIN incorrecto. Intenta de nuevo.');
            setPin('');
        }
    };

    if (isAuthenticated) {
        return <>{children}</>;
    }

    const isBlue = themeColor === 'blue';
    const bgBlur = isBlue ? "bg-blue-600/10" : "bg-purple-600/10";
    const btnColor = isBlue ? "bg-blue-600 hover:bg-blue-700" : "bg-purple-600 hover:bg-purple-700";
    const focusRing = isBlue ? "focus:border-blue-500 text-blue-100" : "focus:border-purple-500 text-purple-100";
    const glowColor = isBlue ? "rgba(59,130,246,0.5)" : "rgba(168,85,247,0.5)";

    return (
        <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-[#0F1115] overflow-hidden animate-fade-in relative">
            <div className={`absolute top-[10%] left-[-10%] w-[40rem] h-[40rem] ${bgBlur} rounded-full blur-[120px] pointer-events-none`} />
            <div className={`absolute bottom-[10%] right-[-10%] w-[40rem] h-[40rem] ${bgBlur} rounded-full blur-[120px] pointer-events-none`} />

            <div className="w-full max-w-[400px] z-10 animate-fade-in-up">
                <div className="bg-[#16181D] border border-white/5 rounded-[2rem] shadow-2xl overflow-hidden relative">
                    {/* Ribbon effect at top */}
                    <div className="absolute top-0 inset-x-0 flex justify-center">
                        <div
                            className={`w-32 h-1.5 rounded-b-md ${isBlue ? 'bg-blue-500' : 'bg-purple-500'}`}
                            style={{ boxShadow: `0 4px 15px ${glowColor}` }}
                        ></div>
                    </div>

                    <div className="px-8 pt-12 pb-10">
                        <div className="text-center mb-8">
                            <h1 className="text-2xl font-bold text-white mb-2">{title}</h1>
                            <p className="text-sm text-gray-400">{description}</p>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="space-y-2 text-left">
                                <label className="text-xs font-semibold text-gray-500 uppercase tracking-widest ml-1">PIN DE ACCESO</label>
                                <input
                                    type="password"
                                    placeholder="••••••"
                                    value={pin}
                                    onChange={(e) => {
                                        setPin(e.target.value);
                                        setError('');
                                    }}
                                    className={`w-full px-5 py-4 bg-gray-900 border border-white/10 rounded-2xl focus:outline-none focus:ring-0 ${focusRing} transition-all duration-300 text-center text-2xl tracking-[0.5em]`}
                                    autoFocus
                                />
                                {error && <p className="text-sm font-medium text-red-500 text-center animate-pulse mt-2">{error}</p>}
                            </div>

                            <Button
                                type="submit"
                                className={`w-full py-6 text-lg font-bold rounded-2xl transition-all duration-300 transform active:scale-[0.98] ${btnColor} border-0 mt-8 text-white shadow-lg`}
                                disabled={pin.length < 3}
                            >
                                Ingresar
                            </Button>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
}
