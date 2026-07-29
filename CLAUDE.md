# Project Context

## Overview
Static linktree-style page for **MangoPlayz**, who runs three YouTube channels. Fourth in the
family after `../Jona Website`, `../Blissolic Website` and `../Dewier Website` — same layout,
same JS, same interactions, palette re-derived from a different avatar.

- **NathanMC** `@NathanMCShorts` (`UCN-Z_OLH1XeCzrmmXH228Cw`) — **the main channel**, ~101K subs,
  bio "Subscribe to watch me suffer!". Its avatar is the page hero and the palette source; the
  sub pill counts this channel.
- **MangoPlayz** `@MangoPlayzYT` (`UCkEZ7Z3PuvLEvr8x5ibBf-w`) — ~7.43K
- **MangoMods** `@MangoModsMC` (`UCbIzhX2gzTRxuIX-qEK9r5Q`) — ~610, Minecraft mod guides

No build step, no deps, no API keys — open `index.html` or serve the folder.

## Current State
**Live and permanent** at **https://mangoplayz.xyz/** (GitHub Pages, repo `BlissolicPY/mangoplayz`,
public, `main` branch root, custom domain via the tracked `CNAME` file). The old Pages URL
`blissolicpy.github.io/mangoplayz/` still 301s to the apex, so old links keep working — but the
apex is the canonical home and is what `canonical` / `og:site_name` point at. Verified in a real
browser: 200, avatar + CSS + fonts load over HTTPS, pill reaches `data-state="live"` at 101K (real
fetch, not the fallback), 5 tiles, no horizontal overflow.

`x.com/MangoPlayzz` 200. All three channels resolved via InnerTube.

## Where We Left Off
2026-07-29 (latest) — **performance pass + the subscriber pill's dot removed** (user's request; the
count is now the leftmost thing in the pill and the pill's padding is symmetric, since the shorter
left padding only existed to balance a round dot against a text edge). See "Performance" below.
`quality.js` and `assets/bg-baked.jpg` are new.

Earlier that day — tile text legibility, ported from the Blissolic site after the same complaint
there. Handles measured **2.88:1** against the tile substrate on the live page and are now
**8.11:1**; titles, counts and arrows moved with them. `style.css?v=11`. Tile height is unchanged
at 66px, so the one-screen layout still holds (`scrollHeight == innerHeight` at 1920x889). See the
entry under Decisions. Nothing outstanding.

Earlier that day — shortened the link-preview text to `All of MangoPlayz's links in one place.` across
all three description tags (`index.html:8` SEO, `:19` og, `:23` twitter), commit `ff3424e`, pushed
to `main` and verified live at the CDN. Nothing outstanding.

## Key Files
- `quality.js` — the adaptive quality tier. Load it FIRST; everything else reads `data-q`.
  Shared, near-identical, with `../Blissolic Website/quality.js`.
- `assets/bg-baked.jpg` — the background with its filters already applied. `assets/bg.jpg` is the
  source; nothing loads it.
- `index.html` — the whole page. 5 tiles: the three channels, Discord, X. No email tile (he
  publishes none), so unlike the sibling sites there is no toast and no clipboard code.
- `main.js` — live sub-count fetch + `abbreviate()` (integer-domain floor, the fixed version).
- `player.js` — the "now playing" widget (background music).
- `style.css` — palette custom properties.
- `assets/pfp.jpg` — NathanMC's 900x900 avatar, the palette source.

## Per-tile counts, cursor trail, one-screen layout (added 2026-07-28)

