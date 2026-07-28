/* MangoPlayz — "now playing" widget.

   The audio is NOT hosted here. This drives the official YouTube IFrame player,
   parked offscreen, so the upload keeps its play count and nothing is
   re-distributed. In exchange we only get what the API exposes: play/pause,
   seek, duration and volume. There is no access to the audio stream itself, so
   there is no compressor or gain staging to be done client-side — YouTube
   already loudness-normalises its own audio, and the rest is handled by
   starting quiet (VOLUME_DEFAULT) and fading in rather than punching in. */

(() => {
  "use strict";

  const VIDEO_ID = "bzZNZO-fnU0";
  const FADE_MS = 1600;        // ramp on first play, so it never punches in
  const API_TIMEOUT_MS = 8000; // if the API never loads, hide the widget

  /* Volume needs two separate things and they are easy to conflate.

     1. YouTube's setVolume is LINEAR AMPLITUDE, not loudness. setVolume(22) is
        about -13 dB — plenty loud as a background bed. Ears are roughly
        logarithmic, so a linear slider also feels dead across its top half and
        then collapses at the very bottom, which makes it feel impossible to
        turn down. VOLUME_CURVE fixes the feel: the slider carries perceived
        loudness 0-100 and is raised to this power to get the amplitude YouTube
        wants, so the bottom half of the travel covers the quiet end properly.

     2. VOLUME_DEFAULT is a slider position, NOT an amplitude. 28 maps to
        amplitude 6, about -24 dB — roughly half the perceived loudness of the
        old default, which was still too hot at a system volume of 34.

     Turn the whole page down further by lowering VOLUME_DEFAULT alone. */
  const VOLUME_CURVE = 2.2;
  const VOLUME_DEFAULT = 28;

  const el = {
    root:  document.getElementById("player"),
    host:  document.getElementById("ytHost"),
    pp:    document.getElementById("ppBtn"),
    seek:  document.getElementById("seek"),
    fill:  document.getElementById("fill"),
    knob:  document.getElementById("knob"),
    cur:   document.getElementById("tCur"),
    dur:   document.getElementById("tDur"),
    vol:   document.getElementById("vol"),
    mute:  document.getElementById("muteBtn"),
    label: document.getElementById("npLabel"),
    gate:  document.getElementById("gate"),
  };

  if (!el.root || !el.host) return;

  /* ---------- tiny persistence (localStorage throws in some privacy modes) ---------- */

  // mp2, not mp: the old namespace stored volumes on a different scale and a
  // pause flag from before autoplay existed, so nothing is inherited
  const store = {
    get(k, fallback) {
      try {
        const v = localStorage.getItem("mp2:" + k);
        return v === null ? fallback : v;
      } catch {
        return fallback;
      }
    },
    set(k, v) {
      try {
        localStorage.setItem("mp2:" + k, String(v));
      } catch {
        /* nothing to do — the widget just won't remember */
      }
    },
  };

  /* ---------- state ---------- */

  let player = null;
  let ready = false;
  let duration = 0;
  let scrubbing = false;
  let fadeId = null;
  let tickId = null;

  // vol2, not vol: values stored under the old key were raw amplitudes and mean
  // something different on this scale, so they're deliberately not inherited
  let volume = clamp(parseInt(store.get("vol", VOLUME_DEFAULT), 10) || VOLUME_DEFAULT, 0, 100);
  let muted = store.get("muted", "false") === "true";

  function clamp(n, lo, hi) { return Math.min(hi, Math.max(lo, n)); }

  // slider position (perceived loudness) -> the amplitude YouTube expects
  function amplitude(pos) {
    return Math.round(100 * Math.pow(clamp(pos, 0, 100) / 100, VOLUME_CURVE));
  }

  function fmt(s) {
    if (!Number.isFinite(s) || s < 0) return "--:--";
    const m = Math.floor(s / 60);
    const r = Math.floor(s % 60);
    return m + ":" + String(r).padStart(2, "0");
  }

  /* ---------- paint ---------- */

  function paintVolume() {
    el.vol.value = String(volume);
    el.vol.style.setProperty("--vol", String(muted ? 0 : volume));
    el.root.dataset.muted = String(muted);
    el.mute.setAttribute("aria-label", muted ? "Unmute" : "Mute");
  }

  function paintProgress(seconds) {
    const pct = duration > 0 ? clamp((seconds / duration) * 100, 0, 100) : 0;
    el.fill.style.width = pct + "%";
    el.knob.style.left = pct + "%";
    el.cur.textContent = fmt(seconds);
    el.dur.textContent = fmt(duration);
    el.seek.setAttribute("aria-valuenow", String(Math.round(pct)));
    el.seek.setAttribute("aria-valuetext", fmt(seconds) + " of " + fmt(duration));
  }

  function setPlayingFlag(on) {
    el.root.dataset.playing = String(on);
    el.pp.setAttribute("aria-label", on ? "Pause" : "Play");
  }

  /* ---------- volume, with a fade for the first start ---------- */

  function applyVolume() {
    if (!ready) return;
    if (muted) player.mute();
    else {
      player.unMute();
      player.setVolume(amplitude(volume));
    }
  }

  function cancelFade() {
    if (fadeId) cancelAnimationFrame(fadeId);
    fadeId = null;
  }

  function fadeIn() {
    if (!ready || muted) return applyVolume();
    cancelFade();
    const target = amplitude(volume);
    const start = performance.now();
    player.unMute();
    player.setVolume(0);
    const step = (now) => {
      const t = clamp((now - start) / FADE_MS, 0, 1);
      player.setVolume(Math.round(target * t));
      if (t < 1) fadeId = requestAnimationFrame(step);
      else fadeId = null;
    };
    fadeId = requestAnimationFrame(step);
  }

  /* ---------- transport ---------- */

  function play(withFade) {
    if (!ready) return;
    if (withFade) fadeIn();
    else applyVolume();
    player.playVideo();
    store.set("auto", "on");
  }

  function pause() {
    if (!ready) return;
    cancelFade();
    player.pauseVideo();
    // a deliberate pause is remembered: the track won't ambush them next visit
    store.set("auto", "off");
  }

  function startTicking() {
    stopTicking();
    tickId = setInterval(() => {
      if (!ready || scrubbing) return;
      if (!duration) {
        const d = player.getDuration();
        if (d > 0) duration = d;
      }
      paintProgress(player.getCurrentTime() || 0);
    }, 250);
  }

  function stopTicking() {
    clearInterval(tickId);
    tickId = null;
  }

  /* ---------- seeking ---------- */

  function fractionFromEvent(e) {
    const r = el.seek.getBoundingClientRect();
    return clamp((e.clientX - r.left) / r.width, 0, 1);
  }

  function seekToFraction(f, commit) {
    if (!ready || !duration) return;
    const t = f * duration;
    paintProgress(t);
    if (commit) player.seekTo(t, true);
  }

  el.seek.addEventListener("pointerdown", (e) => {
    if (!ready || !duration) return;
    scrubbing = true;
    el.seek.setPointerCapture(e.pointerId);
    seekToFraction(fractionFromEvent(e), false);
  });

  el.seek.addEventListener("pointermove", (e) => {
    if (scrubbing) seekToFraction(fractionFromEvent(e), false);
  });

  el.seek.addEventListener("pointerup", (e) => {
    if (!scrubbing) return;
    scrubbing = false;
    el.seek.releasePointerCapture(e.pointerId);
    seekToFraction(fractionFromEvent(e), true);
  });

  el.seek.addEventListener("keydown", (e) => {
    if (!ready || !duration) return;
    const now = player.getCurrentTime() || 0;
    const jump = { ArrowLeft: -5, ArrowRight: 5, ArrowDown: -5, ArrowUp: 5 };
    if (e.key in jump) {
      player.seekTo(clamp(now + jump[e.key], 0, duration), true);
    } else if (e.key === "Home") {
      player.seekTo(0, true);
    } else if (e.key === "End") {
      player.seekTo(Math.max(0, duration - 1), true);
    } else {
      return;
    }
    e.preventDefault();
  });

  /* ---------- controls ---------- */

  el.pp.addEventListener("click", () => {
    if (!ready) return;
    const state = player.getPlayerState();
    if (state === YT.PlayerState.PLAYING || state === YT.PlayerState.BUFFERING) pause();
    else play(false);
  });

  el.vol.addEventListener("input", () => {
    cancelFade(); // a hand on the slider outranks the intro ramp
    volume = clamp(parseInt(el.vol.value, 10) || 0, 0, 100);
    muted = volume === 0;
    store.set("vol", volume);
    store.set("muted", muted);
    paintVolume();
    applyVolume();
  });

  el.mute.addEventListener("click", () => {
    muted = !muted;
    if (!muted && volume === 0) volume = VOLUME_DEFAULT; // don't unmute into silence
    store.set("muted", muted);
    store.set("vol", volume);
    paintVolume();
    applyVolume();
  });

  /* ---------- autostart ----------
     Audible autoplay is blocked by every browser until the visitor has some
     history with the site. Chrome relaxes it once its Media Engagement Index
     for the domain is high enough — so regulars (him, us) usually DO get sound
     immediately, while a first-time visitor does not. Nothing defeats this;
     anything that claims to is muting itself.

     So: try audible first, and if the browser refused, fall back to MUTED
     autoplay, which is always permitted. The track is then already running and
     in sync, and the first click/tap/key unmutes it mid-song rather than
     starting it from the top. */

  const GESTURES = ["pointerdown", "touchstart", "keydown"];

  /* Chrome 121+ will just tell you the verdict, which avoids the probe below
     and the ~1s of uncertainty that comes with it. Everywhere else, null. */
  function declaredPolicy() {
    try {
      if (typeof navigator.getAutoplayPolicy === "function") {
        return navigator.getAutoplayPolicy("mediaelement"); // allowed | allowed-muted | disallowed
      }
    } catch {
      /* fall through to probing */
    }
    return null;
  }

  function markBlocked(on) {
    el.root.dataset.blocked = String(on);
    if (el.label) el.label.textContent = on ? "Click for sound" : "Now playing";
    if (!el.gate) return;

    if (on) {
      el.gate.hidden = false;
    } else if (!el.gate.hidden) {
      el.gate.classList.add("is-leaving");
      setTimeout(() => {
        el.gate.hidden = true;
        el.gate.classList.remove("is-leaving");
      }, 500);
    }
  }

  function autostart() {
    if (!ready || store.get("auto", "on") === "off") return;

    // someone who muted it last visit gets silence, not a prompt for sound
    if (muted) {
      player.mute();
      player.playVideo();
      return;
    }

    const verdict = declaredPolicy();
    if (verdict === "allowed-muted" || verdict === "disallowed") return silentStart();

    player.unMute();
    player.setVolume(0);
    player.playVideo();

    if (verdict === "allowed") return fadeIn();

    // no verdict available: probe. If the browser refused, playVideo() simply
    // never reaches PLAYING, and there is no event to tell us so.
    setTimeout(() => {
      const s = player.getPlayerState();
      if (s === YT.PlayerState.PLAYING || s === YT.PlayerState.BUFFERING) fadeIn();
      else silentStart();
    }, 900);
  }

  /* Muted playback is permitted unconditionally, so the track starts anyway and
     runs silently behind the gate. The first click unmutes it MID-SONG rather
     than starting it over — which is the whole point of doing it this way. */
  function silentStart() {
    player.mute();
    player.playVideo();
    markBlocked(true);

    const kick = () => {
      GESTURES.forEach((t) => window.removeEventListener(t, kick, true));
      markBlocked(false);
      if (player.getPlayerState() !== YT.PlayerState.PLAYING) player.playVideo();
      fadeIn();
    };

    GESTURES.forEach((t) => window.addEventListener(t, kick, { capture: true, once: true }));
  }

  /* ---------- YouTube API ---------- */

  function hideWidget(why) {
    stopTicking();
    el.root.hidden = true;
    // never leave a full-screen gate over a page with no player behind it
    if (el.gate) el.gate.hidden = true;
    if (why) console.warn("[player] hidden:", why);
  }

  window.onYouTubeIframeAPIReady = () => {
    player = new YT.Player(el.host, {
      videoId: VIDEO_ID,
      host: "https://www.youtube-nocookie.com",
      playerVars: {
        autoplay: 0,
        controls: 0,
        disablekb: 1,
        modestbranding: 1,
        playsinline: 1,
        rel: 0,
        origin: window.location.origin,
      },
      events: {
        onReady: () => {
          ready = true;
          duration = player.getDuration() || 0;
          paintVolume();
          applyVolume();
          paintProgress(0);
          startTicking();
          autostart();
        },
        onStateChange: (e) => {
          const S = YT.PlayerState;
          if (e.data === S.PLAYING) {
            if (!duration) duration = player.getDuration() || 0;
            setPlayingFlag(true);
          } else if (e.data === S.ENDED) {
            // loop the track rather than leaving the page in silence
            player.seekTo(0, true);
            player.playVideo();
          } else {
            setPlayingFlag(false);
          }
        },
        // 101/150 = embedding disabled, 100 = video gone. Either way the widget
        // is lying about being able to play, so it removes itself.
        onError: (e) => hideWidget("player error " + e.data),
      },
    });
  };

  const tag = document.createElement("script");
  tag.src = "https://www.youtube.com/iframe_api";
  tag.async = true;
  tag.onerror = () => hideWidget("iframe_api failed to load");
  document.head.appendChild(tag);

  setTimeout(() => {
    if (!ready) hideWidget("iframe_api timed out");
  }, API_TIMEOUT_MS);

  paintVolume();
  paintProgress(0);
})();
