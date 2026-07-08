import { animate, createTimeline } from 'animejs';
import { spring } from 'animejs/easings';
import type {
  TargetsParam,
  Timeline,
  JSAnimation,
  AnimationParams,
} from 'animejs';

function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function noopAnimation(): JSAnimation {
  const dummy = document.createElement('div');
  document.body.appendChild(dummy);
  const anim = animate(dummy, { duration: 1 } as AnimationParams);
  setTimeout(() => dummy.remove(), 1);
  return anim;
}

function noopTimeline(): Timeline {
  return createTimeline({ autoplay: true });
}

export function heroEntrance(
  logo: TargetsParam,
  title: TargetsParam,
  subtitle: TargetsParam,
): Timeline {
  if (prefersReducedMotion()) return noopTimeline();
  const tl = createTimeline({
    autoplay: true,
  });
  tl.add(logo, {
    scale: [0.6, 1],
    opacity: [0, 1],
    rotate: [-6, 0],
    ease: spring({ mass: 1, stiffness: 80, damping: 12 }),
    duration: 1000,
  } as AnimationParams)
    .add(
      title,
      {
        translateY: [40, 0],
        opacity: [0, 1],
        ease: spring({ mass: 1, stiffness: 100, damping: 14 }),
        duration: 900,
      } as AnimationParams,
      '-=500',
    )
    .add(
      subtitle,
      {
        translateY: [24, 0],
        opacity: [0, 1],
        ease: spring({ mass: 1, stiffness: 90, damping: 13 }),
        duration: 700,
      } as AnimationParams,
      '-=400',
    );
  return tl;
}

export function cardsEntrance(cards: TargetsParam) {
  if (prefersReducedMotion()) return noopAnimation();
  return animate(cards, {
    translateY: [60, 0],
    opacity: [0, 1],
    scale: [0.97, 1],
    ease: spring({ mass: 1, stiffness: 80, damping: 12 }),
    duration: 1200,
    delay: (_el: unknown, i: number) => 600 + i * 120,
  } as AnimationParams);
}

export function staggerEntrance(
  targets: TargetsParam,
  options?: {
    fromY?: number;
    staggerDelay?: number;
    startDelay?: number;
    scale?: [number, number];
  },
): JSAnimation {
  if (prefersReducedMotion()) return noopAnimation();
  const { fromY = 30, staggerDelay = 60, startDelay = 0, scale } =
    options ?? {};
  return animate(targets, {
    translateY: [fromY, 0],
    opacity: [0, 1],
    ...(scale ? { scale } : {}),
    ease: spring({ mass: 1, stiffness: 80, damping: 12 }),
    duration: 800,
    delay: (_el: unknown, i: number) => startDelay + i * staggerDelay,
  } as AnimationParams);
}

export function modalEnter(
  overlay: TargetsParam,
  content: TargetsParam,
): Timeline {
  if (prefersReducedMotion()) return noopTimeline();
  const tl = createTimeline({ autoplay: true });
  tl.add(overlay, {
    opacity: [0, 1],
    duration: 250,
    ease: 'linear',
  } as AnimationParams).add(
    content,
    {
      translateY: [30, 0],
      scale: [0.95, 1],
      opacity: [0, 1],
      ease: spring({ mass: 1, stiffness: 120, damping: 14 }),
      duration: 500,
    } as AnimationParams,
    '-=150',
  );
  return tl;
}

export function modalExit(
  overlay: TargetsParam,
  content: TargetsParam,
): Timeline {
  if (prefersReducedMotion()) return noopTimeline();
  const tl = createTimeline({ autoplay: true });
  tl.add(content, {
    translateY: [0, 20],
    scale: [1, 0.96],
    opacity: [1, 0],
    duration: 200,
    ease: 'outQuad',
  } as AnimationParams).add(
    overlay,
    { opacity: [1, 0], duration: 180, ease: 'linear' } as AnimationParams,
    '-=120',
  );
  return tl;
}

export function toastEnter(target: TargetsParam): JSAnimation {
  if (prefersReducedMotion()) return noopAnimation();
  return animate(target, {
    translateY: [24, 0],
    opacity: [0, 1],
    scale: [0.92, 1],
    ease: spring({ mass: 1, stiffness: 140, damping: 14 }),
    duration: 500,
  } as AnimationParams);
}

export function toastExit(target: TargetsParam): JSAnimation {
  if (prefersReducedMotion()) return noopAnimation();
  return animate(target, {
    translateY: [0, -16],
    opacity: [1, 0],
    scale: [1, 0.92],
    duration: 250,
    ease: 'outQuad',
  } as AnimationParams);
}

export function shakeElement(target: TargetsParam): JSAnimation {
  if (prefersReducedMotion()) return noopAnimation();
  return animate(target, {
    translateX: [0, -6, 6, -5, 5, -3, 3, -2, 2, 0],
    duration: 500,
    ease: 'outQuad',
  } as AnimationParams);
}

export function pulseElement(
  target: TargetsParam,
  scale = 1.04,
): JSAnimation {
  if (prefersReducedMotion()) return noopAnimation();
  return animate(target, {
    scale: [1, scale, 1],
    duration: 500,
    ease: spring({ mass: 1, stiffness: 200, damping: 12 }),
  } as AnimationParams);
}

export function scanSuccessBurst(target: TargetsParam): JSAnimation {
  if (prefersReducedMotion()) return noopAnimation();
  return animate(target, {
    scale: [1, 1.08, 1],
    boxShadow: [
      '0 0 0 0 rgba(52,211,153,0)',
      '0 0 0 24px rgba(52,211,153,0.25)',
      '0 0 0 0 rgba(52,211,153,0)',
    ],
    duration: 700,
    ease: spring({ mass: 1, stiffness: 180, damping: 12 }),
  } as AnimationParams);
}

export function glowPulse(
  target: TargetsParam,
  color = 'rgba(59,130,246,0.4)',
): JSAnimation {
  if (prefersReducedMotion()) return noopAnimation();
  return animate(target, {
    boxShadow: [
      `0 0 0 0 ${color}`,
      `0 0 0 12px transparent`,
      `0 0 0 0 ${color}`,
    ],
    duration: 2000,
    loop: true,
    ease: 'inOutSine',
  } as AnimationParams);
}

export function rippleEffect(
  button: HTMLElement,
  x: number,
  y: number,
): JSAnimation {
  if (prefersReducedMotion()) return noopAnimation();
  const rect = button.getBoundingClientRect();
  const size = Math.max(rect.width, rect.height) * 1.2;
  const ripple = document.createElement('span');
  ripple.style.cssText = `
    position: absolute;
    left: ${x - rect.left - size / 2}px;
    top: ${y - rect.top - size / 2}px;
    width: ${size}px;
    height: ${size}px;
    border-radius: 50%;
    background: rgba(255,255,255,0.35);
    pointer-events: none;
    will-change: transform, opacity;
  `;
  button.appendChild(ripple);
  return animate(ripple, {
    scale: [0, 3],
    opacity: [0.6, 0],
    duration: 650,
    ease: 'outQuad',
  } as AnimationParams);
}