- **Live counts on every tile.** NathanMC reuses the hero pill's number rather than fetching
  again, so the two can never disagree. The rest: socialcounts for the two secondary channels,
  Discord's invite API (`approximate_member_count`), and mixerno's `twitter-user-counter` for
  `@MangoPlayzz` (identity confirmed via `user.name`, not assumed from the handle).
  - **Test CORS from the page, never from a terminal.** Discord sends no
    `Access-Control-Allow-Origin` to a PowerShell probe because that request carries no `Origin` —
    it looks dead and isn't.
  - **mixerno returns counts as strings**, which the `Number.isFinite` guard silently dropped, so
    every reader now goes through `Number()` first.
  - **Under 10,000 prints in full with separators** (`7,430`, `399`); only larger counts abbreviate.
    Abbreviating small numbers gives "1.29K" for 1,291, which reads worse than the real figure.

- **The player is fixed to the top-left on screens ≥64rem**, and drops back into the flow below
  that (a fixed panel would cover the hero on a phone). **That media query must sit AFTER the base
  `.player` rule** — same specificity means source order wins, and in front of it the base
  `width: 100%` won and the panel spanned the whole viewport.

- **The page is meant to fit without scrolling**, so two height-based media queries tighten spacing
  only — nothing changes size or colour. Verified fitting at 1440x900 and 1366x700.

- **`leaves.js` — two separate effects, both hooked to `mp:enter`** (never to a click handler of
  their own; the gate must stay independent, and these are pure decoration).
  - **The gust**: 64 leaves swept across as the gate clears. Motion is split over three nested
    elements because one keyframe can't do it — the outer span crosses the viewport **linearly**
    (an eased sweep reads as a swipe; wind doesn't slow in the middle of the screen), the middle
    sways, the svg spins. All transform-only, so it stays on the compositor.
    Sizes come from three depth bands (14% foreground at 110–190px, 41% mid, the rest small) with
    duration, opacity, blur, sway and spin all derived from size: near leaves cross fast and sharp,
    distant ones lag and blur, and big ones blur again for being past the focal plane. Tints are
    the page's own `--flame` / `--gold` / `--ember` values, i.e. the maple in the background photo.
  - **The drift**: after 1.8s, a sparse ambient fall — max 9 at a time, one every 1.7s, 11–26px,
    9–17s each, opacity 0.2–0.45. The first batch uses **negative animation delays** so it starts
    mid-screen rather than leaving the page bare for ten seconds. Spawning pauses on
    `visibilitychange`.
  - **`.leaf-fall` is z-index 1 and `.card` was given `position: relative; z-index: 2`** to make
    that work. Two payoffs: nothing ever crosses the text, and since the tiles use
    `backdrop-filter`, leaves passing behind them show through the glass as soft blurred shapes.
    That only happens because they're underneath.

- **Page views** sit in `.stats` next to the subscriber pill as an eye icon + number. A static page
  can't count itself, so it uses keyless public counters — abacus first (bare `{value}` payload),
  counterapi as fallback — both verified CORS-open from the live origin. The hit fires **once per
  browser session** via `sessionStorage`, so refreshing doesn't inflate it; later loads just read.
  The counter URL is public and anyone could bump it: it's a vanity number, not analytics. If both
  services die the whole pill hides rather than leaving an eye staring at an em dash.

  Two layout traps cost time here, both worth remembering:
  - **`.stats` needs `width: 100%`.** Shrink-to-fit sized it to 242px while its contents needed
    243, so the view pill wrapped to a second line over one pixel of rounding.
  - **The short-viewport media queries were still setting `margin-top` on `.subs`.** Once the pill
    moved inside the stats row that margin shoved it 17.6px below the view count. They target
    `.stats` now. Same class of bug as the `.player` one: a rule written for the old structure,
    silently surviving the restructure.

- **`cursor.js`** is the same speed-stretched glow as the Blissolic site, re-tinted gold. Native
  cursor stays visible on purpose; see that project's CLAUDE.md for the reasoning and the caveat
  that headless Chromium throttles rAF so the motion can only be judged in a real browser.

## Background music / "now playing"

Track: **SoFaygo — 2 FAR**, video `bzZNZO-fnU0` (2:02). Starts on the visitor's first
click/tap/keypress anywhere on the page, at 22% volume with a 1.6s fade-in, and loops.

- **The audio is not hosted here and must not be.** `player.js` drives the official YouTube
  IFrame player parked offscreen in `.yt-host`; our card is just a skin over its API. Ripping the
  audio and self-hosting would be redistributing someone else's master, and a DMCA would take the
  page's music out with it. This way the upload keeps its play count and there is nothing to
  take down.
- **The upload is a re-upload channel** (`@unvaulted1`), not the artist or label — the single most
  likely way this breaks is that video going away. `onError` (100/101/150) hides the whole widget
  rather than leaving dead controls on the page, and an 8s watchdog does the same if the API is
  blocked by an extension. If it dies, swap `VIDEO_ID` for an official upload.
- **"Stabilise the volume" is done by starting quiet and ramping, not by processing.** A
  cross-origin iframe gives no access to the audio stream, so there is no Web Audio compressor or
  gain node to hang off it. YouTube already loudness-normalises server-side; the rest is the
  default level plus the fade so it never punches in.
- **The slider is perceptual; `setVolume` is not.** YouTube's `setVolume` takes linear amplitude,
  so a raw slider feels dead across its top half and then collapses at the bottom — which is
  exactly how the first version felt ("hard to drag it down a lot"). `player.js` now treats the
  slider as perceived loudness and raises it to `VOLUME_CURVE = 2.2` to get the amplitude:
  10 → 1, 28 → 6, 50 → 22, 100 → 100. **`VOLUME_DEFAULT = 28` is a slider position, not an
  amplitude** — it lands on amplitude 6, about -24 dB, after 22 (-13 dB) was still too hot at a
  system volume of 34. To make the whole site quieter, change that one constant.
- **The intro gate is the autoplay solution, and it is shown to everyone.** Audible autoplay is
  blocked everywhere until the visitor has history with the site — Chrome gates it on a per-origin
  **Media Engagement Index**, so regulars get sound and first-timers don't. That, not any trick, is
  why other sites appear to autoplay: whoever was testing had been there before. Rather than fight
  a policy that can't be beaten, `#gate` turns the required gesture into the page's entrance: one
  click anywhere, and from that point audible playback cannot be refused by any browser.

  Earlier builds probed the policy (`getAutoplayPolicy()`, then a 900ms `getPlayerState()` check)
  and only gated when refused. That's gone — with a guaranteed gesture there is nothing to detect,
  so `player.js` has no probe, no muted fallback and no `data-blocked` state.

  Things that do **not** work and shouldn't be re-attempted: silent priming clips, Web Audio (its
  context starts suspended), unmuting without a gesture (Chrome pauses the media), and
  `mousemove`/`scroll` (neither is user activation).

