import AppLayout from './AppLayout';

export default function ConsultaLayout() {
    return (
        <AppLayout
            authKey="consulta_auth"
            title="Acceso de Consulta"
            description="Ingresa el PIN de acceso para ver los reportes."
            themeColor="purple"
            brandName="AulaConsulta"
            pinConfigKey="consulta_pin"
            navItems={[
                { name: 'Reportes', path: '/consulta/report', icon: 'bar_chart' },
            ]}
        />
    );
}
