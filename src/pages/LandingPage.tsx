import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { heroEntrance, cardsEntrance } from '../lib/animations';

export default function LandingPage() {
  const heroRef = useRef<HTMLDivElement>(null);
  const cardsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!heroRef.current || !cardsRef.current) return;

    const logo = heroRef.current.querySelector<HTMLElement>('.hero-logo');
    const title = heroRef.current.querySelector<HTMLElement>('.hero-title');
    const subtitle = heroRef.current.querySelector<HTMLElement>('.hero-subtitle');
    const cards = cardsRef.current.querySelectorAll<HTMLElement>('.entrance-card');

    if (logo && title && subtitle) {
      heroEntrance(logo, title, subtitle);
    }
    if (cards.length) {
      cardsEntrance(cards);
    }
  }, []);

  return (
    <div className="flex flex-col items-center justify-center min-h-[100dvh] p-4 py-12 bg-theme-base overflow-x-hidden relative">
      <div className="absolute inset-0 bg-gradient-to-b from-theme-accent1-600/[0.08] to-transparent pointer-events-none" />

      <div className="w-full max-w-5xl flex flex-col items-center z-10">
        <div ref={heroRef} className="text-center mb-16 max-w-lg">
          <div className="hero-logo inline-flex items-center justify-center w-24 h-24 p-2 bg-theme-card/80 backdrop-blur-md rounded-3xl shadow-2xl mb-8">
            <img src={`${import.meta.env.BASE_URL}logo.png`} alt="AulaEcosystem Logo" className="w-full h-full object-contain filter drop-shadow-md" />
          </div>
          <h1 className="hero-title text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-theme-text mb-4 drop-shadow-sm text-balance">
            AulaEcosystem
          </h1>
          <p className="hero-subtitle text-lg sm:text-xl text-theme-muted font-medium max-w-md mx-auto leading-relaxed">
            Sistema Inteligente de Control Escolar y Asistencia Digital
          </p>
        </div>

        <div ref={cardsRef} className="grid grid-cols-1 md:grid-cols-5 gap-6 w-full px-4 md:px-0">
          <Link
            to="/teacher/scan"
            className="entrance-card group relative flex flex-col items-start justify-center p-8 md:col-span-3 bg-theme-card/80 backdrop-blur-xl rounded-[2.5rem] transition-all duration-300 shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-card-hover)] hover:-translate-y-2 active:scale-[0.98] overflow-hidden"
          >
            <div className="absolute -right-12 -top-12 w-40 h-40 rounded-full bg-theme-accent1-500/10 blur-3xl pointer-events-none" />
            <div className="w-16 h-16 rounded-2xl bg-theme-accent1-500/10 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-500">
              <span className="material-icons-round text-3xl text-theme-accent1-400">admin_panel_settings</span>
            </div>
            <h2 className="text-2xl md:text-3xl font-bold text-theme-text mb-2">Docente</h2>
            <p className="text-theme-muted text-sm md:text-base font-medium leading-relaxed max-w-md">
              Registra y gestiona asistencia, justifica faltas en tiempo real
            </p>
          </Link>

          <div className="flex flex-col gap-6 md:col-span-2">
            <Link
              to="/student"
              className="entrance-card group relative flex items-center gap-5 p-6 bg-theme-card/80 backdrop-blur-xl rounded-[2rem] transition-all duration-300 shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-card-hover)] hover:-translate-y-2 active:scale-[0.98] overflow-hidden"
            >
              <div className="w-14 h-14 rounded-2xl bg-theme-accent2-500/10 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform duration-500">
                <span className="material-icons-round text-2xl text-theme-accent2-400">badge</span>
              </div>
              <div>
                <h2 className="text-xl font-bold text-theme-text">Alumno</h2>
                <p className="text-theme-muted text-sm leading-relaxed">
                  Genera tu pase digital QR
                </p>
              </div>
            </Link>

            <Link
              to="/consulta/report"
              className="entrance-card group relative flex items-center gap-5 p-6 bg-theme-card/80 backdrop-blur-xl rounded-[2rem] transition-all duration-300 shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-card-hover)] hover:-translate-y-2 active:scale-[0.98] overflow-hidden"
            >
              <div className="w-14 h-14 rounded-2xl bg-theme-accent3-500/10 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform duration-500">
                <span className="material-icons-round text-2xl text-theme-accent3-400">search</span>
              </div>
              <div>
                <h2 className="text-xl font-bold text-theme-text">Consulta</h2>
                <p className="text-theme-muted text-sm leading-relaxed">
                  Visualiza y exporta reportes
                </p>
              </div>
            </Link>
          </div>
        </div>
      </div>

      <div className="mt-12 mb-6 text-center text-theme-muted/70 text-xs sm:text-sm z-10 font-medium tracking-wide">
        AulaEcosystem v2.0.0 &copy; {new Date().getFullYear()}
      </div>
    </div>
  );
}
