// 淡い紫に合わせた光の粒・花びらをゆっくり降らせる(控えめ・軽量)。
// 非表示タブでは描画を止め、「視差効果を減らす」設定では何もしない。

const COLORS = [
  "255,255,255",
  "236,214,255",
  "255,205,230",
  "214,196,255",
];

function rand(min, max) {
  return min + Math.random() * (max - min);
}

function makeParticle(w, h, spawnAnywhere) {
  const petal = Math.random() < 0.45;
  return {
    petal,
    x: rand(0, w),
    y: spawnAnywhere ? rand(0, h) : rand(-40, -5),
    size: petal ? rand(5, 9) : rand(2, 5),
    vy: rand(0.25, 0.7),
    sway: rand(0.4, 1.2),
    phase: rand(0, Math.PI * 2),
    rot: rand(0, Math.PI * 2),
    vrot: rand(-0.015, 0.015),
    alpha: rand(0.35, 0.8),
    twinkle: rand(0.01, 0.04),
    color: COLORS[Math.floor(Math.random() * COLORS.length)],
  };
}

function drawPetal(ctx, p) {
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate(p.rot);
  ctx.beginPath();
  ctx.ellipse(0, 0, p.size, p.size * 0.55, 0, 0, Math.PI * 2);
  ctx.fillStyle = `rgba(${p.color},${p.alpha})`;
  ctx.fill();
  ctx.restore();
}

function drawSparkle(ctx, p, alpha) {
  const r = p.size;
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate(p.rot);
  ctx.beginPath(); // 4方向に尖った星
  ctx.moveTo(0, -r * 2);
  ctx.quadraticCurveTo(0, 0, r * 2, 0);
  ctx.quadraticCurveTo(0, 0, 0, r * 2);
  ctx.quadraticCurveTo(0, 0, -r * 2, 0);
  ctx.quadraticCurveTo(0, 0, 0, -r * 2);
  ctx.fillStyle = `rgba(${p.color},${alpha})`;
  ctx.shadowColor = `rgba(${p.color},.9)`;
  ctx.shadowBlur = 8;
  ctx.fill();
  ctx.restore();
}

export function startParticles(canvas) {
  if (!canvas || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const ctx = canvas.getContext("2d");
  let w = 0, h = 0, particles = [], raf = null, t = 0;

  const resize = () => {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = window.innerWidth;
    h = window.innerHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const count = Math.min(36, Math.round(w / 45)); // 控えめな数
    particles = Array.from({ length: count }, () => makeParticle(w, h, true));
  };

  const frame = () => {
    t += 1;
    ctx.clearRect(0, 0, w, h);
    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      p.y += p.vy;
      p.x += Math.sin(t * 0.01 + p.phase) * p.sway * 0.5;
      p.rot += p.vrot;
      if (p.y > h + 20) {
        particles[i] = makeParticle(w, h, false);
        continue;
      }
      if (p.petal) drawPetal(ctx, p);
      else drawSparkle(ctx, p, p.alpha * (0.6 + 0.4 * Math.sin(t * p.twinkle + p.phase)));
    }
    raf = requestAnimationFrame(frame);
  };

  const start = () => { if (raf === null) raf = requestAnimationFrame(frame); };
  const stop = () => { if (raf !== null) cancelAnimationFrame(raf); raf = null; };

  resize();
  window.addEventListener("resize", resize);
  document.addEventListener("visibilitychange", () => (document.hidden ? stop() : start()));
  // 登場演出のあとに粒が現れるよう、少し遅らせて開始
  canvas.style.opacity = "0";
  canvas.style.transition = "opacity 1.2s ease 0.6s";
  requestAnimationFrame(() => (canvas.style.opacity = "1"));
  start();
}
