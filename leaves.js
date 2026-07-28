/* MangoPlayz — the leaf gust that plays as the intro gate clears.

   Hooked to the `mp:enter` event the inline gate script fires, not to a click
   handler of its own: the gate has to stay independent of every other file, and
   this is pure decoration — if it never runs, nothing about the page breaks.

   Motion is split across three nested elements on purpose, because one keyframe
   cannot do it: the outer span carries the leaf across the viewport (linear, so
   the gust reads as wind rather than an ease), the middle one sways it up and
   down, and the svg spins. Composing them gives organic motion out of three
   trivial animations, all of them transform-only so they stay on the
   compositor. */

(() => {
  "use strict";

  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  const COUNT = 64;

  // straight off the page's own palette — the reds and golds of the maple in
  // the background photograph, not invented autumn colours
  const TINTS = [
    "#FC7614", // flame-500, the background's signature orange
    "#FC6716", // flame-600
    "#FDC735", // gold-500
    "#FED639", // gold-400
    "#D57918", // amber-600
    "#A6570A", // amber-700, the dark ones that read as depth
    "#871703", // ember-800
  ];

  const LEAF = `<svg viewBox="0 0 24 24" aria-hidden="true">
    <path fill="currentColor" d="M12 1.8c-5.4 4.6-7.6 10.9 0 20.4 7.6-9.5 5.4-15.8 0-20.4z"/>
    <path stroke="rgba(0,0,0,0.22)" stroke-width="0.9" stroke-linecap="round" d="M12 5.2v13.4"/>
  </svg>`;

  const rand = (min, max) => min + Math.random() * (max - min);
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

  function gust() {
    const frag = document.createDocumentFragment();

    for (let i = 0; i < COUNT; i++) {
      const leaf = document.createElement("span");
      leaf.className = "leaf";
      leaf.setAttribute("aria-hidden", "true");

      /* Three depth bands rather than one flat random size. The foreground
         ones are the whole effect: huge, fast and blurred, they read as leaves
         brushing past the camera and are what makes the gust feel like the page
         is being swept clear rather than sprinkled on. */
      const roll = Math.random();
      const size =
        roll < 0.14 ? rand(110, 190) :  // foreground, whipping past
        roll < 0.55 ? rand(52, 104)  :  // midground, the bulk of it
                      rand(26, 50);     // background

      // 0 = right in front of the lens, 1 = far away
      const far = 1 - Math.min((size - 26) / 164, 1);

      leaf.style.setProperty("--top", `${rand(-14, 104)}vh`);
      leaf.style.setProperty("--size", `${size.toFixed(0)}px`);
      // near leaves cross fast, distant ones lag — parallax, so the depth reads
      leaf.style.setProperty("--dur", `${(rand(1.05, 1.5) + far * 1.15).toFixed(2)}s`);
      leaf.style.setProperty("--delay", `${rand(0, 0.55).toFixed(2)}s`);
      leaf.style.setProperty("--drift", `${rand(-20, 28)}vh`);
      leaf.style.setProperty("--op", (0.95 - far * 0.45).toFixed(2));
      // the big foreground ones blur because they're out of focus, the tiny
      // ones because they're distant — both ends soften, the middle stays sharp
      leaf.style.setProperty(
        "--blur",
        `${(far * 2 + Math.max(0, (size - 110) / 40)).toFixed(2)}px`
      );
      leaf.style.setProperty("--tint", pick(TINTS));

      const sway = document.createElement("i");
      // sway scales with the leaf, or the big ones look pinned to a rail
      sway.style.setProperty("--sway", `${rand(12, 30) + size * 0.22}px`);
      sway.style.setProperty("--swayDur", `${rand(0.5, 1.05)}s`);
      sway.innerHTML = LEAF;

      const svg = sway.firstElementChild;
      // heavy things tumble slower; spinning a 180px leaf at 0.8s looks like a
      // propeller rather than a leaf
      svg.style.setProperty("--spinDur", `${(rand(0.9, 1.8) + size / 90).toFixed(2)}s`);
      svg.style.setProperty("--spinDir", Math.random() < 0.5 ? "normal" : "reverse");

      leaf.appendChild(sway);
      // each leaf clears itself up the moment it has crossed
      leaf.addEventListener("animationend", () => leaf.remove(), { once: true });
      frag.appendChild(leaf);
    }

    document.body.appendChild(frag);
  }

  /* ---------- the ambient drift that follows the gust ----------
     Small, slow, sparse and low-contrast. It sits BEHIND the card (z-index 1
     against the card's 2) for two reasons: nothing ever crosses the text, and
     the tiles use backdrop-filter, so a leaf passing behind one shows through
     the glass as a soft blurred shape. That is the nicest part of it and it is
     free — it only works because the leaves are underneath. */

  const FALL_MAX = 9;         // concurrent leaves; more reads as weather
  const FALL_EVERY = 1700;    // ms between spawns
  let falling = 0;
  let fallTimer = null;

  function dropLeaf(initial) {
    if (falling >= FALL_MAX) return;
    falling++;

    const leaf = document.createElement("span");
    leaf.className = "leaf-fall";
    leaf.setAttribute("aria-hidden", "true");

    const size = rand(11, 26);
    leaf.style.setProperty("--left", `${rand(-2, 100)}vw`);
    leaf.style.setProperty("--size", `${size.toFixed(0)}px`);
    leaf.style.setProperty("--dur", `${rand(9, 17).toFixed(1)}s`);
    // stagger the first batch up the screen so the page isn't bare for 10s
    leaf.style.setProperty("--delay", initial ? `-${rand(0, 12).toFixed(1)}s` : "0s");
    leaf.style.setProperty("--drift", `${rand(-9, 9)}vw`);
    leaf.style.setProperty("--op", rand(0.2, 0.45).toFixed(2));
    leaf.style.setProperty("--blur", `${rand(0, 1.1).toFixed(2)}px`);
    leaf.style.setProperty("--tint", pick(TINTS));

    const sway = document.createElement("i");
    sway.style.setProperty("--sway", `${rand(14, 40)}px`);
    sway.style.setProperty("--swayDur", `${rand(2.4, 4.6).toFixed(1)}s`);
    sway.innerHTML = LEAF;
    sway.firstElementChild.style.setProperty("--spinDur", `${rand(6, 14).toFixed(1)}s`);

    leaf.appendChild(sway);
    leaf.addEventListener(
      "animationend",
      () => {
        leaf.remove();
        falling--;
      },
      { once: true }
    );
    document.body.appendChild(leaf);
  }

  function startFalling() {
    for (let i = 0; i < 5; i++) dropLeaf(true);
    fallTimer = setInterval(() => dropLeaf(false), FALL_EVERY);
  }

  // a backgrounded tab has nobody looking at it
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      clearInterval(fallTimer);
      fallTimer = null;
    } else if (!fallTimer) {
      fallTimer = setInterval(() => dropLeaf(false), FALL_EVERY);
    }
  });

  window.addEventListener(
    "mp:enter",
    () => {
      gust();
      // let the gust be the whole picture first, then settle into the drift
      setTimeout(startFalling, 1800);
    },
    { once: true }
  );
})();
