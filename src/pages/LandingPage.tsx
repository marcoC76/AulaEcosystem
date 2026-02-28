import { Link } from 'react-router-dom';

export default function LandingPage() {
    return (
        <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-gray-900 overflow-hidden">
            {/* Background decorations */}
            <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-blue-600/20 rounded-full blur-[100px] pointer-events-none" />
            <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-emerald-600/10 rounded-full blur-[100px] pointer-events-none" />

            <div className="w-full max-w-4xl flex flex-col items-center z-10 animate-fade-in-up">
                {/* Header */}
                <div className="text-center mb-12">
                    <div className="inline-flex items-center justify-center p-3 sm:p-4 bg-gray-800 rounded-2xl sm:rounded-3xl border border-gray-700 shadow-xl mb-6">
                        <span className="material-icons-round text-4xl sm:text-6xl text-blue-500">qr_code_scanner</span>
                    </div>
                    <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-white mb-4">
                        AulaEcosystem
                    </h1>
                    <p className="text-lg sm:text-xl text-gray-400 max-w-md mx-auto">
                        Sistema Inteligente de Control Escolar y Credenciales Digitales
                    </p>
                </div>

                {/* Options Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 w-full max-w-2xl px-4">
                    <Link
                        to="/student"
                        className="group flex flex-col items-center justify-center p-8 bg-gray-850 hover:bg-gray-800 border border-gray-700 hover:border-emerald-500/50 rounded-3xl transition-all duration-300 shadow-lg hover:shadow-emerald-500/10 hover:-translate-y-1"
                    >
                        <div className="w-20 h-20 rounded-full bg-gray-800 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300 shadow-inner">
                            <span className="material-icons-round text-4xl text-emerald-400">badge</span>
                        </div>
                        <h2 className="text-2xl font-semibold text-white mb-2">Soy Alumno</h2>
                        <p className="text-center text-gray-400 text-sm">
                            Genera tu pase digital para asistencia
                        </p>
                    </Link>

                    <Link
                        to="/teacher/scan"
                        className="group flex flex-col items-center justify-center p-8 bg-gray-850 hover:bg-gray-800 border border-gray-700 hover:border-blue-500/50 rounded-3xl transition-all duration-300 shadow-lg hover:shadow-blue-500/10 hover:-translate-y-1"
                    >
                        <div className="w-20 h-20 rounded-full bg-gray-800 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300 shadow-inner">
                            <span className="material-icons-round text-4xl text-blue-400">admin_panel_settings</span>
                        </div>
                        <h2 className="text-2xl font-semibold text-white mb-2">Soy Docente</h2>
                        <p className="text-center text-gray-400 text-sm">
                            Registra asistencia y consulta reportes
                        </p>
                    </Link>
                </div>
            </div>

            {/* Footer */}
            <div className="absolute bottom-6 text-center text-gray-600 text-xs sm:text-sm z-10 animate-fade-in opacity-70">
                AulaEcosystem v1.0.0 &copy; {new Date().getFullYear()}
            </div>
        </div>
    );
}
