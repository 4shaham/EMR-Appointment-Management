import React from "react";

// ─── 1. Pure Inline Spinner (Zero-padding, zero-margin) ──────────────────────
export interface SpinnerProps {
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  color?: "current" | "white" | "sky" | "purple" | "emerald" | "slate";
  className?: string;
  ariaLabel?: string;
}

export const Spinner: React.FC<SpinnerProps> = ({
  size = "sm",
  color = "current",
  className = "",
  ariaLabel = "Loading...",
}) => {
  const sizeMap = {
    xs: "w-3.5 h-3.5 border-[1.5px]",
    sm: "w-4 h-4 border-2",
    md: "w-6 h-6 border-2",
    lg: "w-8 h-8 border-3",
    xl: "w-12 h-12 border-4",
  };

  const colorMap = {
    current: "border-current/25 border-t-current",
    white: "border-white/30 border-t-white text-white",
    sky: "border-sky-200 border-t-sky-600 text-sky-600",
    purple: "border-purple-200 border-t-purple-600 text-purple-600",
    emerald: "border-emerald-200 border-t-emerald-600 text-emerald-600",
    slate: "border-slate-200 border-t-slate-600 text-slate-600",
  };

  return (
    <span
      role="status"
      aria-label={ariaLabel}
      className={`inline-block shrink-0 rounded-full animate-spin ${sizeMap[size]} ${colorMap[color]} ${className}`}
    >
      <span className="sr-only">{ariaLabel}</span>
    </span>
  );
};

// ─── 2. Block Loading State (Cards, Pages, Initial Modal Load) ───────────────
export interface LoadingSpinnerProps {
  message?: string;
  size?: "sm" | "md" | "lg";
  minHeight?: string; // e.g. "min-h-[200px]"
  className?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  message,
  size = "md",
  minHeight = "min-h-[160px]",
  className = "",
}) => {
  return (
    <div
      role="status"
      aria-live="polite"
      className={`flex flex-col items-center justify-center p-6 space-y-3 ${minHeight} ${className}`}
    >
      <Spinner size={size} color="sky" />
      {message && (
        <p className="text-xs sm:text-sm font-medium text-slate-500 tracking-wide select-none">
          {message}
        </p>
      )}
    </div>
  );
};

// ─── 3. Button Content Loader (Preserves Button Dimensions & Stability) ──────
export interface ButtonLoaderProps {
  isLoading: boolean;
  children: React.ReactNode;
  loadingText?: string;
  spinnerSize?: "xs" | "sm";
  spinnerColor?: "current" | "white" | "sky" | "purple" | "emerald";
  className?: string;
}

export const ButtonLoader: React.FC<ButtonLoaderProps> = ({
  isLoading,
  children,
  loadingText,
  spinnerSize = "sm",
  spinnerColor = "current",
  className = "",
}) => {
  return (
    <span className={`inline-flex items-center justify-center relative ${className}`}>
      {isLoading && (
        <Spinner
          size={spinnerSize}
          color={spinnerColor}
          className="mr-2"
          ariaLabel={loadingText || "Processing request..."}
        />
      )}
      <span>{isLoading && loadingText ? loadingText : children}</span>
    </span>
  );
};
