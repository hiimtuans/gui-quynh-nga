/**
 * Romantic QR Code Web App - Bulletproof HD Engine
 * - Safe Audio exception handling (Works 100% on both Local & Deployed links)
 * - Cache busting & high-DPI crisp text rendering
 * - Symmetrical romantic heart shape
 */

document.addEventListener('DOMContentLoaded', () => {
  'use strict';

  const background = document.querySelector('#background');
  const bg = background.getContext('2d');
  const canvas = document.querySelector('#scene');
  const ctx = canvas.getContext('2d');

  const sampleCanvas = document.createElement('canvas');
  const sampleCtx = sampleCanvas.getContext('2d', { willReadFrequently: true });

  const orientationOverlay = document.querySelector('#orientation-overlay');
  const soundButton = document.querySelector('#sound-button');
  const replayButton = document.querySelector('#replay-button');
  const audioHint = document.querySelector('#audio-hint');
  const soundtrack = document.querySelector('#soundtrack');

  const CONFIG = {
    finalMessage: 'Anh Tuấn  ♡  Quỳnh Nga',
    finalSubmessage: 'Mãi bên nhau bạn nhé',
    rainGlyphs: '01ABCDEFラブアミール愛恋♡♥',
    timeline: [
      { text: '3', duration: 1400, number: true },
      { text: '2', duration: 1400, number: true },
      { text: '1', duration: 1400, number: true },
      { text: 'Em đồng ý', duration: 2900 },
      { text: 'Làm người yêu', duration: 2900 },
      { text: 'Anh nhé ♥', duration: 2900 },
      { text: 'Anh Yêu Em', duration: 3200 },
      { heart: true, duration: Infinity }
    ]
  };

  const SCENE_GAP = 150;
  const mobile = matchMedia('(pointer: coarse)').matches;
  const particleStep = mobile ? 5 : 4;
  const heartParticleCount = mobile ? 500 : 700;

  const random = (min, max) => min + Math.random() * (max - min);
  const clamp = value => Math.min(1, Math.max(0, value));
  const easeOutCubic = t => 1 - Math.pow(1 - clamp(t), 3);
  const easeInCubic = t => Math.pow(clamp(t), 3);

  let width = 0;
  let height = 0;
  let dpr = 2;
  let running = false;
  let landscape = false;
  let currentIndex = -1;
  let currentSceneStart = 0;
  let sequenceStart = 0;
  let particles = [];
  let heartParticles = [];
  let heartCurve = [];
  let columns = [];
  let stars = [];
  let exploded = false;
  let lastFrame = performance.now();
  let lastRainFrame = 0;
  let raf = 0;

  function setCanvasSize(target, context) {
    target.width = Math.round(width * dpr);
    target.height = Math.round(height * dpr);
    target.style.width = `${width}px`;
    target.style.height = `${height}px`;
    context.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function makeBackgroundObjects() {
    const spacing = 16;
    columns = Array.from({ length: Math.ceil(width / spacing) + 1 }, (_, index) => ({
      x: index * spacing,
      y: random(-height, height),
      speed: random(70, 130),
      size: 13,
      phase: Math.floor(random(0, CONFIG.rainGlyphs.length)),
      length: Math.floor(random(8, 14)),
      opacity: random(.4, .8)
    }));

    stars = Array.from({ length: 50 }, () => ({
      x: random(0, width),
      y: random(0, height),
      r: random(.5, 1.2),
      phase: random(0, Math.PI * 2),
      speed: random(.6, 1.4)
    }));
  }

  function resize() {
    width = window.innerWidth || document.documentElement.clientWidth;
    height = window.innerHeight || document.documentElement.clientHeight;
    dpr = Math.max(window.devicePixelRatio || 1, 2);

    setCanvasSize(background, bg);
    setCanvasSize(canvas, ctx);
    bg.clearRect(0, 0, width, height);
    makeBackgroundObjects();
  }

  function phoneIsPortrait() {
    return mobile && height > width;
  }

  function renderRain(now) {
    if (now - lastRainFrame < 30) return;
    const dt = Math.min(.065, (now - lastRainFrame) / 1000 || .033);
    lastRainFrame = now;

    bg.clearRect(0, 0, width, height);
    bg.save();
    bg.textAlign = 'center';
    bg.textBaseline = 'middle';

    for (const col of columns) {
      col.y += col.speed * dt;
      if (col.y > height + 24) {
        col.y = random(-height * .8, -24);
      }
      const headY = Math.floor(col.y / col.size) * col.size;
      bg.font = `600 ${col.size}px 'Outfit', sans-serif`;

      for (let index = 0; index < col.length; index++) {
        const y = headY - index * col.size;
        if (y < -col.size || y > height + col.size) continue;
        const fade = 1 - index / col.length;
        const alpha = fade * fade * col.opacity * 0.85;

        if (index === 0) bg.fillStyle = `rgba(255, 255, 255, ${alpha})`;
        else if (index < 3) bg.fillStyle = `rgba(255, 40, 147, ${alpha})`;
        else bg.fillStyle = `rgba(160, 30, 200, ${alpha * 0.6})`;

        const glyph = (col.phase + index * 3 + Math.floor(headY / col.size)) % CONFIG.rainGlyphs.length;
        bg.fillText(CONFIG.rainGlyphs[Math.abs(glyph)], col.x, y);
      }
    }
    bg.restore();
  }

  function drawStars(now) {
    const t = now / 1000;
    ctx.save();
    for (const star of stars) {
      ctx.globalAlpha = 0.2 + Math.max(0, Math.sin(t * star.speed + star.phase)) * 0.5;
      ctx.fillStyle = '#ffb6c1';
      ctx.beginPath();
      ctx.arc(star.x, star.y, star.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  // --- High Resolution Text Sampling (Zero Blur) ---
  function sampleText(item) {
    sampleCanvas.width = Math.round(width * dpr);
    sampleCanvas.height = Math.round(height * dpr);
    sampleCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
    sampleCtx.clearRect(0, 0, width, height);

    const size = item.number ? Math.min(height * .38, width * .26) : Math.min(height * .18, width * .11);
    sampleCtx.font = `900 ${size}px 'Be Vietnam Pro', sans-serif`;
    sampleCtx.textAlign = 'center';
    sampleCtx.textBaseline = 'middle';
    sampleCtx.fillStyle = '#ffffff';
    sampleCtx.fillText(item.text, width / 2, height / 2);

    const imgData = sampleCtx.getImageData(0, 0, sampleCanvas.width, sampleCanvas.height);
    const pixels = imgData.data;
    const points = [];

    const step = Math.max(2, Math.floor(particleStep * dpr));

    for (let y = 0; y < sampleCanvas.height; y += step) {
      for (let x = 0; x < sampleCanvas.width; x += step) {
        const idx = (y * sampleCanvas.width + x) * 4;
        if (pixels[idx + 3] > 120) {
          points.push({ x: x / dpr, y: y / dpr });
        }
      }
    }
    return points;
  }

  function prepareText(item, oldParticles = []) {
    const points = sampleText(item);
    particles = points.map((target, index) => {
      const source = oldParticles.length ? oldParticles[index % oldParticles.length] : null;
      const angle = random(0, Math.PI * 2);
      const distance = random(width * .1, width * .3);
      return {
        x: source ? source.x : target.x + Math.cos(angle) * distance,
        y: source ? source.y : target.y + Math.sin(angle) * distance,
        tx: target.x,
        ty: target.y,
        vx: 0,
        vy: 0,
        size: random(1.1, 1.8),
        color: index % 3 === 0 ? '#ffffff' : '#ff69b4'
      };
    });
    exploded = false;
  }

  function explodeText() {
    if (exploded) return;
    exploded = true;
    for (const p of particles) {
      const angle = random(0, Math.PI * 2);
      const speed = random(90, 220);
      p.vx = Math.cos(angle) * speed;
      p.vy = Math.sin(angle) * speed;
    }
  }

  function drawTextScene(item, age, dt) {
    const dissolveStart = item.duration - 700;
    if (age >= dissolveStart) explodeText();
    const assembling = age < dissolveStart;
    const particleAlpha = assembling ? easeOutCubic(age / 500) : 1 - easeInCubic((age - dissolveStart) / 600);

    for (const p of particles) {
      if (assembling) {
        p.x += (p.tx - p.x) * 0.16;
        p.y += (p.ty - p.y) * 0.16;
      } else {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vx *= 0.94;
        p.vy *= 0.94;
      }
    }

    if (particles.length && particleAlpha > 0.01) {
      ctx.save();
      ctx.globalAlpha = particleAlpha;
      for (const p of particles) {
        ctx.fillStyle = p.color;
        ctx.shadowColor = '#ff1493';
        ctx.shadowBlur = 6;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
  }

  // --- ELEGANT CLASSIC ROMANTIC HEART FORMULA ---
  function heartPoint(t) {
    const sinT = Math.sin(t);
    const cosT = Math.cos(t);
    return {
      x: 16 * Math.pow(sinT, 3),
      y: -(14 * cosT - 5 * Math.cos(2 * t) - 2.5 * Math.cos(3 * t) - 1.2 * Math.cos(4 * t))
    };
  }

  function prepareHeart(sourceParticles) {
    heartCurve = Array.from({ length: 240 }, (_, index) => heartPoint((index / 240) * Math.PI * 2));

    heartParticles = Array.from({ length: heartParticleCount }, (_, index) => {
      const curveIndex = Math.floor((index / heartParticleCount) * 239);
      const point = heartCurve[curveIndex];
      const thickness = random(-0.9, 0.9);
      return {
        tx: point.x + random(-0.6, 0.6),
        ty: point.y + random(-0.6, 0.6),
        size: random(1.2, 2.0),
        color: index % 3 === 0 ? '#ffffff' : (index % 2 === 0 ? '#ff69b4' : '#ff1493'),
        phase: random(0, Math.PI * 2),
        sx: sourceParticles.length ? sourceParticles[index % sourceParticles.length].x : width / 2,
        sy: sourceParticles.length ? sourceParticles[index % sourceParticles.length].y : height / 2
      };
    });
  }

  function drawHeart(age) {
    const reveal = easeOutCubic(age / 1000);
    const pulse = 1 + 0.03 * Math.sin(age * 0.005);
    
    // ELEGANT HEART SCALE (Thon gọn, kiều diễm, xinh xắn)
    const scale = Math.min(width, height) * 0.020 * pulse;
    const scaleX = scale * 0.92;
    const scaleY = scale * 0.98;
    const centerX = width / 2;
    const centerY = height / 2 - scale * 0.5;

    ctx.save();
    ctx.globalAlpha = reveal;

    for (let index = 0; index < heartParticles.length; index++) {
      const p = heartParticles[index];
      const progress = easeOutCubic((age - (index / heartParticles.length) * 200) / 800);
      if (progress <= 0) continue;

      const targetX = centerX + p.tx * scaleX;
      const targetY = centerY + p.ty * scaleY;

      const curX = p.sx + (targetX - p.sx) * progress;
      const curY = p.sy + (targetY - p.sy) * progress;

      ctx.fillStyle = p.color;
      ctx.shadowColor = '#ff1493';
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.arc(curX, curY, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    // Render Crisp Center Text Inside Heart Cavity
    if (age > 1400) {
      const fontSize = Math.min(width * 0.042, height * 0.078, 26);
      ctx.save();
      ctx.globalAlpha = easeOutCubic((age - 1400) / 600);
      ctx.font = `700 ${fontSize}px 'Dancing Script', cursive`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = '#ff1493';
      ctx.shadowBlur = 14;
      ctx.fillText(CONFIG.finalMessage, centerX, centerY - scaleY * 1.0);
      ctx.restore();
    }

    if (age > 2200) {
      const subSize = Math.min(width * 0.018, height * 0.035, 12);
      ctx.save();
      ctx.globalAlpha = easeOutCubic((age - 2200) / 600) * 0.85;
      ctx.font = `700 ${subSize}px 'Be Vietnam Pro', sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#ffb6c1';
      ctx.shadowColor = '#ff1493';
      ctx.shadowBlur = 8;
      ctx.fillText(CONFIG.finalSubmessage, centerX, centerY + scaleY * 10.5);
      ctx.restore();
    }

    if (age > 3400) {
      if (replayButton) replayButton.classList.remove('hidden');
      if (audioHint) audioHint.classList.add('hidden');
    }
  }

  function enterScene(index, now) {
    const previousParticles = particles;
    currentIndex = index;
    currentSceneStart = now;
    if (CONFIG.timeline[index].heart) {
      particles = [];
      prepareHeart(previousParticles);
    } else {
      prepareText(CONFIG.timeline[index], previousParticles);
    }
  }

  function startSequence() {
    running = true;
    sequenceStart = performance.now();
    try {
      if (soundtrack) soundtrack.currentTime = 0;
    } catch (e) {}
    enterScene(0, sequenceStart);
    if (soundButton) soundButton.classList.remove('hidden');
    tryStartSound();
  }

  function stopSequence() {
    running = false;
    currentIndex = -1;
    particles = [];
    heartParticles = [];
    if (replayButton) replayButton.classList.add('hidden');
    try {
      if (soundtrack) soundtrack.pause();
    } catch (e) {}
  }

  async function tryStartSound() {
    if (!running || !soundtrack) return;
    soundtrack.muted = false;
    soundtrack.volume = .76;
    try {
      await soundtrack.play();
      if (audioHint) audioHint.classList.add('hidden');
      if (soundButton) soundButton.classList.remove('muted');
    } catch (_) {
      if (audioHint) audioHint.classList.remove('hidden');
      if (soundButton) soundButton.classList.add('muted');
    }
  }

  function triggerFullAppScreen() {
    try {
      if (document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen();
      } else if (document.documentElement.webkitRequestFullscreen) {
        document.documentElement.webkitRequestFullscreen();
      }
    } catch (e) {}
  }

  function updateOrientation() {
    const nextLandscape = !phoneIsPortrait();
    if (orientationOverlay) orientationOverlay.classList.toggle('hidden', nextLandscape);
    
    // Auto start on desktop or landscape
    if (!running) {
      landscape = true;
      startSequence();
    }
  }

  function draw(now) {
    const dt = Math.min(.034, (now - lastFrame) / 1000 || .016);
    lastFrame = now;

    renderRain(now);
    ctx.clearRect(0, 0, width, height);
    drawStars(now);

    if (running && currentIndex >= 0) {
      let item = CONFIG.timeline[currentIndex];
      let age = now - currentSceneStart;
      if (!item.heart && age >= item.duration + SCENE_GAP) {
        enterScene(currentIndex + 1, now);
        item = CONFIG.timeline[currentIndex];
        age = 0;
      }
      if (item.heart) drawHeart(age);
      else drawTextScene(item, age, dt);
    }
    raf = requestAnimationFrame(draw);
  }

  if (soundButton) {
    soundButton.addEventListener('click', event => {
      event.stopPropagation();
      if (soundtrack && soundtrack.paused) {
        tryStartSound();
        return;
      }
      if (soundtrack) {
        soundtrack.muted = !soundtrack.muted;
        soundButton.classList.toggle('muted', soundtrack.muted);
      }
    });
  }

  if (replayButton) {
    replayButton.addEventListener('click', event => {
      event.stopPropagation();
      try { if (soundtrack) soundtrack.currentTime = 0; } catch (e) {}
      startSequence();
    });
  }

  document.addEventListener('pointerdown', event => {
    triggerFullAppScreen();
    if (running && soundtrack && soundtrack.paused && !event.target.closest('button')) {
      tryStartSound();
    }
  }, { passive: true });

  window.addEventListener('resize', () => {
    resize();
    updateOrientation();
  });

  window.addEventListener('orientationchange', () => {
    setTimeout(() => {
      resize();
      updateOrientation();
    }, 150);
  });

  resize();
  landscape = true;
  if (orientationOverlay) orientationOverlay.classList.add('hidden');
  startSequence();
  raf = requestAnimationFrame(draw);
});
