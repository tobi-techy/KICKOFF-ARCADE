import { useState, useEffect } from "react";

interface PixelPlayerProps {
  id: string;
  color: string;
  role?: string;
  isActive?: boolean;
  isOpponent?: boolean;
  position?: "GK" | "DEF" | "MID" | "ATT";
  direction?: string;
  isMoving?: boolean;
}

const POSITION_FOLDER: Record<string, string> = {
  GK: "goalkeeper",
  DEF: "defender",
  MID: "midfielder",
  ATT: "attacker",
};

// Available animation directions per position (based on what we have)
const ANIM_DIRS: Record<string, string[]> = {
  attacker: ["south", "west", "south-west"],
  midfielder: ["south", "west", "south-west", "north-west"],
  defender: ["south", "west", "south-west", "north-west"],
  goalkeeper: [],
};

// Map any direction to nearest available animation direction
function getNearestAnimDir(folder: string, dir: string): string | null {
  const available = ANIM_DIRS[folder] || [];
  if (available.length === 0) return null;
  if (available.includes(dir)) return dir;
  
  // Map to nearest
  const mapping: Record<string, string> = {
    "east": "west",
    "north": "south",
    "north-east": "north-west",
    "south-east": "south-west",
  };
  const mapped = mapping[dir];
  if (mapped && available.includes(mapped)) return mapped;
  return available[0]; // fallback to first available
}

export function PixelPlayer({ 
  id, 
  color, 
  role, 
  isActive, 
  isOpponent, 
  position = "MID",
  direction = "south",
  isMoving = false,
}: PixelPlayerProps) {
  const folder = POSITION_FOLDER[position] || "midfielder";
  const [frame, setFrame] = useState(0);
  
  const animDir = isMoving ? getNearestAnimDir(folder, direction) : null;
  const hasAnim = animDir !== null;
  const flipX = ["east", "north-east", "south-east"].includes(direction);
  
  // Animation loop
  useEffect(() => {
    if (!isMoving || !hasAnim) return;
    const interval = setInterval(() => setFrame(f => (f + 1) % 4), 120);
    return () => clearInterval(interval);
  }, [isMoving, hasAnim]);

  const sprite = hasAnim && isMoving
    ? `/sprites/${folder}/animations/running-4-frames/${animDir}/frame_00${frame}.png`
    : `/sprites/${folder}/rotations/${direction}.png`;

  return (
    <div className="flex flex-col items-center relative">
      {isActive && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 text-[10px] bg-yellow-400 text-black px-2 py-0.5 font-black z-20 shadow-md rounded animate-pulse">
          YOU
        </div>
      )}
      {isOpponent && (
        <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[8px] border-t-red-500 z-20" />
      )}

      {/* Shadow */}
      <div 
        className="absolute bottom-1 left-1/2 -translate-x-1/2 w-12 h-3 bg-black/30 rounded-full blur-sm"
        style={{ transform: "translateX(-50%) scaleY(0.5)" }}
      />

      <div className="relative">
        <img
          src={sprite}
          alt={role || position}
          className="w-[96px] h-[96px]"
          style={{
            imageRendering: "pixelated",
            filter: isOpponent ? "hue-rotate(180deg) saturate(1.5)" : "none",
            transform: flipX ? "scaleX(-1)" : "none",
          }}
        />
        {isActive && (
          <div className="absolute -inset-1 border-2 border-yellow-400 rounded-full opacity-60 animate-ping" style={{ animationDuration: "1.5s" }} />
        )}
      </div>
    </div>
  );
}
