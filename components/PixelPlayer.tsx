import { motion } from "framer-motion";

interface PixelPlayerProps {
  id: string;
  color: string;
  role?: string;
  isActive?: boolean;
  isOpponent?: boolean;
  position?: "GK" | "DEF" | "MID" | "ATT";
  direction?: string;
}

const POSITION_FOLDER: Record<string, string> = {
  GK: "goalkeeper",
  DEF: "defender",
  MID: "midfielder",
  ATT: "attacker",
};

export function PixelPlayer({ 
  id, 
  color, 
  role, 
  isActive, 
  isOpponent, 
  position = "MID",
  direction = "south"
}: PixelPlayerProps) {
  const folder = POSITION_FOLDER[position] || "midfielder";
  const sprite = `/sprites/${folder}/rotations/${direction}.png`;

  return (
    <div className="flex flex-col items-center relative">
      {isActive && (
        <motion.div
          animate={{ scale: [1, 1.15, 1] }}
          transition={{ repeat: Infinity, duration: 0.8 }}
          className="absolute -top-3 left-1/2 -translate-x-1/2 text-[10px] bg-yellow-400 text-black px-2 py-0.5 font-black z-20 shadow-md rounded"
        >
          YOU
        </motion.div>
      )}
      {isOpponent && (
        <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[8px] border-t-red-500 z-20" />
      )}

      <div className="relative">
        <img
          src={sprite}
          alt={role || position}
          className="w-[96px] h-[96px]"
          style={{
            imageRendering: "pixelated",
            filter: isOpponent ? "hue-rotate(180deg) saturate(1.5)" : "none",
          }}
        />
        {isActive && (
          <div className="absolute -inset-1 border-2 border-yellow-400 rounded-full opacity-60" />
        )}
        {isOpponent && (
          <div className="absolute -inset-1 border-2 border-red-500 rounded-full opacity-60" />
        )}
      </div>
    </div>
  );
}
