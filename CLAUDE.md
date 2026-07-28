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
- `style.css` — palette custom properties.
- `assets/pfp.jpg` — NathanMC's 900x900 avatar, the palette source.

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

- **This palette is multi-hue, so the ambient carries two hues.** 61.5% of chromatic pixels are
  amber/gold (H20–59), 9.3% palm green (H130–179), 7.4% sunset mauve (H290–339). Aurora 1 is
  amber, aurora 2 is sky-plum in the opposite corner, aurora 3 is the brighter magenta as a spice,
  and the bottom of the page floor is the teal palm shadow so it isn't warm top to bottom. The
  Dewier site had to fake this with value contrast because its avatar was 98.84% one hue.

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
