/* Idle snapping: native wheel/touch momentum first, a soft landing second. */
(() => {
  'use strict';
  const root = document.documentElement;
  const panels = [...document.querySelectorAll('.film')];
  if (!panels.length) return;
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const clamp = (value, min, max) => Math.max(min, Math.min(value, max));
  let idleTimer = 0, animation = 0, animating = false;
  let pointerDown = false, touching = false;
  let previousY = window.scrollY, previousTime = performance.now();
  let lastScroll = 0, lastInput = 0, velocity = 0;
  let resizeTimer = 0;
  let alignedPanel = null, resizeAnchor = null;
  const viewportHeight = () => window.visualViewport?.height || window.innerHeight;
  function rememberAlignment() {
    alignedPanel = panels.find(panel => Math.abs(panel.getBoundingClientRect().top) < 2) || null;
  }
  root.dataset.snapState = 'idle';

  function blocked() {
    return document.hidden || Math.abs((window.visualViewport?.scale || 1) - 1) > .01 || touching || pointerDown || !!document.querySelector('dialog[open]') || !window.getSelection()?.isCollapsed;
  }
  function cancelLanding() {
    clearTimeout(idleTimer);
    cancelAnimationFrame(animation);
    animation = 0;
    animating = false;
    root.classList.remove('is-snapping');
    root.dataset.snapState = 'idle';
  }
  function schedule(delay = 180) {
    clearTimeout(idleTimer);
    if (!blocked() && !animating) idleTimer = setTimeout(settle, delay);
  }
  function interrupted() {
    alignedPanel = null;
    resizeAnchor = null;
    cancelLanding();
    lastInput = performance.now();
    previousY = window.scrollY;
    previousTime = lastInput;
    velocity = 0;
    schedule(220);
  }
  function targets() {
    const limit = Math.max(0, root.scrollHeight - viewportHeight());
    return [0, ...panels.map(panel => clamp(panel.getBoundingClientRect().top + window.scrollY, 0, limit))];
  }
  function settle() {
    if (blocked() || animating) return;
    if (resizeTimer) { schedule(180); return; }
    const now = performance.now();
    const quietFor = now - Math.max(lastScroll, lastInput);
    // Momentum produces scroll events even after the fingers have lifted.
    if (quietFor < 170) { schedule(180 - quietFor); return; }
    const y = window.scrollY;
    const viewport = viewportHeight();
    const remainingVelocity = velocity * Math.exp(-quietFor / 70);
    const projected = y + clamp(remainingVelocity * 120, -viewport * .1, viewport * .1);
    const options = targets();
    const target = options.reduce((best, option) => Math.abs(option - projected) < Math.abs(best - projected) ? option : best, options[0]);
    // Leave tiny alignment differences alone; this also prevents snap loops.
    if (Math.abs(target - y) < 2) { root.dataset.snapState = 'idle'; rememberAlignment(); return; }
    land(target, remainingVelocity * 1000);
  }
  function land(target, initialVelocity = 0) {
    cancelLanding();
    if (motion.matches) {
      root.classList.add('is-snapping');
      window.scrollTo({ top: target, behavior: 'instant' });
      root.classList.remove('is-snapping');
      previousY = window.scrollY;
      previousTime = performance.now();
      velocity = 0;
      rememberAlignment();
      return;
    }
    const startY = window.scrollY;
    const offset = startY - target;
    // A critically damped spring lands without bouncing across a boundary.
    const omega = 15;
    const v = clamp(initialVelocity, -1600, 1600);
    const coefficient = v + omega * offset;
    const began = performance.now();
    animating = true;
    root.classList.add('is-snapping');
    root.dataset.snapState = 'snapping';
    function frame(now) {
      if (!animating) return;
      if (blocked()) { cancelLanding(); return; }
      const t = (now - began) / 1000;
      const position = target + (offset + coefficient * t) * Math.exp(-omega * t);
      window.scrollTo({ top: position, behavior: 'instant' });
      if ((Math.abs(position - target) < .45 && t > .18) || t > .95) {
        window.scrollTo({ top: target, behavior: 'instant' });
        animating = false;
        animation = 0;
        root.classList.remove('is-snapping');
        root.dataset.snapState = 'idle';
        previousY = window.scrollY;
        previousTime = now;
        velocity = 0;
        rememberAlignment();
        return;
      }
      animation = requestAnimationFrame(frame);
    }
    animation = requestAnimationFrame(frame);
  }
  window.addEventListener('scroll', () => {
    const now = performance.now(), y = window.scrollY;
    if (!animating) {
      const dt = now - previousTime;
      const sampled = dt > 0 && dt < 100 ? (y - previousY) / dt : 0;
      velocity = sampled * .65 + velocity * .35;
      lastScroll = now;
      root.dataset.snapState = 'settling';
      schedule();
    }
    previousY = y;
    previousTime = now;
  }, { passive: true });
  window.addEventListener('wheel', interrupted, { passive: true });
  window.addEventListener('touchstart', () => { touching = true; interrupted(); }, { passive: true });
  window.addEventListener('touchend', () => { touching = false; lastInput = performance.now(); schedule(220); }, { passive: true });
  window.addEventListener('touchcancel', () => { touching = false; schedule(220); }, { passive: true });
  window.addEventListener('pointerdown', () => { pointerDown = true; interrupted(); }, { passive: true });
  window.addEventListener('pointerup', () => { pointerDown = false; lastInput = performance.now(); schedule(220); }, { passive: true });
  window.addEventListener('pointercancel', () => { pointerDown = false; schedule(220); }, { passive: true });
  window.addEventListener('keydown', event => {
    const editing = event.target instanceof Element && event.target.closest('input,textarea,select,[contenteditable=true]');
    if (!editing && ['ArrowUp','ArrowDown','PageUp','PageDown','Home','End',' '].includes(event.key)) interrupted();
  });
  window.addEventListener('scrollend', () => { if (!animating) schedule(180); }, { passive: true });
  function viewportResized() {
    // Preserve the film after an idle viewport resize, but never lock a live gesture.
    if (!resizeAnchor) resizeAnchor = alignedPanel;
    cancelLanding();
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      resizeTimer = 0;
      const field = document.activeElement?.matches('input,textarea,[contenteditable=true]');
      if (field || blocked()) return;
      const anchor = resizeAnchor;
      resizeAnchor = null;
      if (anchor) {
        const limit = Math.max(0, root.scrollHeight - viewportHeight());
        land(clamp(anchor.getBoundingClientRect().top + window.scrollY, 0, limit));
      } else schedule(180);
    }, 300);
  }
  window.addEventListener('resize', viewportResized, { passive: true });
  window.visualViewport?.addEventListener('resize', viewportResized, { passive: true });
  window.addEventListener('blur', () => { touching = false; pointerDown = false; cancelLanding(); });
  document.addEventListener('visibilitychange', () => { if (document.hidden) cancelLanding(); });
  document.querySelectorAll('dialog').forEach(dialog => {
    dialog.addEventListener('close', () => schedule(250));
  });
  motion.addEventListener('change', cancelLanding);
  // Opening a page doesn't pull the visitor away from its introduction.
})();
