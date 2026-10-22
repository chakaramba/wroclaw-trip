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
  root.dataset.snapState = 'idle';

  function blocked() {
    return document.hidden || touching || pointerDown || !!document.querySelector('dialog[open]') || !window.getSelection()?.isCollapsed;
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
    cancelLanding();
    lastInput = performance.now();
    previousY = window.scrollY;
    previousTime = lastInput;
    velocity = 0;
    schedule(220);
  }
  function targets() {
    const limit = Math.max(0, root.scrollHeight - window.innerHeight);
    return [0, ...panels.map(panel => clamp(panel.getBoundingClientRect().top + window.scrollY, 0, limit))];
  }
  function settle() {
    if (blocked() || animating) return;
    const now = performance.now();
    const quietFor = now - Math.max(lastScroll, lastInput);
    // Momentum produces scroll events even after the fingers have lifted.
    if (quietFor < 170) { schedule(180 - quietFor); return; }
    const y = window.scrollY;
    const viewport = window.innerHeight;
    const remainingVelocity = velocity * Math.exp(-quietFor / 70);
    const projected = y + clamp(remainingVelocity * 120, -viewport * .1, viewport * .1);
    const options = targets();
    const target = options.reduce((best, option) => Math.abs(option - projected) < Math.abs(best - projected) ? option : best, options[0]);
    // Leave tiny alignment differences alone; this also prevents snap loops.
    if (Math.abs(target - y) < 2) { root.dataset.snapState = 'idle'; return; }
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
  window.addEventListener('resize', () => {
    cancelLanding();
    clearTimeout(resizeTimer);
    // Browser chrome and the on-screen keyboard can both resize the viewport.
    resizeTimer = setTimeout(() => {
      const field = document.activeElement?.matches('input,textarea,[contenteditable=true]');
      if (!field) schedule(280);
    }, 300);
  }, { passive: true });
  window.addEventListener('blur', () => { touching = false; pointerDown = false; cancelLanding(); });
  document.addEventListener('visibilitychange', () => { if (document.hidden) cancelLanding(); });
  document.querySelectorAll('dialog').forEach(dialog => {
    dialog.addEventListener('close', () => schedule(250));
  });
  motion.addEventListener('change', cancelLanding);
  // Opening a page doesn't pull the visitor away from its introduction.
})();
