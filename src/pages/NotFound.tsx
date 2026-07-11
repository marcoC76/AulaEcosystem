import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { animate, createTimeline } from 'animejs';
import { spring } from 'animejs/easings';
import type { AnimationParams } from 'animejs';
import { Button } from '../components/ui/Button';

export default function NotFound() {
  const digitsRef = useRef<HTMLDivElement>(null);
  const lineRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLDivElement>(null);
  const particlesRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const digits = digitsRef.current;
    const line = lineRef.current;
    const text = textRef.current;
    const button = buttonRef.current;
    const particles = particlesRef.current;
    if (!digits || !line || !text || !button) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    createTimeline({ autoplay: true })
      .add(digits.children, {
        translateY: [80, 0],
        opacity: [0, 1],
        rotate: [15, 0],
        scale: [0.6, 1],
        ease: spring({ mass: 1, stiffness: 100, damping: 12 }),
        duration: 1200,
        delay: (_el: unknown, i: number) => i * 120,
      } as AnimationParams)
      .add(line, {
        scaleX: [0, 1],
        opacity: [0, 1],
        ease: spring({ mass: 1, stiffness: 120, damping: 14 }),
        duration: 800,
      } as AnimationParams, '-=500')
      .add(text.children, {
        translateY: [20, 0],
        opacity: [0, 1],
        ease: spring({ mass: 1, stiffness: 90, damping: 13 }),
        duration: 600,
        delay: (_el: unknown, i: number) => i * 100,
      } as AnimationParams, '-=350')
      .add(button, {
        translateY: [20, 0],
        opacity: [0, 1],
        ease: spring({ mass: 1, stiffness: 100, damping: 14 }),
        duration: 500,
      } as AnimationParams, '-=250');

    if (particles) {
      Array.from(particles.children).forEach((p) => {
        animate(p, {
          translateY: [-30, 30],
          translateX: [-20, 20],
          rotate: [0, 360],
          duration: 3500 + Math.random() * 2000,
          direction: 'alternate',
          loop: true,
          ease: 'inOutSine',
        } as AnimationParams);
      });
    }
  }, []);

  return (
    <div className="flex flex-col items-center justify-center min-h-[100dvh] p-4 bg-theme-base relative overflow-hidden">

      {/* Particle dots */}
      <div ref={particlesRef} className="absolute inset-0 pointer-events-none" aria-hidden="true">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className="absolute rounded-full"
            style={{
              width: `${4 + (i % 3) * 3}px`,
              height: `${4 + (i % 3) * 3}px`,
              backgroundColor: i % 2 === 0 ? 'var(--theme-accent1-400)' : 'var(--theme-accent2-400)',
              opacity: 0.18,
              left: `${10 + i * 14}%`,
              top: `${15 + (i % 4) * 20}%`,
            }}
          />
        ))}
      </div>

      {/* Gradient background */}
      <div className="absolute inset-0 bg-gradient-to-b from-theme-accent1-600/[0.08] to-transparent pointer-events-none" />

      <div className="flex flex-col items-center text-center z-10">

        {/* Logo */}
        <div className="w-20 h-20 p-2 bg-theme-card/80 backdrop-blur-md rounded-[2rem] shadow-[var(--shadow-card)] mb-8">
          <img src={`${import.meta.env.BASE_URL}logo.png`} alt="AulaEcosystem" className="w-full h-full object-contain" />
        </div>

        {/* 404 digits */}
        <div ref={digitsRef} className="flex items-center gap-3 sm:gap-4 mb-2">
          <span className="text-7xl sm:text-9xl font-extrabold tracking-tight text-theme-text">4</span>
          <span className="text-7xl sm:text-9xl font-extrabold tracking-tight text-theme-accent1-500">0</span>
          <span className="text-7xl sm:text-9xl font-extrabold tracking-tight text-theme-text">4</span>
        </div>

        {/* Animated line */}
        <div ref={lineRef} className="h-1 w-32 rounded-full bg-gradient-to-r from-theme-accent1-500 to-theme-accent2-500 origin-center mb-6" />

        {/* Text */}
        <div ref={textRef}>
          <p className="text-xl sm:text-2xl font-bold text-theme-text mb-1">Página no encontrada</p>
          <p className="text-sm text-theme-muted/70 mb-8">La ruta solicitada no existe</p>
        </div>

        {/* Button */}
        <div ref={buttonRef}>
          <Link to="/">
            <Button>Volver al inicio</Button>
          </Link>
        </div>

      </div>
    </div>
  );
}
