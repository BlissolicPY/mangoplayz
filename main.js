/* MangoPlayz — live subscriber count for the main channel (@NathanMCShorts) */

(() => {
  "use strict";

  const CHANNEL_ID = "UCN-Z_OLH1XeCzrmmXH228Cw"; // NathanMC, the main channel
  const REFRESH_MS = 300_000; // 5min: the display only moves every 1000 subs

  /* Keyless, and all send Access-Control-Allow-Origin: *.
     Each source lists several readers, tried in order — these are scraper APIs
     and they rot, hence both the extra readers and the `> 0` guard below.

     Order happens not to matter at this size: socialcounts (101635 / 101000)
     and mixerno (101114 / 101000) all render "101K". That is a property of
     101K, not of the chain — at 175K on the sibling Dewier site the same two
     sources differ by a whole notch. Re-check before assuming. */
  const SOURCES = [
    {
      url: `https://api.socialcounts.org/youtube-live-subscriber-count/${CHANNEL_ID}`,
      read: (d) => [
        d?.counters?.estimation?.subscriberCount,
        d?.counters?.api?.subscriberCount,
        d?.est_sub,
      ],
    },
    {
      url: `https://mixerno.space/api/youtube-channel-counter/user/${CHANNEL_ID}`,
      read: (d) => [
        d?.counts?.find((c) => c.value === "subscribers")?.count,
        d?.counts?.find((c) => c.value === "apisubscribers")?.count,
      ],
    },
  ];

  // last known good — YouTube's own floored figure, so a fully dead chain still
  // renders what the channel page shows
  const FALLBACK = 101_000;

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* Matches YouTube's own abbreviation: 3 significant figures, TRUNCATED.
     101,635 -> "101K" (not "102K" — YouTube floors, and rounding up would read
     as inflated next to the channel itself). 12,345 -> "12.3K". 1,234 -> "1.23K".

     The floor runs in the integer domain (n * f / v) rather than on the scaled
     float (scaled * f). Flooring a binary fraction drops a whole notch whenever
     the scaled value lands just under an exact decimal: 1.13 * 100 is
     112.99999999999999, so the float path prints 1.12K for 1130. */
  function abbreviate(n) {
    const units = [
      { v: 1e9, s: "B" },
      { v: 1e6, s: "M" },
      { v: 1e3, s: "K" },
    ];
    for (const { v, s } of units) {
      if (n >= v) {
        const scaled = n / v;
        const dp = scaled >= 100 ? 0 : scaled >= 10 ? 1 : 2;
        const f = 10 ** dp;
        const truncated = Math.floor((n * f) / v) / f;
        // parseFloat drops trailing zeros: 1.00K -> 1K, matching YouTube
        return String(parseFloat(truncated.toFixed(dp))) + s;
      }
    }
    return String(n);
  }

  const countEl = document.getElementById("subCount");

  let shown = 0;      // value currently painted
  let rafId = null;
  let timerId = null;

  async function fetchCount() {
    for (const src of SOURCES) {
      try {
        const res = await fetch(src.url, { cache: "no-store" });
        if (!res.ok) continue;
        for (const n of src.read(await res.json())) {
          if (Number.isFinite(n) && n > 0) return n;
        }
      } catch {
        /* try the next source */
      }
    }
    return null;
  }

  const easeOutExpo = (t) => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t));

  function animateTo(target, duration) {
    cancelAnimationFrame(rafId);

    if (reduceMotion || duration === 0) {
      shown = target;
      countEl.textContent = abbreviate(target);
      return;
    }

    const from = shown;
    const delta = target - from;
    const start = performance.now();

    // the raw value drives the animation; each frame is abbreviated on the way
    // past, so the odometer reads 0 -> 1.23K -> 12.4K -> 101K
    const step = (now) => {
      const t = Math.min((now - start) / duration, 1);
      shown = Math.round(from + delta * easeOutExpo(t));
      countEl.textContent = abbreviate(shown);
      if (t < 1) rafId = requestAnimationFrame(step);
    };

    rafId = requestAnimationFrame(step);
  }

  function bump() {
    if (reduceMotion) return;
    countEl.classList.remove("is-bump");
    void countEl.offsetWidth; // restart the animation
    countEl.classList.add("is-bump");
  }

  async function refresh(first = false) {
    const n = (await fetchCount()) ?? (first ? FALLBACK : null);
    if (n === null || n === shown) return;

    countEl.dataset.state = "live";
    animateTo(n, first ? 1800 : 900);
    if (!first) bump();
  }

  function startPolling() {
    stopPolling();
    timerId = setInterval(() => refresh(false), REFRESH_MS);
  }

  function stopPolling() {
    clearInterval(timerId);
    timerId = null;
  }

  // don't burn requests on a backgrounded tab
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      stopPolling();
    } else {
      refresh(false);
      startPolling();
    }
  });

  refresh(true).then(startPolling);
})();
