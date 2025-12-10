import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import type { ButtonProps } from "@/components/ui/button";

interface ParticleButtonProps extends ButtonProps {
    onSuccess?: () => void;
    successDuration?: number;
    particleColor?: string;
}

function SuccessParticles({
    buttonRef,
    color = "bg-black dark:bg-white",
}: {
    buttonRef: React.RefObject<HTMLButtonElement>;
    color?: string;
}) {
    const rect = buttonRef.current?.getBoundingClientRect();
    if (!rect) return null;

    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    return (
        <AnimatePresence>
            {[...Array(8)].map((_, i) => (
                <motion.div
                    key={i}
                    className={cn("fixed w-1.5 h-1.5 rounded-full", color)}
                    style={{ left: centerX, top: centerY }}
                    initial={{
                        scale: 0,
                        x: 0,
                        y: 0,
                        opacity: 1,
                    }}
                    animate={{
                        scale: [0, 1.5, 0],
                        x: [0, (i % 2 ? 1 : -1) * (Math.random() * 60 + 30)],
                        y: [0, (Math.random() - 0.5) * 80 - 20],
                        opacity: [1, 1, 0],
                    }}
                    transition={{
                        duration: 0.7,
                        delay: i * 0.05,
                        ease: "easeOut",
                    }}
                />
            ))}
        </AnimatePresence>
    );
}

function ParticleButton({
    children,
    onClick,
    onSuccess,
    successDuration = 800,
    particleColor = "bg-blue-500",
    className,
    ...props
}: ParticleButtonProps) {
    const [showParticles, setShowParticles] = useState(false);
    const buttonRef = useRef<HTMLButtonElement>(null);

    const handleClick = async (e: React.MouseEvent<HTMLButtonElement>) => {
        setShowParticles(true);

        setTimeout(() => {
            setShowParticles(false);
            if (onSuccess) {
                onSuccess();
            }
            if (onClick) {
                onClick(e);
            }
        }, successDuration / 2);
    };

    return (
        <>
            {showParticles && <SuccessParticles buttonRef={buttonRef} color={particleColor} />}
            <Button
                ref={buttonRef}
                onClick={handleClick}
                className={cn(
                    "relative overflow-visible",
                    showParticles && "scale-95",
                    "transition-transform duration-150",
                    className
                )}
                {...props}
            >
                <motion.span
                    className="flex items-center gap-2"
                    animate={showParticles ? { scale: [1, 0.9, 1] } : {}}
                    transition={{ duration: 0.3 }}
                >
                    {children}
                </motion.span>
            </Button>
        </>
    );
}

export { ParticleButton };
