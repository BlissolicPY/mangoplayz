/* mangoplayz.xyz — hardware-adaptive quality.

   Everything else on this page was made cheaper; this decides how much of it a
   given machine actually gets. It sets `data-q` on <html> to "high", "mid" or
   "low", and fires `mp:quality` when that changes. CSS reads the attribute for
   the effects it owns, leaves.js reads it for how many leaves to spawn.

   Why measure rather than sniff: this page renders on a 165Hz RTX 3080 here and
   on a five-year-old school laptop there, and no static signal separates them
   reliably. `hardwareConcurrency` says nothing about the GPU, user agents lie,
   and a phone with eight cores can still be thermally throttled to a crawl. So
   the static hints only pick a STARTING tier — the real decision comes from
   watching actual frame times once the page is animating.

   The ladder only ever goes DOWN. A page that quietly drops an effect reads as
   "this is how it looks"; one that adds effects back mid-scroll reads as broken,
   and an upgrade that turns out to be wrong oscillates. */

(() => {
  "use strict";

  const root = document.documentElement;

  const mq = (q) => window.matchMedia(q).matches;
  const RANK = { high: 3, mid: 2, low: 1 };

  /* ---------- the starting guess ---------- */

  let tier = "high";

  // someone who asked for less motion gets the calm page, full stop
  if (mq("(prefers-reduced-motion: reduce)")) {
    tier = "low";
  } else if (
    // 4 threads or less, or 4GB or less of RAM: not proof of a slow machine,
    // but enough to start careful and let the probe promote nothing
    (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4) ||
    (navigator.deviceMemory && navigator.deviceMemory <= 4) ||
    // phones and tablets: no cursor to trail, and far less GPU headroom than
    // their core count suggests
    mq("(pointer: coarse)")
  ) {
    tier = "mid";
  }

  /* ?q=high|mid|low pins a tier: it is how each rung gets looked at on a machine
     that would never fall to it on its own, and how the before/after timings
     compare like with like instead of one arm quietly degrading itself. */
  const forced = new URLSearchParams(location.search).get("q");

  const set = (next) => {
    if (forced) return;
    if (RANK[next] >= RANK[tier]) return;   // down only
    tier = next;
    root.dataset.q = tier;
    window.dispatchEvent(new CustomEvent("mp:quality", { detail: { tier } }));
  };

  if (forced && RANK[forced]) tier = forced;
  root.dataset.q = tier;

  /* ---------- what the machine actually manages ---------- */

  // p50 frame time, not mean: one 300ms stall from a font swap or a fetch would
  // drag a mean below the threshold and condemn a machine that is fine
  const SAMPLES = 55;
  const MID_MS = 22;   // ~45fps
  const LOW_MS = 34;   // ~30fps

  function probe(done) {
    const f = [];
    let last = performance.now();
    const tick = (t) => {
      f.push(t - last);
      last = t;
      if (f.length < SAMPLES) return requestAnimationFrame(tick);
      const s = f.slice(5).sort((a, b) => a - b);
      done(s[Math.floor(s.length / 2)]);
    };
    requestAnimationFrame(tick);
  }

  function judge(p50) {
    if (p50 > LOW_MS) set("low");
    else if (p50 > MID_MS) set("mid");
  }

  window.addEventListener(
    "mp:enter",
    () => {
      // wait out the entrance: the reveal and the gust are the heaviest two
      // seconds the page ever has, and judging it on those would downgrade a
      // machine that holds 60fps for the other 99% of the visit
      setTimeout(() => probe(judge), 2600);
      // one more look once everything has settled, in case the first was lucky
      setTimeout(() => probe(judge), 11000);
    },
    { once: true }
  );

  // a tab that comes back from the background gets one honest re-check, since
  // whatever else the machine is now doing is the condition that matters
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden && tier !== "low") setTimeout(() => probe(judge), 1200);
  });
})();
