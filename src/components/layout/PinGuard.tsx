import { useState, useEffect, useRef, type ReactNode } from 'react';
import { Button } from '../ui/Button';
import { useAnimatedMount } from '../../hooks/useAnimatedMount';
import { shakeElement } from '../../lib/animations';
import feedback from '../../lib/feedback';

interface PinGuardProps {
    children: ReactNode;
    authKey: string;
    correctPin: string;
    extraPins?: { pin: string, onMatch: () => void }[];
    title: string;
    description?: string;
    themeColor?: 'blue' | 'purple';
}

export default function PinGuard({
    children,
    authKey,
    correctPin,
    extraPins = [],
    title,
    description = "Ingresa tu PIN de seguridad para continuar.",
    themeColor = 'blue'
}: PinGuardProps) {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [pin, setPin] = useState('');
    const [error, setError] = useState('');
    const formRef = useAnimatedMount<HTMLDivElement>({
        selector: '.pin-stagger',
        fromY: 24,
        staggerDelay: 80,
        startDelay: 100,
        scale: [0.97, 1],
        enabled: !isAuthenticated,
    });
    const inputRef = useRef<HTMLInputElement>(null);
    const errorRef = useRef<HTMLParagraphElement>(null);

    useEffect(() => {
        const auth = localStorage.getItem(authKey);
        if (auth === 'true') {
            setIsAuthenticated(true);
        }
    }, [authKey]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        const match = extraPins.find(ep => ep.pin === pin);
        if (match) {
            match.onMatch();
            return;
        }

        if (pin === correctPin) {
            localStorage.setItem(authKey, 'true');
            feedback.heavy('success');
            setIsAuthenticated(true);
        } else {
            setError('PIN incorrecto. Intenta de nuevo.');
            setPin('');
            feedback.heavy('error');
            if (inputRef.current) {
                shakeElement(inputRef.current);
            }
            if (errorRef.current) {
                shakeElement(errorRef.current);
            }
        }
    };

    if (isAuthenticated) {
        return <>{children}</>;
    }

    const isBlue = themeColor === 'blue';
    const btnColor = isBlue ? "bg-theme-accent1-600 hover:bg-theme-accent1-700" : "bg-theme-accent3-600 hover:bg-theme-accent3-700";
    const focusRing = isBlue ? "focus:border-theme-accent1-500 text-theme-text" : "focus:border-theme-accent3-500 text-theme-text";
    const glowColor = isBlue ? "rgba(59,130,246,0.5)" : "rgba(168,85,247,0.5)";

    return (
        <div className="flex flex-col items-center justify-center min-h-[100dvh] p-4 bg-theme-base overflow-hidden relative">
            <div className="absolute inset-0 bg-gradient-to-b from-theme-accent1-600/[0.06] to-transparent pointer-events-none" />

            <div ref={formRef} className="w-full max-w-[400px] z-10">
                <div className="bg-theme-card/80 backdrop-blur-xl rounded-[2rem] shadow-[var(--shadow-card)] overflow-hidden relative">
                    <div className="absolute top-0 inset-x-0 flex justify-center">
                        <div
                            className={`w-32 h-1.5 rounded-b-md pin-stagger ${isBlue ? 'bg-theme-accent1-500' : 'bg-theme-accent3-500'}`}
                            style={{ boxShadow: `0 4px 15px ${glowColor}` }}
                        ></div>
                    </div>

                    <div className="px-8 pt-12 pb-10">
                        <div className="text-center mb-8">
                            <h1 className="pin-stagger text-2xl font-bold text-theme-text mb-2">{title}</h1>
                            <p className="pin-stagger text-sm text-theme-muted">{description}</p>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="space-y-2 text-left">
                                <label htmlFor="pin-input" className="pin-stagger text-xs font-semibold text-theme-muted/80 uppercase tracking-widest ml-1">PIN DE ACCESO</label>
                                <input
                                    ref={inputRef}
                                    id="pin-input"
                                    type="password"
                                    autoComplete="one-time-code"
                                    placeholder="••••••"
                                    value={pin}
                                    onChange={(e) => {
                                        setPin(e.target.value);
                                        setError('');
                                    }}
                                    aria-invalid={!!error}
                                    aria-describedby={error ? 'pin-error' : undefined}
                                    className={`pin-stagger w-full px-5 py-4 bg-theme-base/50 border border-theme-border rounded-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-theme-accent1-500 ${focusRing} transition-all duration-300 text-center text-2xl tracking-[0.5em] placeholder:text-theme-muted/50`}
                                    autoFocus
                                />
                                {error && <p ref={errorRef} id="pin-error" className="text-sm font-medium text-red-500 text-center mt-2" role="alert">{error}</p>}
                            </div>

                            <Button
                                type="submit"
                                className={`pin-stagger w-full py-6 text-lg font-bold rounded-2xl transition-all duration-300 transform active:scale-[0.98] ${btnColor} border-0 mt-8 text-white shadow-lg`}
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
