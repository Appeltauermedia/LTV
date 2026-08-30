let audioContext;

function context() {
  const AudioContextClass = globalThis.AudioContext || globalThis.webkitAudioContext;
  if (!AudioContextClass) return null;
  audioContext ||= new AudioContextClass();
  if (audioContext.state === "suspended") audioContext.resume().catch(() => {});
  return audioContext;
}

function note(ctx, frequency, start, duration, gain = 0.12, type = "sine") {
  const oscillator = ctx.createOscillator();
  const volume = ctx.createGain();
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, start);
  volume.gain.setValueAtTime(0.0001, start);
  volume.gain.exponentialRampToValueAtTime(gain, start + 0.015);
  volume.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  oscillator.connect(volume).connect(ctx.destination);
  oscillator.start(start);
  oscillator.stop(start + duration + 0.02);
}

export function playBing(delay = 0) {
  const ctx = context();
  if (!ctx) return;
  const start = ctx.currentTime + delay;
  note(ctx, 880, start, 0.16, 0.1);
  note(ctx, 1320, start + 0.08, 0.24, 0.08);
}

export function playTadaa(delay = 0) {
  const ctx = context();
  if (!ctx) return;
  const start = ctx.currentTime + delay;
  [523.25, 659.25, 783.99, 1046.5].forEach((frequency, index) => note(ctx, frequency, start + index * 0.11, 0.42, 0.09, "triangle"));
}
