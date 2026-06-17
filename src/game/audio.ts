// Lightweight audio system: bundled SFX + CDN-hosted music with crossfade.
// Browser autoplay policy is respected — first user gesture unlocks playback.

import hitSfx from "@/assets/audio/hit.mp3";
import critSfx from "@/assets/audio/crit.mp3";
import enemyHitSfx from "@/assets/audio/enemy-hit.mp3";
import deathSfx from "@/assets/audio/death.mp3";
import lootSfx from "@/assets/audio/loot.mp3";
import shardSfx from "@/assets/audio/shard.mp3";
import levelupSfx from "@/assets/audio/levelup.mp3";
import purchaseSfx from "@/assets/audio/purchase.mp3";
import uiTapSfx from "@/assets/audio/ui-tap.mp3";
import uiConfirmSfx from "@/assets/audio/ui-confirm.mp3";

import musicTitle from "@/assets/audio/music-title.mp3";
import musicCityKingdom from "@/assets/audio/music-city-kingdom.mp3";
import musicCityBrigade from "@/assets/audio/music-city-brigade.mp3";
import musicDungeon from "@/assets/audio/music-dungeon.mp3";
import musicBoss from "@/assets/audio/music-boss.mp3";

export type SfxName =
  | "hit" | "crit" | "enemy-hit" | "death"
  | "loot" | "shard" | "levelup" | "purchase"
  | "ui-tap" | "ui-confirm";

export type MusicTrack = "title" | "city-kingdom" | "city-brigade" | "dungeon" | "boss" | null;

const SFX_URLS: Record<SfxName, string> = {
  "hit": hitSfx, "crit": critSfx, "enemy-hit": enemyHitSfx, "death": deathSfx,
  "loot": lootSfx, "shard": shardSfx, "levelup": levelupSfx, "purchase": purchaseSfx,
  "ui-tap": uiTapSfx, "ui-confirm": uiConfirmSfx,
};

const MUSIC_URLS: Record<Exclude<MusicTrack, null>, string> = {
  "title": musicTitle,
  "city-kingdom": musicCityKingdom,
  "city-brigade": musicCityBrigade,
  "dungeon": musicDungeon,
  "boss": musicBoss,
};

// --- Settings (persisted) ---
type AudioSettings = { master: number; music: number; sfx: number; muted: boolean };
const SETTINGS_KEY = "dusk.audio";
const DEFAULTS: AudioSettings = { master: 0.8, music: 0.5, sfx: 0.7, muted: false };

function loadSettings(): AudioSettings {
  if (typeof window === "undefined") return DEFAULTS;
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return DEFAULTS;
    return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch { return DEFAULTS; }
}

let settings: AudioSettings = loadSettings();
const listeners = new Set<(s: AudioSettings) => void>();

export function getAudioSettings(): AudioSettings { return settings; }
export function setAudioSettings(patch: Partial<AudioSettings>) {
  settings = { ...settings, ...patch };
  try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)); } catch {}
  applyMusicVolume();
  listeners.forEach((fn) => fn(settings));
}
export function subscribeAudioSettings(fn: (s: AudioSettings) => void): () => void {
  listeners.add(fn); return () => listeners.delete(fn);
}

// --- Playback ---
const sfxCache = new Map<SfxName, HTMLAudioElement>();
let musicEl: HTMLAudioElement | null = null;
let currentTrack: MusicTrack = null;
let unlocked = false;

function ensureUnlock() {
  if (unlocked) return;
  unlocked = true;
  // Replay queued music after first gesture
  if (currentTrack) playMusic(currentTrack, { force: true });
}
export { ensureUnlock };

if (typeof window !== "undefined") {
  const unlock = () => {
    ensureUnlock();
    window.removeEventListener("pointerdown", unlock);
    window.removeEventListener("touchstart", unlock);
    window.removeEventListener("keydown", unlock);
  };
  window.addEventListener("pointerdown", unlock, { passive: true });
  window.addEventListener("touchstart", unlock, { passive: true });
  window.addEventListener("keydown", unlock);
}

export function playSfx(name: SfxName) {
  if (typeof window === "undefined") return;
  if (settings.muted) return;
  const vol = settings.master * settings.sfx;
  if (vol <= 0) return;
  try {
    // Use a per-play clone so rapid fire SFX don't cut each other off
    let base = sfxCache.get(name);
    if (!base) { base = new Audio(SFX_URLS[name]); sfxCache.set(name, base); }
    const a = base.cloneNode(true) as HTMLAudioElement;
    a.volume = Math.min(1, Math.max(0, vol));
    void a.play().catch(() => { /* autoplay blocked, will retry on next gesture */ });
  } catch { /* ignore */ }
}

function applyMusicVolume() {
  if (!musicEl) return;
  musicEl.volume = settings.muted ? 0 : Math.min(1, Math.max(0, settings.master * settings.music));
}

export function playMusic(track: MusicTrack, opts: { force?: boolean } = {}) {
  if (typeof window === "undefined") return;
  if (track === currentTrack && !opts.force) return;
  currentTrack = track;
  // Stop any prior
  if (musicEl) { try { musicEl.pause(); } catch {} musicEl = null; }
  if (!track) return;
  if (!unlocked) return; // queue — will play after first gesture
  const url = MUSIC_URLS[track];
  const el = new Audio(url);
  el.loop = true;
  el.preload = "auto";
  musicEl = el;
  applyMusicVolume();
  void el.play().catch((err) => {
    if (import.meta.env.DEV) console.warn("[audio] music play failed:", track, err);
  });
}

export function stopMusic() { playMusic(null); }
