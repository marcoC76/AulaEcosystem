import { useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { driver } from 'driver.js';
import 'driver.js/dist/driver.css';
import type { DriveStep } from 'driver.js';
import { cn } from '../../lib/utils';

const studentTour: DriveStep[] = [
    {
        element: '#student-search',
        popover: {
            title: 'Buscar tu número de control',
            description: 'Escribe aquí tu número de control completo para generar tu credencial con código QR.',
            side: 'bottom',
            align: 'center',
        },
    },
    {
        element: '#student-card',
        popover: {
            title: 'Tu credencial digital',
            description: 'Aquí aparecerá tu pase con tu información, avatar y código QR único para registrar asistencia.',
            side: 'top',
            align: 'center',
        },
    },
    {
        element: '#download-section',
        popover: {
            title: 'Descargar o imprimir',
            description: 'Puedes cambiar entre tema oscuro/claro, imprimir tu credencial, o descargarla como PNG o PDF.',
            side: 'top',
            align: 'center',
        },
    },
];

const teacherScanTour: DriveStep[] = [
    {
        element: '#teacher-select',
        popover: {
            title: 'Seleccionar docente',
            description: 'Elige tu nombre de la lista para iniciar la sesión de escaneo.',
            side: 'bottom',
            align: 'center',
        },
    },
    {
        element: '#subject-select',
        popover: {
            title: 'Elegir materia',
            description: 'Selecciona la materia que estás impartiendo en este momento.',
            side: 'bottom',
            align: 'center',
        },
    },
    {
        element: '#parcial-select',
        popover: {
            title: 'Periodo',
            description: 'Selecciona el parcial. Se auto-selecciona según la fecha actual.',
            side: 'bottom',
            align: 'center',
        },
    },
    {
        element: '#qr-reader',
        popover: {
            title: 'Escáner QR',
            description: 'Apunta la cámara al código QR del alumno para registrar su asistencia al instante.',
            side: 'top',
            align: 'center',
        },
    },
    {
        element: '#manual-search',
        popover: {
            title: 'Búsqueda manual',
            description: 'Si el QR no funciona, puedes buscar al alumno por nombre o número de control.',
            side: 'top',
            align: 'center',
        },
    },
];

const teacherReportTour: DriveStep[] = [
    {
        element: '#report-filters',
        popover: {
            title: 'Filtros de reporte',
            description: 'Selecciona profesor, materia y grupos para generar el reporte de asistencia.',
            side: 'bottom',
            align: 'center',
        },
    },
    {
        element: '#dashboard-report-content',
        popover: {
            title: 'Resultados y estadísticas',
            description: 'Aquí verás la tabla de asistencia con KPIs, gráficas y el detalle por alumno.',
            side: 'top',
            align: 'center',
        },
    },
    {
        element: '#export-actions',
        popover: {
            title: 'Exportar datos',
            description: 'Descarga los reportes en CSV, PDF o genera el PDF Sábana con todas las fechas.',
            side: 'left',
            align: 'center',
        },
    },
];

const consultaReportTour: DriveStep[] = [
    {
        element: '#report-filters',
        popover: {
            title: 'Filtros de consulta',
            description: 'Selecciona los filtros para visualizar el reporte de asistencia en modo solo lectura.',
            side: 'bottom',
            align: 'center',
        },
    },
    {
        element: '#dashboard-report-content',
        popover: {
            title: 'Resultados',
            description: 'Visualiza la información de asistencia. En este modo no puedes editar ni justificar faltas.',
            side: 'top',
            align: 'center',
        },
    },
];

const tourMap: Record<string, DriveStep[]> = {
    '/student': studentTour,
    '/teacher/scan': teacherScanTour,
    '/teacher/report': teacherReportTour,
    '/consulta/report': consultaReportTour,
};

export default function Tour() {
    const location = useLocation();
    const steps = tourMap[location.pathname];

    const handleClick = useCallback(() => {
        const steps = tourMap[location.pathname];
        if (!steps || steps.length === 0) return;
        const tour = driver({
            steps,
            animate: true,
            showProgress: true,
            showButtons: ['next', 'previous', 'close'],
            progressText: 'Paso {{current}} de {{total}}',
            nextBtnText: 'Siguiente',
            prevBtnText: 'Anterior',
            doneBtnText: 'Finalizar',
            overlayColor: '#0F1115',
            overlayOpacity: 0.7,
            stagePadding: 8,
            stageRadius: 12,
            popoverClass: 'driver-popover-custom',
        });
        tour.drive();
    }, [location.pathname]);

    if (!steps || steps.length === 0) return null;

    return (
        <button
            onClick={handleClick}
            className={cn(
                "tour-fab fixed sm:bottom-20 bottom-36 right-4 z-[9998] w-12 h-12 rounded-full shadow-2xl",
                "flex items-center justify-center text-lg font-bold",
                "bg-theme-accent1-600 text-white hover:bg-theme-accent1-700 active:scale-90",
                "transition-all duration-200 border border-white/10 backdrop-blur-md",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-theme-accent1-500/50"
            )}
            aria-label="Ayuda: tutorial interactivo"
            title="Ayuda"
        >
            <span className="material-icons-round text-2xl">help</span>
        </button>
    );
}
