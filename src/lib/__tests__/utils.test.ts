import { describe, it, expect } from 'vitest';
import { cn } from '../utils';

describe('cn', () => {
  it('joins class names', () => {
    expect(cn('a', 'b')).toBe('a b');
  });

  it('handles conditional classes', () => {
    expect(cn('base', false && 'hidden', 'visible')).toBe('base visible');
  });

  it('merges Tailwind classes correctly', () => {
    expect(cn('px-4', 'px-2')).toBe('px-2');
  });

  it('returns empty string for no inputs', () => {
    expect(cn()).toBe('');
  });

  it('filters out falsy values', () => {
    expect(cn('a', undefined, null, '', 'b')).toBe('a b');
  });
});
