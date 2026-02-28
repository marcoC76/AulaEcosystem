import { Routes, Route } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import TeacherLayout from './components/layout/TeacherLayout';
import AulaPass from './pages/student/AulaPass';
import AulaScan from './pages/teacher/AulaScan';
import AulaLook from './pages/teacher/AulaLook';

function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/student" element={<AulaPass />} />

      <Route path="/teacher" element={<TeacherLayout />}>
        {/* We can redirect /teacher to /teacher/scan if needed, but for now we rely on explicit links */}
        <Route path="scan" element={<AulaScan />} />
        <Route path="report" element={<AulaLook />} />
      </Route>
    </Routes>
  );
}

export default App;
