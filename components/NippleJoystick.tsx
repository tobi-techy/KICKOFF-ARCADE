import React, { useEffect, useRef } from "react";
import nipplejs, { JoystickManager } from "nipplejs";

interface NippleJoystickProps {
  onMove: (vector: { x: number; y: number }) => void;
  size?: number;
}

export const NippleJoystick: React.FC<NippleJoystickProps> = ({ onMove, size = 120 }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const managerRef = useRef<JoystickManager | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    managerRef.current = nipplejs.create({
      zone: containerRef.current,
      mode: "static",
      position: { left: "50%", top: "50%" },
      color: "white",
      size,
      restOpacity: 0.5,
      fadeTime: 100,
    });

    managerRef.current.on("move", (_, data) => {
      if (data.vector) {
        onMove({ x: data.vector.x, y: data.vector.y });
      }
    });

    managerRef.current.on("end", () => {
      onMove({ x: 0, y: 0 });
    });

    return () => {
      managerRef.current?.destroy();
    };
  }, [onMove, size]);

  return (
    <div
      ref={containerRef}
      className="relative rounded-full bg-white/5 backdrop-blur-sm"
      style={{ width: size, height: size }}
    />
  );
};