- **Gate dismissal is inline in `<head>`, deliberately not in `player.js`.** Two reasons: `gated`
  must be on `<html>` before first paint or the staggered reveal runs behind the overlay and the
  page is already finished when the visitor clicks through; and if `player.js` or the YouTube API
  is blocked by an extension, the intro must still clear. **A gate that can trap the page is a
  broken page.** The inline script removes `gated`, fades `#gate` out and fires `mp:enter`;
  `player.js` merely listens (and buffers `pendingEnter` if the API hasn't finished loading).

- **The track pre-buffers muted behind the gate, then seeks to 0 on entry** — so the click is
  followed by music, not by loading, and the song starts with the page rather than mid-way.
  Verified: 0:14 while buffering, 0:05 immediately after entry.

- **`html.gated [data-reveal] { animation-play-state: paused }`** holds the entrance. Pausing (not
  delaying) is what makes it work, because a paused animation also stops its `animation-delay`
  clock — so removing the class replays the whole stagger from the top.

- A deliberate pause or mute is still remembered (`mp2:auto`, `mp2:muted`): those visitors pass
  through the gate into silence rather than being re-started.
- **Storage namespace is `mp2:`.** The old `mp:` keys held amplitudes on the pre-curve scale and a
  pause flag from before autoplay existed, so they are deliberately not inherited — everyone gets
  the new quiet default once.
- **`youtube-nocookie.com` is the player host**, so no tracking cookie is set unless it actually
  plays.
- **Known limitation: iOS ignores `setVolume`.** The slider will move and persist but iOS routes
  volume to the hardware buttons only. Mute/pause still work.
- The offscreen host is a real 320x180 element pushed to `left:-10000px` rather than
  `display:none` or 0x0 — some browsers won't start playback in a collapsed frame.

## Performance (2026-07-29)

Ported from the Blissolic site, where the same effects were costing far more. The honest summary:
**at identical visuals this page was already close to its floor, and the win here comes from the
adaptive ladder** rather than from the background work.

Headed Chrome, 1920x889, 8x CPU throttle via CDP, pointer sweeping the tiles, three passes per arm,
alternating, medians. "before" is the previous commit served from a pinned copy:

| arm | fps | p50 | frames >25 ms |
|---|---|---|---|
| before | 14.3 | 72.6 ms | 100% |
| after, identical visuals (`?q=high`) | 14.6 | 66.7 ms | 100% |
| after, ladder deciding | **41.1** | **24.2 ms** | **34%** |

Unthrottled renderer CPU per wall second, 4 passes: 0.857 -> 0.828. Real but small.

- **Why so different from Blissolic's +54% at equal visuals:** that page's bats animated wing paths
  *inside* a `blur() + 2x drop-shadow()` filter, so the filters re-rasterised every frame. These
  leaves only *rotate* a filtered element, and a rotation of an already-rasterised layer is
  compositor work. Disabling the leaf filters outright measured as noise, so **they were left
  alone** — there was no sprite atlas worth building here.
- What did carry over and is worth keeping: the background filter baked into `assets/bg-baked.jpg`,
  the auroras translating instead of scaling (scaling a 90px blur recomputes it every frame), grain
  shrunk from a 4x-viewport blend to `-4%`, scanlines and vignette merged into one layer, and the
  cursor glow's `mix-blend-mode: screen` and `blur()` both removed.
- **`.photo` needs `will-change: transform`.** Baking the filter out cost it the composited layer
  the filter had been forcing for free, and a 1400x788 JPEG then got rescaled into the `.bg` stack
  on every grain shift. Pinning the layer back was the single biggest change measured here.
- **The grain is the most expensive thing left at high tier** (removing it: 0.844 -> 0.688 CPU per
  second). It survives at `high` because it is part of the look; `mid` and `low` drop it.

See `../Blissolic Website/CLAUDE.md` for the method notes — especially that fps on this machine is
too noisy to resolve effects this size, and that renderer CPU time is the instrument that works.

## Adaptive quality (`quality.js`, added 2026-07-29)

Sets `data-q` on `<html>` to `high`, `mid` or `low` and fires `mp:quality` on change. CSS reads it;
`leaves.js` reads it for how many leaves to spawn (64/38/20 in the gust, 28/12/0 drifting).

- **It measures rather than sniffs.** Static hints (`hardwareConcurrency <= 4`, `deviceMemory <= 4`,
  `pointer: coarse`) only choose a starting tier; the decision comes from the p50 of ~50 real
  frames, sampled 2.6s after entry and again at 11s.
- **It only ever goes down**, and the probe waits out the entrance gust, which is the heaviest two
  seconds the page ever has.
- `?q=high|mid|low` pins a tier for testing.

## Decisions & Rationale

- **The handle line was measurably unreadable, not merely dim (fixed 2026-07-29).** `.tile__sub`
  sat on `--text-faint` (0.34 alpha), weight 300, 12.5px. Sampled off a screenshot of the **live**
  page — glyph core against the tile substrate, mean sRGB 35.3 — that is **2.88:1**, against the
  4.5:1 WCAG AA floor for small text. Now `--text-soft` 0.72 / weight 400 / 13.3px with +0.012em
  tracking: **8.11:1** measured the same way.
  - Over this substrate 0.49 is where alpha crosses 4.5:1. The chosen 0.72 is the same value the
    Blissolic site landed on and that is worth stating rather than assuming: the backgrounds are a
    sunset and a night sky, but the tile fill is white-over-dark on both, so the substrates
    converge (35.3 here, 34.5 there). **Re-measure if the background photo changes.**
  - Hover goes to full white. It was `--text-dim` (0.58), which against the new base would be a
    step *down* — hovering would dim the line you're reading.
  - `--text-faint` is glyph-only now: the count moved to `--text-dim` at weight 600, the arrow to
    0.46 (4.3:1). The gold hover on the count is untouched.
  - **This did not cost the one-screen layout.** Tile height is set by the 38.4px icon, not the
    text block, which grew to ~38px and still fits under it — measured 66px before and after.

- **The Discord invite on the page is NOT the one that was handed over.** `discord.gg/KswrWpA4w`
  works but carries `expires_at: 2026-08-27` — a 30-day link that would dead-end on a permanent
  page. `discord.gg/GxqW9vmbAK`, from the MangoPlayz channel's own bio, points at the **same
  guild** (Mango's Fruit Bowl, `783450877439639562`, 399 members) with `expires_at: null`. Always
  check `expires_at`, not just whether the invite 200s.

- **Hero = the main channel's avatar, page name = the person's brand.** He's "MangoPlayz"
  everywhere (X, Discord) but his main channel is NathanMC, so the avatar, the bio line and the
  sub pill are all NathanMC's while the page is titled MangoPlayz. Swap `assets/pfp.jpg` and the
  og:image URL if he'd rather lead with the MangoPlayz avatar.

- **Palette is sampled, with one deliberate exception.** Bucket quantisation (4 bits/channel) over
  the inscribed circle: gold `#FDC735` is the most common bucket (3.26%), `#FEFB05` the hair
  highlight, `#A6570A` (S89 **L35**) the saturated mid-dark that carries the ambient, `#653C68` /
  `#B66693` the sunset sky, `#08D736` the palms, `#032C2B` the palm/water shadow.
  **`--void-950 #160D0C` is the exception** — this is a bright cartoon avatar with no near-black
  at all, its darkest well-represented bucket being `#2D1B19` at L14. Using that as the page floor
  measured **mean luma 51.8** against 33–40 for the siblings; the family's depth was gone. So the
  floor is that same bucket at half lightness (same hue and saturation). Final numbers after also
  easing the auroras: mean 39.5, tile delta 40.7, centre-to-corner 21.9, backdrop behind the tiles
  16.9 — against the Blissolic reference's 40.0 / 27.3 / 20.1 / 18.4.

- **The background photograph is now the ambient.** `assets/bg.jpg` — an autumn pagoda sunset,
  from the user, cropped and scaled to 1400x788 / q72 (226KB; 1920 was 391KB of upscale past the
  1672px source, so it was pointless). Sampled the same way as the avatars: 99.84% chromatic,
  dominant buckets `#FC7614` (6.17%) and `#FC6716` (5.57%) at L53, deep embers `#570704` (L18) and
  `#871703` (L27). **The two sources agree on hue** — the avatar's gold is H20–59, the photo's fire
  is H0–59 — which is why the background dropped in without repainting a single accent.

  The two surviving auroras are re-tinted from the photo and dropped to 0.16/0.30; they exist only
  to keep some drift alive behind a still image. **The sky-plum aurora is gone** — there is no
  purple anywhere in this background and it fought the fire.

- **The scrim is vertical, not centred, and sized in rem.** Two failures got it here, both worth
  not repeating. A centred ellipse sized in `%` covered the card on desktop but shrank off it on a
  phone, where the card is 440px inside a 480px window — the tiles ended up sitting on bare
  photograph. Then darkening enough to fix that made the image invisible at phone width, because
  any scrim wide enough to cover a near-full-width card covers the whole screen. The answer is to
  stop fighting it: the photo lives at the **top**, behind the hero, where the type is large and
  gold and can survive a busy backdrop, and the page darkens into the tile stack. The ellipse is
  `30rem 26rem`, so it tracks the 27.5rem card at every viewport rather than the window.

  Final measurements: mean luma 42.8, backdrop behind the tiles 17.5, centre-to-corner 18.0 —
  against the Blissolic reference's 40.0 / 18.4 / 20.1. Photo filter is
  `saturate(0.9) brightness(0.72) blur(2px)`; the blur calms the foliage texture behind the tiles
  and hides JPEG noise the darkening would otherwise exaggerate.

- **No `preload` on `bg.jpg`.** It warned that the preload went unused and risked a second fetch of
  a 226KB file. The stylesheet is render-blocking anyway, so the image starts loading the moment
  the CSS parses and the preload bought nothing.

- **Only the main channel's YouTube tile is red.** Three brand-red tiles say nothing about which
  channel is which, so MangoPlayz takes the fruit gold `#FDC735` and MangoMods the palm green
  `#08D736`; the glyph still carries the platform, and a `Main` badge marks NathanMC.

- **Tiles sit at `rgba(255,255,255,0.05)` / border `0.10`**, inherited from the Dewier build —
  warm backgrounds read closer than their luminance suggests, so tiles need the lift.

- **Sub count truncates, not rounds**; `FALLBACK = 101_000`.

- **Source order happens not to matter here, and that is a coincidence.** socialcounts
  (101635 / 101000) and mixerno (101114 / 101000) all render `101K`. That is a property of 101K,
  not of the chain — at 175K on the Dewier site the same two sources differ by a whole notch, and
  at 25.7K on the Blissolic site they differ too. Re-check per channel; never port the claim.

- **og:image is absolute (YouTube CDN) and og:url is omitted**, `canonical` points at the Pages
  URL — inherited from the siblings.

- **The description tags describe the page, not the channel.** They were
  `Subscribe to watch me suffer! All of MangoPlayz's channels and links in one place.` — the first
  half is NathanMC's channel bio, which already appears on the page under the hero, so the embed
  repeated it and buried the one thing a preview needs to say. Now just
  `All of MangoPlayz's links in one place.` **Keep `description`, `og:description` and
  `twitter:description` identical**; they are one string in three places, and letting the Google
  snippet drift from the Discord embed is how they end up contradicting each other.

## Gotchas
- **PowerShell 5.1 `Get-Content -Raw` reads UTF-8 as ANSI.** Round-tripping this file's CSS
  through `Get-Content -Raw` + `[IO.File]::WriteAllText(..., UTF8)` turned every em dash into
  `â€”`. Use `[IO.File]::ReadAllText($f, (New-Object Text.UTF8Encoding $false))` for read-modify-write.
- **youtube.com/@handle serves a consent wall to this machine** — use InnerTube `resolve_url` then
  `browse`, as in the sibling projects.
- **`gh api -X POST ... --input -` fails from PowerShell 5.1** ("Problems parsing JSON"); write the
  body to a file and pass `--input <file>`.
- **Editing a meta tag is not the same as the preview changing, and there are two caches.**
  GitHub Pages' CDN took ~45s to serve the new tag after the push — poll it as the crawler,
  `curl -A "Discordbot/2.0" "https://mangoplayz.xyz/?cb=$RANDOM"`, because a plain browser fetch
  can be served from a different edge. Then **Discord's own OG cache still holds the old embed for
  about a day**, keyed by exact URL — posting `https://mangoplayz.xyz/?1` is a different key, so it
  scrapes fresh and shows the new preview immediately. Neither cache is a bug in the page; do not
  go looking for one in `index.html`.
