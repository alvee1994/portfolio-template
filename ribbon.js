// Animated ribbon of thin lines in the hero. Colour comes from --accent.
(function () {
  const c = document.getElementById('ribbon');
  if (!c) return;
  const ctx = c.getContext('2d');
  const color = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim();
  const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const N = 70;
  let w, h;

  function size() {
    const r = devicePixelRatio || 1;
    w = c.clientWidth; h = c.clientHeight;
    c.width = w * r; c.height = h * r;
    ctx.setTransform(r, 0, 0, r, 0, 0);
  }

  function draw(t) {
    ctx.clearRect(0, 0, w, h);
    ctx.strokeStyle = color;
    ctx.lineWidth = 0.7;
    const cx = w * 0.72, cy = h * 0.4, R = Math.max(w, h) * 0.5;
    for (let i = 0; i < N; i++) {
      const k = i / N;
      // each line is a tilted ellipse; phase offset per line makes the band twist over time
      const twist = Math.sin(t * 0.0004 + k * 3) * 0.35;
      ctx.globalAlpha = 0.15 + 0.55 * Math.sin(Math.PI * k);
      ctx.beginPath();
      ctx.ellipse(cx + Math.sin(t * 0.0003 + k * 2) * 20, cy, R * (0.78 + 0.18 * k), R * (0.42 + 0.3 * Math.abs(twist)),
        -0.6 + k * 0.5 + twist, 0, Math.PI * 2);
      ctx.stroke();
    }
    if (!still) requestAnimationFrame(draw);
  }

  size();
  addEventListener('resize', size);
  requestAnimationFrame(draw);
})();
