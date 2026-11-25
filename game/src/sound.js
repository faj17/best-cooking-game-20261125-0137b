// Tiny synthesized sounds: a few oscillator blips, no audio files, nothing fetched.
// Created on the first user gesture; M toggles mute.

export function createSound() {
  let audio = null;
  let muted = false;

  function ensure() {
    if (!audio) {
      try {
        audio = new (window.AudioContext || window.webkitAudioContext)();
      } catch {
        audio = null;
      }
    }
    if (audio && audio.state === 'suspended') audio.resume().catch(() => {});
    return audio;
  }

  function tone(freq, duration, type = 'sine', gain = 0.12, when = 0) {
    if (muted) return;
    const ctx = ensure();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const amp = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    amp.gain.setValueAtTime(gain, ctx.currentTime + when);
    amp.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + when + duration);
    osc.connect(amp);
    amp.connect(ctx.destination);
    osc.start(ctx.currentTime + when);
    osc.stop(ctx.currentTime + when + duration);
  }

  return {
    unlock() {
      ensure();
    },
    toggleMute() {
      muted = !muted;
      return muted;
    },
    pickup() {
      tone(520, 0.08, 'sine', 0.1);
    },
    place() {
      tone(340, 0.07, 'triangle', 0.1);
    },
    chop() {
      tone(180, 0.06, 'square', 0.12);
      tone(120, 0.05, 'square', 0.08, 0.02);
    },
    grillDone() {
      tone(660, 0.09, 'sine', 0.1);
      tone(880, 0.12, 'sine', 0.1, 0.09);
    },
    serve() {
      tone(523, 0.1, 'sine', 0.12);
      tone(659, 0.1, 'sine', 0.12, 0.09);
      tone(784, 0.16, 'sine', 0.12, 0.18);
    },
    error() {
      tone(140, 0.14, 'sawtooth', 0.07);
    },
    expire() {
      tone(220, 0.2, 'sawtooth', 0.08);
      tone(165, 0.25, 'sawtooth', 0.08, 0.15);
    },
    trash() {
      tone(300, 0.08, 'triangle', 0.08);
      tone(200, 0.1, 'triangle', 0.08, 0.06);
    },
  };
}
