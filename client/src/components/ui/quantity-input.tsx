import { forwardRef } from "react";
import { cn } from "@/lib/utils";

type QuantityInputProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange" | "type"> & {
  value: number | string | null | undefined;
  /** The raw text as typed — it may be empty or incomplete while editing. */
  onValueChange: (raw: string) => void;
  invalid?: boolean;
};

/**
 * A quantity field that can be cleared and retyped (no forced 0), shows the
 * decimal keypad on phones and accepts Arabic digits. It never parses or rounds
 * on its own: callers validate with parseQuantity (shared/quantity.ts) when the
 * user moves on, and keep the raw text until then.
 */
export const QuantityInput = forwardRef<HTMLInputElement, QuantityInputProps>(function QuantityInput(
  { value, onValueChange, invalid, className, ...props },
  ref,
) {
  return (
    <input
      ref={ref}
      type="text"
      inputMode="decimal"
      autoComplete="off"
      dir="ltr"
      value={value == null ? "" : String(value)}
      onChange={(e) => onValueChange(e.target.value)}
      onKeyDown={(e) => { if (e.key === "Enter") e.preventDefault(); }}
      aria-invalid={invalid || undefined}
      className={cn(className)}
      {...props}
    />
  );
});
