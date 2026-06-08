import { useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useGame } from "@/game/store";
import { TitleScreen } from "@/game/TitleScreen";
import { IntroScreen } from "@/game/IntroScreen";
import { CityScreen } from "@/game/CityScreen";
import { VendorScreen, AuctionScreen } from "@/game/MarketScreens";
import { QuestsScreen } from "@/game/QuestsScreen";
import { TalentTreeScreen } from "@/game/TalentTreeScreen";
import { ProfessionScreen } from "@/game/ProfessionScreen";
import { EquipmentScreen } from "@/game/EquipmentScreen";
import { ShopScreen } from "@/game/ShopScreen";
import { ChampionPassScreen } from "@/game/ChampionPassScreen";
import { DungeonScreen } from "@/game/DungeonScreen";
import { CharacterHeader } from "@/game/CharacterHeader";
import { RunSummaryScreen } from "@/game/RunSummaryScreen";
import { EchoTreeScreen } from "@/game/EchoTreeScreen";
import { JournalScreen } from "@/game/JournalScreen";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dusk Below — Mobile Dungeon Crawler" },
      { name: "description", content: "A dark gothic pixel dungeon crawler. Choose a faction, pick a class, descend." },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover, maximum-scale=1" },
      { property: "og:title", content: "Dusk Below" },
      { property: "og:description", content: "Dark gothic pixel dungeon crawler for mobile." },
    ],
  }),
  component: Game,
});

const HEADERLESS = new Set(["title", "intro"]);

function Game() {
  const screen = useGame((s) => s.screen);
  const hydrateMeta = useGame((s) => s.hydrateMeta);
  // Load persisted meta after mount to avoid SSR/client hydration mismatch.
  if (typeof window !== "undefined") {
    // useEffect via lazy import to keep this file lean
  }
  // eslint-disable-next-line react-hooks/rules-of-hooks
  useEffectOnce(() => { hydrateMeta(); });
  return (
    <main className="mx-auto h-dvh max-w-md overflow-y-auto bg-background text-foreground">
      {!HEADERLESS.has(screen) && <CharacterHeader />}
      {screen === "title" && <TitleScreen />}
      {screen === "intro" && <IntroScreen />}
      {screen === "city" && <CityScreen />}
      {screen === "vendor" && <VendorScreen />}
      {screen === "auction" && <AuctionScreen />}
      {screen === "quests" && <QuestsScreen />}
      {(screen === "trainer" || screen === "talents") && <TalentTreeScreen />}
      {screen === "profession" && <ProfessionScreen />}
      {screen === "equipment" && <EquipmentScreen />}
      {screen === "shop" && <ShopScreen />}
      {screen === "champion" && <ChampionPassScreen />}
      {screen === "dungeon" && <DungeonScreen />}
      {screen === "run_summary" && <RunSummaryScreen />}
      {screen === "echo" && <EchoTreeScreen />}
      {screen === "journal" && <JournalScreen />}
    </main>
  );
}

function useEffectOnce(fn: () => void) {
  // Local helper to dodge an extra import line; runs once on mount.
  const ran = (useEffectOnce as unknown as { _ran?: boolean });
  // Real effect:
  // eslint-disable-next-line @typescript-eslint/no-use-before-define
  React.useEffect(() => { if (!ran._ran) { ran._ran = true; fn(); } }, []);
}
