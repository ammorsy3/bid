import { useRef, useState } from "react";

interface SpotlightCardProps {
  children: React.ReactNode;
  className?: string;
  spotlightColor?: 'blue' | 'purple' | 'green' | 'red' | 'orange';
}

const colorMap = {
  blue: { hue: 220, saturation: 100, lightness: 60 },
  purple: { hue: 280, saturation: 100, lightness: 60 },
  green: { hue: 140, saturation: 80, lightness: 50 },
  red: { hue: 0, saturation: 100, lightness: 60 },
  orange: { hue: 30, saturation: 100, lightness: 55 }
};

export const SpotlightCard = ({
  children,
  className = "",
  spotlightColor = "blue",
}: SpotlightCardProps) => {
  const divRef = useRef<HTMLDivElement>(null);
  const [isFocused, setIsFocused] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [opacity, setOpacity] = useState(0);

  const handleMouseMove = (e: { clientX: number; clientY: number }) => {
    if (!divRef.current || isFocused) return;

    const rect = divRef.current.getBoundingClientRect();
    setPosition({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  const handleFocus = () => {
    setIsFocused(true);
    setOpacity(1);
  };

  const handleBlur = () => {
    setIsFocused(false);
    setOpacity(0);
  };

  const handleMouseEnter = () => {
    setOpacity(1);
  };

  const handleMouseLeave = () => {
    setOpacity(0);
  };

  const { hue, saturation, lightness } = colorMap[spotlightColor];

  return (
    <div
      ref={divRef}
      onMouseMove={handleMouseMove}
      onFocus={handleFocus}
      onBlur={handleBlur}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={`relative rounded-2xl border border-neutral-200 bg-white overflow-hidden ${className}`}
    >
      {/* Main spotlight glow - inner fill */}
      <div
        className="pointer-events-none absolute inset-0 transition-opacity duration-300 ease-out"
        style={{
          opacity: opacity * 0.15,
          background: `radial-gradient(600px circle at ${position.x}px ${position.y}px, hsl(${hue} ${saturation}% ${lightness}%), transparent 40%)`,
        }}
      />
      
      {/* Neon border glow effect */}
      <div
        className="pointer-events-none absolute inset-0 transition-opacity duration-300 ease-out"
        style={{
          opacity,
          background: `radial-gradient(400px circle at ${position.x}px ${position.y}px, hsl(${hue} ${saturation}% ${lightness}% / 0.4), transparent 40%)`,
          filter: 'brightness(1.5)',
        }}
      />
      
      {/* Bright center highlight */}
      <div
        className="pointer-events-none absolute inset-0 transition-opacity duration-300 ease-out"
        style={{
          opacity: opacity * 0.8,
          background: `radial-gradient(200px circle at ${position.x}px ${position.y}px, hsl(${hue} ${saturation}% 80% / 0.3), transparent 50%)`,
          filter: 'brightness(2)',
        }}
      />
      
      {/* White hot center */}
      <div
        className="pointer-events-none absolute inset-0 transition-opacity duration-300 ease-out"
        style={{
          opacity: opacity * 0.6,
          background: `radial-gradient(100px circle at ${position.x}px ${position.y}px, hsl(0 0% 100% / 0.4), transparent 50%)`,
        }}
      />
      
      {children}
    </div>
  );
};
