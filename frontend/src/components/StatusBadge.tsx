import React from "react";
import { AppointmentStatus } from "../types";

export const StatusBadge: React.FC<{ status: AppointmentStatus }> = ({ status }) => {
  const configs: Record<
    AppointmentStatus,
    { label: string; bg: string; text: string; dot: string }
  > = {
    scheduled: {
      label: "Scheduled",
      bg: "bg-blue-50 border-blue-200",
      text: "text-blue-700",
      dot: "bg-blue-500",
    },
    arrived: {
      label: "Arrived",
      bg: "bg-amber-50 border-amber-200",
      text: "text-amber-700",
      dot: "bg-amber-500",
    },
    completed: {
      label: "Completed",
      bg: "bg-emerald-50 border-emerald-200",
      text: "text-emerald-700",
      dot: "bg-emerald-500",
    },
    cancelled: {
      label: "Cancelled",
      bg: "bg-rose-50 border-rose-200",
      text: "text-rose-700",
      dot: "bg-rose-500",
    },
  };

  const config = configs[status] || configs.scheduled;

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${config.bg} ${config.text}`}
    >
      <span className={`w-1.5 h-1.5 mr-1.5 rounded-full ${config.dot}`} />
      {config.label}
    </span>
  );
};
