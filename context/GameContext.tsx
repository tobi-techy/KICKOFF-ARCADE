import React, { createContext, useContext, useState } from "react";
import {
  GameState,
  ScreenName,
  Team,
  Player,
  MatchStats,
  GameMode,
  LobbyData,
  Difficulty,
} from "../types";
import { DEMO_PLAYERS, EXTRA_PLAYERS } from "../constants";

interface GameContextType extends GameState {
  setScreen: (screen: ScreenName) => void;
  setGameMode: (mode: GameMode) => void;
  setMatchDuration: (duration: number) => void;
  setDifficulty: (difficulty: Difficulty) => void;
  selectTeam: (team: Team) => void;
  setSquadPlayer: (index: number, player: Player) => void;
  connectWallet: (address: string) => void;
  disconnectWallet: () => void;
  finishMatch: (stats: MatchStats) => void;
  autoFillSquad: () => void;
  swapPlayers: (
    index1: number,
    index2: number,
    source1: "squad" | "bench",
    source2: "squad" | "bench",
  ) => void;
  addXP: (amount: number) => void;
  addCoins: (amount: number) => void;
  setLobby: (lobby: LobbyData | null) => void;
  lobby: LobbyData | null;
  tournamentMatchIndex: number | null;
  setTournamentMatchIndex: (index: number | null) => void;
}

const initialState: GameState = {
  currentScreen: ScreenName.HOME,
  gameMode: null,
  selectedTeam: null,
  squad: Array(7).fill(null),
  bench: Array(3).fill(null),
  walletAddress: null,
  matchStats: null,
  matchDuration: 600,
  difficulty: "medium",
  xp: 0,
  coins: 0,
  inventory: [],
  matchHistory: [],
};

const GameContext = createContext<GameContextType | undefined>(undefined);

export const GameProvider = ({ children }: React.PropsWithChildren<{}>) => {
  const [state, setState] = useState<GameState>(initialState);
  const [lobby, setLobbyState] = useState<LobbyData | null>(null);
  const [tournamentMatchIndex, setTournamentMatchIndex] = useState<number | null>(null);

  const setScreen = (screen: ScreenName) =>
    setState((prev) => ({ ...prev, currentScreen: screen }));

  const setGameMode = (mode: GameMode) =>
    setState((prev) => ({ ...prev, gameMode: mode }));

  const setMatchDuration = (duration: number) =>
    setState((prev) => ({ ...prev, matchDuration: duration }));

  const setDifficulty = (difficulty: Difficulty) =>
    setState((prev) => ({ ...prev, difficulty }));

  const selectTeam = (team: Team) =>
    setState((prev) => ({ ...prev, selectedTeam: team }));

  const setSquadPlayer = (index: number, player: Player) => {
    setState((prev) => {
      const newSquad = [...prev.squad];
      newSquad[index] = player;
      return { ...prev, squad: newSquad };
    });
  };

  const autoFillSquad = () => {
    setState((prev) => ({
      ...prev,
      squad: [...DEMO_PLAYERS],
      bench: [...EXTRA_PLAYERS],
    }));
  };

  const swapPlayers = (
    index1: number,
    index2: number,
    source1: "squad" | "bench",
    source2: "squad" | "bench",
  ) => {
    setState((prev) => {
      const newSquad = [...prev.squad];
      const newBench = [...prev.bench];

      const p1 = source1 === "squad" ? newSquad[index1] : newBench[index1];
      const p2 = source2 === "squad" ? newSquad[index2] : newBench[index2];

      if (source1 === "squad") newSquad[index1] = p2;
      else newBench[index1] = p2;

      if (source2 === "squad") newSquad[index2] = p1;
      else newBench[index2] = p1;

      return { ...prev, squad: newSquad, bench: newBench };
    });
  };

  const connectWallet = (address: string) => {
    setState((prev) => ({
      ...prev,
      walletAddress: address,
      inventory: [...prev.inventory, ...DEMO_PLAYERS],
    }));
  };

  const disconnectWallet = () => {
    setState((prev) => ({ ...prev, walletAddress: null }));
  };

  const finishMatch = (stats: MatchStats) => {
    const coinsEarned = stats.outcome === "WIN" ? 50 : stats.outcome === "DRAW" ? 20 : 10;
    setState((prev) => ({
      ...prev,
      matchStats: stats,
      xp: prev.xp + stats.xpEarned,
      coins: prev.coins + coinsEarned,
      matchHistory: [...prev.matchHistory, { ...stats, timestamp: Date.now() }],
      currentScreen: ScreenName.MATCH_RESULT,
    }));
  };

  const addXP = (amount: number) => {
    setState((prev) => ({ ...prev, xp: prev.xp + amount }));
  };

  const addCoins = (amount: number) => {
    setState((prev) => ({ ...prev, coins: prev.coins + amount }));
  };

  const setLobby = (lobbyData: LobbyData | null) => {
    setLobbyState(lobbyData);
  };

  return (
    <GameContext.Provider
      value={{
        ...state,
        lobby,
        tournamentMatchIndex,
        setScreen,
        setGameMode,
        setMatchDuration,
        setDifficulty,
        selectTeam,
        setSquadPlayer,
        connectWallet,
        disconnectWallet,
        finishMatch,
        autoFillSquad,
        swapPlayers,
        addXP,
        addCoins,
        setLobby,
        setTournamentMatchIndex,
      }}
    >
      {children}
    </GameContext.Provider>
  );
};

export const useGame = () => {
  const context = useContext(GameContext);
  if (!context) throw new Error("useGame must be used within a GameProvider");
  return context;
};
