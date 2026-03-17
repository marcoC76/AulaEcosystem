import { Link } from 'react-router-dom';

export default function LandingPage() {
    return (
        <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-[#0F1115] overflow-hidden">
            {/* Background ambient lighting */}
            <div className="absolute top-1/4 left-1/4 w-[30rem] h-[30rem] bg-blue-600/10 rounded-full blur-[120px] pointer-events-none" />
            <div className="absolute bottom-1/4 right-1/4 w-[30rem] h-[30rem] bg-emerald-600/10 rounded-full blur-[120px] pointer-events-none" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[30rem] h-[30rem] bg-purple-600/10 rounded-full blur-[120px] pointer-events-none" />

            <div className="w-full max-w-5xl flex flex-col items-center z-10 animate-fade-in-up">
                {/* Header */}
                <div className="text-center mb-16">
                    <div className="inline-flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-md rounded-2xl border border-white/5 shadow-2xl mb-8">
                        <span className="material-icons-round text-5xl bg-gradient-to-br from-blue-400 to-emerald-400 text-transparent bg-clip-text">qr_code_scanner</span>
                    </div>
                    <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-white mb-4 drop-shadow-sm">
                        AulaEcosystem
                    </h1>
                    <p className="text-lg sm:text-xl text-gray-400 font-medium max-w-md mx-auto">
                        Sistema Inteligente de Control Escolar y Asistencia Digital
                    </p>
                </div>

                {/* Options Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 w-full px-4">
                    {/* Alumno Card */}
                    <Link
                        to="/student"
                        className="group relative flex flex-col items-center justify-center p-10 bg-[#16181D]/80 backdrop-blur-xl border border-white/5 hover:border-emerald-500/30 rounded-[2.5rem] transition-all duration-300 shadow-xl hover:shadow-2xl hover:shadow-emerald-500/10 hover:-translate-y-2 overflow-hidden"
                    >
                        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500/0 via-emerald-500 to-emerald-500/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                        <div className="w-20 h-20 rounded-2xl bg-gradient-to-b from-emerald-500/10 to-emerald-500/5 border border-emerald-500/20 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-500 shadow-inner">
                            <span className="material-icons-round text-4xl text-emerald-400">badge</span>
                        </div>
                        <h2 className="text-2xl font-bold text-white mb-3">Alumno</h2>
                        <p className="text-center text-gray-400 text-sm font-medium leading-relaxed">
                            Genera tu pase digital QR usando tu número de control
                        </p>
                    </Link>

                    {/* Docente Card */}
                    <Link
                        to="/teacher/scan"
                        className="group relative flex flex-col items-center justify-center p-10 bg-[#16181D]/80 backdrop-blur-xl border border-white/5 hover:border-blue-500/30 rounded-[2.5rem] transition-all duration-300 shadow-xl hover:shadow-2xl hover:shadow-blue-500/10 hover:-translate-y-2 overflow-hidden"
                    >
                        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500/0 via-blue-500 to-blue-500/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                        <div className="w-20 h-20 rounded-2xl bg-gradient-to-b from-blue-500/10 to-blue-500/5 border border-blue-500/20 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-500 shadow-inner">
                            <span className="material-icons-round text-4xl text-blue-400">admin_panel_settings</span>
                        </div>
                        <h2 className="text-2xl font-bold text-white mb-3">Docente</h2>
                        <p className="text-center text-gray-400 text-sm font-medium leading-relaxed">
                            Registra y gestiona asistencia, justifica faltas
                        </p>
                    </Link>

                    {/* Consulta Card */}
                    <Link
                        to="/consulta/report"
                        className="group relative flex flex-col items-center justify-center p-10 bg-[#16181D]/80 backdrop-blur-xl border border-white/5 hover:border-purple-500/30 rounded-[2.5rem] transition-all duration-300 shadow-xl hover:shadow-2xl hover:shadow-purple-500/10 hover:-translate-y-2 overflow-hidden"
                    >
                        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-500/0 via-purple-500 to-purple-500/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                        <div className="w-20 h-20 rounded-2xl bg-gradient-to-b from-purple-500/10 to-purple-500/5 border border-purple-500/20 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-500 shadow-inner">
                            <span className="material-icons-round text-4xl text-purple-400">search</span>
                        </div>
                        <h2 className="text-2xl font-bold text-white mb-3">Consulta</h2>
                        <p className="text-center text-gray-400 text-sm font-medium leading-relaxed">
                            Visualiza y exporta los reportes de asistencia
                        </p>
                    </Link>
                </div>
            </div>

            {/* Footer */}
            <div className="absolute bottom-6 text-center text-gray-500 text-xs sm:text-sm z-10 animate-fade-in opacity-80 font-medium tracking-wide">
                AulaEcosystem v1.0.0 &copy; {new Date().getFullYear()}
            </div>
        </div>
    );
}
