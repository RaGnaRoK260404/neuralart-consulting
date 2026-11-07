/* NeuralArt — physics layer for the Kinetic template (uses Matter.js).
   Two playgrounds:
   1) Hero: every letter of the wordmark is a body. Grab & throw any letter; letters it hits
      wake up and fall (domino). "Rebuild" springs them home. First load plays an assemble intro.
   2) Pit: tag pills drop into the contact section and can be thrown around. */
const Physics = (() => {
  if (!window.Matter) return { hero(){}, pit(){} };
  const { Engine, Bodies, Body, Composite, Constraint, Events } = Matter;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* shared drag: pointer -> soft constraint; release keeps momentum (fling) */
  function dragger(engine, stage, getBody, onGrab) {
    let c = null, el = null, last = null, vel = { x: 0, y: 0 };
    const local = e => { const r = stage.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
    stage.addEventListener('pointerdown', e => {
      const hit = getBody(e); if (!hit) return;
      const { body, node } = hit; if (onGrab && onGrab(body, node, e) === false) return;
      e.preventDefault(); const p = local(e);
      c = Constraint.create({ pointA: p, bodyB: body, pointB: { x: p.x - body.position.x, y: p.y - body.position.y }, stiffness: .18, damping: .08, length: 0 });
      Composite.add(engine.world, c); el = node; el.classList.add('held'); last = p;
      stage.setPointerCapture(e.pointerId);
    });
    stage.addEventListener('pointermove', e => { if (!c) return; const p = local(e); vel = { x: p.x - last.x, y: p.y - last.y }; last = p; c.pointA = p; });
    const up = () => { if (!c) return; const b = c.bodyB; Composite.remove(engine.world, c); c = null;
      Body.setVelocity(b, { x: b.velocity.x + vel.x * .35, y: b.velocity.y + vel.y * .35 }); el.classList.remove('held'); el = null; };
    stage.addEventListener('pointerup', up); stage.addEventListener('pointercancel', up);
    return { get active() { return !!c; } };
  }

  function walls(engine, w, h, old) {
    if (old) Composite.remove(engine.world, old);
    const t = 400, o = { isStatic: true, friction: .6, restitution: .2 };
    const set = [Bodies.rectangle(w / 2, h + t / 2, w * 3, t, o), Bodies.rectangle(-t / 2, h / 2 - 2000, t, h + 4000, o), Bodies.rectangle(w + t / 2, h / 2 - 2000, t, h + 4000, o)];
    Composite.add(engine.world, set); return set;
  }

  /* ---------------- HERO ---------------- */
  function hero({ stage, letters, onMode, rebuildBtn }) {
    const engine = Engine.create({ gravity: { y: 1.25 } });
    let mode = 'home', items = [], bounds = null, raf = 0, spring = null;
    const W = () => stage.clientWidth, H = () => stage.clientHeight;

    function capture() { // measure each letter at rest and create a body there
      letters.forEach(s => s.style.transform = '');
      const sr = stage.getBoundingClientRect();
      items = letters.map((s, i) => {
        const r = s.getBoundingClientRect(), hx = r.left - sr.left + r.width / 2, hy = r.top - sr.top + r.height / 2;
        const body = Bodies.rectangle(hx, hy, Math.max(8, r.width * .9), r.height * .96, { isStatic: true, chamfer: { radius: Math.min(r.width, r.height) * .08 }, restitution: .25, friction: .5, frictionAir: .012, density: .002 });
        body.plugin = { i }; return { s, body, hx, hy };
      });
      Composite.add(engine.world, items.map(it => it.body));
      bounds = walls(engine, W(), H(), bounds);
    }
    function wake(it, kick) { if (it.body.isStatic) { Body.setStatic(it.body, false); if (kick) Body.setVelocity(it.body, kick); Body.setAngularVelocity(it.body, (Math.random() - .5) * .08); } }

    function setMode(m) { mode = m; stage.dataset.mode = m; onMode && onMode(m); rebuildBtn.hidden = m !== 'free'; }

    function breakOut() { if (mode !== 'home') return; capture(); setMode('free'); loop(); }

    function render() {
      for (const it of items) { const b = it.body; it.s.style.transform = `translate(${(b.position.x - it.hx).toFixed(2)}px,${(b.position.y - it.hy).toFixed(2)}px) rotate(${b.angle.toFixed(4)}rad)`; }
    }
    function loop() {
      cancelAnimationFrame(raf);
      let last = performance.now();
      const tick = now => {
        if (mode === 'home') return;
        const dt = Math.min(1000 / 30, now - last); last = now;
        if (mode !== 'rebuild') { Engine.update(engine, dt); render(); }
        else if (spring()) { finishRebuild(); return; }
        raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    }

    // domino: a moving body that hits a resting letter knocks it loose
    Events.on(engine, 'collisionStart', ev => {
      for (const { bodyA, bodyB } of ev.pairs) {
        for (const [a, b] of [[bodyA, bodyB], [bodyB, bodyA]]) {
          if (b.isStatic && b.plugin && b.plugin.i != null && !a.isStatic && a.speed > 2.2) {
            const it = items[b.plugin.i]; wake(it, { x: a.velocity.x * .5, y: a.velocity.y * .3 - 2 });
            it.s.classList.add('hit'); setTimeout(() => it.s.classList.remove('hit'), 380);
          }
        }
      }
    });

    // rebuild: critically-damped springs pull every letter home, staggered
    function rebuild() {
      if (mode !== 'free' && mode !== 'intro') return;
      setMode('rebuild');
      const st = items.map((it, k) => ({ it, x: it.body.position.x - it.hx, y: it.body.position.y - it.hy, a: ((it.body.angle + Math.PI) % (2 * Math.PI)) - Math.PI, vx: 0, vy: 0, va: 0, delay: k * 3 }));
      let f = 0;
      spring = () => {
        f++; let moving = false;
        for (const p of st) {
          if (f > p.delay) { const k = .09, c = .62;
            p.vx = (p.vx - p.x * k) * c; p.vy = (p.vy - p.y * k) * c; p.va = (p.va - p.a * k) * c;
            p.x += p.vx; p.y += p.vy; p.a += p.va; }
          if (Math.abs(p.x) + Math.abs(p.y) > .4 || Math.abs(p.a) > .002) moving = true;
          p.it.s.style.transform = `translate(${p.x.toFixed(2)}px,${p.y.toFixed(2)}px) rotate(${p.a.toFixed(4)}rad)`;
        }
        return !moving;
      };
      loop();
    }
    function finishRebuild() {
      Composite.clear(engine.world, false); bounds = null; items.forEach(it => it.s.style.transform = ''); items = [];
      setMode('home');
    }

    // intro: letters rain in, pile up, then assemble
    function intro() {
      capture(); setMode('intro');
      items.forEach((it, k) => { Body.setStatic(it.body, false);
        Body.setPosition(it.body, { x: it.hx + (Math.random() - .5) * 200, y: -it.body.bounds.max.y + it.hy - 150 - Math.random() * 700 });
        Body.setAngle(it.body, (Math.random() - .5) * 1.4); Body.setAngularVelocity(it.body, (Math.random() - .5) * .15); });
      render(); loop();
      setTimeout(rebuild, 1650);
    }

    const drag = dragger(engine, stage, e => {
      const s = e.target.closest('.word span'); if (!s) return null;
      const i = letters.indexOf(s); if (i < 0) return null;
      if (mode === 'home') breakOut(); if (mode !== 'free') return null;
      const it = items[i]; return { body: it.body, node: s };
    }, (body, node, e) => {
      const it = items[body.plugin.i]; wake(it);
      if (e.pointerType === 'touch') { // touch: tap = flick upward, no drag (keeps page scroll natural)
        Body.setVelocity(body, { x: (Math.random() - .5) * 10, y: -9 - Math.random() * 4 }); Body.setAngularVelocity(body, (Math.random() - .5) * .4); return false; }
    });

    // cursor sweeps nudge loose letters
    let pv = null;
    stage.addEventListener('pointermove', e => {
      if (mode !== 'free' || drag.active) { pv = null; return; }
      const r = stage.getBoundingClientRect(), p = { x: e.clientX - r.left, y: e.clientY - r.top };
      if (pv) { const vx = p.x - pv.x, vy = p.y - pv.y, sp = Math.hypot(vx, vy);
        if (sp > 6) for (const it of items) { const b = it.body; if (b.isStatic) continue; const d = Math.hypot(b.position.x - p.x, b.position.y - p.y);
          if (d < 140) Body.applyForce(b, b.position, { x: vx * b.mass * .0009 * (1 - d / 140), y: vy * b.mass * .0009 * (1 - d / 140) - b.mass * .0004 }); } }
      pv = p;
    });

    rebuildBtn.addEventListener('click', rebuild);
    stage.addEventListener('dblclick', e => { if (mode === 'free') rebuild(); });
    addEventListener('keydown', e => { if ((e.key === 'r' || e.key === 'R') && mode === 'free' && !/input|textarea/i.test(e.target.tagName)) rebuild(); });
    addEventListener('resize', () => { if (mode === 'free') rebuild(); });

    return { intro: reduce ? () => {} : intro, get mode() { return mode; }, breakOut, rebuild };
  }

  /* ---------------- PIT ---------------- */
  function pit(stage, labels) {
    const engine = Engine.create({ gravity: { y: 1.1 } });
    let items = [], bounds = null, started = false, raf = 0, idle = 0;
    const nodes = labels.map((l, i) => { const n = document.createElement('div'); n.className = 'chip ' + (l.cls || ''); n.textContent = l.t; if (l.action) { n.dataset.action = l.action; n.setAttribute('role', 'button'); n.tabIndex = 0; n.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); stage.dispatchEvent(new CustomEvent('chipaction', { detail: l.action })); } }); } stage.appendChild(n); return n; });
    function start() {
      if (started) return; started = true;
      const w = stage.clientWidth, h = stage.clientHeight; bounds = walls(engine, w, h);
      items = nodes.map((n, i) => { const bw = n.offsetWidth, bh = n.offsetHeight;
        const b = Bodies.rectangle(bw / 2 + Math.random() * (w - bw), -bh - i * 70 - Math.random() * 60, bw, bh, { chamfer: { radius: bh / 2 }, restitution: .35, friction: .4, frictionAir: .01, density: .0016, angle: (Math.random() - .5) * .9 });
        return { n, b, bw, bh }; });
      Composite.add(engine.world, items.map(i => i.b)); render(); run();
    }
    function render() { for (const { n, b, bw, bh } of items) n.style.transform = `translate(${(b.position.x - bw / 2).toFixed(1)}px,${(b.position.y - bh / 2).toFixed(1)}px) rotate(${b.angle.toFixed(4)}rad)`; }
    let vis = false;
    function run() { cancelAnimationFrame(raf); let last = performance.now();
      const t = now => { const dt = Math.min(1000 / 30, now - last); last = now; if (vis) { Engine.update(engine, dt); render(); } raf = requestAnimationFrame(t); }; raf = requestAnimationFrame(t); }
    new IntersectionObserver(([e]) => { vis = e.isIntersecting; if (vis) start(); }, { threshold: .35 }).observe(stage);
    let downAt = null;
    dragger(engine, stage, e => { const n = e.target.closest('.chip'); if (!n) return null; const it = items.find(i => i.n === n); downAt = { x: e.clientX, y: e.clientY, n }; return it ? { body: it.b, node: n } : null; });
    stage.addEventListener('pointerup', e => { if (downAt && Math.hypot(e.clientX - downAt.x, e.clientY - downAt.y) < 6 && downAt.n.dataset.action) stage.dispatchEvent(new CustomEvent('chipaction', { detail: downAt.n.dataset.action })); downAt = null; });
    addEventListener('resize', () => { if (!started) return; bounds = walls(engine, stage.clientWidth, stage.clientHeight, bounds);
      for (const { b } of items) if (b.position.x > stage.clientWidth) Body.setPosition(b, { x: stage.clientWidth - 60, y: b.position.y }); });
    stage.addEventListener('dblclick', () => { for (const { b } of items) Body.setVelocity(b, { x: (Math.random() - .5) * 20, y: -16 - Math.random() * 10 }); });
  }

  return { hero, pit };
})();
