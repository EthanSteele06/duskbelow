import { createFileRoute } from "@tanstack/react-router";
import { useGame } from "@/game/store";
import { TitleScreen } from "@/game/TitleScreen";
import { IntroScreen } from "@/game/IntroScreen";
import { CityScreen } from "@/game/CityScreen";
import { VendorScreen, AuctionScreen } from "@/game/MarketScreens";
import { QuestsScreen } from "@/game/QuestsScreen";
import { TrainerScreen } from "@/game/TrainerScreen";
import { ProfessionScreen } from "@/game/ProfessionScreen";
import { DungeonScreen, VictoryScreen, DefeatScreen } from "@/game/DungeonScreen";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dusk Below — Mobile Dungeon Crawler" },
      { name: "description", content: "A dark gothic pixel dungeon crawler. Choose a faction, pick a class, descend." },
      { property: "og:title", content: "Dusk Below" },
      { property: "og:description", content: "Dark gothic pixel dungeon crawler for mobile." },
    ],
  }),
  component: Game,
});

function Game() {
  const screen = useGame((s) => s.screen);
  return (
    <main className="mx-auto h-dvh max-w-md overflow-y-auto bg-background text-foreground">
      {screen === "title" && <TitleScreen />}
      {screen === "intro" && <IntroScreen />}
      {screen === "city" && <CityScreen />}
      {screen === "vendor" && <VendorScreen />}
      {screen === "auction" && <AuctionScreen />}
      {screen === "quests" && <QuestsScreen />}
      {screen === "trainer" && <TrainerScreen />}
      {screen === "profession" && <ProfessionScreen />}
      {screen === "dungeon" && <DungeonScreen />}
      {screen === "victory" && <VictoryScreen />}
      {screen === "defeat" && <DefeatScreen />}
    </main>
  );
}
