/* Let native momentum flow into a critically damped landing at matching speed. */
(() => {
  'use strict';
  const root = document.documentElement;
  const panels = [...document.querySelectorAll('.film')];
  if (!panels.length) return;
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const clamp = (value, min, max) => Math.max(min, Math.min(value, max));
  let idleTimer = 0, animation = 0, animating = false;
  let pointerDown = false, touching = false, scrollKeyDown = false;
  let previousY = window.scrollY, previousTime = performance.now();
  let lastScroll = 0, lastInput = 0, velocity = 0;
  let resizeTimer = 0, momentumFrame = 0;
  let gesturePending = false, slowSince = 0;
  const springOmega = 15;
  // px/ms: the spring's peak speed from rest, bounded for short and long moves.
  const captureSpeed = distance => clamp(Math.abs(distance) * springOmega / Math.E / 1000, .12, .9);
  let pendingHeight = null, layoutScrollY = null;
  const viewportHeight = () => window.visualViewport?.height || window.innerHeight;
  root.style.setProperty('--film-height', `${viewportHeight()}px`);
  root.dataset.snapState = 'idle';

  function blocked() {
    return document.hidden || Math.abs((window.visualViewport?.scale || 1) - 1) > .01 || touching || pointerDown || scrollKeyDown || !!document.querySelector('dialog[open]') || !window.getSelection()?.isCollapsed;
  }
  function cancelLanding() {
    clearTimeout(idleTimer);
    cancelAnimationFrame(momentumFrame);
    momentumFrame = 0;
    cancelAnimationFrame(animation);
    animation = 0;
    animating = false;
    root.classList.remove('is-snapping');
    root.dataset.snapState = 'idle';
  }
  function schedule(delay = 180) {
    clearTimeout(idleTimer);
    if (!blocked() && !animating) {
      idleTimer = setTimeout(settle, delay);
      if (gesturePending && !momentumFrame) momentumFrame = requestAnimationFrame(watchMomentum);
    }
  }
  function watchMomentum(now) {
    momentumFrame = 0;
    if (blocked() || animating || !gesturePending) return;
    // A resize needs to finish before its new tile positions can be trusted.
    if (!resizeTimer && now - lastInput >= 110) {
      const speed = currentVelocity(now);
      const target = nearestTarget(window.scrollY, speed);
      if (Math.abs(speed) <= captureSpeed(target - window.scrollY)) {
        if (!slowSince) slowSince = now;
        if (now - slowSince >= 80) { settle(true); return; }
      } else slowSince = 0;
    } else slowSince = 0;
    momentumFrame = requestAnimationFrame(watchMomentum);
  }
  function currentVelocity(now) {
    // Between momentum frames retain measured speed; decay only once events stop.
    return velocity * Math.exp(-Math.max(0, now - lastScroll - 50) / 70);
  }
  function nearestTarget(y, speed) {
    const projected = y + clamp(speed * 120, -viewportHeight() * .1, viewportHeight() * .1);
    return targets().reduce((best, option) => Math.abs(option - projected) < Math.abs(best - projected) ? option : best, 0);
  }
  function interrupted(preserveVelocity = false) {
    cancelLanding();
    gesturePending = true;
    slowSince = 0;
    lastInput = performance.now();
    if (!preserveVelocity) {
      previousY = window.scrollY;
      previousTime = lastInput;
      velocity = 0;
    }
    schedule(220);
  }
  function targets() {
    const limit = Math.max(0, root.scrollHeight - viewportHeight());
    return [0, ...panels.map(panel => clamp(panel.getBoundingClientRect().top + window.scrollY, 0, limit))];
  }
  function settle(captureMomentum = false) {
    if (blocked() || animating) return;
    if (resizeTimer) { schedule(180); return; }
    const now = performance.now();
    const quietFor = now - Math.max(lastScroll, lastInput);
    // Momentum produces scroll events even after the fingers have lifted.
    if (!captureMomentum && quietFor < 170) { schedule(180 - quietFor); return; }
    const remainingVelocity = currentVelocity(now);
    applyViewportHeight();
    const y = window.scrollY;
    const target = nearestTarget(y, remainingVelocity);
    gesturePending = false;
    cancelAnimationFrame(momentumFrame);
    momentumFrame = 0;
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
    const omega = springOmega;
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
    if (layoutScrollY !== null) {
      const isLayoutCorrection = Math.abs(y - layoutScrollY) < 2;
      layoutScrollY = null;
      if (isLayoutCorrection && !animating) {
        previousY = y;
        previousTime = now;
        return;
      }
    }
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
  window.addEventListener('wheel', () => {
    // Wheel events include trackpad momentum: each fresh event yields to the user.
    interrupted(true);
  }, { passive: true });
  window.addEventListener('touchstart', () => { touching = true; interrupted(); }, { passive: true });
  window.addEventListener('touchend', () => { touching = false; lastInput = performance.now(); schedule(220); }, { passive: true });
  window.addEventListener('touchcancel', () => { touching = false; schedule(220); }, { passive: true });
  window.addEventListener('pointerdown', () => { pointerDown = true; interrupted(); }, { passive: true });
  window.addEventListener('pointerup', () => { pointerDown = false; lastInput = performance.now(); schedule(220); }, { passive: true });
  window.addEventListener('pointercancel', () => { pointerDown = false; schedule(220); }, { passive: true });
  window.addEventListener('keydown', event => {
    const editing = event.target instanceof Element && event.target.closest('input,textarea,select,[contenteditable=true]');
    if (!editing && ['ArrowUp','ArrowDown','PageUp','PageDown','Home','End',' '].includes(event.key)) { scrollKeyDown = true; interrupted(); }
  });
  window.addEventListener('keyup', () => {
    if (scrollKeyDown) { scrollKeyDown = false; lastInput = performance.now(); schedule(220); }
  });
  window.addEventListener('scrollend', () => { if (!animating) schedule(180); }, { passive: true });
  function applyViewportHeight() {
    if (pendingHeight === null) return;
    // Commit only at the momentum-to-snap handoff, never during a gesture.
    // Keep the visible film at the same screen position when preceding rows resize.
    const firstTop = panels[0].getBoundingClientRect().top;
    const anchor = firstTop <= 0
      ? panels.reduce((best, panel) => Math.abs(panel.getBoundingClientRect().top) < Math.abs(best.getBoundingClientRect().top) ? panel : best)
      : null;
    const top = anchor?.getBoundingClientRect().top;
    root.classList.add('is-snapping');
    root.style.setProperty('--film-height', `${pendingHeight}px`);
    pendingHeight = null;
    if (anchor) {
      const limit = Math.max(0, root.scrollHeight - viewportHeight());
      const corrected = clamp(window.scrollY + anchor.getBoundingClientRect().top - top, 0, limit);
      window.scrollTo({ top: corrected, behavior: 'instant' });
      layoutScrollY = window.scrollY;
      previousY = window.scrollY;
      previousTime = performance.now();
    }
    root.classList.remove('is-snapping');
  }
  function viewportResized() {
    const field = document.activeElement?.matches('input,textarea,[contenteditable=true]');
    if (field || Math.abs((window.visualViewport?.scale || 1) - 1) > .01) return;
    const height = viewportHeight();
    const committed = parseFloat(root.style.getPropertyValue('--film-height'));
    if (Math.abs(height - committed) < 2 && pendingHeight === null) return;
    pendingHeight = height;
    // Browser-bar animation must not reflow all seven rows or retarget a spring.
    const resumeGesture = gesturePending || animating;
    cancelLanding();
    gesturePending = resumeGesture;
    slowSince = 0;
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      resizeTimer = 0;
      schedule(180);
    }, 220);
  }
  window.addEventListener('resize', viewportResized, { passive: true });
  window.visualViewport?.addEventListener('resize', viewportResized, { passive: true });
  window.addEventListener('blur', () => { touching = false; pointerDown = false; scrollKeyDown = false; cancelLanding(); });
  document.addEventListener('visibilitychange', () => { if (document.hidden) cancelLanding(); });
  document.querySelectorAll('dialog').forEach(dialog => {
    dialog.addEventListener('close', () => schedule(250));
  });
  motion.addEventListener('change', cancelLanding);
  // Opening a page doesn't pull the visitor away from its introduction.
})();
