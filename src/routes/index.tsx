import { useEffect, useRef } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useGame, type Screen } from "@/game/store";
import { TitleScreen } from "@/game/TitleScreen";
import { IntroScreen } from "@/game/IntroScreen";
import { CityScreen } from "@/game/CityScreen";
import { VendorScreen, AuctionScreen, AuctionHouseScreen } from "@/game/MarketScreens";
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
import { ChronicleScreen } from "@/game/ChronicleScreen";
import { WandererScreen } from "@/game/WandererScreen";
import { DailyScreen } from "@/game/DailyScreen";
import { ScreenLoadOverlay } from "@/game/ScreenLoadOverlay";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dusk Below — Mobile Dungeon Crawler" },
      {
        name: "description",
        content: "A dark gothic pixel dungeon crawler. Choose a faction, pick a class, descend.",
      },
      {
        name: "viewport",
        content: "width=device-width, initial-scale=1, viewport-fit=cover, maximum-scale=1",
      },
      { property: "og:title", content: "Dusk Below" },
      { property: "og:description", content: "Dark gothic pixel dungeon crawler for mobile." },
    ],
  }),
  component: Game,
});

const HEADERLESS = new Set(["title", "intro"]);

function Game() {
  const screen = useGame((s) => s.screen);
  const screenLoad = useGame((s) => s.screenLoad);
  const completeScreenLoad = useGame((s) => s.completeScreenLoad);
  const hydrateMeta = useGame((s) => s.hydrateMeta);
  const mainRef = useRef<HTMLElement>(null);
  // Load persisted meta after mount to avoid SSR/client hydration mismatch.
  useEffect(() => {
    hydrateMeta();
  }, [hydrateMeta]);
  useEffect(() => {
    mainRef.current?.scrollTo({ top: 0 });
  }, [screen]);

  return (
    <main
      ref={mainRef}
      className="relative mx-auto h-dvh max-w-md overflow-y-auto bg-background text-foreground"
    >
      {!HEADERLESS.has(screen) && <CharacterHeader />}
      <div key={screen} className="screen-page screen-transition-in">
        {renderScreen(screen)}
      </div>
      {screenLoad && <ScreenLoadOverlay load={screenLoad} onComplete={completeScreenLoad} />}
    </main>
  );
}

function renderScreen(screen: Screen) {
  if (screen === "title") return <TitleScreen />;
  if (screen === "intro") return <IntroScreen />;
  if (screen === "city") return <CityScreen />;
  if (screen === "vendor") return <VendorScreen />;
  if (screen === "auction") return <AuctionScreen />;
  if (screen === "auction_house") return <AuctionHouseScreen />;
  if (screen === "quests") return <QuestsScreen />;
  if (screen === "trainer" || screen === "talents") return <TalentTreeScreen />;
  if (screen === "profession") return <ProfessionScreen />;
  if (screen === "equipment") return <EquipmentScreen />;
  if (screen === "shop") return <ShopScreen />;
  if (screen === "champion") return <ChampionPassScreen />;
  if (screen === "dungeon") return <DungeonScreen />;
  if (screen === "run_summary") return <RunSummaryScreen />;
  if (screen === "echo") return <EchoTreeScreen />;
  if (screen === "journal") return <JournalScreen />;
  if (screen === "chronicle") return <ChronicleScreen />;
  if (screen === "wanderer") return <WandererScreen />;
  if (screen === "daily") return <DailyScreen />;
  return null;
}
