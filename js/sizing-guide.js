(function() {
  'use strict';

  const SHIRT_PATH = 'M 22 28 C 30 22, 42 18, 60 18 C 78 18, 90 22, 98 28 L 118 38 C 122 40, 124 44, 122 48 L 116 62 C 114 66, 110 67, 106 65 L 96 60 L 96 110 C 96 114, 93 117, 89 117 L 31 117 C 27 117, 24 114, 24 110 L 24 60 L 14 65 C 10 67, 6 66, 4 62 L -2 48 C -4 44, -2 40, 2 38 Z';
  const NECK_PATH  = 'M 42 19 C 48 28, 72 28, 78 19';

  const SIZES = [
    { id: 'S',  label: 'S',  scale: 0.70 },
    { id: 'M',  label: 'M',  scale: 0.95 },
    { id: 'L',  label: 'L',  scale: 1.20 },
    { id: 'XL', label: 'XL', scale: 1.50 },
  ];

  // Natural total slot width at scale 1.0 (used for responsive scaling).
  const NATURAL_SLOT_WIDTH = SIZES.reduce(function(sum, s) {
    return sum + 90 + s.scale * 80;
  }, 0) + (SIZES.length - 1) * 12;

  function shuffled(arr) {
    return arr
      .map(function(v)     { return { v: v, r: Math.random() }; })
      .sort(function(a, b) { return a.r - b.r; })
      .map(function(x)     { return x.v; });
  }

  // CSS zoom causes e.clientX/Y (viewport px) to differ from CSS layout px.
  // The ratio of getBoundingClientRect().width to clientWidth gives the zoom
  // factor so drag and fly deltas can be converted from viewport px to CSS px.
  function getZoom() {
    return stage.clientWidth > 0
      ? stage.getBoundingClientRect().width / stage.clientWidth
      : 1;
  }

  // Scale multiplier so all 4 slots fit within 88% of the stage width.
  function computeScaleMult() {
    return Math.min(1, Math.max(0.38, stage.clientWidth * 0.88 / NATURAL_SLOT_WIDTH));
  }

  const SVG_NS = 'http://www.w3.org/2000/svg';
  function svgEl(tag) { return document.createElementNS(SVG_NS, tag); }

  function createShirt(effectiveScale, filled, strokeWidth) {
    strokeWidth = strokeWidth !== undefined ? strokeWidth : 4;
    const svg = svgEl('svg');
    svg.setAttribute('viewBox', '-6 12 132 124');
    svg.setAttribute('width',   String(120 * effectiveScale));
    svg.setAttribute('height',  String(130 * effectiveScale));
    svg.style.overflow = 'visible';
    svg.style.display  = 'block';

    const g = svgEl('g');
    g.style.filter = 'url(#sg-rough)';

    const body = svgEl('path');
    body.setAttribute('d',               SHIRT_PATH);
    body.setAttribute('fill',            filled ? '#fff' : 'transparent');
    body.setAttribute('stroke',          '#fff');
    body.setAttribute('stroke-width',    String(strokeWidth));
    body.setAttribute('stroke-linejoin', 'round');
    body.setAttribute('stroke-linecap',  'round');

    const neck = svgEl('path');
    neck.setAttribute('d',               NECK_PATH);
    neck.setAttribute('fill',            'none');
    neck.setAttribute('stroke',          '#fff');
    neck.setAttribute('stroke-width',    String(strokeWidth * 0.85));
    neck.setAttribute('stroke-linejoin', 'round');
    neck.setAttribute('stroke-linecap',  'round');

    g.appendChild(body);
    g.appendChild(neck);
    svg.appendChild(g);
    return svg;
  }

  function createDefs() {
    const svg = svgEl('svg');
    svg.setAttribute('width', '0'); svg.setAttribute('height', '0');
    svg.style.position = 'absolute';
    svg.setAttribute('aria-hidden', 'true');

    const defs = svgEl('defs');
    const filt = svgEl('filter');
    filt.setAttribute('id', 'sg-rough');
    filt.setAttribute('x', '-10%'); filt.setAttribute('y', '-10%');
    filt.setAttribute('width', '120%'); filt.setAttribute('height', '120%');

    const turb = svgEl('feTurbulence');
    turb.setAttribute('type', 'fractalNoise');
    turb.setAttribute('baseFrequency', '0.9');
    turb.setAttribute('numOctaves', '2');
    turb.setAttribute('seed', '3');

    const disp = svgEl('feDisplacementMap');
    disp.setAttribute('in', 'SourceGraphic');
    disp.setAttribute('scale', '1.6');

    filt.appendChild(turb); filt.appendChild(disp);
    defs.appendChild(filt);
    svg.appendChild(defs);
    return svg;
  }

  // ── State ──────────────────────────────────────────────────────────────────

  let queue     = [];
  let matched   = new Set();
  let score     = { correct: 0, wrong: 0 };
  let finalSize = null;
  let flying    = false;
  let animating = false;
  let drag      = null;
  let scaleMult = 1;

  // ── DOM refs ───────────────────────────────────────────────────────────────

  let stage, promptEl, slotsRow, bottomArea, doneArea, targetWrap;
  const slotEls = {};

  function currentSz() {
    return SIZES.find(function(s) { return s.id === queue[0]; }) ?? null;
  }

  // ── Init ───────────────────────────────────────────────────────────────────

  function init() {
    stage = document.getElementById('sg-stage');
    stage.appendChild(createDefs());

    promptEl = document.createElement('div');
    promptEl.id = 'sg-prompt';
    stage.appendChild(promptEl);

    slotsRow = document.createElement('div');
    slotsRow.id = 'sg-slots';
    SIZES.forEach(function(s) {
      const el = buildSlot(s);
      slotEls[s.id] = el;
      slotsRow.appendChild(el);
    });
    stage.appendChild(slotsRow);

    bottomArea = document.createElement('div');
    bottomArea.id = 'sg-bottom';
    stage.appendChild(bottomArea);

    doneArea = document.createElement('div');
    doneArea.id = 'sg-done';
    bottomArea.appendChild(doneArea);

    scaleMult = computeScaleMult();
    startGame();

    let resizeTimer = null;
    window.addEventListener('resize', function() {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(handleResize, 100);
    });
  }

  // ── Start / reset ──────────────────────────────────────────────────────────

  function startGame() {
    queue     = shuffled(SIZES.map(function(s) { return s.id; }));
    matched   = new Set();
    score     = { correct: 0, wrong: 0 };
    finalSize = null;
    flying    = false;
    animating = false;
    drag      = null;
    scaleMult = computeScaleMult();

    setPrompt(false);
    SIZES.forEach(resetSlotVisual);

    doneArea.style.display = 'none';
    doneArea.innerHTML     = '';

    if (targetWrap) { targetWrap.remove(); targetWrap = null; }
    spawnTarget();
  }

  // ── Slot building ──────────────────────────────────────────────────────────

  function buildSlot(sz) {
    const el = document.createElement('div');
    el.className      = 'sg-slot';
    el.dataset.slotId = sz.id;
    el.appendChild(createShirt(sz.scale * scaleMult, false, 4));

    const label = document.createElement('div');
    label.className   = 'sg-label';
    label.textContent = sz.label;
    el.appendChild(label);

    applySlotSizing(el, sz);

    el.addEventListener('click', function() {
      if (matched.has(sz.id) || flying || animating) return;
      handleAttempt(sz.id);
    });
    return el;
  }

  function applySlotSizing(el, sz) {
    el.style.minWidth = `${(90 + sz.scale * 80) * scaleMult}px`;
    const label = el.querySelector('.sg-label');
    if (label) label.style.fontSize = `${Math.max(10, Math.round(18 * scaleMult))}px`;
  }

  function resetSlotVisual(sz) {
    const el  = slotEls[sz.id];
    const old = el.querySelector('svg');
    if (old) old.remove();
    el.insertBefore(createShirt(sz.scale * scaleMult, false, 4), el.querySelector('.sg-label'));
    el.querySelector('.sg-label').style.color = 'rgba(255,255,255,0)';
    el.style.cursor     = 'pointer';
    el.style.background = 'transparent';
    el.style.boxShadow  = 'none';
    applySlotSizing(el, sz);
  }

  function spawnTarget() {
    const cs = currentSz();
    if (!cs) return;

    targetWrap = document.createElement('div');
    targetWrap.id = 'sg-target';

    const hint = document.createElement('div');
    hint.className   = 'sg-hint';
    hint.textContent = 'Drag me';
    targetWrap.appendChild(hint);

    targetWrap.appendChild(createShirt(cs.scale * scaleMult, true, 4));
    targetWrap.addEventListener('pointerdown', onDown);
    bottomArea.appendChild(targetWrap);
  }

  // ── Resize ─────────────────────────────────────────────────────────────────

  function handleResize() {
    scaleMult = computeScaleMult();

    SIZES.forEach(function(s) {
      const el     = slotEls[s.id];
      const filled = matched.has(s.id);
      const old    = el.querySelector('svg');
      if (old) old.remove();
      el.insertBefore(createShirt(s.scale * scaleMult, filled, filled ? 5 : 4), el.querySelector('.sg-label'));
      applySlotSizing(el, s);
    });

    if (targetWrap) {
      const cs  = currentSz();
      const old = targetWrap.querySelector('svg');
      if (old && cs) {
        old.remove();
        targetWrap.appendChild(createShirt(cs.scale * scaleMult, true, 4));
      }
    }

    if (!animating) setPrompt(finalSize !== null);
  }

  // ── Drag ───────────────────────────────────────────────────────────────────

  function onDown(e) {
    if (flying || animating) return;
    e.preventDefault();
    targetWrap.setPointerCapture(e.pointerId);
    // Record grab point in viewport px; converted to CSS px on each move.
    drag = { startX: e.clientX, startY: e.clientY, dx: 0, dy: 0 };
    targetWrap.classList.add('sg-dragging');
    targetWrap.style.transition = 'transform 60ms';
    targetWrap.addEventListener('pointermove',   onMove);
    targetWrap.addEventListener('pointerup',     onUp);
    targetWrap.addEventListener('pointercancel', onUp);
  }

  function onMove(e) {
    if (!drag) return;
    // Divide by zoom so the CSS translate matches the visual pointer movement
    // exactly, regardless of any CSS zoom applied to a parent element.
    const z = getZoom();
    drag.dx = (e.clientX - drag.startX) / z;
    drag.dy = (e.clientY - drag.startY) / z;
    targetWrap.style.transform = `translate(calc(-50% + ${drag.dx}px), ${drag.dy}px) scale(1.04)`;
  }

  function onUp(e) {
    if (!drag) return;
    targetWrap.removeEventListener('pointermove',   onMove);
    targetWrap.removeEventListener('pointerup',     onUp);
    targetWrap.removeEventListener('pointercancel', onUp);
    targetWrap.classList.remove('sg-dragging');

    const hit = document.elementsFromPoint(e.clientX, e.clientY)
      .find(function(el) { return el.dataset?.slotId; });

    if (hit) {
      handleAttempt(hit.dataset.slotId);
    } else {
      drag = null;
      targetWrap.style.transition = 'transform 240ms cubic-bezier(.4,1.4,.5,1)';
      targetWrap.style.transform  = 'translate(-50%, 0)';
    }
  }

  // ── Game logic ─────────────────────────────────────────────────────────────

  function handleAttempt(slotId) {
    const cs = currentSz();
    if (!cs || matched.has(cs.id)) return;

    if (slotId === cs.id) {
      score.correct++;
      setHighlight(slotId, 'good');
      flyToSlot(slotId);
    } else {
      score.wrong++;
      setHighlight(slotId, 'bad');
      setTimeout(function() { setHighlight(slotId, null); }, 420);
      shakeTarget();
    }
    drag = null;
  }

  function flyToSlot(slotId) {
    flying = true;

    const z         = getZoom();
    const stageRect = stage.getBoundingClientRect();
    const slotRect  = slotEls[slotId].getBoundingClientRect();

    // getBoundingClientRect returns viewport px; CSS transform takes CSS px.
    const flyX = (slotRect.left + slotRect.width  / 2 - (stageRect.left + stageRect.width  / 2)) / z;
    const flyY = (slotRect.top  + slotRect.height * 0.45 - (stageRect.top + stageRect.height * 0.72)) / z;

    targetWrap.style.transition    = 'transform 380ms cubic-bezier(.4,1.4,.5,1), opacity 380ms ease';
    targetWrap.style.transform     = `translate(calc(-50% + ${flyX}px), ${flyY}px) scale(0.6)`;
    targetWrap.style.opacity       = '0';
    targetWrap.style.pointerEvents = 'none';

    setTimeout(function() {
      flying = false;
      matched.add(slotId);
      fillSlot(slotId);
      setHighlight(slotId, null);
      queue = queue.slice(1);
      if (targetWrap) { targetWrap.remove(); targetWrap = null; }

      if (queue.length === 0) {
        finalSize = SIZES[Math.floor(Math.random() * SIZES.length)];
        showDone();
      } else {
        spawnTarget();
      }
    }, 420);
  }

  function shakeTarget() {
    targetWrap.style.transition = 'none';
    void targetWrap.offsetWidth;
    targetWrap.style.transform = 'translate(-50%, 0)';
    void targetWrap.offsetWidth;
    targetWrap.style.animation = 'sg-shake 360ms ease';
    targetWrap.addEventListener('animationend', function() {
      targetWrap.style.animation  = '';
      targetWrap.style.transition = 'transform 240ms cubic-bezier(.4,1.4,.5,1)';
    }, { once: true });
  }

  function fillSlot(sizeId) {
    const el  = slotEls[sizeId];
    const old = el.querySelector('svg');
    if (old) old.remove();
    const sz = SIZES.find(function(s) { return s.id === sizeId; });
    el.insertBefore(createShirt(sz.scale * scaleMult, true, 5), el.querySelector('.sg-label'));
    el.querySelector('.sg-label').style.color = '#fff';
    el.style.cursor = 'default';
  }

  function setHighlight(sizeId, kind) {
    const el = slotEls[sizeId];
    if (kind === 'good') {
      el.style.background = 'rgba(74,222,128,0.08)';
      el.style.boxShadow  = 'inset 0 0 0 2px #4ade80';
    } else if (kind === 'bad') {
      el.style.background = 'rgba(248,113,113,0.10)';
      el.style.boxShadow  = 'inset 0 0 0 2px #f87171';
    } else {
      el.style.background = 'transparent';
      el.style.boxShadow  = 'none';
    }
  }

  function setPrompt(done) {
    if (done && finalSize) {
      promptEl.style.fontSize   = `${Math.max(18, Math.round(28 * scaleMult))}px`;
      promptEl.style.fontWeight = '600';
      promptEl.innerHTML = `You are a size <span style="font-weight:700;letter-spacing:2px">${escHtml(finalSize.label)}</span>`;
    } else {
      promptEl.style.fontSize   = `${Math.max(14, Math.round(22 * scaleMult))}px`;
      promptEl.style.fontWeight = '500';
      promptEl.textContent = 'Match the shirt to the correct size';
    }
  }

  // Cycles through random size labels before landing on finalSize (slot machine).
  // Starts fast (55ms), eases to slow (310ms), last 4 steps lock onto finalSize.
  function animateFinalSize(onComplete) {
    const STEPS  = 28;
    const MIN_MS = 55;
    const MAX_MS = 310;
    let step    = 0;
    let prevIdx = -1;

    promptEl.style.fontSize   = `${Math.max(18, Math.round(28 * scaleMult))}px`;
    promptEl.style.fontWeight = '600';
    animating = true;

    function tick() {
      const t     = step / (STEPS - 1);
      const delay = MIN_MS + t * t * (MAX_MS - MIN_MS);

      let label;
      if (step >= STEPS - 4) {
        label = finalSize.label;
      } else {
        let idx;
        do {
          idx = Math.floor(Math.random() * SIZES.length);
        } while (idx === prevIdx && SIZES.length > 1);
        prevIdx = idx;
        label = SIZES[idx].label;
      }

      promptEl.innerHTML = `You are a size <span style="font-weight:700;letter-spacing:2px">${escHtml(label)}</span>`;
      step++;

      if (step < STEPS) {
        setTimeout(tick, delay);
      } else {
        animating = false;
        onComplete();
      }
    }

    tick();
  }

  function showDone() {
    if (targetWrap) { targetWrap.remove(); targetWrap = null; }

    animateFinalSize(function() {
      const scoreDiv = document.createElement('div');
      scoreDiv.className   = 'sg-score';
      scoreDiv.textContent = `${score.correct} correct · ${score.wrong} wrong`;

      const btn = document.createElement('button');
      btn.className   = 'sg-replay-btn';
      btn.textContent = 'Play again';
      btn.addEventListener('click', startGame);

      doneArea.appendChild(scoreDiv);
      doneArea.appendChild(btn);
      doneArea.style.display = 'flex';
    });
  }

  document.addEventListener('DOMContentLoaded', init);
}());
