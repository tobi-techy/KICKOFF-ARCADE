import { motion } from "framer-motion";

interface PixelPlayerProps {
  id: string;
  color: string;
  role?: string;
  isActive?: boolean;
  isOpponent?: boolean;
}

const HAIR_COLORS = ["#1a1a2e", "#3d2314", "#8b4513", "#d4a574", "#2d1b0e"];
const SKIN_TONES = ["#ffdbac", "#f1c27d", "#e0ac69", "#c68642", "#8d5524"];

export function PixelPlayer({ id, color, role, isActive, isOpponent }: PixelPlayerProps) {
  const hairColor = HAIR_COLORS[Math.abs(id.charCodeAt(2)) % HAIR_COLORS.length];
  const skinTone = SKIN_TONES[Math.abs(id.charCodeAt(3)) % SKIN_TONES.length];

  return (
    <div className="flex flex-col items-center">
      {/* Indicators */}
      {isActive && (
        <motion.div
          animate={{ scale: [1, 1.15, 1] }}
          transition={{ repeat: Infinity, duration: 0.8 }}
          className="absolute -top-5 left-1/2 -translate-x-1/2 text-[8px] bg-yellow-400 text-black px-1.5 py-0.5 font-black z-20 shadow-md"
        >
          YOU
        </motion.div>
      )}
      {isOpponent && (
        <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-0 h-0 border-l-4 border-l-transparent border-r-4 border-r-transparent border-t-6 border-t-red-500 z-20" />
      )}

      {/* Character Container */}
      <svg width="40" height="48" viewBox="0 0 40 48" className="overflow-visible">
        {/* Shadow */}
        <ellipse cx="20" cy="46" rx="10" ry="3" fill="rgba(0,0,0,0.3)" />

        {/* Hair Back */}
        <rect x="10" y="2" width="20" height="8" rx="2" fill={hairColor} />

        {/* Head */}
        <rect x="11" y="6" width="18" height="14" rx="2" fill={skinTone} />

        {/* Hair Front */}
        <rect x="10" y="2" width="20" height="6" rx="2" fill={hairColor} />
        <rect x="10" y="6" width="4" height="4" fill={hairColor} />
        <rect x="26" y="6" width="4" height="4" fill={hairColor} />

        {/* Eyes */}
        <rect x="14" y="11" width="4" height="4" rx="1" fill="white" />
        <rect x="22" y="11" width="4" height="4" rx="1" fill="white" />
        <rect x="15" y="12" width="2" height="2" fill="#1a1a2e" />
        <rect x="23" y="12" width="2" height="2" fill="#1a1a2e" />

        {/* Mouth */}
        <rect x="17" y="16" width="6" height="1" rx="0.5" fill="#c9967a" />

        {/* Jersey */}
        <rect
          x="8"
          y="20"
          width="24"
          height="14"
          rx="2"
          fill={color}
          stroke={isActive ? "#facc15" : isOpponent ? "#ef4444" : "rgba(255,255,255,0.2)"}
          strokeWidth={isActive || isOpponent ? 2 : 1}
        />
        {/* Jersey Collar */}
        <rect x="16" y="20" width="8" height="3" rx="1" fill="white" fillOpacity="0.3" />
        {/* Jersey Number/Role */}
        <text
          x="20"
          y="30"
          textAnchor="middle"
          fontSize="8"
          fontWeight="bold"
          fill="white"
          style={{ textShadow: "1px 1px 0 rgba(0,0,0,0.5)" }}
        >
          {role?.toUpperCase().slice(0, 2) || ""}
        </text>

        {/* Arms */}
        <rect x="4" y="21" width="5" height="10" rx="2" fill={skinTone} />
        <rect x="31" y="21" width="5" height="10" rx="2" fill={skinTone} />

        {/* Shorts */}
        <rect x="10" y="33" width="20" height="6" rx="1" fill="#1e293b" />

        {/* Legs */}
        <rect x="12" y="38" width="6" height="6" rx="1" fill={skinTone} />
        <rect x="22" y="38" width="6" height="6" rx="1" fill={skinTone} />

        {/* Shoes */}
        <rect x="11" y="43" width="8" height="4" rx="1" fill="#0f172a" />
        <rect x="21" y="43" width="8" height="4" rx="1" fill="#0f172a" />
      </svg>
    </div>
  );
}
