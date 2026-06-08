import { useEffect, useState } from "react";
import { useGame } from "@/game/store";
import { getAudioSettings, setAudioSettings, subscribeAudioSettings, playSfx } from "@/game/audio";

export function SettingsButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        aria-label="Settings"
        onClick={() => { playSfx("ui-tap"); setOpen(true); }}
        className="pixel-btn !p-1.5 !text-[10px]"
      >
        ⚙
      </button>
      {open && <SettingsModal onClose={() => setOpen(false)} />}
    </>
  );
}

function SettingsModal({ onClose }: { onClose: () => void }) {
  const [audio, setAudio] = useState(getAudioSettings());
  const reset = useGame((s) => s.reset);
  const isChampion = useGame((s) => s.player?.isChampion ?? false);
  const [confirmWipe, setConfirmWipe] = useState(0);

  useEffect(() => subscribeAudioSettings(setAudio), []);

  const onWipe = () => {
    if (isChampion) return;
    if (confirmWipe < 2) { setConfirmWipe(confirmWipe + 1); return; }
    try {
      localStorage.removeItem("duskbelow.meta.v1");
      localStorage.removeItem("dusk.audio");
    } catch { /* ignore */ }
    window.location.reload();
  };


  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-sm border-2 border-black bg-card p-4 space-y-4 max-h-[90vh] overflow-y-auto"
      >
        <header className="flex items-center justify-between border-b border-black pb-2">
          <h2 className="pixel text-[12px] text-gold">⚙ Settings</h2>
          <button onClick={onClose} className="pixel-btn !p-1 !text-[10px]">✕</button>
        </header>

        <section>
          <h3 className="pixel text-[10px] text-gold mb-2">▣ Audio</h3>
          <Slider
            label="Master"
            value={audio.master}
            disabled={audio.muted}
            onChange={(v) => setAudioSettings({ master: v })}
          />
          <Slider
            label="Music"
            value={audio.music}
            disabled={audio.muted}
            onChange={(v) => setAudioSettings({ music: v })}
          />
          <Slider
            label="SFX"
            value={audio.sfx}
            disabled={audio.muted}
            onChange={(v) => { setAudioSettings({ sfx: v }); }}
            onRelease={() => playSfx("ui-confirm")}
          />
          <label className="flex items-center gap-2 mt-2">
            <input
              type="checkbox"
              checked={audio.muted}
              onChange={(e) => setAudioSettings({ muted: e.target.checked })}
            />
            <span className="font-body text-sm">Mute all</span>
          </label>
        </section>

        <section>
          <h3 className="pixel text-[10px] text-gold mb-2">▣ Account</h3>
          <div className="space-y-2">
            <button onClick={() => { reset(); onClose(); }} className="pixel-btn w-full !text-[9px]">
              ↻ Abandon Current Run
            </button>
            <button
              onClick={onWipe}
              className={`pixel-btn w-full !text-[9px] ${confirmWipe > 0 ? "pixel-btn-danger" : ""}`}
            >
              {confirmWipe === 0 && "✗ Hard Reset (Wipe All)"}
              {confirmWipe === 1 && "⚠ Are you sure? Tap again to confirm."}
              {confirmWipe >= 2 && "‼ FINAL WARNING — Tap to wipe everything"}
            </button>
            <p className="font-body text-xs text-muted-foreground">
              Hard reset deletes all progress: classes, shards, gear, professions. Cannot be undone.
            </p>
          </div>
        </section>

        <section>
          <h3 className="pixel text-[10px] text-gold mb-2">▣ About</h3>
          <p className="font-body text-xs text-muted-foreground">
            Dusk Below — a dark fantasy idle dungeon crawler. Music: Kevin MacLeod (incompetech.com, CC-BY 4.0).
          </p>
        </section>
      </div>
    </div>
  );
}

function Slider({
  label, value, disabled, onChange, onRelease,
}: { label: string; value: number; disabled?: boolean; onChange: (v: number) => void; onRelease?: () => void }) {
  return (
    <div className={`mb-2 ${disabled ? "opacity-50" : ""}`}>
      <div className="flex justify-between pixel text-[8px]">
        <span>{label}</span>
        <span>{Math.round(value * 100)}%</span>
      </div>
      <input
        type="range"
        min={0} max={100} step={1}
        value={Math.round(value * 100)}
        disabled={disabled}
        onChange={(e) => onChange(Number(e.target.value) / 100)}
        onPointerUp={onRelease}
        className="w-full"
      />
    </div>
  );
}
