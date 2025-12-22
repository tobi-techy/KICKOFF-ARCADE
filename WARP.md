# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project Overview

KickOff Arcade is a React-based web football/soccer arcade game built with TypeScript, Vite, and Planck.js physics engine. The game features multiple screens (home, team select, match gameplay, etc.), real-time physics simulation, touch/keyboard controls, and an arcade-style UI. This is an AI Studio app that uses the Gemini API.

## Development Commands

### Start Development Server
```bash
npm run dev
```
Runs Vite dev server on `http://localhost:3000`

### Build for Production
```bash
npm run build
```
Compiles TypeScript and bundles assets to `dist/`

### Preview Production Build
```bash
npm run preview
```

## Environment Setup

Set your Gemini API key in `.env.local`:
```
GEMINI_API_KEY=your_api_key_here
```

The key is injected into the app via `vite.config.ts` as `process.env.GEMINI_API_KEY` and `process.env.API_KEY`.

## Architecture

### Screen-Based Navigation System
The app uses a screen-based state machine controlled by `GameContext` with these screens:
- `HOME` → `MODE_SELECT` → `TEAM_SELECT` → `SQUAD_SELECT` → `MATCH` → `MATCH_RESULT`
- Additional screens: `WALLET_CONNECT`, `REWARDS`, `LEADERBOARD`, `PROFILE`

Navigation is managed through `setScreen()` in GameContext, which updates `currentScreen`. The `ScreenRouter` component in `App.tsx` handles rendering based on current screen state.

### Game State Management
All game state lives in `context/GameContext.tsx` using React Context + useState:
- **Team/Squad**: Selected team, squad composition (7 players + 3 bench)
- **Match**: Game mode, match duration, scores, statistics
- **Wallet**: Wallet connection state, inventory, XP
- **Operations**: `setScreen`, `selectTeam`, `autoFillSquad`, `swapPlayers`, `finishMatch`, etc.

State is globally accessible via `useGame()` hook throughout the app.

### Physics Engine (Planck.js)
`utils/physics.ts` contains `GamePhysics` class managing all physics simulation:
- **World Setup**: 2D physics world with walls, goal sensors, collision detection
- **Entities**: Ball (dynamic body), Players (dynamic bodies with stamina), Walls/Posts (static)
- **Movement**: Smooth acceleration-based player movement with stamina system
- **Ball Control**: Dribbling (ball sticks to player), kicks (pass/shoot/through/tackle), spin/curve
- **Tackles**: Slide tackles (risky, can cause fouls) and standing tackles
- **Callbacks**: `onGoal`, `onCollision`, `onFoul` for game events

The physics engine runs at 60 FPS via `requestAnimationFrame` in `MatchScreen`, stepping the world and updating DOM positions.

### Match Gameplay Loop
`screens/MatchScreen.tsx` is the core gameplay component:
1. **Initialization**: Creates `GamePhysics` instance, spawns 7 home + 7 away players, positions ball
2. **Input Handling**: 
   - Touch: `NippleJoystick` (nipplejs library) for mobile controls
   - Keyboard: WASD/arrows for movement, Space for kick, Shift for sprint
3. **Game Loop**: 60 FPS `requestAnimationFrame` that:
   - Reads input from joystick/keyboard refs
   - Calls `physics.movePlayer()` for active player
   - Runs basic AI for all other players (seek ball, defend, attack)
   - Steps physics simulation via `physics.step()`
   - Updates DOM positions by setting `transform` styles
   - Checks ball possession, updates stamina, handles time countdown
4. **Events**: Goal detection, collision sounds, possession tracking

### AI Behavior
Simple state-based AI for non-controlled players (in `MatchScreen.tsx`):
- **Attacking**: Chase ball if close, move to attacking positions
- **Defending**: Mark opponents, hold defensive line
- **Midfield**: Support attack/defense based on ball position
- **Goalkeeper**: Stay near goal, dive for close balls

AI uses physics movement with reduced speed factor (92% of player speed).

### Component Structure
- **Screens** (`screens/`): Full-screen game states (HomeScreen, MatchScreen, etc.)
- **Components** (`components/`): Reusable UI elements
  - `PixelPlayer`: Renders player sprite with color/position
  - `NippleJoystick`: Touch joystick wrapper around nipplejs
  - `Button`: Styled button component
- **Context** (`context/`): React Context for global state
- **Utils** (`utils/`): 
  - `physics.ts`: Physics engine
  - `sounds.ts`: Web Audio API sound engine (tones, noise generation)
- **Types** (`types.ts`): TypeScript interfaces and enums
- **Constants** (`constants.ts`): Static data (teams, demo players, NFT rewards)

### Styling
Uses Tailwind CSS 4.x with PostCSS. Custom arcade fonts (Chakra Petch) loaded via Google Fonts in `index.html`. Framer Motion for screen transitions and animations.

## Path Aliases

`@/` resolves to the project root (configured in `tsconfig.json` and `vite.config.ts`).

Example: `import { GameProvider } from '@/context/GameContext'`

## Key Technical Details

### Physics Constants
- Field: 200x120 units
- Player radius: 3.5 units
- Ball radius: 2 units
- Scale: 10 (physics units to screen units)

### Player Stats
Players have: `speed`, `shooting`, `passing`, `defending`, `rating`, `rarity`, `position` (GK/DEF/MID/ATT)

### Formations
Currently uses 4-3-3 formation with 7 players per team (reduced from 11 for arcade gameplay). Formations defined as proportional positions in `FORMATIONS` object.

### Stamina System
- Drains during sprint (0.3/frame)
- Regenerates when not sprinting (0.15/frame)
- Affects player speed (70% speed when below 20 stamina)

### Ball Physics
- Dribbling: Ball follows player smoothly, positioned ahead in movement direction
- Kicks: Type-based (pass/shoot/through/tackle) with power, accuracy, spin
- Curve: Angular velocity on ball creates perpendicular force for curve shots
- Possession: Auto-detected when player is within radius of ball

## Testing

No test framework is currently configured. If adding tests, consider:
- Vitest for unit/integration tests (Vite-native)
- Testing Library for React component tests
- Playwright for E2E tests (note: MCP Playwright server is available)

## Common Pitfalls

### Physics Sticking Issues
Ball can stick to walls/corners due to physics damping. The `dribbleBall()` function includes margin clamping to prevent this, but edge cases may occur.

### Performance on Mobile
Running 60 FPS physics + 14 players + DOM updates can be heavy on older devices. Consider:
- Using CSS transforms (already implemented) instead of top/left
- Reducing AI update frequency for off-screen players
- Using `will-change: transform` sparingly

### Environment Variables
Vite requires `process.env.*` to be explicitly defined in `vite.config.ts`. If adding new env vars, update the `define` section.

### TypeScript Paths
Both `tsconfig.json` and `vite.config.ts` must have matching path aliases for dev/build to work correctly.

## Related Documentation

- Original project source: https://ai.studio/apps/drive/1CEbdawfuaC1L61eH45adX82xS8O_0gBZ
- Planck.js docs: https://piqnt.com/planck.js/
- Nipple.js docs: https://yoannmoi.net/nipplejs/
