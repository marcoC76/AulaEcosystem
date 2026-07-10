import AppLayout from './AppLayout';

export default function TeacherLayout() {
    return (
        <AppLayout
            authKey="teacher_auth"
            title="Acceso Docente"
            themeColor="blue"
            brandName="AulaDocente"
            pinConfigKey="teacher_pin"
            navItems={[
                { name: 'Escanear', path: '/teacher/scan', icon: 'qr_code_scanner' },
                { name: 'Reportes', path: '/teacher/report', icon: 'bar_chart' },
            ]}
        />
    );
}
