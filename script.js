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
  const liveMessage = document.querySelector('#live-message');
  const soundtrack = document.querySelector('#soundtrack');

  const CONFIG = {
    finalMessage: 'Anh Tuấn  ♡  Quỳnh Nga',
    finalSubmessage: 'Mãi bên nhau bạn nhé',
    rainGlyphs: '01アイウエオカキクケコサシスセソ愛恋♡♥',
    timeline: [
      { text: '3', duration: 1400, number: true },
      { text: '2', duration: 1400, number: true },
      { text: '1', duration: 1400, number: true },
      { text: 'Gửi dấu yêu của anh', duration: 3900 },
      { text: 'Cảm ơn em', duration: 3900 },
      { text: 'Vì đã đến bên anh', duration: 3900 },
      { text: 'Anh yêu em rất nhiều ♥', duration: 3900 },
      { heart: true, duration: Infinity }
    ]
  };

  const SCENE_GAP = 150;
  const mobile = matchMedia('(pointer: coarse)').matches;
  const particleStep = mobile ? 8 : 7;
  const heartParticleCount = mobile ? 620 : 900;
  const maxDpr = mobile ? 1.25 : 1.55;
  const random = (min, max) => min + Math.random() * (max - min);
  const clamp = value => Math.min(1, Math.max(0, value));
  const easeOutCubic = t => 1 - Math.pow(1 - clamp(t), 3);
  const easeInCubic = t => Math.pow(clamp(t), 3);

  let width = 0;
  let height = 0;
  let dpr = 1;
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
  let resizeTimer = 0;
  let backgroundFocus = 1;

  function setCanvasSize(target, context) {
    target.width = Math.round(width * dpr);
    target.height = Math.round(height * dpr);
    target.style.width = `${width}px`;
    target.style.height = `${height}px`;
    context.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function makeBackgroundObjects() {
    const spacing = mobile ? 21 : 18;
    columns = Array.from({ length: Math.ceil(width / spacing) + 1 }, (_, index) => ({
      x: index * spacing,
      y: random(-height, height),
      speed: random(82, 148),
      size: spacing - 3,
      phase: Math.floor(random(0, CONFIG.rainGlyphs.length)),
      length: Math.floor(random(8, 15)),
      opacity: random(.42, .82)
    }));
    stars = Array.from({ length: mobile ? 42 : 65 }, () => ({
      x: random(0, width),
      y: random(0, height),
      r: random(.4, 1.15),
      phase: random(0, Math.PI * 2),
      speed: random(.6, 1.5),
      warm: Math.random() < .12
    }));
  }

  function resize() {
    const oldWidth = width || window.innerWidth;
    const oldHeight = height || window.innerHeight;
    width = window.innerWidth;
    height = window.innerHeight;
    dpr = Math.min(window.devicePixelRatio || 1, maxDpr);
    setCanvasSize(background, bg);
    setCanvasSize(canvas, ctx);
    bg.clearRect(0, 0, width, height);
    makeBackgroundObjects();

    if (particles.length && running) {
      const sx = width / oldWidth;
      const sy = height / oldHeight;
      for (const p of particles) {
        p.x *= sx; p.tx *= sx;
        p.y *= sy; p.ty *= sy;
      }
    }
  }

  function phoneIsPortrait() {
    return mobile && height > width;
  }

  function renderRain(now) {
    if (now - lastRainFrame < 32) return;
    const dt = Math.min(.065, (now - lastRainFrame) / 1000 || .033);
    lastRainFrame = now;

    bg.clearRect(0, 0, width, height);
    bg.save();
    bg.textAlign = 'center';
    bg.textBaseline = 'middle';
    for (const col of columns) {
      col.y += col.speed * dt * (.28 + backgroundFocus * .72);
      if (col.y > height + 24) {
        col.y = random(-height * .8, -24);
        col.speed = random(82, 148);
      }
      const headY = Math.floor(col.y / col.size) * col.size;
      bg.font = `600 ${col.size}px ui-monospace, SFMono-Regular, Menlo, monospace`;
      for (let index = 0; index < col.length; index++) {
        const y = headY - index * col.size;
        if (y < -col.size || y > height + col.size) continue;
        const fade = 1 - index / col.length;
        const centerDistance = Math.abs(col.x - width / 2) / (width * .3);
        const centerMask = .48 + Math.min(1, centerDistance) * .52;
        const alpha = fade * fade * col.opacity * backgroundFocus * centerMask;
        if (index === 0) bg.fillStyle = `rgba(255, 226, 242, ${alpha})`;
        else if (index < 3) bg.fillStyle = `rgba(246, 73, 164, ${alpha * .78})`;
        else bg.fillStyle = `rgba(166, 35, 139, ${alpha * .48})`;
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
      ctx.globalAlpha = (.13 + Math.max(0, Math.sin(t * star.speed + star.phase)) * .45) * (.55 + backgroundFocus * .45);
      ctx.fillStyle = star.warm ? '#ffd6a1' : '#ffd9ed';
      ctx.beginPath();
      ctx.arc(star.x, star.y, star.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  function getTextMetrics(item) {
    const lines = item.text.split('\n');
    const longest = lines.reduce((a, b) => a.length > b.length ? a : b, '');
    const maxWidth = width * .78;
    let size = item.number ? Math.min(height * .36, width * .24) : Math.min(height * .16, width * .09);
    sampleCtx.font = `800 ${size}px "Be Vietnam Pro", Arial, sans-serif`;
    const measured = sampleCtx.measureText(longest).width;
    if (measured > maxWidth) size *= maxWidth / measured;
    return { lines, size, lineHeight: size * 1.18 };
  }

  function sampleText(item) {
    sampleCanvas.width = Math.max(1, Math.round(width));
    sampleCanvas.height = Math.max(1, Math.round(height));
    sampleCtx.setTransform(1, 0, 0, 1, 0, 0);
    sampleCtx.clearRect(0, 0, width, height);
    const metrics = getTextMetrics(item);
    sampleCtx.font = `800 ${metrics.size}px "Be Vietnam Pro", Arial, sans-serif`;
    sampleCtx.textAlign = 'center';
    sampleCtx.textBaseline = 'middle';
    sampleCtx.fillStyle = '#fff';
    const totalHeight = (metrics.lines.length - 1) * metrics.lineHeight;
    metrics.lines.forEach((line, index) => {
      sampleCtx.fillText(line, width / 2, height / 2 - totalHeight / 2 + index * metrics.lineHeight);
    });

    const pixels = sampleCtx.getImageData(0, 0, sampleCanvas.width, sampleCanvas.height).data;
    const points = [];
    for (let y = 0; y < height; y += particleStep) {
      for (let x = 0; x < width; x += particleStep) {
        if (pixels[(y * sampleCanvas.width + x) * 4 + 3] > 110) points.push({ x, y });
      }
    }
    return { points, metrics };
  }

  function prepareText(item, oldParticles = []) {
    const { points } = sampleText(item);
    particles = points.map((target, index) => {
      const source = oldParticles.length ? oldParticles[index % oldParticles.length] : null;
      const angle = random(0, Math.PI * 2);
      const distance = random(Math.min(width, height) * .16, Math.max(width, height) * .42);
      return {
        x: source ? source.x : target.x + Math.cos(angle) * distance,
        y: source ? source.y : target.y + Math.sin(angle) * distance,
        tx: target.x,
        ty: target.y,
        vx: source ? source.vx * .38 : 0,
        vy: source ? source.vy * .38 : 0,
        size: random(.8, 1.55),
        pink: index % 4 !== 0
      };
    });
    exploded = false;
  }

  function explodeText() {
    if (exploded) return;
    exploded = true;
    for (const p of particles) {
      const dx = p.x - width / 2;
      const dy = p.y - height / 2;
      const length = Math.hypot(dx, dy) || 1;
      const speed = random(85, 210);
      p.vx = dx / length * speed + random(-48, 48);
      p.vy = dy / length * speed + random(-42, 22);
    }
  }

  function drawParticleBatch(alpha) {
    if (!particles.length || alpha <= .01) return;

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = alpha * .22;
    ctx.fillStyle = '#ff3094';
    ctx.filter = 'blur(4px)';
    ctx.beginPath();
    for (const p of particles) {
      ctx.moveTo(p.x + 4, p.y);
      ctx.arc(p.x, p.y, p.size + 3, 0, Math.PI * 2);
    }
    ctx.fill();
    ctx.filter = 'none';

    for (const pink of [true, false]) {
      ctx.globalAlpha = alpha * (pink ? .78 : .95);
      ctx.fillStyle = pink ? '#ff76ba' : '#fff5fb';
      ctx.beginPath();
      for (const p of particles) {
        if (p.pink !== pink) continue;
        ctx.moveTo(p.x + p.size, p.y);
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      }
      ctx.fill();
    }
    ctx.restore();
  }

  function drawTextScene(item, age, dt) {
    const dissolveStart = item.duration - 720;
    if (age >= dissolveStart) explodeText();
    const assembling = age < dissolveStart;
    const particleAlpha = assembling ? easeOutCubic(age / 650) : 1 - easeInCubic((age - dissolveStart) / 680);

    for (const p of particles) {
      if (assembling) {
        const pull = Math.min(.28, dt * 12.5);
        p.vx *= Math.pow(.83, dt * 60);
        p.vy *= Math.pow(.83, dt * 60);
        p.x += (p.tx - p.x) * pull + p.vx * dt;
        p.y += (p.ty - p.y) * pull + p.vy * dt;
      } else {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vx *= Math.pow(.97, dt * 60);
        p.vy = p.vy * Math.pow(.975, dt * 60) - 8 * dt;
      }
    }
    drawParticleBatch(particleAlpha);

    const textIn = easeOutCubic((age - 360) / 300);
    const textOut = age < dissolveStart ? 1 : 1 - easeInCubic((age - dissolveStart) / 470);
    const textAlpha = textIn * textOut;
    if (textAlpha <= .01) return;

    const metrics = getTextMetrics(item);
    const totalHeight = (metrics.lines.length - 1) * metrics.lineHeight;
    ctx.save();
    ctx.globalAlpha = textAlpha * .94;
    ctx.font = `800 ${metrics.size}px "Be Vietnam Pro", Arial, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#fff1f9';
    ctx.shadowColor = '#ff4fa4';
    ctx.shadowBlur = item.number ? 20 : 14;
    metrics.lines.forEach((line, index) => {
      ctx.fillText(line, width / 2, height / 2 - totalHeight / 2 + index * metrics.lineHeight);
    });
    ctx.restore();
  }

  function heartPoint(t) {
    return {
      x: 16 * Math.pow(Math.sin(t), 3),
      y: -(13 * Math.cos(t) - 5 * Math.cos(2*t) - 2 * Math.cos(3*t) - Math.cos(4*t)) - .7
    };
  }

  function prepareHeart(sourceParticles) {
    const rawCurve = Array.from({ length: 160 }, (_, index) => heartPoint(index / 160 * Math.PI * 2));
    heartCurve = rawCurve.map((point, index) => {
      const previous = rawCurve[(index - 1 + rawCurve.length) % rawCurve.length];
      const next = rawCurve[(index + 1) % rawCurve.length];
      const tangentX = next.x - previous.x;
      const tangentY = next.y - previous.y;
      const tangentLength = Math.hypot(tangentX, tangentY) || 1;
      return { ...point, nx: -tangentY / tangentLength, ny: tangentX / tangentLength };
    });
    heartParticles = Array.from({ length: heartParticleCount }, (_, index) => {
      const streamCount = 5;
      const stream = index % streamCount;
      const slot = Math.floor(index / streamCount);
      const slotCount = Math.ceil(heartParticleCount / streamCount);
      return {
        curvePosition: slot / slotCount * heartCurve.length + random(-.42, .42),
        orbitSpeed: (stream % 2 === 0 ? 1 : -1) * (4.25 + stream * .32),
        thickness: random(-1.34, 1.34),
        size: random(.55, 1.3),
        tone: index % 7 === 0 ? 2 : stream % 2,
        lane: stream,
        phase: random(0, Math.PI * 2),
        sx: sourceParticles.length ? sourceParticles[index % sourceParticles.length].x : width / 2 + random(-width * .28, width * .28),
        sy: sourceParticles.length ? sourceParticles[index % sourceParticles.length].y : height / 2 + random(-height * .25, height * .25)
      };
    });
  }

  function drawHeart(age) {
    const reveal = easeOutCubic(age / 1200);
    const firstBeat = Math.exp(-Math.pow((age - 1260) / 105, 2)) * .075;
    const secondBeat = Math.exp(-Math.pow((age - 1510) / 125, 2)) * .045;
    const idleBeat = age > 1900 ? Math.sin(age / 520) * .008 : 0;
    const scale = Math.min(width / 42, height / 33) * .94 * (1 + firstBeat + secondBeat + idleBeat);
    const time = age * .001;
    const centerX = width / 2;
    const centerY = height / 2 - Math.min(20, height * .055);
    const positions = [];

    for (let index = 0; index < heartParticles.length; index++) {
      const particle = heartParticles[index];
      const progress = easeOutCubic((age - index / heartParticles.length * 240) / 900);
      if (progress <= 0) continue;
      const rawCurvePosition = particle.curvePosition + time * particle.orbitSpeed;
      const curvePosition = ((rawCurvePosition % heartCurve.length) + heartCurve.length) % heartCurve.length;
      const curveIndex = Math.floor(curvePosition);
      const nextIndex = (curveIndex + 1) % heartCurve.length;
      const mix = curvePosition - curveIndex;
      const currentPoint = heartCurve[curveIndex];
      const nextPoint = heartCurve[nextIndex];
      const pointX = currentPoint.x + (nextPoint.x - currentPoint.x) * mix;
      const pointY = currentPoint.y + (nextPoint.y - currentPoint.y) * mix;
      const normalX = currentPoint.nx + (nextPoint.nx - currentPoint.nx) * mix;
      const normalY = currentPoint.ny + (nextPoint.ny - currentPoint.ny) * mix;
      const flowWave = Math.sin(particle.curvePosition * .26 - time * 3.2 + particle.lane * .55) * .14;
      const flowingThickness = particle.thickness + flowWave;
      const targetX = centerX + (pointX + normalX * flowingThickness) * scale;
      const targetY = centerY + (pointY + normalY * flowingThickness) * scale;
      const lightWave = Math.sin(curvePosition * .24 - time * 4.6 + particle.lane * .42);
      positions.push({
        particle,
        x: particle.sx + (targetX - particle.sx) * progress,
        y: particle.sy + (targetY - particle.sy) * progress,
        size: particle.size * (.78 + Math.max(0, Math.sin(time * 2 + particle.phase)) * .46),
        highlight: lightWave > .84
      });
    }

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = reveal * .2;
    ctx.fillStyle = '#ff258b';
    ctx.shadowColor = '#ff258b';
    ctx.shadowBlur = 10;
    ctx.beginPath();
    for (const position of positions) {
      const radius = position.size + 1.7;
      ctx.moveTo(position.x + radius, position.y);
      ctx.arc(position.x, position.y, radius, 0, Math.PI * 2);
    }
    ctx.fill();
    ctx.shadowBlur = 0;

    const tones = ['#ff3f98', '#ff72b8', '#ffeaf5'];
    for (let tone = 0; tone < tones.length; tone++) {
      ctx.globalAlpha = reveal * (tone === 2 ? .96 : .82);
      ctx.fillStyle = tones[tone];
      ctx.beginPath();
      for (const position of positions) {
        const particle = position.particle;
        if (particle.tone !== tone) continue;
        ctx.moveTo(position.x + position.size, position.y);
        ctx.arc(position.x, position.y, position.size, 0, Math.PI * 2);
      }
      ctx.fill();
    }

    ctx.globalAlpha = reveal * .92;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    for (const position of positions) {
      if (!position.highlight) continue;
      const radius = position.size + .65;
      ctx.moveTo(position.x + radius, position.y);
      ctx.arc(position.x, position.y, radius, 0, Math.PI * 2);
    }
    ctx.fill();
    ctx.restore();

    if (age > 1650) {
      const fontSize = Math.min(width * .052, height * .105, 31);
      ctx.save();
      ctx.globalAlpha = easeOutCubic((age - 1650) / 650);
      ctx.font = `700 ${fontSize}px "Dancing Script", cursive`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#fff4fa';
      ctx.shadowColor = '#ff3b98';
      ctx.shadowBlur = 13;
      ctx.fillText(CONFIG.finalMessage, centerX, centerY - scale * 1.2);
      ctx.restore();
    }

    if (age > 2450) {
      const subSize = Math.min(width * .019, height * .038, 13);
      ctx.save();
      ctx.globalAlpha = easeOutCubic((age - 2450) / 650) * .8;
      ctx.font = `600 ${subSize}px "Be Vietnam Pro", Arial, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#f3bdd9';
      ctx.shadowColor = '#ff3b98';
      ctx.shadowBlur = 8;
      ctx.fillText(CONFIG.finalSubmessage, centerX, centerY + scale * 2.15);
      ctx.restore();
    }

    if (age > 3600) {
      replayButton.classList.remove('hidden');
      audioHint.classList.add('hidden');
    }
  }

  function enterScene(index, now) {
    const previousParticles = particles;
    currentIndex = index;
    currentSceneStart = now;
    if (CONFIG.timeline[index].heart) {
      particles = [];
      prepareHeart(previousParticles);
      replayButton.classList.add('hidden');
      liveMessage.textContent = `${CONFIG.finalMessage}. ${CONFIG.finalSubmessage}.`;
    } else {
      prepareText(CONFIG.timeline[index], previousParticles);
      replayButton.classList.add('hidden');
      liveMessage.textContent = CONFIG.timeline[index].text;
    }
  }

  function startSequence() {
    if (!landscape) return;
    running = true;
    sequenceStart = performance.now();
    soundtrack.currentTime = 0;
    enterScene(0, sequenceStart);
    soundButton.classList.remove('hidden');
    tryStartSound(false);
  }

  function stopSequence() {
    running = false;
    currentIndex = -1;
    particles = [];
    heartParticles = [];
    replayButton.classList.add('hidden');
    soundtrack.pause();
  }

  function syncAudioToSequence() {
    const seconds = Math.max(0, (performance.now() - sequenceStart) / 1000);
    if (Number.isFinite(soundtrack.duration)) soundtrack.currentTime = Math.min(seconds, Math.max(0, soundtrack.duration - .2));
  }

  async function tryStartSound(sync) {
    if (!running) return;
    if (sync) syncAudioToSequence();
    soundtrack.muted = false;
    soundtrack.volume = .76;
    try {
      await soundtrack.play();
      audioHint.classList.add('hidden');
      soundButton.classList.remove('muted');
    } catch (_) {
      audioHint.classList.remove('hidden');
      soundButton.classList.add('muted');
    }
  }

  function updateOrientation() {
    const nextLandscape = !phoneIsPortrait();
    orientationOverlay.classList.toggle('hidden', nextLandscape);
    if (nextLandscape && !landscape) {
      landscape = true;
      startSequence();
    } else if (!nextLandscape && landscape) {
      landscape = false;
      stopSequence();
    } else {
      landscape = nextLandscape;
    }
  }

  function draw(now) {
    const dt = Math.min(.034, (now - lastFrame) / 1000 || .016);
    lastFrame = now;
    const heartActive = running && currentIndex >= 0 && CONFIG.timeline[currentIndex].heart;
    const focusTarget = heartActive ? .38 : 1;
    backgroundFocus += (focusTarget - backgroundFocus) * Math.min(1, dt * 2.2);
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

  soundButton.addEventListener('click', event => {
    event.stopPropagation();
    if (soundtrack.paused) {
      tryStartSound(true);
      return;
    }
    soundtrack.muted = !soundtrack.muted;
    soundButton.classList.toggle('muted', soundtrack.muted);
  });

  replayButton.addEventListener('click', event => {
    event.stopPropagation();
    soundtrack.currentTime = 0;
    startSequence();
  });

  document.addEventListener('pointerdown', event => {
    if (running && soundtrack.paused && !event.target.closest('button')) tryStartSound(true);
  }, { passive: true });

  window.addEventListener('resize', () => {
    window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(() => {
      resize();
      updateOrientation();
    }, 100);
  }, { passive: true });

  window.addEventListener('orientationchange', () => {
    window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(() => {
      resize();
      updateOrientation();
    }, 160);
  });

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      cancelAnimationFrame(raf);
    } else {
      lastFrame = performance.now();
      lastRainFrame = lastFrame;
      raf = requestAnimationFrame(draw);
    }
  });

  resize();
  landscape = !phoneIsPortrait();
  orientationOverlay.classList.toggle('hidden', landscape);
  raf = requestAnimationFrame(draw);

  const preview = new URLSearchParams(location.search).get('preview');
  if (landscape && preview === 'heart') {
    running = true;
    sequenceStart = performance.now();
    backgroundFocus = .38;
    replayButton.style.display = 'none';
    enterScene(CONFIG.timeline.length - 1, sequenceStart - 2700);
  } else if (landscape) {
    startSequence();
  }
});
