import { useEffect, useRef } from 'react';
import { animate } from 'animejs';
import { spring } from 'animejs/easings';
import type { AnimationParams } from 'animejs';

interface UseAnimatedMountOptions {
  fromY?: number;
  staggerDelay?: number;
  duration?: number;
  enabled?: boolean;
  scale?: [number, number];
}

export function useAnimatedMount<T extends HTMLElement = HTMLElement>(
  options: UseAnimatedMountOptions = {},
) {
  const ref = useRef<T>(null);
  const {
    staggerDelay = 70,
    fromY = 28,
    duration = 800,
    enabled = true,
    scale,
  } = options;

  useEffect(() => {
    if (!ref.current || !enabled) return;

    const children = Array.from(ref.current.children) as HTMLElement[];
    if (children.length === 0) return;

    children.forEach((child) => {
      child.style.opacity = '0';
      child.style.transform = `translateY(${fromY}px)`;
    });

    const anim = animate(children, {
      translateY: [fromY, 0],
      opacity: [0, 1],
      ...(scale ? { scale } : {}),
      ease: spring({ mass: 1, stiffness: 80, damping: 12 }),
      duration,
      delay: (_el: unknown, i: number) => i * staggerDelay,
    } as AnimationParams);

    return () => {
      anim.pause();
    };
  }, [staggerDelay, fromY, duration, enabled, scale]);

  return ref;
}
