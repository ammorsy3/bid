"use client";

import React, { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Button } from "./button";
import { Copy, Check } from "lucide-react";

interface AnimatedCopyButtonProps {
  text: string;
  children?: React.ReactNode;
  className?: string;
  variant?: "outline" | "default" | "ghost";
  size?: "sm" | "lg" | "default";
  isRtl?: boolean;
}

export const AnimatedCopyButton: React.FC<AnimatedCopyButtonProps> = ({
  text,
  children,
  className,
  variant = "outline",
  size = "sm",
  isRtl = false,
}) => {
  const [isCopied, setIsCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleCopy}
      className={className}
    >
      <AnimatePresence mode="wait">
        {isCopied ? (
          <motion.div
            key="check"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className={`flex items-center gap-2 ${isRtl ? "flex-row-reverse" : ""}`}
          >
            <Check className={`h-4 w-4 ${isRtl ? "ml-2" : "mr-2"}`} />
            Copied!
          </motion.div>
        ) : (
          <motion.div
            key="copy"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className={`flex items-center gap-2 ${isRtl ? "flex-row-reverse" : ""}`}
          >
            <Copy className={`h-4 w-4 ${isRtl ? "ml-2" : "mr-2"}`} />
            {children || "Copy Link"}
          </motion.div>
        )}
      </AnimatePresence>
    </Button>
  );
};
