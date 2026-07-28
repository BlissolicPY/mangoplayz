/* MangoPlayz — motion-blurred cursor trail.

   The native cursor is deliberately LEFT VISIBLE. Hiding it and drawing a dot
   instead is the fashionable version and it is worse: people lose track of the
   pointer, text-selection and link affordances disappear, and any frame drop
   makes the whole page feel broken. This draws a soft glow that lags behind the
   real pointer instead, so the cursor keeps all its normal behaviour and just
   gains a tail.

   The "motion blur" is squash-and-stretch, not a filter: the glow is rotated to
   face the direction of travel and stretched along it in proportion to speed,
   which is what a real smeared highlight does. A blur filter alone just looks
   out of focus. */

(() => {
  "use strict";

  // no trail on touch — there is no cursor to blur, and it would just be a
  // stray glow that teleports on every tap
  if (!window.matchMedia("(pointer: fine)").matches) return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  const EASE = 0.16;        // how fast the glow chases the pointer, 0-1
  const STRETCH = 0.055;    // px of speed -> extra length
  const MAX_STRETCH = 2.6;  // ceiling, or fast flicks turn it into a streak
  const IDLE_FADE = 0.12;   // opacity easing when the pointer stops

  const glow = document.createElement("div");
  glow.className = "cursor-glow";
  glow.setAttribute("aria-hidden", "true");
  document.body.appendChild(glow);

  let pointerX = window.innerWidth / 2;
  let pointerY = window.innerHeight / 2;
  let x = pointerX;
  let y = pointerY;
  let opacity = 0;
  let target = 0;
  let running = false;

  function onMove(e) {
    pointerX = e.clientX;
    pointerY = e.clientY;
    target = 1;
    if (!running) {
      running = true;
      requestAnimationFrame(frame);
    }
  }

  function frame() {
    const dx = pointerX - x;
    const dy = pointerY - y;

    x += dx * EASE;
    y += dy * EASE;

    // velocity of the GLOW, not the pointer: it's what's actually being drawn,
    // so the stretch stays in sync with the thing smearing
    const vx = dx * EASE;
    const vy = dy * EASE;
    const speed = Math.hypot(vx, vy);

    const scaleX = Math.min(1 + speed * STRETCH, MAX_STRETCH);
    const scaleY = 1 / Math.sqrt(scaleX); // keep the area roughly constant
    const angle = speed > 0.1 ? (Math.atan2(vy, vx) * 180) / Math.PI : 0;

    opacity += (target - opacity) * IDLE_FADE;

    glow.style.opacity = String(opacity);
    glow.style.transform =
      `translate3d(${x}px, ${y}px, 0) translate(-50%, -50%) ` +
      `rotate(${angle}deg) scale(${scaleX}, ${scaleY})`;

    // park the loop once it has settled and faded, so an idle tab costs nothing
    const settled = Math.abs(dx) < 0.1 && Math.abs(dy) < 0.1;
    if (settled && Math.abs(target - opacity) < 0.01) {
      running = false;
      return;
    }
    requestAnimationFrame(frame);
  }

  function fadeOut() {
    target = 0;
    if (!running) {
      running = true;
      requestAnimationFrame(frame);
    }
  }

  window.addEventListener("pointermove", onMove, { passive: true });
  window.addEventListener("pointerdown", onMove, { passive: true });
  document.addEventListener("mouseleave", fadeOut);
  window.addEventListener("blur", fadeOut);
})();
