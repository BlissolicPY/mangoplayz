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
**Live and permanent** at **https://blissolicpy.github.io/mangoplayz/** (GitHub Pages, repo
`BlissolicPY/mangoplayz`, public, `main` branch root). Verified in a real browser: 200, avatar +
CSS + fonts load over HTTPS, pill reaches `data-state="live"` at 101K (real fetch, not the
fallback), 5 tiles, no horizontal overflow.

`x.com/MangoPlayzz` 200. All three channels resolved via InnerTube.

## Where We Left Off
2026-07-28 — built and deployed this session. Nothing outstanding.

## Key Files
- `index.html` — the whole page. 5 tiles: the three channels, Discord, X. No email tile (he
  publishes none), so unlike the sibling sites there is no toast and no clipboard code.
- `main.js` — live sub-count fetch + `abbreviate()` (integer-domain floor, the fixed version).
- `player.js` — the "now playing" widget (background music).
- `style.css` — palette custom properties.
- `assets/pfp.jpg` — NathanMC's 900x900 avatar, the palette source.

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

## Decisions & Rationale

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

## Gotchas
- **PowerShell 5.1 `Get-Content -Raw` reads UTF-8 as ANSI.** Round-tripping this file's CSS
  through `Get-Content -Raw` + `[IO.File]::WriteAllText(..., UTF8)` turned every em dash into
  `â€”`. Use `[IO.File]::ReadAllText($f, (New-Object Text.UTF8Encoding $false))` for read-modify-write.
- **youtube.com/@handle serves a consent wall to this machine** — use InnerTube `resolve_url` then
  `browse`, as in the sibling projects.
- **`gh api -X POST ... --input -` fails from PowerShell 5.1** ("Problems parsing JSON"); write the
  body to a file and pass `--input <file>`.
