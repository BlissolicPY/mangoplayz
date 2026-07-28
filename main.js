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

  /* Per-tile counts. All were verified CORS-open FROM THE PAGE ITSELF, not from
     a terminal — Discord returns no Access-Control-Allow-Origin header unless
     the request carries an Origin, so a curl/PowerShell probe reports a false
     negative on it. Re-test in a browser before ever concluding one died.

     mixerno returns some counts as STRINGS ("1291"), so every reader goes
     through Number() before the isFinite guard, which would otherwise silently
     drop them. */
  const TILE_COUNTS = [
    {
      el: "cMangoYT",
      label: "subscribers",
      fallback: 7_430,
      url: "https://api.socialcounts.org/youtube-live-subscriber-count/UCkEZ7Z3PuvLEvr8x5ibBf-w",
      read: (d) => [d?.counters?.estimation?.subscriberCount, d?.counters?.api?.subscriberCount],
    },
    {
      el: "cMangoMods",
      label: "subscribers",
      fallback: 610,
      url: "https://api.socialcounts.org/youtube-live-subscriber-count/UCbIzhX2gzTRxuIX-qEK9r5Q",
      read: (d) => [d?.counters?.estimation?.subscriberCount, d?.counters?.api?.subscriberCount],
    },
    {
      el: "cDiscord",
      label: "members",
      fallback: 399,
      url: "https://discord.com/api/v10/invites/GxqW9vmbAK?with_counts=true",
      read: (d) => [d?.approximate_member_count],
    },
    {
      el: "cX",
      label: "followers",
      fallback: 1_291,
      url: "https://mixerno.space/api/twitter-user-counter/user/MangoPlayzz",
      read: (d) => [d?.counts?.find((c) => c.value === "followers")?.count],
    },
  ];

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

  /* The tiles want a different format from the hero pill. Abbreviating below
     10K produces things like "1.29K" for 1,291, which reads worse than the real
     number — so anything under 10,000 is printed in full with thousands
     separators and only larger counts get the K/M treatment. */
  function formatCount(n) {
    return n < 10_000 ? n.toLocaleString("en-GB") : abbreviate(n);
  }

  /* ---------- page views ----------
     A static page can't count anything itself, so this leans on a keyless
     public counter. Both services below were verified CORS-open FROM THE PAGE,
     and abacus goes first only because its payload is a bare {value}.

     The hit is fired once per browser SESSION, not per load, so hammering F5
     doesn't inflate it — every later load just reads. The counter is public and
     could be incremented by anyone who finds the URL; that's the price of
     having no backend, and it's a vanity number, not analytics. */
  const VIEW_NS = "mangoplayz-xyz";
  const VIEW_KEY = "views";

  const VIEW_SOURCES = [
    {
      hit: `https://abacus.jasoncameron.dev/hit/${VIEW_NS}/${VIEW_KEY}`,
      get: `https://abacus.jasoncameron.dev/get/${VIEW_NS}/${VIEW_KEY}`,
      read: (d) => d?.value,
    },
    {
      hit: `https://api.counterapi.dev/v1/${VIEW_NS}/${VIEW_KEY}/up`,
      get: `https://api.counterapi.dev/v1/${VIEW_NS}/${VIEW_KEY}/`,
      read: (d) => d?.count,
    },
  ];

  async function showViews() {
    const el = document.getElementById("viewCount");
    const numEl = document.getElementById("viewNum");
    if (!el || !numEl) return;

    let counted = false;
    try {
      counted = sessionStorage.getItem("mp2:counted") === "1";
    } catch {
      /* private mode — it just counts again, which is harmless */
    }

    for (const src of VIEW_SOURCES) {
      try {
        const res = await fetch(counted ? src.get : src.hit, { cache: "no-store" });
        if (!res.ok) continue;
        const n = Number(src.read(await res.json()));
        if (!Number.isFinite(n) || n <= 0) continue;

        numEl.textContent = formatCount(n);
        el.dataset.state = "live";
        el.setAttribute("aria-label", `${formatCount(n)} page ${n === 1 ? "view" : "views"}`);
        try {
          sessionStorage.setItem("mp2:counted", "1");
        } catch {
          /* nothing to remember it with */
        }
        return;
      } catch {
        /* try the next service */
      }
    }
    el.dataset.state = "dead";
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
        for (const raw of src.read(await res.json())) {
          const n = Number(raw);
          if (Number.isFinite(n) && n > 0) return n;
        }
      } catch {
        /* try the next source */
      }
    }
    return null;
  }

  /* ---------- per-tile counts ---------- */

  const tileShown = new Map();

  async function readOne(src) {
    try {
      const res = await fetch(src.url, { cache: "no-store" });
      if (!res.ok) return null;
      for (const raw of src.read(await res.json())) {
        const n = Number(raw);
        if (Number.isFinite(n) && n > 0) return n;
      }
    } catch {
      /* dead source — handled by the caller */
    }
    return null;
  }

  function paintTile(el, src, n, first) {
    el.textContent = formatCount(n);
    el.dataset.state = "live";
    el.setAttribute("aria-label", `${formatCount(n)} ${src.label}`);

    if (!first && !reduceMotion && tileShown.get(src.el) !== n) {
      el.classList.remove("is-bump");
      void el.offsetWidth; // restart the animation
      el.classList.add("is-bump");
    }
    tileShown.set(src.el, n);
  }

  async function refreshTiles(first = false) {
    await Promise.all(
      TILE_COUNTS.map(async (src) => {
        const el = document.getElementById(src.el);
        if (!el) return;

        const n = (await readOne(src)) ?? (first ? src.fallback : null);
        // a source that rots mid-session leaves the last good number alone; one
        // that is already dead on arrival hides its slot entirely rather than
        // sitting on an em dash forever
        if (n === null) {
          if (first) el.dataset.state = "dead";
          return;
        }
        paintTile(el, src, n, first);
      })
    );
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
    // the tiles ride the same timer rather than running their own
    refreshTiles(first);

    const n = (await fetchCount()) ?? (first ? FALLBACK : null);
    if (n === null || n === shown) return;

    countEl.dataset.state = "live";
    animateTo(n, first ? 1800 : 900);
    if (!first) bump();

    // the NathanMC tile reuses the pill's number instead of fetching again
    const mainTile = document.getElementById("cNathan");
    if (mainTile) {
      paintTile(mainTile, { el: "cNathan", label: "subscribers" }, n, first);
    }
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
  showViews();
})();
