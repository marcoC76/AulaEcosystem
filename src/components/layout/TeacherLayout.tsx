import { Outlet, Link, useLocation } from 'react-router-dom';
import PinGuard from './PinGuard';
import { cn } from '../../lib/utils';
import { TEACHER_PIN } from '../../lib/constants';

export default function TeacherLayout() {
    const location = useLocation();

    const navItems = [
        { name: 'Escanear', path: '/teacher/scan', icon: 'qr_code_scanner' },
        { name: 'Reportes', path: '/teacher/report', icon: 'bar_chart' },
    ];

    return (
        <PinGuard
            authKey="teacher_auth"
            correctPin={TEACHER_PIN}
            title="Acceso Docente"
            themeColor="blue"
        >
            <div className="flex flex-col min-h-screen bg-gray-900 text-white">

                {/* Desktop Top Navbar */}
                <header className="hidden sm:flex items-center justify-between px-8 py-4 bg-gray-850 border-b border-gray-800 shadow-md sticky top-0 z-40">
                    <div className="flex items-center gap-3">
                        <span className="material-icons-round text-blue-500 text-3xl">admin_panel_settings</span>
                        <span className="font-bold tracking-tight text-xl">AulaDocente</span>
                    </div>
                    <nav className="flex gap-2">
                        {navItems.map((item) => {
                            const isActive = location.pathname.startsWith(item.path);
                            return (
                                <Link
                                    key={item.path}
                                    to={item.path}
                                    className={cn(
                                        "flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all duration-200",
                                        isActive
                                            ? "bg-blue-600 text-white shadow-md shadow-blue-900/40"
                                            : "text-gray-400 hover:text-white hover:bg-gray-800"
                                    )}
                                >
                                    <span className="material-icons-round text-xl">{item.icon}</span>
                                    {item.name}
                                </Link>
                            )
                        })}
                        <Link
                            to="/"
                            onClick={() => localStorage.removeItem('teacher_auth')}
                            className="ml-4 flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-gray-400 hover:text-white hover:bg-gray-800 transition-all duration-200"
                        >
                            <span className="material-icons-round text-xl">logout</span>
                            Salir
                        </Link>
                    </nav>
                </header>

                {/* Main Content Area */}
                <main className="flex-1 overflow-x-hidden pb-16 sm:pb-0">
                    <Outlet />
                </main>

                {/* Mobile Bottom Navbar */}
                <nav className="sm:hidden fixed bottom-0 left-0 right-0 z-50 bg-gray-850 border-t border-gray-800 pb-safe">
                    <div className="flex justify-around items-center h-16 px-2">
                        {navItems.map((item) => {
                            const isActive = location.pathname.startsWith(item.path);
                            return (
                                <Link
                                    key={item.path}
                                    to={item.path}
                                    className={cn(
                                        "flex flex-col items-center justify-center w-full h-full gap-1 transition-colors duration-200",
                                        isActive ? "text-blue-500" : "text-gray-500 hover:text-gray-300"
                                    )}
                                >
                                    <span className={cn(
                                        "material-icons-round transition-transform duration-200",
                                        isActive ? "text-2xl scale-110" : "text-xl"
                                    )}>
                                        {item.icon}
                                    </span>
                                    <span className="text-[10px] font-medium">{item.name}</span>
                                </Link>
                            )
                        })}
                        <Link
                            to="/"
                            onClick={() => localStorage.removeItem('teacher_auth')}
                            className="flex flex-col items-center justify-center w-full h-full gap-1 text-gray-500 hover:text-gray-300 transition-colors duration-200"
                        >
                            <span className="material-icons-round text-xl">logout</span>
                            <span className="text-[10px] font-medium">Salir</span>
                        </Link>
                    </div>
                </nav>

            </div>
        </PinGuard>
    );
}
