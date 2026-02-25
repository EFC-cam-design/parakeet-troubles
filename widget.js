/* ============================================================
   WISH & GRATEFUL — StreamElements Widget JavaScript
   Paste into the SE Custom Widget JS tab.
   ============================================================ */

(function () {
  'use strict';

  // ============================================================
  // NAMED CONSTELLATION GROUPS
  // cx/cy are normalised (0-1) screen positions for zone centres
  // ============================================================
  const CONSTELLATIONS = [
    { name: 'The Dreamers',  cx: 0.18, cy: 0.22 },
    { name: 'The Seekers',   cx: 0.82, cy: 0.20 },
    { name: 'The Hopeful',   cx: 0.50, cy: 0.13 },
    { name: 'The Brave',     cx: 0.15, cy: 0.72 },
    { name: 'The Creators',  cx: 0.85, cy: 0.72 },
    { name: 'The Wanderers', cx: 0.50, cy: 0.83 },
    { name: 'The Guardians', cx: 0.28, cy: 0.50 },
    { name: 'The Luminous',  cx: 0.72, cy: 0.50 },
  ];

  // Garden element types cycle in order
  const GARDEN_TYPES = ['plum', 'koi', 'stone', 'bridge', 'bamboo', 'ripple'];

  // ============================================================
  // GLOBAL STATE
  // ============================================================
  let cfg = {};

  let stars      = [];   // { id, username, text, x, y, constName, opacity, size, phase, addedAt }
  let gratitudes = [];   // { id, username, text, elementType, addedAt }
  let bgStars    = [];   // { x, y, r, phase, speed, brightness }

  let wishQueue     = [];
  let gratefulQueue = [];
  let processingWish     = false;
  let processingGrateful = false;

  // DOM references
  let starCanvas, starCtx, svgLayer;
  let parchmentEl, parchmentUsername, parchmentText;
  let scrollEl, entryUsername, entryText, gardenSvg;

  // ============================================================
  // INIT
  // ============================================================
  function init(fields) {
    cfg = parseFields(fields);

    // Inject Google Font
    if (cfg.fontName && cfg.fontName.toLowerCase() !== 'default') {
      const link = document.createElement('link');
      link.rel  = 'stylesheet';
      link.href = 'https://fonts.googleapis.com/css2?family='
                + encodeURIComponent(cfg.fontName)
                + ':wght@400;700&display=swap';
      document.head.appendChild(link);
    }

    applyCSSVars();
    cacheDOMRefs();
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    positionScroll();
    initBgStars();
    startAnimLoop();

    loadState().then(() => {
      redrawAllStars();
      redrawGarden();
    });
  }

  function parseFields(f) {
    return {
      persistenceMode:        f.persistenceMode        || 'session',
      triggerType:            f.triggerType            || 'both',
      wishCommand:            (f.wishCommand           || '!wish').toLowerCase().trim(),
      gratefulCommand:        (f.gratefulCommand       || '!grateful').toLowerCase().trim(),
      wishRedemptionName:     (f.wishRedemptionName    || 'wish').toLowerCase().trim(),
      gratefulRedemptionName: (f.gratefulRedemptionName|| 'grateful').toLowerCase().trim(),
      maxStars:               Math.max(10, parseInt(f.maxStars)              || 50),
      wishDuration:           Math.max(3,  parseFloat(f.wishDuration)        || 6)  * 1000,
      gratefulDuration:       Math.max(3,  parseFloat(f.gratefulDuration)    || 8)  * 1000,
      animSpeed:              Math.max(0.25, parseFloat(f.animSpeed)         || 1),
      chartBgColor:           f.chartBgColor           || '#0a0a2e',
      starColor:              f.starColor              || '#ffffff',
      starGlowColor:          f.starGlowColor          || '#88aaff',
      constellationColor:     f.constellationColor     || '#4466aa',
      parchmentBgColor:       f.parchmentBgColor       || '#0d0d2b',
      parchmentTextColor:     f.parchmentTextColor     || '#d4af37',
      scrollPaperColor:       f.scrollPaperColor       || '#f4e8c1',
      scrollInkColor:         f.scrollInkColor         || '#1a0a00',
      blossomColor:           f.blossomColor           || '#ffb7c5',
      starShape:              f.starShape              || 'star',
      fontName:               f.fontName               || 'Cinzel',
      enableSound:            f.enableSound            === true,
      wishSoundUrl:           f.wishSoundUrl           || '',
      gratefulSoundUrl:       f.gratefulSoundUrl       || '',
      showUsernames:          f.showUsernames           !== false,
      showConstNames:         f.showConstNames          !== false,
      showTooltip:            f.showTooltip             !== false,
      bgStarCount:            Math.min(600, Math.max(50, parseInt(f.bgStarCount) || 200)),
      nebulaEffect:           f.nebulaEffect           || 'subtle',
      scrollPosition:         f.scrollPosition         || 'top-center',
      scrollWidth:            Math.max(300, Math.min(1200, parseInt(f.scrollWidth) || 600)),
    };
  }

  function applyCSSVars() {
    const r = document.documentElement.style;
    r.setProperty('--chart-bg',       cfg.chartBgColor);
    r.setProperty('--star-color',     cfg.starColor);
    r.setProperty('--star-glow',      cfg.starGlowColor);
    r.setProperty('--constellation',  cfg.constellationColor);
    r.setProperty('--parchment-bg',   cfg.parchmentBgColor);
    r.setProperty('--parchment-text', cfg.parchmentTextColor);
    r.setProperty('--scroll-paper',   cfg.scrollPaperColor);
    r.setProperty('--scroll-ink',     cfg.scrollInkColor);
    r.setProperty('--blossom',        cfg.blossomColor);
    r.setProperty('--font-family',    `'${cfg.fontName}', serif`);
    r.setProperty('--scroll-width',   cfg.scrollWidth + 'px');
    // Scale animation durations by animSpeed
    const s = cfg.animSpeed;
    r.setProperty('--open-dur',              (0.8  / s) + 's');
    r.setProperty('--close-dur',             (0.65 / s) + 's');
    r.setProperty('--parchment-open-dur',    (0.5  / s) + 's');
    r.setProperty('--parchment-close-dur',   (0.45 / s) + 's');
  }

  function cacheDOMRefs() {
    starCanvas       = document.getElementById('star-canvas');
    starCtx          = starCanvas.getContext('2d');
    svgLayer         = document.getElementById('svg-layer');
    parchmentEl      = document.getElementById('wish-parchment');
    parchmentUsername= parchmentEl.querySelector('.parchment-username');
    parchmentText    = parchmentEl.querySelector('.parchment-text');
    scrollEl         = document.getElementById('grateful-scroll');
    entryUsername    = scrollEl.querySelector('.entry-username');
    entryText        = scrollEl.querySelector('.entry-text');
    gardenSvg        = document.getElementById('garden-svg');
    gardenSvg.setAttribute('width',  cfg.scrollWidth - 36);
    gardenSvg.setAttribute('height', 260);
  }

  function resizeCanvas() {
    starCanvas.width  = window.innerWidth;
    starCanvas.height = window.innerHeight;
    svgLayer.setAttribute('viewBox', `0 0 ${window.innerWidth} ${window.innerHeight}`);
    svgLayer.setAttribute('width',  window.innerWidth);
    svgLayer.setAttribute('height', window.innerHeight);
  }

  // ============================================================
  // BACKGROUND STAR FIELD
  // ============================================================
  function initBgStars() {
    bgStars = Array.from({ length: cfg.bgStarCount }, () => ({
      x:          Math.random(),
      y:          Math.random(),
      r:          0.3 + Math.random() * 1.3,
      phase:      Math.random() * Math.PI * 2,
      speed:      0.5 + Math.random() * 1.8,
      brightness: 0.3 + Math.random() * 0.7,
    }));
  }

  // ============================================================
  // ANIMATION LOOP
  // ============================================================
  function startAnimLoop() {
    function loop(ts) {
      drawFrame(ts);
      requestAnimationFrame(loop);
    }
    requestAnimationFrame(loop);
  }

  function drawFrame(ts) {
    const w   = starCanvas.width;
    const h   = starCanvas.height;
    const ctx = starCtx;

    ctx.clearRect(0, 0, w, h);

    // Deep space background
    ctx.fillStyle = cfg.chartBgColor;
    ctx.fillRect(0, 0, w, h);

    // Nebula blobs
    if (cfg.nebulaEffect !== 'none') drawNebulae(ctx, w, h);

    // Background twinkling micro-stars
    bgStars.forEach(s => {
      const twinkle = 0.6 + 0.4 * Math.sin(ts * 0.001 * s.speed + s.phase);
      ctx.beginPath();
      ctx.arc(s.x * w, s.y * h, s.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255,255,255,${(s.brightness * twinkle).toFixed(3)})`;
      ctx.fill();
    });

    // User wish-stars (drawn with glow)
    stars.forEach(star => {
      if (star.opacity > 0) renderUserStar(ctx, star, ts);
    });
  }

  function drawNebulae(ctx, w, h) {
    const alpha = cfg.nebulaEffect === 'vibrant' ? 0.09 : 0.045;
    const patches = [
      { x: 0.28, y: 0.38, r: 0.32, color: `rgba(110,55,165,${alpha * 2})` },
      { x: 0.72, y: 0.60, r: 0.35, color: `rgba(20,65,130,${alpha * 2})` },
      { x: 0.50, y: 0.50, r: 0.20, color: `rgba(60,20,100,${alpha})` },
    ];
    patches.forEach(p => {
      const g = ctx.createRadialGradient(p.x * w, p.y * h, 0, p.x * w, p.y * h, p.r * Math.max(w, h));
      g.addColorStop(0, p.color);
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
    });
  }

  function renderUserStar(ctx, star, ts) {
    const { x, y, size, phase, opacity } = star;
    const twinkle = 0.88 + 0.12 * Math.sin(ts * 0.0018 + phase);
    const a = opacity * twinkle;

    ctx.save();
    ctx.globalAlpha = a;

    // Outer glow halo
    const haloR = size * 5;
    const halo  = ctx.createRadialGradient(x, y, 0, x, y, haloR);
    halo.addColorStop(0,   cfg.starGlowColor + 'cc');
    halo.addColorStop(0.4, cfg.starGlowColor + '44');
    halo.addColorStop(1,   cfg.starGlowColor + '00');
    ctx.fillStyle = halo;
    ctx.beginPath();
    ctx.arc(x, y, haloR, 0, Math.PI * 2);
    ctx.fill();

    // Star body
    ctx.fillStyle = cfg.starColor;
    if (cfg.starShape === 'circle') {
      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fill();
    } else if (cfg.starShape === 'sparkle') {
      drawSparkleShape(ctx, x, y, size, ts * 0.0006 + phase);
    } else {
      drawFivePointStar(ctx, x, y, size, size * 0.42);
    }

    ctx.restore();
  }

  function drawFivePointStar(ctx, cx, cy, outerR, innerR) {
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const angle = (Math.PI / 5) * i - Math.PI / 2;
      const r     = i % 2 === 0 ? outerR : innerR;
      const fn    = i === 0 ? 'moveTo' : 'lineTo';
      ctx[fn](cx + Math.cos(angle) * r, cy + Math.sin(angle) * r);
    }
    ctx.closePath();
    ctx.fill();
  }

  function drawSparkleShape(ctx, cx, cy, size, rot) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(rot);
    ctx.strokeStyle = cfg.starColor;
    ctx.lineWidth   = size * 0.5;
    ctx.lineCap     = 'round';
    for (let i = 0; i < 4; i++) {
      const angle = (Math.PI / 2) * i;
      const len   = (i % 2 === 0 ? size * 2.2 : size * 1.5);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(Math.cos(angle) * len, Math.sin(angle) * len);
      ctx.stroke();
    }
    ctx.restore();
  }

  // ============================================================
  // WISH — PARCHMENT + STAR FLOW
  // ============================================================
  function triggerWish(username, text) {
    wishQueue.push({ username, text });
    drainWishQueue();
  }

  function drainWishQueue() {
    if (processingWish || wishQueue.length === 0) return;
    processingWish = true;
    const { username, text } = wishQueue.shift();
    showParchment(username, text, () => {
      const star = addStar(username, text);
      fadeInStar(star, () => {
        refreshConstellationSVG();
        if (cfg.showUsernames) flashStarLabel(star);
        saveState();
        playSound(cfg.wishSoundUrl);
        setTimeout(() => { processingWish = false; drainWishQueue(); }, 600);
      });
    });
  }

  function showParchment(username, text, onDone) {
    parchmentUsername.textContent = username;
    parchmentText.textContent     = '\u201c' + text + '\u201d';

    parchmentEl.classList.remove('parchment-close');
    parchmentEl.classList.add('parchment-open');

    setTimeout(() => {
      parchmentEl.classList.remove('parchment-open');
      parchmentEl.classList.add('parchment-close');
      const closeMs = (450 / cfg.animSpeed);
      setTimeout(onDone, closeMs);
    }, cfg.wishDuration);
  }

  function addStar(username, text) {
    const cIdx = stars.length % CONSTELLATIONS.length;
    const c    = CONSTELLATIONS[cIdx];

    // Place within constellation zone (zone radius ~12% of screen)
    const zoneR = 0.12;
    const angle = Math.random() * Math.PI * 2;
    const dist  = Math.sqrt(Math.random()) * zoneR;
    const xN    = Math.max(0.04, Math.min(0.96, c.cx + Math.cos(angle) * dist));
    const yN    = Math.max(0.04, Math.min(0.96, c.cy + Math.sin(angle) * dist));

    const star = {
      id:        Date.now() + Math.random(),
      username,
      text,
      x:         xN * window.innerWidth,
      y:         yN * window.innerHeight,
      constName: c.name,
      opacity:   0,
      size:      5 + Math.random() * 4,
      phase:     Math.random() * Math.PI * 2,
      addedAt:   Date.now(),
    };

    if (stars.length >= cfg.maxStars) {
      const removed = stars.shift();
      // Remove old SVG label if present
      const old = document.getElementById('star-lbl-' + removed.id);
      if (old) old.remove();
    }

    stars.push(star);
    return star;
  }

  function fadeInStar(star, onDone) {
    const step = 0.04 * cfg.animSpeed;
    const iv   = setInterval(() => {
      star.opacity = Math.min(1, star.opacity + step);
      if (star.opacity >= 1) { clearInterval(iv); onDone(); }
    }, 40);
  }

  function flashStarLabel(star) {
    const ns   = 'http://www.w3.org/2000/svg';
    const el   = document.createElementNS(ns, 'text');
    el.id      = 'star-lbl-' + star.id;
    el.setAttribute('x', star.x);
    el.setAttribute('y', star.y - star.size - 8);
    el.setAttribute('text-anchor', 'middle');
    el.setAttribute('class', 'star-name');
    el.textContent = star.username;
    svgLayer.appendChild(el);
    // Force reflow then fade in
    requestAnimationFrame(() => el.classList.add('visible'));
    // Fade out after 5 s
    setTimeout(() => {
      el.classList.remove('visible');
      setTimeout(() => el.remove(), 700);
    }, 5000);
  }

  // ============================================================
  // CONSTELLATION SVG LINES
  // ============================================================
  function refreshConstellationSVG() {
    // Remove previous lines + group labels
    svgLayer.querySelectorAll('.constellation-line, .constellation-label').forEach(el => el.remove());

    const ns     = 'http://www.w3.org/2000/svg';
    const groups = {};
    stars.forEach(s => {
      (groups[s.constName] = groups[s.constName] || []).push(s);
    });

    Object.entries(groups).forEach(([name, grp]) => {
      if (grp.length < 2) return;
      grp.sort((a, b) => a.addedAt - b.addedAt);

      // Draw line segments
      for (let i = 0; i < grp.length - 1; i++) {
        const line = document.createElementNS(ns, 'line');
        line.setAttribute('x1', grp[i].x);
        line.setAttribute('y1', grp[i].y);
        line.setAttribute('x2', grp[i + 1].x);
        line.setAttribute('y2', grp[i + 1].y);
        line.setAttribute('class', 'constellation-line');
        svgLayer.insertBefore(line, svgLayer.firstChild);
      }

      // Group name plate when ≥3 stars
      if (cfg.showConstNames && grp.length >= 3) {
        const cx = grp.reduce((s, st) => s + st.x, 0) / grp.length;
        const cy = grp.reduce((s, st) => s + st.y, 0) / grp.length;
        const lbl = document.createElementNS(ns, 'text');
        lbl.setAttribute('x', cx);
        lbl.setAttribute('y', cy + 28);
        lbl.setAttribute('text-anchor', 'middle');
        lbl.setAttribute('class', 'constellation-label');
        lbl.textContent = name;
        svgLayer.appendChild(lbl);
      }
    });
  }

  function redrawAllStars() {
    svgLayer.querySelectorAll('.user-star-hit').forEach(el => el.remove());
    const ns = 'http://www.w3.org/2000/svg';
    stars.forEach(star => {
      // Invisible SVG circle for tooltip hover
      if (!cfg.showTooltip) return;
      const circle = document.createElementNS(ns, 'circle');
      circle.setAttribute('cx', star.x);
      circle.setAttribute('cy', star.y);
      circle.setAttribute('r',  star.size * 3.5);
      circle.setAttribute('fill', 'transparent');
      circle.setAttribute('class', 'user-star-hit');
      const title = document.createElementNS(ns, 'title');
      title.textContent = star.username + ': \u201c' + star.text + '\u201d';
      circle.appendChild(title);
      svgLayer.appendChild(circle);
    });
    refreshConstellationSVG();
  }

  // ============================================================
  // GRATEFUL — SCROLL + GARDEN FLOW
  // ============================================================
  function triggerGrateful(username, text) {
    gratefulQueue.push({ username, text });
    drainGratefulQueue();
  }

  function drainGratefulQueue() {
    if (processingGrateful || gratefulQueue.length === 0) return;
    processingGrateful = true;
    const { username, text } = gratefulQueue.shift();

    const elementType = GARDEN_TYPES[gratitudes.length % GARDEN_TYPES.length];
    const entry = { id: Date.now() + Math.random(), username, text, elementType, addedAt: Date.now() };
    gratitudes.push(entry);

    // Paint new garden element
    paintGardenElement(entry, true);

    // Show scroll
    entryUsername.textContent = username;
    entryText.textContent     = '\u201c' + text + '\u201d';
    scrollEl.classList.remove('scroll-close');
    scrollEl.classList.add('scroll-open');

    setTimeout(() => {
      scrollEl.classList.remove('scroll-open');
      scrollEl.classList.add('scroll-close');
      const closeMs = 650 / cfg.animSpeed;
      setTimeout(() => {
        saveState();
        playSound(cfg.gratefulSoundUrl);
        setTimeout(() => { processingGrateful = false; drainGratefulQueue(); }, 400);
      }, closeMs);
    }, cfg.gratefulDuration);
  }

  // ============================================================
  // GARDEN SCENE — SVG PAINTING
  // ============================================================
  function redrawGarden() {
    gardenSvg.innerHTML = '';
    paintGardenBackground();
    gratitudes.forEach(entry => paintGardenElement(entry, false));
  }

  function paintGardenBackground() {
    const svg = gardenSvg;
    const W   = parseInt(svg.getAttribute('width'))  || 560;
    const H   = parseInt(svg.getAttribute('height')) || 260;
    const ns  = 'http://www.w3.org/2000/svg';

    // Faint watercolour washes
    [
      { y: H * 0.55, h: H * 0.22, fill: 'rgba(120,170,195,0.09)' },
      { y: H * 0.72, h: H * 0.18, fill: 'rgba(90,140,90,0.07)'  },
    ].forEach(band => {
      const r = document.createElementNS(ns, 'rect');
      r.setAttribute('x', 0); r.setAttribute('y', band.y);
      r.setAttribute('width', W); r.setAttribute('height', band.h);
      r.setAttribute('fill', band.fill);
      svg.appendChild(r);
    });

    // Ground horizon line
    const ground = document.createElementNS(ns, 'line');
    ground.setAttribute('x1', 0);      ground.setAttribute('y1', H - 14);
    ground.setAttribute('x2', W);      ground.setAttribute('y2', H - 14);
    ground.setAttribute('stroke', cfg.scrollInkColor);
    ground.setAttribute('stroke-width', '0.8');
    ground.setAttribute('opacity', '0.25');
    svg.appendChild(ground);
  }

  function paintGardenElement(entry, isNew) {
    const svg = gardenSvg;
    const W   = parseInt(svg.getAttribute('width'))  || 560;
    const H   = parseInt(svg.getAttribute('height')) || 260;
    let g;

    switch (entry.elementType) {
      case 'plum':   g = makePlumBranch(W, H, entry); break;
      case 'koi':    g = makeKoi(W, H, entry);        break;
      case 'stone':  g = makeStone(W, H, entry);      break;
      case 'bridge': g = makeBridge(W, H, entry);     break;
      case 'bamboo': g = makeBamboo(W, H, entry);     break;
      default:       g = makeRipple(W, H, entry);     break;
    }

    if (!g) return;
    g.setAttribute('class', 'garden-element' + (isNew ? ' new-entry' : ''));
    svg.appendChild(g);
  }

  /* ── Garden element factories ── */

  function svgEl(tag) {
    return document.createElementNS('http://www.w3.org/2000/svg', tag);
  }

  function gardenLabel(g, x, y, name) {
    const t = svgEl('text');
    t.setAttribute('x', x); t.setAttribute('y', y);
    t.setAttribute('class', 'garden-label');
    t.textContent = name;
    g.appendChild(t);
  }

  function makePlumBranch(W, H, entry) {
    const g  = svgEl('g');
    const x  = 25 + Math.random() * (W - 110);
    const y  = H - 16;
    const ink = cfg.scrollInkColor;

    // Main branch (cubic Bezier)
    const cx1 = x + rnd(-20, 20), cy1 = y - 55 - rnd(0, 30);
    const cx2 = x + rnd(-30, 30), cy2 = y - 110 - rnd(0, 30);
    const ex  = cx2 + rnd(-20, 20), ey = cy2 - rnd(15, 25);

    appendPath(g, `M ${x} ${y} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${ex} ${ey}`,
      { stroke: ink, 'stroke-width': '2.8', fill: 'none', 'stroke-linecap': 'round' });

    // Side branch
    const sbex = cx1 + rnd(-30, 30), sbey = cy1 - rnd(30, 55);
    appendPath(g, `M ${cx1} ${cy1} Q ${cx1 + rnd(-25,25)} ${cy1 - 22} ${sbex} ${sbey}`,
      { stroke: ink, 'stroke-width': '1.4', fill: 'none', 'stroke-linecap': 'round' });

    // Blossoms at branch tip and side tip
    [[ex, ey], [sbex, sbey]].forEach(([bx, by]) => {
      const count = 3 + Math.floor(Math.random() * 5);
      for (let i = 0; i < count; i++) {
        const fx = bx + rnd(-28, 28), fy = by + rnd(-28, 28);
        g.appendChild(makePlumFlower(fx, fy, 4.5 + Math.random() * 3.5));
      }
    });

    gardenLabel(g, x, y + 14, entry.username);
    return g;
  }

  function makePlumFlower(cx, cy, r) {
    const g = svgEl('g');
    for (let i = 0; i < 5; i++) {
      const angle = (Math.PI * 2 / 5) * i;
      const c = svgEl('circle');
      c.setAttribute('cx', cx + Math.cos(angle) * r * 0.78);
      c.setAttribute('cy', cy + Math.sin(angle) * r * 0.78);
      c.setAttribute('r',  r * 0.56);
      c.setAttribute('fill', cfg.blossomColor);
      c.setAttribute('stroke', cfg.scrollInkColor);
      c.setAttribute('stroke-width', '0.4');
      c.setAttribute('opacity', '0.88');
      g.appendChild(c);
    }
    // Yellow centre
    const ctr = svgEl('circle');
    ctr.setAttribute('cx', cx); ctr.setAttribute('cy', cy);
    ctr.setAttribute('r', r * 0.28); ctr.setAttribute('fill', '#f5d060');
    g.appendChild(ctr);
    return g;
  }

  function makeKoi(W, H, entry) {
    const g     = svgEl('g');
    const x     = 40 + Math.random() * (W - 110);
    const y     = 30 + Math.random() * (H - 80);
    const sc    = 0.7 + Math.random() * 0.6;
    const flip  = Math.random() > 0.5 ? 1 : -1;
    const colors= ['#e05c28', '#c9302c', '#e8993a', '#d47fa0'];
    const col   = colors[Math.floor(Math.random() * colors.length)];
    const ink   = cfg.scrollInkColor;

    // Body ellipse
    const body = svgEl('ellipse');
    body.setAttribute('cx', x); body.setAttribute('cy', y);
    body.setAttribute('rx', 28 * sc); body.setAttribute('ry', 9.5 * sc);
    body.setAttribute('fill', col); body.setAttribute('stroke', ink);
    body.setAttribute('stroke-width', '0.9');
    body.setAttribute('transform', `scale(${flip},1) translate(${flip < 0 ? -x * 2 : 0},0)`);
    g.appendChild(body);

    // Tail
    const tx = x + flip * 28 * sc;
    appendPath(g, `M ${tx} ${y} L ${tx + flip*14*sc} ${y - 11*sc} L ${tx + flip*14*sc} ${y + 11*sc} Z`,
      { fill: col, stroke: ink, 'stroke-width': '0.7' });

    // Dorsal fin
    appendPath(g, `M ${x - flip*5*sc} ${y - 9.5*sc} Q ${x} ${y - 18*sc} ${x + flip*12*sc} ${y - 7*sc}`,
      { fill: 'none', stroke: ink, 'stroke-width': '0.8' });

    // Water ripple beneath
    const ripple = svgEl('ellipse');
    ripple.setAttribute('cx', x); ripple.setAttribute('cy', y + 10 * sc);
    ripple.setAttribute('rx', 34 * sc); ripple.setAttribute('ry', 5 * sc);
    ripple.setAttribute('fill', 'none'); ripple.setAttribute('stroke', '#88bbcc');
    ripple.setAttribute('stroke-width', '0.7'); ripple.setAttribute('opacity', '0.55');
    g.appendChild(ripple);

    gardenLabel(g, x, y + 18 * sc + 12, entry.username);
    return g;
  }

  function makeStone(W, H, entry) {
    const g   = svgEl('g');
    const x   = 30 + Math.random() * (W - 80);
    const y   = 25 + Math.random() * (H - 65);
    const rx  = 17 + Math.random() * 14;
    const ry  = 11 + Math.random() * 9;
    const rot = rnd(-25, 25);
    const ink = cfg.scrollInkColor;

    const base = svgEl('ellipse');
    base.setAttribute('cx', x); base.setAttribute('cy', y);
    base.setAttribute('rx', rx); base.setAttribute('ry', ry);
    base.setAttribute('fill', '#c0b8b0'); base.setAttribute('stroke', ink);
    base.setAttribute('stroke-width', '1.4');
    base.setAttribute('transform', `rotate(${rot},${x},${y})`);
    g.appendChild(base);

    // Highlight sheen
    const shine = svgEl('ellipse');
    shine.setAttribute('cx', x - rx * 0.18); shine.setAttribute('cy', y - ry * 0.22);
    shine.setAttribute('rx', rx * 0.55); shine.setAttribute('ry', ry * 0.45);
    shine.setAttribute('fill', 'rgba(255,255,255,0.28)');
    shine.setAttribute('transform', `rotate(${rot},${x},${y})`);
    g.appendChild(shine);

    // Engraved name
    const lbl = svgEl('text');
    lbl.setAttribute('x', x); lbl.setAttribute('y', y + 3.5);
    lbl.setAttribute('text-anchor', 'middle'); lbl.setAttribute('font-size', '8.5');
    lbl.setAttribute('fill', ink); lbl.setAttribute('font-family', `${cfg.fontName}, serif`);
    lbl.setAttribute('transform', `rotate(${rot},${x},${y})`);
    lbl.textContent = entry.username;
    g.appendChild(lbl);

    return g;
  }

  function makeBridge(W, H, entry) {
    const g   = svgEl('g');
    const x   = W * 0.25 + Math.random() * W * 0.5;
    const y   = H * 0.38 + Math.random() * H * 0.38;
    const bw  = 55 + Math.random() * 38;
    const bh  = 18 + Math.random() * 14;
    const ink = cfg.scrollInkColor;

    // Arch curve
    appendPath(g,
      `M ${x - bw/2} ${y} Q ${x} ${y - bh * 1.6} ${x + bw/2} ${y}`,
      { stroke: ink, 'stroke-width': '2.2', fill: 'none', 'stroke-linecap': 'round' });

    // Handrail
    appendPath(g,
      `M ${x - bw/2} ${y - 5} Q ${x} ${y - bh * 1.6 - 6} ${x + bw/2} ${y - 5}`,
      { stroke: ink, 'stroke-width': '1', fill: 'none' });

    // Balusters
    for (let i = 0; i <= 4; i++) {
      const t    = i / 4;
      const px   = x - bw / 2 + t * bw;
      const archY= y - Math.sin(t * Math.PI) * bh * 1.6;
      const post = svgEl('line');
      post.setAttribute('x1', px); post.setAttribute('y1', archY - 5.5);
      post.setAttribute('x2', px); post.setAttribute('y2', archY + 4);
      post.setAttribute('stroke', ink); post.setAttribute('stroke-width', '0.9');
      g.appendChild(post);
    }

    gardenLabel(g, x, y + 14, entry.username);
    return g;
  }

  function makeBamboo(W, H, entry) {
    const g        = svgEl('g');
    const x        = 18 + Math.random() * (W - 60);
    const segments = 4 + Math.floor(Math.random() * 4);
    const segH     = 18 + Math.random() * 14;
    const ink      = cfg.scrollInkColor;

    for (let i = 0; i < segments; i++) {
      const sy   = H - 14 - i * segH;
      const sway = Math.sin(i * 0.9) * 3;

      const seg  = svgEl('rect');
      seg.setAttribute('x', x + sway - 4); seg.setAttribute('y', sy - segH);
      seg.setAttribute('width', '8'); seg.setAttribute('height', segH);
      seg.setAttribute('fill', '#7ab648'); seg.setAttribute('stroke', ink);
      seg.setAttribute('stroke-width', '0.9'); seg.setAttribute('rx', '1.5');
      g.appendChild(seg);

      // Node ring
      const node = svgEl('line');
      node.setAttribute('x1', x + sway - 5); node.setAttribute('y1', sy);
      node.setAttribute('x2', x + sway + 5); node.setAttribute('y2', sy);
      node.setAttribute('stroke', ink); node.setAttribute('stroke-width', '1.4');
      g.appendChild(node);

      // Leaves on alternating segments
      if (i % 2 === 1) {
        const dir = i % 4 < 2 ? 1 : -1;
        const lx  = x + sway + dir * 4;
        const ly  = sy - segH * 0.5;
        appendPath(g,
          `M ${lx} ${ly} Q ${lx + dir*18} ${ly - 7} ${lx + dir*32} ${ly - 4}`,
          { stroke: ink, 'stroke-width': '0.9', fill: 'none', 'stroke-linecap': 'round' });
      }
    }

    gardenLabel(g, x + 2, H - 1, entry.username);
    return g;
  }

  function makeRipple(W, H, entry) {
    const g = svgEl('g');
    const x = 40 + Math.random() * (W - 90);
    const y = 28 + Math.random() * (H - 72);

    for (let i = 1; i <= 4; i++) {
      const el = svgEl('ellipse');
      el.setAttribute('cx', x); el.setAttribute('cy', y);
      el.setAttribute('rx', i * 13); el.setAttribute('ry', i * 5);
      el.setAttribute('fill', 'none'); el.setAttribute('stroke', '#6090aa');
      el.setAttribute('stroke-width', '0.75');
      el.setAttribute('opacity', (1.05 - i * 0.22).toFixed(2));
      g.appendChild(el);
    }

    // Lotus bud at centre
    const bud = svgEl('ellipse');
    bud.setAttribute('cx', x); bud.setAttribute('cy', y);
    bud.setAttribute('rx', '5'); bud.setAttribute('ry', '7');
    bud.setAttribute('fill', cfg.blossomColor); bud.setAttribute('stroke', cfg.scrollInkColor);
    bud.setAttribute('stroke-width', '0.7');
    g.appendChild(bud);

    gardenLabel(g, x, y + 30, entry.username);
    return g;
  }

  /* ── SVG path helper ── */
  function appendPath(parent, d, attrs) {
    const el = svgEl('path');
    el.setAttribute('d', d);
    Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, v));
    parent.appendChild(el);
    return el;
  }

  function rnd(min, max) { return min + Math.random() * (max - min); }

  // ============================================================
  // SCROLL POSITIONING
  // ============================================================
  function positionScroll() {
    const el  = scrollEl || document.getElementById('grateful-scroll');
    const pos = cfg.scrollPosition;
    el.classList.remove('pos-top-left', 'pos-top-right');
    if (pos === 'top-left')  el.classList.add('pos-top-left');
    if (pos === 'top-right') el.classList.add('pos-top-right');
    // top-center is the default CSS
  }

  // ============================================================
  // PERSISTENCE (SE KV store)
  // ============================================================
  async function loadState() {
    if (cfg.persistenceMode !== 'persistent') return;
    try {
      const sStars = await SE_API.store.get('wg_stars');
      const sGrats = await SE_API.store.get('wg_gratitudes');
      if (sStars) stars      = JSON.parse(sStars);
      if (sGrats) gratitudes = JSON.parse(sGrats);
    } catch (e) {
      console.warn('[WishGrateful] Could not load persisted state:', e);
    }
  }

  async function saveState() {
    if (cfg.persistenceMode !== 'persistent') return;
    try {
      await SE_API.store.set('wg_stars',      JSON.stringify(stars));
      await SE_API.store.set('wg_gratitudes', JSON.stringify(gratitudes));
    } catch (e) {
      console.warn('[WishGrateful] Could not save state:', e);
    }
  }

  // ============================================================
  // SOUND
  // ============================================================
  function playSound(url) {
    if (!cfg.enableSound || !url) return;
    try { new Audio(url).play(); } catch (_) {}
  }

  // ============================================================
  // SE EVENT LISTENERS
  // ============================================================
  window.addEventListener('onWidgetLoad', obj => {
    init(obj.detail.fieldData);
  });

  window.addEventListener('onEventReceived', obj => {
    const { listener, event } = obj.detail;

    if (listener === 'message') {
      if (cfg.triggerType === 'channelpoints') return;
      const raw      = (event.text || '').trim();
      const lower    = raw.toLowerCase();
      const username = event.nick || event.username || 'Viewer';

      if (lower.startsWith(cfg.wishCommand + ' ')) {
        const text = raw.slice(cfg.wishCommand.length).trim();
        if (text) triggerWish(username, text);
      } else if (lower.startsWith(cfg.gratefulCommand + ' ')) {
        const text = raw.slice(cfg.gratefulCommand.length).trim();
        if (text) triggerGrateful(username, text);
      }
      return;
    }

    if (listener === 'redemption-latest') {
      if (cfg.triggerType === 'commands') return;
      const title    = (event.title || '').toLowerCase();
      const message  = event.message || '';
      const username = event.username || 'Viewer';

      if (title.includes(cfg.wishRedemptionName))     triggerWish(username, message);
      else if (title.includes(cfg.gratefulRedemptionName)) triggerGrateful(username, message);
    }
  });

})();
