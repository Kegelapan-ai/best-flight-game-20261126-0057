// Langit Nusantara — every sound is synthesised with WebAudio: an engine
// hum that follows the throttle, a chime when a ring is cleared, wind that
// grows with speed. No audio files, nothing loaded over the network.

export function createAudio() {
  let ctx = null;
  let engineOsc = null;
  let engineGain = null;
  let windSrc = null;
  let windGain = null;
  let muted = false;

  function ensure() {
    if (ctx) return true;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      ctx = new AC();
      // Engine: two detuned sawtooth oscillators through a low-pass filter.
      engineOsc = ctx.createOscillator();
      engineOsc.type = 'sawtooth';
      engineOsc.frequency.value = 70;
      const engineOsc2 = ctx.createOscillator();
      engineOsc2.type = 'sawtooth';
      engineOsc2.frequency.value = 71.5;
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 420;
      engineGain = ctx.createGain();
      engineGain.gain.value = 0;
      engineOsc.connect(filter);
      engineOsc2.connect(filter);
      filter.connect(engineGain);
      engineGain.connect(ctx.destination);
      engineOsc.start();
      engineOsc2.start();
      // Wind: looped filtered noise.
      const len = ctx.sampleRate * 2;
      const buf = ctx.createBuffer(1, len, ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
      windSrc = ctx.createBufferSource();
      windSrc.buffer = buf;
      windSrc.loop = true;
      const windFilter = ctx.createBiquadFilter();
      windFilter.type = 'bandpass';
      windFilter.frequency.value = 900;
      windGain = ctx.createGain();
      windGain.gain.value = 0;
      windSrc.connect(windFilter);
      windFilter.connect(windGain);
      windGain.connect(ctx.destination);
      windSrc.start();
      return true;
    } catch {
      return false;
    }
  }

  function tone(freq, dur, type, vol, when = 0) {
    if (!ctx || muted) return;
    const t = ctx.currentTime + when;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.value = freq;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g);
    g.connect(ctx.destination);
    o.start(t);
    o.stop(t + dur + 0.05);
  }

  return {
    unlock() {
      if (ensure() && ctx.state === 'suspended') ctx.resume();
    },
    setEngine(throttle, speedKt, flying) {
      if (!ctx || muted) return;
      const target = flying ? 0.03 + throttle * 0.05 : 0;
      engineGain.gain.setTargetAtTime(target, ctx.currentTime, 0.1);
      if (engineOsc) {
        engineOsc.frequency.setTargetAtTime(55 + throttle * 75 + speedKt * 0.15, ctx.currentTime, 0.1);
      }
      windGain.gain.setTargetAtTime(flying ? Math.min(0.05, speedKt * 0.00025) : 0, ctx.currentTime, 0.2);
    },
    ringChime() {
      tone(880, 0.35, 'sine', 0.18);
      tone(1318, 0.5, 'sine', 0.14, 0.09);
    },
    touchdown() {
      tone(180, 0.25, 'triangle', 0.2);
      tone(90, 0.4, 'sine', 0.2, 0.05);
    },
    crashThud() {
      tone(70, 0.6, 'sawtooth', 0.22);
      tone(45, 0.8, 'sine', 0.22, 0.08);
    },
    click() {
      tone(660, 0.08, 'square', 0.06);
    },
    toggleMute() {
      muted = !muted;
      if (ctx && engineGain) engineGain.gain.value = 0;
      return muted;
    },
  };
}
