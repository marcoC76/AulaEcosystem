import { useCallback, useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { driver } from 'driver.js';
import 'driver.js/dist/driver.css';
import type { DriveStep } from 'driver.js';
import { cn } from '../../lib/utils';

const TOUR_KEY_PREFIX = 'tour_seen_v1_';

function elementExists(element: string | Element | (() => Element | undefined) | undefined): boolean {
    if (typeof element !== 'string') return true;
    return document.querySelector(element) !== null;
}

function getVisibleSteps(steps: DriveStep[]): DriveStep[] {
    return steps.filter(s => elementExists(s.element));
}

const icons: Record<string, string> = {
    badge: '\u{1F4CB}',
    credit_card: '\u{1F0CF}',
    download: '\u{1F4E5}',
    school: '\u{1F3EB}',
    menu_book: '\u{1F4DA}',
    calendar_month: '\u{1F4C5}',
    qr_code_scanner: '\u{1F4F7}',
    search: '\u{1F50D}',
    tune: '\u{2699}\u{FE0F}',
    dashboard: '\u{1F4CA}',
    file_download: '\u{1F4E4}',
    visibility: '\u{1F441}\u{FE0F}',
};

function d(title: string, desc: string, icon: string): string {
    const emoji = icons[icon] ?? '\u{2753}';
    return `<div class="tour-step">
<span class="tour-step-emoji">${emoji}</span>
<div><strong class="tour-step-title">${title}</strong><span class="tour-step-desc">${desc}</span></div>
</div>`;
}

const studentTour: DriveStep[] = [
    {
        element: '#student-search',
        popover: {
            title: 'Paso 1: Buscar tu número de control',
            description: d('Buscar', 'Escribe tu número de control completo para generar tu credencial con código QR.', 'badge'),
            side: 'bottom',
            align: 'center',
        },
    },
    {
        element: '#student-card',
        popover: {
            title: 'Paso 2: Tu credencial digital',
            description: d('Credencial', 'Aquí aparecerá tu pase con tu información, avatar y código QR único para registrar asistencia.', 'credit_card'),
            side: 'top',
            align: 'center',
        },
    },
    {
        element: '#download-section',
        popover: {
            title: 'Paso 3: Descargar o imprimir',
            description: d('Exportar', 'Puedes cambiar entre tema oscuro/claro, imprimir tu credencial, o descargarla como PNG o PDF.', 'download'),
            side: 'top',
            align: 'center',
        },
    },
];

const teacherScanTour: DriveStep[] = [
    {
        element: '#teacher-select',
        popover: {
            title: 'Paso 1: Seleccionar docente',
            description: d('Docente', 'Elige tu nombre de la lista para iniciar la sesión de escaneo.', 'school'),
            side: 'bottom',
            align: 'center',
        },
    },
    {
        element: '#subject-select',
        popover: {
            title: 'Paso 2: Elegir materia',
            description: d('Materia', 'Selecciona la materia que estás impartiendo en este momento.', 'menu_book'),
            side: 'bottom',
            align: 'center',
        },
    },
    {
        element: '#parcial-select',
        popover: {
            title: 'Paso 3: Período',
            description: d('Parcial', 'Selecciona el parcial. Se auto-selecciona según la fecha actual.', 'calendar_month'),
            side: 'bottom',
            align: 'center',
        },
    },
    {
        element: '#qr-reader',
        popover: {
            title: 'Paso 4: Escáner QR',
            description: d('Escanear', 'Apunta la cámara al código QR del alumno para registrar su asistencia al instante.', 'qr_code_scanner'),
            side: 'top',
            align: 'center',
        },
    },
    {
        element: '#manual-search',
        popover: {
            title: 'Paso 5: Búsqueda manual',
            description: d('Buscar', 'Si el QR no funciona, puedes buscar al alumno por nombre o número de control.', 'search'),
            side: 'top',
            align: 'center',
        },
    },
];

const teacherReportTour: DriveStep[] = [
    {
        element: '#report-filters',
        popover: {
            title: 'Paso 1: Filtros de reporte',
            description: d('Filtros', 'Selecciona profesor, materia y grupos para generar el reporte de asistencia.', 'tune'),
            side: 'bottom',
            align: 'center',
        },
    },
    {
        element: '#dashboard-report-content',
        popover: {
            title: 'Paso 2: Resultados y estadísticas',
            description: d('Dashboard', 'Aquí verás la tabla de asistencia con KPIs, gráficas y el detalle por alumno.', 'dashboard'),
            side: 'top',
            align: 'center',
        },
    },
    {
        element: '#export-actions',
        popover: {
            title: 'Paso 3: Exportar datos',
            description: d('Exportar', 'Descarga los reportes en CSV, PDF o genera el PDF Sábana con todas las fechas.', 'file_download'),
            side: 'left',
            align: 'center',
        },
    },
];

const consultaReportTour: DriveStep[] = [
    {
        element: '#report-filters',
        popover: {
            title: 'Paso 1: Filtros de consulta',
            description: d('Filtros', 'Selecciona los filtros para visualizar el reporte de asistencia en modo solo lectura.', 'tune'),
            side: 'bottom',
            align: 'center',
        },
    },
    {
        element: '#dashboard-report-content',
        popover: {
            title: 'Paso 2: Resultados',
            description: d('Dashboard', 'Visualiza la información de asistencia. En este modo no puedes editar ni justificar faltas.', 'visibility'),
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

const tourLabels: Record<string, string> = {
    '/student': 'Pase estudiantil',
    '/teacher/scan': 'Escáner de asistencia',
    '/teacher/report': 'Reportes',
    '/consulta/report': 'Consulta',
};

export default function Tour() {
    const location = useLocation();
    const allSteps = tourMap[location.pathname];
    const label = tourLabels[location.pathname] ?? '';
    const [showHint, setShowHint] = useState(false);

    useEffect(() => {
        if (!allSteps || allSteps.length === 0) return;
        const key = TOUR_KEY_PREFIX + location.pathname;
        const seen = localStorage.getItem(key);
        if (!seen) {
            const timer = setTimeout(() => setShowHint(true), 2000);
            const dismiss = () => setShowHint(false);
            document.addEventListener('click', dismiss, { once: true });
            return () => {
                clearTimeout(timer);
                document.removeEventListener('click', dismiss);
            };
        }
    }, [location.pathname, allSteps]);

    const handleClick = useCallback(() => {
        const steps = getVisibleSteps(allSteps);
        if (!steps || steps.length === 0) return;
        const key = TOUR_KEY_PREFIX + location.pathname;
        localStorage.setItem(key, '1');
        setShowHint(false);
        const tour = driver({
            steps,
            animate: true,
            showProgress: true,
            showButtons: ['next', 'previous', 'close'],
            progressText: '{{current}} de {{total}}',
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
    }, [location.pathname, allSteps]);

    if (!allSteps || allSteps.length === 0) return null;

    return (
        <div className="tour-root">
            {showHint && (
                <div
                    className={cn(
                        "tour-hint fixed sm:bottom-36 bottom-28 right-4 z-[9997]",
                        "flex items-center gap-2 px-4 py-2.5 rounded-2xl",
                        "bg-theme-card/90 backdrop-blur-xl border border-theme-border",
                        "shadow-xl text-sm text-theme-text",
                        "animate-fade-in-up cursor-pointer select-none",
                        "hover:bg-theme-card transition-colors duration-200"
                    )}
                    onClick={handleClick}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleClick(); }}
                >
                    <span className="tour-hint-icon">?</span>
                    <span>Tour: <strong>{label}</strong></span>
                    <span className="text-theme-muted ml-1">{'\u{276F}'}</span>
                </div>
            )}
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
                <span className="text-xl">{'\u{2753}'}</span>
            </button>
        </div>
    );
}
