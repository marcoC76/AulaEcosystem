const SUCCESS_URL = 'https://marcoc76.github.io/audios/a-sudden-appearance-143034.mp3';
const ERROR_URL = 'https://github.com/marcoC76/audios/raw/refs/heads/main/error.mp3';

const HAPTIC_PATTERNS = {
  click: [10],
  navigate: [15],
  success: [50],
  error: [100, 80, 100],
  heavySuccess: [80, 50, 80],
  heavyError: [200, 100, 200],
  notification: [40, 30, 40],
} as const;

type HapticType = keyof typeof HAPTIC_PATTERNS;

let audioCtx: AudioContext | null = null;
const audioBuffers: { success: AudioBuffer | null; error: AudioBuffer | null } = { success: null, error: null };
let preloaded = false;

function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

async function getAudioContext(): Promise<AudioContext> {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') {
    await audioCtx.resume();
  }
  return audioCtx;
}

async function preloadAudio(): Promise<void> {
  if (preloaded) return;
  preloaded = true;
  try {
    const ctx = await getAudioContext();
    const [successResp, errorResp] = await Promise.all([
      fetch(SUCCESS_URL).catch(() => null),
      fetch(ERROR_URL).catch(() => null),
    ]);
    if (successResp?.ok) {
      audioBuffers.success = await ctx.decodeAudioData(await successResp.arrayBuffer());
    }
    if (errorResp?.ok) {
      audioBuffers.error = await ctx.decodeAudioData(await errorResp.arrayBuffer());
    }
  } catch {
    // fallback: synthetic beeps will be used
  }
}

let listenAttached = false;
function ensureFirstInteractionPreload(): void {
  if (listenAttached) return;
  listenAttached = true;
  const handler = () => {
    preloadAudio();
    document.removeEventListener('pointerdown', handler);
  };
  document.addEventListener('pointerdown', handler, { once: true });
}

function playBuffer(buffer: AudioBuffer | null): void {
  if (!buffer) return;
  getAudioContext().then(ctx => {
    const source = ctx.createBufferSource();
    const gain = ctx.createGain();
    source.buffer = buffer;
    source.connect(gain);
    gain.connect(ctx.destination);
    gain.gain.setValueAtTime(0.6, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + buffer.duration);
    source.start();
  }).catch(() => {});
}

function playSyntheticBeep(type: 'success' | 'error'): void {
  getAudioContext().then(ctx => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    if (type === 'success') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, ctx.currentTime);
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      osc.start();
      gain.gain.exponentialRampToValueAtTime(0.00001, ctx.currentTime + 0.1);
      osc.stop(ctx.currentTime + 0.1);
    } else {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(200, ctx.currentTime);
      osc.frequency.linearRampToValueAtTime(100, ctx.currentTime + 0.3);
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      osc.start();
      gain.gain.exponentialRampToValueAtTime(0.00001, ctx.currentTime + 0.3);
      osc.stop(ctx.currentTime + 0.3);
    }
  }).catch(() => {});
}

function haptic(type: HapticType): void {
  if (prefersReducedMotion()) return;
  if (!navigator.vibrate) return;
  navigator.vibrate(HAPTIC_PATTERNS[type]);
}

const feedback = {
  sound(type: 'success' | 'error'): void {
    if (prefersReducedMotion()) return;
    ensureFirstInteractionPreload();
    if (type === 'success' && audioBuffers.success) {
      playBuffer(audioBuffers.success);
    } else if (type === 'error' && audioBuffers.error) {
      playBuffer(audioBuffers.error);
    } else {
      playSyntheticBeep(type);
    }
  },

  haptic,

  light(type: 'click' | 'navigate'): void {
    this.sound('success');
    haptic(type);
  },

  medium(type: 'success' | 'error'): void {
    this.sound(type);
    haptic(type);
  },

  heavy(type: 'success' | 'error'): void {
    this.sound(type);
    haptic(type === 'success' ? 'heavySuccess' : 'heavyError');
  },
};

ensureFirstInteractionPreload();

export default feedback;
