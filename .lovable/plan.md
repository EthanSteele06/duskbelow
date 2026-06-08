# Pre-Launch Polish Pass

Five workstreams, ordered roughly by user-visible impact. Each is self-contained so we can ship/test incrementally.

---

## 1. Audio: Music + SFX (ElevenLabs)

**Generation (server-side, one-time):** A `/api/public/audio/generate` script-style server route calls ElevenLabs once per asset, we save the MP3 output to `src/assets/audio/*.mp3`, then commit. Audio is bundled, not generated at runtime — keeps cost at zero per play and works offline.

Tracks to generate (looping, ~60s each):
- `title.mp3` — somber dark-fantasy theme, harp + low strings
- `city-kingdom.mp3` — hopeful medieval, lute + soft choir
- `city-brigade.mp3` — grim war-camp, low drums + bone flute
- `dungeon.mp3` — tense ambient drone with sparse percussion
- `boss.mp3` — driving, percussive, brass stabs

SFX (~1–2s each):
- `hit.mp3`, `crit.mp3`, `enemy-hit.mp3`, `death.mp3`
- `loot.mp3`, `shard.mp3`, `levelup.mp3`, `purchase.mp3`
- `ui-tap.mp3`, `ui-confirm.mp3`

**Playback:** New `src/game/audio.ts` exposes `playSfx(name)` and `playMusic(track)` using a small Howler-free implementation (Web Audio + HTMLAudio). Music crossfades on route change. Wired into:
- `TitleScreen` → title track
- `CityScreen` → faction-based city track
- `DungeonScreen` → dungeon track, swaps to boss track on boss encounter
- Combat actions, loot pickup, shard gain, vendor purchase, tap-to-confirm

**Settings:** Master / music / SFX volume sliders + mute toggle, persisted to `localStorage` under `dusk.audio`. Default music 50%, SFX 70%. Auto-mute if user hasn't interacted yet (browser autoplay policy) — first tap unlocks.

---

## 2. First-Run Tutorial

Lightweight popover system, not a forced linear tour. Triggers only on `meta.tutorialSeen[stepId] !== true`, dismissible with "Got it" (marks seen) or "Skip all" (marks all seen).

Steps:
1. **Title screen** — "Pick a class. Locked classes unlock via the Echo Tree."
2. **First city visit** — "Spend gold at the Vendor for run-only blessings. Visit the Trainer to spec, Professions to craft."
3. **First dungeon entry** — "Tap an ability to see what it does. Tap again to confirm. You can't retreat mid-fight without a Hearthstone."
4. **First shard earned** — "Echo Shards persist between runs. Spend them in the Echo Tree."
5. **First defeat** — "On defeat you lose loot and gold. Use Hearthstone to escape safely."

Implementation: `src/game/Tutorial.tsx` renders a fixed overlay with arrow + text. `meta.tutorialSeen: Record<string, boolean>` added to store.

---

## 3. Settings Menu + Run Summary

**Settings modal** (gear icon top-right of CityScreen + TitleScreen):
- Audio: master / music / SFX sliders, mute
- Gameplay: tap-to-confirm toggle (currently auto-detected), show damage numbers toggle
- Account: reset current run, hard reset account (with double-confirm), sign in/out (see §5)
- Info: version, link to patch notes modal

**Run summary screen** — new `RunSummaryScreen.tsx` shown between dungeon exit and city:
- Outcome banner (Victory / Defeat / Escaped)
- Stats: deepest floor, kills, XP gained, gold earned/lost, shards earned, items found, items kept (0 on defeat)
- Highlight: best loot equipped this run
- "Continue" button → city

Hooks into existing `finishRun()` — we already compute most of this, just need to surface it.

---

## 4. SEO + Favicon + OG Image

- **Title/meta** per route in `__root.tsx` + `src/routes/index.tsx`: "Dusk Below — A Dark Fantasy Idle RPG"
- **OG image**: generate a 1200×630 hero shot (pixel art castle silhouette + game logo) → `src/assets/og-image.jpg`, wire into og:image + twitter:image
- **Favicon**: generate 512×512 icon (stylized rune/sword), convert to favicon set, replace default in `public/`
- **PWA manifest**: `public/manifest.webmanifest` with name, short_name, icons, theme_color (#0f0a14), display:standalone — makes it installable on mobile home screen
- **robots.txt + sitemap.xml**: allow all, list `/` and `/auth` if we add it
- Run `seo--trigger_scan` at the end to verify

---

## 5. Cloud Save (Account-Based)

**Requires enabling Lovable Cloud** (will prompt for this first).

Schema:
- `profiles` table (id → auth.users, display_name, created_at)
- `save_states` table (user_id, slot int default 1, meta jsonb, player jsonb, updated_at) with RLS: user can only read/write own rows

Flow:
- Settings → "Sign in to sync" → email/password + Google sign-in
- On sign-in: if cloud save exists and is newer → prompt "Use cloud save / Keep local / Merge"; if no cloud save → upload local
- Auto-save to cloud after each run completion + each city visit (debounced)
- Signed-out users keep using `localStorage` (unchanged)
- New `src/game/sync.ts` handles serialize/deserialize + conflict resolution

**Out of scope:** Cross-device live sync, multiple save slots, social/leaderboard features.

---

## Technical notes

- Audio: bundled MP3s ~3-5MB total. Acceptable for a game; lazy-load music tracks per screen if size becomes an issue.
- Tutorial state lives in `meta` (persists with account if signed in).
- Settings state lives in a new `settings` slice of the store, persisted separately from `player`/`meta` so it survives `finishRun`.
- Cloud save serializes `{meta, player, settings}` as JSON; schema-version stamped so we can migrate later.

## Order of operations

1. Audio system + generation (biggest impact, no deps)
2. Settings menu (needed for audio controls anyway)
3. Run summary screen
4. First-run tutorial
5. SEO/favicon/OG/PWA
6. Enable Lovable Cloud → cloud save (last, since it's the highest-risk change)

After all five, run security scan + SEO scan, then we're ready to publish.
