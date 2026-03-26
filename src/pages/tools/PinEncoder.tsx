import { useState } from 'react';

export default function PinEncoder() {
    const [input, setInput] = useState('');
    const [encoded, setEncoded] = useState('');
    const [copied, setCopied] = useState(false);

    const handleEncode = () => {
        if (input.trim()) {
            setEncoded(btoa(input.trim()));
            setCopied(false);
        }
    };

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(encoded);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {
            // Fallback para navegadores sin clipboard API
            const textarea = document.createElement('textarea');
            textarea.value = encoded;
            document.body.appendChild(textarea);
            textarea.select();
            document.execCommand('copy');
            document.body.removeChild(textarea);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-theme-base overflow-hidden relative">
            {/* Background glow */}
            <div className="absolute top-[10%] left-[-10%] w-[40rem] h-[40rem] bg-amber-600/10 rounded-full blur-[120px] pointer-events-none" />
            <div className="absolute bottom-[10%] right-[-10%] w-[40rem] h-[40rem] bg-amber-600/10 rounded-full blur-[120px] pointer-events-none" />

            <div className="w-full max-w-[440px] z-10">
                <div className="bg-theme-card border border-theme-border rounded-[2rem] shadow-2xl overflow-hidden relative">
                    {/* Ribbon */}
                    <div className="absolute top-0 inset-x-0 flex justify-center">
                        <div
                            className="w-32 h-1.5 rounded-b-md bg-amber-500"
                            style={{ boxShadow: '0 4px 15px rgba(245,158,11,0.5)' }}
                        />
                    </div>

                    <div className="px-8 pt-12 pb-10">
                        <div className="text-center mb-8">
                            <span className="material-icons-round text-amber-500 text-4xl mb-3 block">vpn_key</span>
                            <h1 className="text-2xl font-bold text-theme-text mb-2">Codificador de PINs</h1>
                            <p className="text-sm text-theme-muted">
                                Escribe un PIN, copia el valor codificado y pégalo en el JSON de configuración.
                            </p>
                        </div>

                        <div className="space-y-6">
                            {/* Input */}
                            <div className="space-y-2 text-left">
                                <label className="text-xs font-semibold text-theme-muted/80 uppercase tracking-widest ml-1">
                                    PIN ORIGINAL
                                </label>
                                <input
                                    type="text"
                                    placeholder="Ej: MiPin2026"
                                    value={input}
                                    onChange={(e) => {
                                        setInput(e.target.value);
                                        setEncoded('');
                                        setCopied(false);
                                    }}
                                    onKeyDown={(e) => e.key === 'Enter' && handleEncode()}
                                    className="w-full px-5 py-4 bg-gray-900 border border-theme-border rounded-2xl focus:outline-none focus:border-amber-500 text-theme-text transition-all duration-300 text-lg"
                                    autoFocus
                                />
                            </div>

                            {/* Encode Button */}
                            <button
                                onClick={handleEncode}
                                disabled={!input.trim()}
                                className="w-full py-4 text-lg font-bold rounded-2xl transition-all duration-300 transform active:scale-[0.98] bg-amber-600 hover:bg-amber-700 disabled:opacity-40 disabled:cursor-not-allowed border-0 text-theme-text shadow-lg"
                            >
                                Codificar
                            </button>

                            {/* Result */}
                            {encoded && (
                                <div className="space-y-3 animate-fade-in">
                                    <label className="text-xs font-semibold text-theme-muted/80 uppercase tracking-widest ml-1 block">
                                        VALOR CODIFICADO (Base64)
                                    </label>
                                    <div className="flex gap-2">
                                        <div className="flex-1 px-4 py-3 bg-gray-900 border border-amber-500/30 rounded-xl text-amber-400 font-mono text-sm break-all select-all">
                                            {encoded}
                                        </div>
                                        <button
                                            onClick={handleCopy}
                                            className={`px-4 rounded-xl border transition-all duration-300 flex items-center justify-center ${
                                                copied
                                                    ? 'bg-theme-accent2-600/20 border-theme-accent2-500 text-theme-accent2-400'
                                                    : 'bg-gray-800 border-gray-700 text-theme-muted hover:text-theme-text hover:border-gray-500'
                                            }`}
                                            title="Copiar al portapapeles"
                                        >
                                            <span className="material-icons-round text-xl">
                                                {copied ? 'check' : 'content_copy'}
                                            </span>
                                        </button>
                                    </div>
                                    {copied && (
                                        <p className="text-xs text-theme-accent2-400 text-center animate-fade-in">
                                            ¡Copiado al portapapeles!
                                        </p>
                                    )}

                                    <div className="mt-4 p-4 bg-amber-900/10 border border-amber-500/20 rounded-xl">
                                        <p className="text-xs text-amber-400/80 leading-relaxed">
                                            <span className="font-bold">Instrucciones:</span> Pega este valor en el campo
                                            <code className="mx-1 px-1.5 py-0.5 bg-gray-800 rounded text-amber-300">teacher_pin</code> o
                                            <code className="mx-1 px-1.5 py-0.5 bg-gray-800 rounded text-amber-300">consulta_pin</code>
                                            de tu archivo JSON de configuración en GitHub.
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Back link */}
                <div className="mt-6 text-center">
                    <a href="/" className="text-sm text-theme-muted/80 hover:text-gray-300 transition-colors">
                        ← Volver al inicio
                    </a>
                </div>
            </div>
        </div>
    );
}
