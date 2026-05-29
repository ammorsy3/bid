interface SpotlightCardProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  spotlightColor?: 'green' | 'red' | 'orange';
}

export const SpotlightCard = ({
  children,
  className = "",
  style,
}: SpotlightCardProps) => {
  return (
    <div
      style={{ ...style, background: 'var(--spotlight-card-bg)' }}
      className={`rounded-2xl border border-[#FE3C01]/10 dark:border-border overflow-hidden ${className}`}
    >
      {children}
    </div>
  );
};
