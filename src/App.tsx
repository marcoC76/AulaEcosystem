import { Routes, Route } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import TeacherLayout from './components/layout/TeacherLayout';
import AulaPass from './pages/student/AulaPass';
import AulaScan from './pages/teacher/AulaScan';
import AulaLook from './pages/teacher/AulaLook';
import ConsultaLayout from './components/layout/ConsultaLayout';
import PinEncoder from './pages/tools/PinEncoder';

function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/student" element={<AulaPass />} />

      <Route path="/teacher" element={<TeacherLayout />}>
        <Route path="scan" element={<AulaScan />} />
        <Route path="report" element={<AulaLook role="teacher" />} />
      </Route>

      <Route path="/consulta" element={<ConsultaLayout />}>
        <Route path="report" element={<AulaLook role="consulta" />} />
      </Route>

      {/* Herramienta oculta para codificar PINs */}
      <Route path="/tools/encoder" element={<PinEncoder />} />
    </Routes>
  );
}

export default App;
