import React, { useEffect } from "react";
import { GameProvider, useGame } from "./context/GameContext";
import { ToastProvider } from "./context/ToastContext";
import { ScreenName, GameMode } from "./types";
import { AnimatePresence, motion } from "framer-motion";

// Screens
import { HomeScreen } from "./screens/HomeScreen";
import { ModeSelectScreen } from "./screens/ModeSelectScreen";
import { TeamSelectScreen } from "./screens/TeamSelectScreen";
import { SquadSelectScreen } from "./screens/SquadSelectScreen";
import { MatchScreen } from "./screens/MatchScreen";
import { MatchResultScreen } from "./screens/MatchResultScreen";
import { WalletScreen } from "./screens/WalletScreen";
import { RewardsScreen } from "./screens/RewardsScreen";
import { MultiplayerLobbyScreen } from "./screens/MultiplayerLobbyScreen";

const ScreenRouter = () => {
  const { currentScreen, setScreen, setGameMode, setLobby } = useGame();

  // Check for join link on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const joinId = params.get("join");
    if (joinId) {
      // Store join ID and redirect to team select first
      setLobby({ 
        lobbyId: joinId, 
        hostId: "", 
        hostName: "", 
        hostTeam: "", 
        wagerAmount: 0, 
        status: "waiting" 
      });
      setGameMode(GameMode.MULTIPLAYER);
      setScreen(ScreenName.TEAM_SELECT);
      // Clean URL
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, [setScreen, setGameMode, setLobby]);

  const renderScreen = () => {
    switch (currentScreen) {
      case ScreenName.HOME:
        return <HomeScreen />;
      case ScreenName.MODE_SELECT:
        return <ModeSelectScreen />;
      case ScreenName.TEAM_SELECT:
        return <TeamSelectScreen />;
      case ScreenName.SQUAD_SELECT:
        return <SquadSelectScreen />;
      case ScreenName.MATCH:
        return <MatchScreen />;
      case ScreenName.MATCH_RESULT:
        return <MatchResultScreen />;
      case ScreenName.WALLET_CONNECT:
        return <WalletScreen />;
      case ScreenName.REWARDS:
        return <RewardsScreen />;
      case ScreenName.MULTIPLAYER_LOBBY:
        return <MultiplayerLobbyScreen />;
      default:
        return <HomeScreen />;
    }
  };

  return (
    <div className="w-full h-full relative bg-black overflow-hidden">
      <AnimatePresence mode="wait">
        <motion.div
          key={currentScreen}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="w-full h-full absolute inset-0"
        >
          {renderScreen()}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

const App: React.FC = () => {
  return (
    <div className="fixed inset-0 w-screen h-dvh bg-neutral-900 overflow-hidden">
      <ToastProvider>
        <GameProvider>
          <ScreenRouter />
        </GameProvider>
      </ToastProvider>
    </div>
  );
};

export default App;
