export enum ScreenName {
  HOME = "HOME",
  MODE_SELECT = "MODE_SELECT",
  TEAM_SELECT = "TEAM_SELECT",
  SQUAD_SELECT = "SQUAD_SELECT",
  MATCH = "MATCH",
  MATCH_RESULT = "MATCH_RESULT",
  WALLET_CONNECT = "WALLET_CONNECT",
  REWARDS = "REWARDS",
  LEADERBOARD = "LEADERBOARD",
  PROFILE = "PROFILE",
}

export enum GameMode {
  SINGLE_PLAYER = "SINGLE_PLAYER",
  MULTIPLAYER = "MULTIPLAYER",
  TOURNAMENT = "TOURNAMENT",
}

export interface Player {
  id: string;
  name: string;
  position: "GK" | "DEF" | "MID" | "ATT";
  rating: number;
  rarity: "COMMON" | "RARE" | "EPIC" | "LEGENDARY";
  isNft: boolean;
  color: string;
  speed: number;
  shooting: number;
  passing: number;
  defending: number;
}

export interface Team {
  id: string;
  name: string;
  primaryColor: string;
  secondaryColor: string;
  badgeUrl: string; // Using colors/initials for demo
  abbr: string;
}

export interface MatchStats {
  homeScore: number;
  awayScore: number;
  possession: number;
  outcome: "WIN" | "LOSS" | "DRAW";
  xpEarned: number;
  timestamp?: number;
}

export interface GameState {
  currentScreen: ScreenName;
  gameMode: GameMode | null;
  selectedTeam: Team | null;
  squad: Player[];
  bench: Player[];
  walletAddress: string | null;
  matchStats: MatchStats | null;
  matchDuration: number;
  xp: number;
  coins: number;
  inventory: Player[];
  matchHistory: MatchStats[];
}
