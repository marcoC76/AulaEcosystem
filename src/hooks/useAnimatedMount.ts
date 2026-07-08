import { useEffect, useRef } from 'react';
import { animate } from 'animejs';
import { spring } from 'animejs/easings';
import type { AnimationParams } from 'animejs';

interface UseAnimatedMountOptions {
  fromY?: number;
  staggerDelay?: number;
  startDelay?: number;
  duration?: number;
  enabled?: boolean;
  scale?: [number, number];
  /** CSS selector for child elements (e.g. '.pin-stagger'). Defaults to direct children. */
  selector?: string;
}

export function useAnimatedMount<T extends HTMLElement = HTMLElement>(
  options: UseAnimatedMountOptions = {},
) {
  const ref = useRef<T>(null);
  const configRef = useRef({
    staggerDelay: options.staggerDelay ?? 70,
    startDelay: options.startDelay ?? 0,
    fromY: options.fromY ?? 28,
    duration: options.duration ?? 800,
    scale: options.scale ?? null,
    selector: options.selector ?? null,
  });

  useEffect(() => {
    if (!ref.current || !options.enabled) return;

    const { staggerDelay, startDelay, fromY, duration, scale, selector } = configRef.current;

    const targets = selector
      ? (Array.from(ref.current.querySelectorAll<HTMLElement>(selector)))
      : (Array.from(ref.current.children) as HTMLElement[]);
    if (targets.length === 0) return;

    targets.forEach((child) => {
      child.style.opacity = '0';
      child.style.transform = `translateY(${fromY}px)`;
    });

    const anim = animate(targets, {
      translateY: [fromY, 0],
      opacity: [0, 1],
      ...(scale ? { scale } : {}),
      ease: spring({ mass: 1, stiffness: 80, damping: 12 }),
      duration,
      delay: (_el: unknown, i: number) => startDelay + i * staggerDelay,
    } as AnimationParams);

    return () => {
      anim.pause();
    };
  }, [options.enabled]);

  return ref;
}
