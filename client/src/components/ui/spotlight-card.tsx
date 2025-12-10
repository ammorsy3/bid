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
      className={`relative isolate rounded-2xl border border-neutral-200 bg-white overflow-hidden ${className}`}
    >
      {/* Static corner glow - top left */}
      <div
        className="pointer-events-none absolute -top-16 -left-16 w-32 h-32 z-0"
        style={{
          background: `radial-gradient(circle, hsl(${hue} ${saturation}% ${lightness}% / 0.2), transparent 70%)`,
          filter: 'blur(15px)',
        }}
      />
      
      {/* Static corner glow - bottom left */}
      <div
        className="pointer-events-none absolute -bottom-16 -left-16 w-32 h-32 z-0"
        style={{
          background: `radial-gradient(circle, hsl(${hue} ${saturation}% ${lightness}% / 0.15), transparent 70%)`,
          filter: 'blur(20px)',
        }}
      />
      
      {/* Static subtle edge glow - left side */}
      <div
        className="pointer-events-none absolute top-0 left-0 w-0.5 h-full z-0"
        style={{
          background: `linear-gradient(to bottom, hsl(${hue} ${saturation}% ${lightness}% / 0.3), hsl(${hue} ${saturation}% ${lightness}% / 0.15) 50%, hsl(${hue} ${saturation}% ${lightness}% / 0.25))`,
          boxShadow: `0 0 15px 3px hsl(${hue} ${saturation}% ${lightness}% / 0.1)`,
        }}
      />

      {/* Main spotlight glow - inner fill */}
      <div
        className="pointer-events-none absolute inset-0 transition-opacity duration-300 ease-out z-0"
        style={{
          opacity: opacity * 0.1,
          background: `radial-gradient(500px circle at ${position.x}px ${position.y}px, hsl(${hue} ${saturation}% ${lightness}%), transparent 40%)`,
        }}
      />
      
      {/* Neon border glow effect */}
      <div
        className="pointer-events-none absolute inset-0 transition-opacity duration-300 ease-out z-0"
        style={{
          opacity: opacity * 0.25,
          background: `radial-gradient(300px circle at ${position.x}px ${position.y}px, hsl(${hue} ${saturation}% ${lightness}% / 0.3), transparent 40%)`,
        }}
      />
      
      {/* Bright center highlight */}
      <div
        className="pointer-events-none absolute inset-0 transition-opacity duration-300 ease-out z-0"
        style={{
          opacity: opacity * 0.4,
          background: `radial-gradient(150px circle at ${position.x}px ${position.y}px, hsl(${hue} ${saturation}% 75% / 0.2), transparent 50%)`,
        }}
      />
      
      {/* Content wrapper - above all glow effects */}
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
};
