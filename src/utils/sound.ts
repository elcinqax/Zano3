type AudioContextConstructor = typeof AudioContext;

const BEEP_FREQUENCY_HZ = 1175;
const BEEP_DURATION_S = 0.16;
const BEEP_PEAK_GAIN = 0.3;

let audioContext: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (audioContext) return audioContext;
  const Constructor =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: AudioContextConstructor }).webkitAudioContext;
  if (!Constructor) return null;
  audioContext = new Constructor();
  return audioContext;
}

/**
 * Must be called from a user gesture (tap/submit): browsers keep the audio context
 * suspended until then, and mobile Safari re-suspends it when the app goes to the background.
 */
export function playSaleBeep(): void {
  try {
    const context = getAudioContext();
    if (!context) return;
    if (context.state !== 'running') void context.resume().catch(() => undefined);

    const startAt = context.currentTime + 0.01;
    const endAt = startAt + BEEP_DURATION_S;

    const oscillator = context.createOscillator();
    oscillator.type = 'triangle';
    oscillator.frequency.setValueAtTime(BEEP_FREQUENCY_HZ, startAt);

    const gain = context.createGain();
    gain.gain.setValueAtTime(0.0001, startAt);
    gain.gain.exponentialRampToValueAtTime(BEEP_PEAK_GAIN, startAt + 0.01);
    gain.gain.setValueAtTime(BEEP_PEAK_GAIN, endAt - 0.05);
    gain.gain.exponentialRampToValueAtTime(0.0001, endAt);

    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start(startAt);
    oscillator.stop(endAt + 0.02);
    oscillator.onended = () => {
      oscillator.disconnect();
      gain.disconnect();
    };
  } catch {
    // A missing or blocked audio device must never interrupt a sale.
  }
}
