/* =============================================
   SCRIPT.JS — Animations, Music, Particles
   ============================================= */

// ── FLOATING PETALS ──────────────────────────
(function createPetals() {
  const container = document.getElementById('petals');
  if (!container) return;
  const colors = [
    'rgba(212,168,240,0.55)',
    'rgba(247,197,213,0.5)',
    'rgba(232,200,122,0.35)',
    'rgba(155,89,196,0.4)',
  ];
  for (let i = 0; i < 22; i++) {
    const p = document.createElement('div');
    p.className = 'petal';
    const size = 6 + Math.random() * 10;
    p.style.cssText = `
      width:${size}px;
      height:${size}px;
      left:${Math.random() * 100}%;
      background:${colors[Math.floor(Math.random() * colors.length)]};
      animation-duration:${8 + Math.random() * 12}s;
      animation-delay:${Math.random() * 10}s;
      border-radius:${Math.random() > 0.5 ? '50% 0 50% 0' : '50%'};
    `;
    container.appendChild(p);
  }
})();

// ── FOOTER STARS ─────────────────────────────
(function createStars() {
  const container = document.getElementById('footerStars');
  if (!container) return;
  for (let i = 0; i < 60; i++) {
    const s = document.createElement('div');
    s.className = 'star';
    const size = 1 + Math.random() * 3;
    s.style.cssText = `
      width:${size}px;
      height:${size}px;
      top:${Math.random() * 100}%;
      left:${Math.random() * 100}%;
      animation-duration:${2 + Math.random() * 4}s;
      animation-delay:${Math.random() * 4}s;
    `;
    container.appendChild(s);
  }
})();

// ── SCROLL REVEAL ─────────────────────────────
const revealTargets = document.querySelectorAll(
  '.chapter-photo, .chapter-text, .apology-photos, .apology-text'
);

const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('in-view');
    }
  });
}, { threshold: 0.15 });

revealTargets.forEach(el => observer.observe(el));

// ── MUSIC ─────────────────────────────────────
let audioCtx = null;
let musicNodes = null;
let isPlaying = false;

function buildMusic(ctx) {
  const masterGain = ctx.createGain();
  masterGain.gain.setValueAtTime(0.0, ctx.currentTime);
  masterGain.gain.linearRampToValueAtTime(0.4, ctx.currentTime + 2);
  masterGain.connect(ctx.destination);

  const reverb = ctx.createConvolver();
  const reverbGain = ctx.createGain();
  reverbGain.gain.value = 0.55;
  reverb.connect(reverbGain);
  reverbGain.connect(masterGain);

  // Simple impulse response for reverb
  const reverbLen = ctx.sampleRate * 3.5;
  const buf = ctx.createBuffer(2, reverbLen, ctx.sampleRate);
  for (let c = 0; c < 2; c++) {
    const d = buf.getChannelData(c);
    for (let i = 0; i < reverbLen; i++) {
      d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / reverbLen, 2.2);
    }
  }
  reverb.buffer = buf;

  const dryGain = ctx.createGain();
  dryGain.gain.value = 1;
  dryGain.connect(masterGain);

  // ── Melody notes (pentatonic scale — romantic feel) ──
  // C4=261.63, D4=293.66, E4=329.63, G4=392, A4=440, C5=523.25
  const melody = [
    [523.25, 0,    0.5],
    [440,    0.6,  0.5],
    [392,    1.2,  0.5],
    [329.63, 1.8,  0.5],
    [392,    2.4,  0.4],
    [440,    2.9,  0.4],
    [523.25, 3.4,  0.6],
    [587.33, 4.1,  0.5],
    [523.25, 4.7,  0.4],
    [440,    5.2,  0.7],
    [392,    6.0,  0.5],
    [329.63, 6.6,  0.4],
    [293.66, 7.2,  0.4],
    [261.63, 7.7,  1.0],
  ];

  const loopLen = 9; // seconds per loop
  const sources = [];

  function scheduleMelody(startTime) {
    melody.forEach(([freq, offset, dur]) => {
      const osc = ctx.createOscillator();
      const env = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;

      const t = startTime + offset;
      env.gain.setValueAtTime(0, t);
      env.gain.linearRampToValueAtTime(0.18, t + 0.05);
      env.gain.exponentialRampToValueAtTime(0.001, t + dur + 0.3);

      osc.connect(env);
      env.connect(dryGain);
      env.connect(reverb);

      osc.start(t);
      osc.stop(t + dur + 0.4);
      sources.push(osc);
    });
  }

  // Soft pad drone
  function schedulePad(startTime) {
    const freqs = [130.81, 164.81, 196, 246.94]; // C3 chord
    freqs.forEach(f => {
      const osc = ctx.createOscillator();
      const env = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.value = f;
      env.gain.setValueAtTime(0, startTime);
      env.gain.linearRampToValueAtTime(0.04, startTime + 1.5);
      env.gain.setValueAtTime(0.04, startTime + loopLen * 2 - 1);
      env.gain.linearRampToValueAtTime(0, startTime + loopLen * 2);
      osc.connect(env);
      env.connect(reverb);
      osc.start(startTime);
      osc.stop(startTime + loopLen * 2 + 0.1);
      sources.push(osc);
    });
  }

  const now = ctx.currentTime;
  scheduleMelody(now + 0.5);
  scheduleMelody(now + loopLen);
  schedulePad(now + 0.1);

  // Repeat loop
  let loopTime = now + loopLen * 2;
  let loopTimer;
  function loopMusic() {
    scheduleMelody(loopTime);
    schedulePad(loopTime);
    loopTime += loopLen;
    loopTimer = setTimeout(loopMusic, (loopLen - 0.5) * 1000);
  }
  loopTimer = setTimeout(loopMusic, (loopLen * 2 - 0.5) * 1000);

  return { masterGain, loopTimer, sources };
}

function toggleMusic() {
  const icon = document.getElementById('musicToggle');
  const music = document.getElementById('bgMusic');

  if (!isPlaying) {
    music.play();
    isPlaying = true;
    icon.classList.remove('paused');
  } else {
    music.pause();
    isPlaying = false;
    icon.classList.add('paused');
  }

  
}

// Auto-prompt music on first interaction
let prompted = false;
document.addEventListener('click', function autoStart() {
  if (!prompted && !isPlaying) {
    prompted = true;
    // Subtle hint animation on music button
    const player = document.getElementById('musicPlayer');
    if (player) {
      player.style.transform = 'scale(1.12)';
      setTimeout(() => { player.style.transform = ''; }, 400);
    }
  }
}, { once: true }

// ── CHAPTER NUMBERS PARALLAX ──────────────────
window.addEventListener('scroll', () => {
  const nums = document.querySelectorAll('.chapter-number');
  nums.forEach(n => {
    const rect = n.closest('.chapter').getBoundingClientRect();
    const progress = -rect.top / window.innerHeight;
    n.style.transform = `translateY(${progress * 30}px)`;
  });
}, { passive: true });

// Auto play setelah 5 detik
setTimeout(function() {
  const music = document.getElementById('bgMusic');
  const icon = document.getElementById('musicToggle');
  music.play().then(function() {
    isPlaying = true;
    icon.classList.remove('paused');
  }).catch(function() {
    // browser blokir autoplay, user harus klik dulu
  });
}, 5000);
