import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { heroEntrance, cardsEntrance, floatingParticles } from '../lib/animations';
import feedback from '../lib/feedback';

export default function LandingPage() {
  const heroRef = useRef<HTMLDivElement>(null);
  const cardsRef = useRef<HTMLDivElement>(null);
  const particlesRef = useRef<HTMLDivElement>(null);

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
    if (particlesRef.current) {
      floatingParticles(particlesRef.current);
    }
  }, []);

  return (
    <div className="flex flex-col items-center justify-center min-h-[100dvh] p-4 py-12 bg-theme-base overflow-x-hidden relative">
      <div className="absolute inset-0 bg-gradient-to-b from-theme-accent1-600/[0.08] to-transparent pointer-events-none" />
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle, currentColor 1px, transparent 1px)', backgroundSize: '32px 32px', color: 'var(--theme-text)' }} />

      {/* Floating particles */}
      <div ref={particlesRef} className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
        <svg className="absolute left-[15%] top-[20%] w-4 h-4" viewBox="0 0 16 16">
          <circle cx="8" cy="8" r="6" fill="none" stroke="var(--theme-accent1-400)" strokeWidth="1.5" opacity="0.25" />
        </svg>
        <svg className="absolute left-[75%] top-[15%] w-5 h-5" viewBox="0 0 20 20">
          <rect x="2" y="2" width="16" height="16" rx="3" fill="var(--theme-accent2-400)" opacity="0.15" transform="rotate(45 10 10)" />
        </svg>
        <svg className="absolute left-[40%] top-[70%] w-3 h-3" viewBox="0 0 12 12">
          <circle cx="6" cy="6" r="4" fill="var(--theme-accent3-400)" opacity="0.2" />
        </svg>
        <svg className="absolute left-[60%] top-[40%] w-6 h-6" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="8" fill="none" stroke="var(--theme-accent1-400)" strokeWidth="1" opacity="0.2" />
        </svg>
        <svg className="absolute left-[25%] top-[50%] w-5 h-5" viewBox="0 0 20 20">
          <circle cx="10" cy="10" r="5" fill="var(--theme-accent2-400)" opacity="0.12" />
        </svg>
        <svg className="absolute left-[80%] top-[65%] w-4 h-4" viewBox="0 0 16 16">
          <rect x="1" y="1" width="14" height="14" rx="2" fill="none" stroke="var(--theme-accent3-400)" strokeWidth="1.5" opacity="0.2" transform="rotate(45 8 8)" />
        </svg>
        <svg className="absolute left-[50%] top-[10%] w-3 h-3" viewBox="0 0 12 12">
          <circle cx="6" cy="6" r="4" fill="var(--theme-accent1-400)" opacity="0.15" />
        </svg>
      </div>

      {/* Asymmetric decorator ring */}
      <svg className="hero-decorator" viewBox="0 0 200 200" aria-hidden="true">
        <circle cx="100" cy="100" r="80" strokeDasharray="120 40" />
        <circle cx="100" cy="100" r="60" strokeDasharray="60 80" strokeWidth="1.5" stroke="var(--theme-accent2-500)" />
        <circle cx="100" cy="100" r="40" strokeDasharray="30 30" strokeWidth="3" />
      </svg>

      <div className="w-full max-w-5xl flex flex-col items-center z-10">
        <div ref={heroRef} className="text-center mb-16 max-w-lg">
          <div className="hero-logo inline-flex items-center justify-center w-24 h-24 p-2 bg-theme-card/80 backdrop-blur-md rounded-[2rem] shadow-[var(--shadow-card)] mb-8">
            <img src={`${import.meta.env.BASE_URL}logo.png`} alt="AulaEcosystem Logo" className="w-full h-full object-contain filter drop-shadow-md" />
          </div>
          <h1 className="hero-title font-display text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-theme-text mb-4 drop-shadow-sm text-balance">
            AulaEcosystem
          </h1>
          <p className="hero-subtitle text-lg sm:text-xl text-theme-muted font-medium max-w-md mx-auto leading-relaxed">
            Sistema Inteligente de Control Escolar y Asistencia Digital
          </p>
        </div>

        <div ref={cardsRef} className="grid grid-cols-1 md:grid-cols-5 gap-6 w-full px-4 md:px-0">
          <Link
            to="/teacher/scan"
            onClick={() => feedback.light('navigate')}
            className="entrance-card group relative flex flex-col items-start justify-center p-8 md:col-span-3 bg-theme-card/80 backdrop-blur-xl rounded-[2rem] transition-all duration-300 shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-card-hover)] hover:-translate-y-2 active:scale-[0.98] overflow-hidden"
          >
            <div className="absolute -right-12 -top-12 w-40 h-40 rounded-full bg-theme-accent1-500/10 blur-3xl pointer-events-none" />
            <div className="w-16 h-16 rounded-2xl bg-theme-accent1-500/10 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-500">
              <span className="material-icons-round text-3xl text-theme-accent1-400">admin_panel_settings</span>
            </div>
            <h2 className="font-display text-2xl md:text-3xl font-bold text-theme-text mb-2">Docente</h2>
            <p className="text-theme-muted text-sm md:text-base font-medium leading-relaxed max-w-md">
              Registra y gestiona asistencia, justifica faltas en tiempo real
            </p>
          </Link>

          <div className="flex flex-col gap-6 md:col-span-2">
            <Link
              to="/student"
              onClick={() => feedback.light('navigate')}
              className="entrance-card group relative flex items-center gap-5 p-6 bg-theme-card/80 backdrop-blur-xl rounded-[2rem] transition-all duration-300 shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-card-hover)] hover:-translate-y-2 active:scale-[0.98] overflow-hidden"
            >
              <div className="w-14 h-14 rounded-2xl bg-theme-accent2-500/10 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform duration-500">
                <span className="material-icons-round text-2xl text-theme-accent2-400">badge</span>
              </div>
              <div>
                <h2 className="font-display text-xl font-bold text-theme-text">Alumno</h2>
                <p className="text-theme-muted text-sm leading-relaxed">
                  Genera tu pase digital QR
                </p>
              </div>
            </Link>

            <Link
              to="/consulta/report"
              onClick={() => feedback.light('navigate')}
              className="entrance-card group relative flex items-center gap-5 p-6 bg-theme-card/80 backdrop-blur-xl rounded-[2rem] transition-all duration-300 shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-card-hover)] hover:-translate-y-2 active:scale-[0.98] overflow-hidden"
            >
              <div className="w-14 h-14 rounded-2xl bg-theme-accent3-500/10 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform duration-500">
                <span className="material-icons-round text-2xl text-theme-accent3-400">search</span>
              </div>
              <div>
                <h2 className="font-display text-xl font-bold text-theme-text">Consulta</h2>
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
