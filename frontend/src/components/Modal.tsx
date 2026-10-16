import React, { ReactNode, useEffect } from "react";
import { X } from "lucide-react";
import { LoadingSpinner } from "./LoadingSpinner";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  maxWidth?: "sm" | "md" | "lg" | "xl" | "2xl";
  isLoading?: boolean;
  loadingMessage?: string;
  minHeight?: string;
  preventCloseOnBackdrop?: boolean;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  maxWidth = "md",
  isLoading = false,
  loadingMessage,
  minHeight,
  preventCloseOnBackdrop = false,
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isLoading) onClose();
    };
    if (isOpen) {
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.body.style.overflow = "unset";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose, isLoading]);

  if (!isOpen) return null;

  const widthClasses = {
    sm: "max-w-sm",
    md: "max-w-md",
    lg: "max-w-lg",
    xl: "max-w-xl",
    "2xl": "max-w-2xl",
  };

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
        onClick={() => {
          if (!preventCloseOnBackdrop && !isLoading) onClose();
        }}
        aria-hidden="true"
      />

      {/* Modal Dialog */}
      <div className="flex min-h-full items-center justify-center p-4 text-center sm:p-0">
        <div
          className={`relative w-full ${widthClasses[maxWidth]} bg-white rounded-2xl shadow-2xl border border-slate-100 p-6 z-10 text-left transition-all my-8 animate-in zoom-in-95 duration-150 ${
            minHeight || ""
          }`}
          aria-busy={isLoading}
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-3.5 border-b border-slate-100">
            <h3 id="modal-title" className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
              {title}
            </h3>
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              aria-label="Close modal"
              className="text-slate-400 hover:text-slate-600 transition-colors p-1.5 rounded-lg hover:bg-slate-100 disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Body */}
          <div className="mt-4">
            {isLoading ? (
              <LoadingSpinner
                message={loadingMessage || "Loading content..."}
                minHeight={minHeight || "min-h-[180px]"}
              />
            ) : (
              children
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
