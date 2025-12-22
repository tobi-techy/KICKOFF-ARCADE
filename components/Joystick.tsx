import React, { useRef, useState, useEffect } from 'react';

interface JoystickProps {
  onMove: (vector: { x: number; y: number }) => void;
  size?: number;
}

export const Joystick: React.FC<JoystickProps> = ({ onMove, size = 100 }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [active, setActive] = useState(false);
  const touchId = useRef<number | null>(null);

  const handleStart = (clientX: number, clientY: number, id: number) => {
    if (active) return;
    touchId.current = id;
    setActive(true);
    updatePosition(clientX, clientY);
  };

  const handleMove = (clientX: number, clientY: number) => {
    if (!active) return;
    updatePosition(clientX, clientY);
  };

  const handleEnd = () => {
    setActive(false);
    setPosition({ x: 0, y: 0 });
    touchId.current = null;
    onMove({ x: 0, y: 0 });
  };

  const updatePosition = (clientX: number, clientY: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const deltaX = clientX - centerX;
    const deltaY = clientY - centerY;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    const maxDist = size / 2;

    const clampedDist = Math.min(distance, maxDist);
    const angle = Math.atan2(deltaY, deltaX);

    const x = Math.cos(angle) * clampedDist;
    const y = Math.sin(angle) * clampedDist;

    setPosition({ x, y });
    
    onMove({
      x: x / maxDist,
      y: y / maxDist
    });
  };

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => handleMove(e.clientX, e.clientY);
    const onMouseUp = () => handleEnd();

    if (active && touchId.current === 999) {
      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [active]);

  return (
    <div 
      ref={containerRef}
      className="relative rounded-full bg-white/10 border border-white/20 backdrop-blur-sm touch-none"
      style={{ width: size, height: size }}
      onTouchStart={(e) => handleStart(e.changedTouches[0].clientX, e.changedTouches[0].clientY, e.changedTouches[0].identifier)}
      onTouchMove={(e) => {
        if (touchId.current !== null) {
          const touch = Array.from(e.changedTouches).find(t => t.identifier === touchId.current);
          if (touch) handleMove(touch.clientX, touch.clientY);
        }
      }}
      onTouchEnd={() => handleEnd()}
      onMouseDown={(e) => handleStart(e.clientX, e.clientY, 999)}
    >
      <div 
        className={`absolute rounded-full bg-white/50 shadow-lg pointer-events-none transition-transform duration-75 ${active ? 'scale-95' : ''}`}
        style={{
          width: size / 2,
          height: size / 2,
          left: '25%',
          top: '25%',
          transform: `translate(${position.x}px, ${position.y}px)`
        }}
      />
    </div>
  );
};