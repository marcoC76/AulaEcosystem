import { lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import NotFound from './pages/NotFound';
import TeacherLayout from './components/layout/TeacherLayout';
import AulaPass from './pages/student/AulaPass';
import ConsultaLayout from './components/layout/ConsultaLayout';
import ErrorBoundary from './components/ui/ErrorBoundary';
import { CookieConsent } from './components/ui/CookieConsent';
import { InstallPWA } from './components/ui/InstallPWA';
import { ToastProvider } from './components/ui/Toast';
import { ThemeSelector } from './components/ui/ThemeSelector';

const AulaScan = lazy(() => import('./pages/teacher/AulaScan'));
const AulaLook = lazy(() => import('./pages/teacher/AulaLook'));
const PinEncoder = lazy(() => import('./pages/tools/PinEncoder'));

function App() {
  return (
    <ToastProvider>
      <ErrorBoundary>
        <Suspense fallback={<div className="flex items-center justify-center min-h-[100dvh] bg-theme-base"><div className="animate-spin material-icons-round text-theme-accent1-500 text-5xl">refresh</div></div>}>
        <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/student" element={<AulaPass />} />

        <Route path="/teacher" element={<TeacherLayout />}>
          <Route path="scan" element={<AulaScan />} />
          <Route path="report" element={<AulaLook />} />
        </Route>

        <Route path="/consulta" element={<ConsultaLayout />}>
          <Route path="report" element={<AulaLook isReadOnly={true} />} />
        </Route>

        {/* Herramienta oculta para codificar PINs */}
        <Route path="/tools/encoder" element={<PinEncoder />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
      </Suspense>
      </ErrorBoundary>
      <CookieConsent />
      <InstallPWA />
      <ThemeSelector />
      <div
        className="pointer-events-none fixed inset-0 z-[60]"
        style={{
          opacity: 'var(--grain-opacity, 0.035)',
          backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' fill='transparent' filter='url(%23n)'/%3E%3C/svg%3E\")",
          backgroundRepeat: 'repeat',
          backgroundSize: '256px 256px',
        }}
        aria-hidden="true"
      />
    </ToastProvider>
  );
}

export default App;
