'use strict';

/* Ambiente procedural do Redenção — noir aconchegante, sem chiado.
   Camadas: drone grave respirando, chuva macia ao fundo, piano generativo
   em pentatônica de D menor com delay e reverb, texturas quentes.
   Tudo sintetizado com Web Audio API; nenhuma amostra externa. */

(() => {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  const DEFAULT_VOLUMES = Object.freeze({ master: 0.7, ambient: 0.6 });

  let context = null;
  let masterGain = null;
  let ambientGain = null;
  let musicBus = null;
  let delaySend = null;
  let started = false;
  let volumes = { ...DEFAULT_VOLUMES };
  let pianoTimer = 0;

  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
  const toGain = (value) => value * value;

  function applyGains(immediate = false) {
    if (!context || !masterGain || !ambientGain) {
      return;
    }

    const now = context.currentTime;
    const master = toGain(volumes.master);
    const ambient = toGain(volumes.ambient);

    if (immediate) {
      masterGain.gain.cancelScheduledValues(now);
      ambientGain.gain.cancelScheduledValues(now);
      masterGain.gain.setValueAtTime(master, now);
      ambientGain.gain.setValueAtTime(ambient, now);
      return;
    }

    masterGain.gain.setTargetAtTime(master, now, 0.08);
    ambientGain.gain.setTargetAtTime(ambient, now, 0.11);
  }

  function createNoiseBuffer(seconds) {
    const length = Math.floor(context.sampleRate * seconds);
    const buffer = context.createBuffer(1, length, context.sampleRate);
    const data = buffer.getChannelData(0);

    for (let index = 0; index < length; index += 1) {
      data[index] = Math.random() * 2 - 1;
    }

    return buffer;
  }

  function createImpulseResponse(seconds, decay) {
    const length = Math.floor(context.sampleRate * seconds);
    const impulse = context.createBuffer(2, length, context.sampleRate);

    for (let channel = 0; channel < 2; channel++) {
      const data = impulse.getChannelData(channel);
      for (let i = 0; i < length; i++) {
        const progress = i / length;
        // cauda exponencial com leve aleatoriedade — sensação de quarto grande
        data[i] = (Math.random() * 2 - 1) * Math.pow(1 - progress, decay);
      }
    }

    return impulse;
  }

  function buildMusicBus() {
    musicBus = context.createGain();
    musicBus.gain.value = 0.85;
    musicBus.connect(ambientGain);

    // Delay com feedback — profundidade e espaço
    const delay = context.createDelay(1.2);
    delay.delayTime.value = 0.46;
    const feedback = context.createGain();
    feedback.gain.value = 0.34;
    const wet = context.createGain();
    wet.gain.value = 0.22;
    const delayFilter = context.createBiquadFilter();
    delayFilter.type = 'lowpass';
    delayFilter.frequency.value = 1600;

    delaySend = context.createGain();
    delaySend.gain.value = 1;
    delaySend.connect(delay);
    delay.connect(delayFilter);
    delayFilter.connect(feedback);
    feedback.connect(delay);
    delay.connect(wet);
    wet.connect(ambientGain);

    // Reverb de convolução — quarto antigo da mansão
    const convolver = context.createConvolver();
    convolver.buffer = createImpulseResponse(2.6, 2.4);
    const reverbWet = context.createGain();
    reverbWet.gain.value = 0.3;
    delaySend.connect(convolver);
    convolver.connect(reverbWet);
    reverbWet.connect(ambientGain);
  }

  function addDroneVoice(frequency, type, level) {
    const osc = context.createOscillator();
    osc.type = type;
    osc.frequency.value = frequency;
    osc.detune.value = (Math.random() - 0.5) * 8;

    const gain = context.createGain();
    gain.gain.value = 0;

    osc.connect(gain);
    gain.connect(droneFilter);
    osc.start();

    // entrada suave
    gain.gain.setTargetAtTime(level, context.currentTime + 0.05, 2.5);
    return gain;
  }

  let droneFilter = null;

  function buildDrone() {
    droneFilter = context.createBiquadFilter();
    droneFilter.type = 'lowpass';
    droneFilter.frequency.value = 220;
    droneFilter.Q.value = 0.8;

    const droneLevel = context.createGain();
    droneLevel.gain.value = 1;
    droneFilter.connect(droneLevel);
    droneLevel.connect(ambientGain);

    // D2 / A2 / D1 — tônica, quinta e sub
    addDroneVoice(73.416, 'sine', 0.16);
    addDroneVoice(110.0, 'sine', 0.075);
    addDroneVoice(36.708, 'triangle', 0.1);

    // Terceira menor longe no grave — melancolia noir
    const third = context.createOscillator();
    third.type = 'sine';
    third.frequency.value = 87.307; // F2
    const thirdGain = context.createGain();
    thirdGain.gain.value = 0;
    third.connect(thirdGain);
    thirdGain.connect(droneFilter);
    third.start();
    thirdGain.gain.setTargetAtTime(0.05, context.currentTime + 0.05, 3.2);

    // Respiração lenta do filtro
    const lfo = context.createOscillator();
    const lfoDepth = context.createGain();
    lfo.type = 'sine';
    lfo.frequency.value = 0.045;
    lfoDepth.gain.value = 95;
    lfo.connect(lfoDepth);
    lfoDepth.connect(droneFilter.frequency);
    lfo.start();

    // Segundo LFO no ganho do drone — maré lenta
    const breath = context.createOscillator();
    const breathDepth = context.createGain();
    breath.type = 'sine';
    breath.frequency.value = 0.021;
    breathDepth.gain.value = 0.12;
    breath.connect(breathDepth);
    breath.start();
    breathDepth.connect(droneLevel.gain);
  }

  function buildRain() {
    const buffer = createNoiseBuffer(4);

    // Corpo da chuva: passa-baixa quente, sem chiado
    const body = context.createBufferSource();
    body.buffer = buffer;
    body.loop = true;
    const bodyFilter = context.createBiquadFilter();
    bodyFilter.type = 'lowpass';
    bodyFilter.frequency.value = 520;
    bodyFilter.Q.value = 0.4;
    const bodyGain = context.createGain();
    bodyGain.gain.value = 0.16;
    body.connect(bodyFilter);
    bodyFilter.connect(bodyGain);
    bodyGain.connect(ambientGain);
    body.start(0, 1.1);

    // Gotas de alta frequência, bem baixas (quase um piscar)
    const patter = context.createBufferSource();
    patter.buffer = buffer;
    patter.loop = true;
    const patterFilter = context.createBiquadFilter();
    patterFilter.type = 'bandpass';
    patterFilter.frequency.value = 3600;
    patterFilter.Q.value = 0.7;
    const patterGain = context.createGain();
    patterGain.gain.value = 0.022;
    patter.connect(patterFilter);
    patterFilter.connect(patterGain);
    patterGain.connect(ambientGain);
    patter.start(0, 2.3);

    // LFO na textura — chuva que vai e volta
    const lfo = context.createOscillator();
    const lfoDepth = context.createGain();
    lfo.type = 'sine';
    lfo.frequency.value = 0.06;
    lfoDepth.gain.value = 0.05;
    lfo.connect(lfoDepth);
    lfoDepth.connect(patterGain.gain);
    lfo.start();
  }

  // Pentatônica menor de D: D F G A C — nunca erra
  const SCALE = [146.83, 174.61, 196.0, 220.0, 261.63, 293.66, 349.23]; // D3..F4
  const MELODY_GAP = [4200, 7500]; // ms entre notas

  function playPianoNote(frequency, velocity) {
    const t = context.currentTime;

    const osc = context.createOscillator();
    osc.type = 'triangle';
    osc.frequency.value = frequency;
    osc.detune.value = (Math.random() - 0.5) * 7;

    // harmônico suave de oitava
    const octave = context.createOscillator();
    octave.type = 'sine';
    octave.frequency.value = frequency * 2;
    const octaveGain = context.createGain();
    octaveGain.gain.value = 0.32;

    const envelope = context.createGain();
    envelope.gain.setValueAtTime(0, t);
    envelope.gain.linearRampToValueAtTime(velocity, t + 0.015);
    envelope.gain.exponentialRampToValueAtTime(velocity * 0.32, t + 1.4);
    envelope.gain.exponentialRampToValueAtTime(0.0001, t + 5.2);

    const noteFilter = context.createBiquadFilter();
    noteFilter.type = 'lowpass';
    noteFilter.frequency.setValueAtTime(2600, t);
    noteFilter.frequency.exponentialRampToValueAtTime(900, t + 4.5);

    osc.connect(envelope);
    octave.connect(octaveGain);
    octaveGain.connect(envelope);
    envelope.connect(noteFilter);
    noteFilter.connect(musicBus);
    noteFilter.connect(delaySend);

    osc.start(t);
    octave.start(t);
    osc.stop(t + 5.4);
    octave.stop(t + 5.4);
  }

  function schedulePiano() {
    const step = () => {
      pianoTimer = window.setTimeout(() => {
        if (!context || context.state !== 'running') {
          step();
          return;
        }

        // Nota principal +, às vezes, uma resposta em terças/sextas
        const index = Math.floor(Math.random() * SCALE.length);
        const velocity = 0.055 + Math.random() * 0.05;
        playPianoNote(SCALE[index], velocity);

        if (Math.random() < 0.38) {
          const answer = Math.min(SCALE.length - 1, Math.max(0, index + (Math.random() < 0.5 ? 2 : -2) + Math.floor(Math.random() * 2) - 0));
          window.setTimeout(() => playPianoNote(SCALE[answer], velocity * 0.72), 340 + Math.random() * 260);
        }

        step();
      }, MELODY_GAP[0] + Math.random() * (MELODY_GAP[1] - MELODY_GAP[0]));
    };

    step();
  }

  function start() {
    if (!AudioContextClass) {
      return;
    }

    if (started) {
      if (context && context.state === 'suspended') {
        context.resume().catch(() => {});
      }
      return;
    }

    try {
      context = new AudioContextClass();
    } catch {
      return;
    }

    masterGain = context.createGain();
    masterGain.gain.value = 0;
    masterGain.connect(context.destination);

    ambientGain = context.createGain();
    ambientGain.gain.value = 0;
    ambientGain.connect(masterGain);

    buildMusicBus();
    buildDrone();
    buildRain();
    schedulePiano();

    started = true;
    applyGains();

    if (context.state === 'suspended') {
      context.resume().catch(() => {});
    }
  }

  function attachUnlockListener() {
    const unlock = () => {
      start();
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
      window.removeEventListener('touchstart', unlock);
    };

    window.addEventListener('pointerdown', unlock, { passive: true });
    window.addEventListener('keydown', unlock);
    window.addEventListener('touchstart', unlock, { passive: true });
  }

  window.RedencaoAudio = {
    start,

    setVolumes(next) {
      if (!next) {
        return;
      }

      volumes = {
        master: clamp(Number(next.master) || 0, 0, 1),
        ambient: clamp(Number(next.ambient) || 0, 0, 1),
      };

      applyGains();
    },
  };

  attachUnlockListener();
})();
