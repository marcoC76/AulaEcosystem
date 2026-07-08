import { lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import TeacherLayout from './components/layout/TeacherLayout';
import AulaPass from './pages/student/AulaPass';
import ConsultaLayout from './components/layout/ConsultaLayout';
import ErrorBoundary from './components/ui/ErrorBoundary';
import { InstallPWA } from './components/ui/InstallPWA';
import { ThemeSelector } from './components/ui/ThemeSelector';
import { ReloadPrompt } from './components/ui/ReloadPrompt';
import { ToastProvider } from './components/ui/Toast';

const AulaScan = lazy(() => import('./pages/teacher/AulaScan'));
const AulaLook = lazy(() => import('./pages/teacher/AulaLook'));
const PinEncoder = lazy(() => import('./pages/tools/PinEncoder'));

function App() {
  return (
    <ToastProvider>
      <ThemeSelector />
      <ReloadPrompt />
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
      </Routes>
      </Suspense>
      </ErrorBoundary>
      <InstallPWA />
    </ToastProvider>
  );
}

export default App;
