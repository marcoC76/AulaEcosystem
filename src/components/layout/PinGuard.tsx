import { useState, useEffect, type ReactNode } from 'react';
import { TEACHER_PIN } from '../../lib/constants';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';

interface PinGuardProps {
    children: ReactNode;
}

export default function PinGuard({ children }: PinGuardProps) {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [pin, setPin] = useState('');
    const [error, setError] = useState('');

    useEffect(() => {
        const auth = localStorage.getItem('teacher_auth');
        if (auth === 'true') {
            setIsAuthenticated(true);
        }
    }, []);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (pin === TEACHER_PIN) {
            localStorage.setItem('teacher_auth', 'true');
            setIsAuthenticated(true);
        } else {
            setError('PIN incorrecto. Intenta de nuevo.');
            setPin('');
        }
    };

    if (isAuthenticated) {
        return <>{children}</>;
    }

    return (
        <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-gray-900 overflow-hidden animate-fade-in">
            <div className="absolute top-[10%] left-[-10%] w-96 h-96 bg-blue-600/10 rounded-full blur-[100px] pointer-events-none" />
            <div className="absolute bottom-[10%] right-[-10%] w-96 h-96 bg-purple-600/10 rounded-full blur-[100px] pointer-events-none" />

            <Card className="w-full max-w-sm z-10 shadow-2xl animate-fade-in-up border-gray-700">
                <CardHeader className="text-center pb-2">
                    <div className="mx-auto bg-gray-800 p-3 rounded-full mb-4 inline-flex shadow-inner">
                        <span className="material-icons-round text-4xl text-blue-500">lock</span>
                    </div>
                    <CardTitle>Acceso Docente</CardTitle>
                    <CardDescription>Ingresa tu PIN de seguridad para continuar.</CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4 mt-2">
                        <div className="space-y-2">
                            <Input
                                type="password"
                                placeholder="PIN numérico"
                                value={pin}
                                onChange={(e) => {
                                    setPin(e.target.value);
                                    setError('');
                                }}
                                className="text-center text-xl tracking-widest"
                                autoFocus
                            />
                            {error && <p className="text-sm font-medium text-red-500 text-center animate-pulse">{error}</p>}
                        </div>
                        <Button type="submit" className="w-full" disabled={pin.length < 3}>
                            Ingresar
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
