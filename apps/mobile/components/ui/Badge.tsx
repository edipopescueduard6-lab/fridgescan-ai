import React from "react";
import { View, Text } from "react-native";
import type { FreshnessStatus } from "@/constants/colors";

type BadgeVariant = "fresh" | "ok" | "expiring" | "expired" | "primary" | "secondary" | "accent" | "default";

interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
  size?: "sm" | "md";
}

const variantBgClasses: Record<BadgeVariant, string> = {
  fresh: "bg-fresh/20",
  ok: "bg-ok/20",
  expiring: "bg-expiring/20",
  expired: "bg-expired/20",
  primary: "bg-primary/20",
  secondary: "bg-secondary/20",
  accent: "bg-accent/20",
  default: "bg-gray-200",
};

const variantTextClasses: Record<BadgeVariant, string> = {
  fresh: "text-fresh",
  ok: "text-yellow-700",
  expiring: "text-expiring",
  expired: "text-expired",
  primary: "text-primary",
  secondary: "text-secondary",
  accent: "text-accent",
  default: "text-gray-600",
};

export default function Badge({ label, variant = "default", size = "sm" }: BadgeProps) {
  return (
    <View
      className={`
        ${variantBgClasses[variant]}
        ${size === "sm" ? "px-2 py-0.5" : "px-3 py-1"}
        rounded-full self-start
      `}
    >
      <Text
        className={`
          ${variantTextClasses[variant]}
          ${size === "sm" ? "text-xs" : "text-sm"}
          font-semibold
        `}
      >
        {label}
      </Text>
    </View>
  );
}

interface FreshnessBadgeProps {
  status: FreshnessStatus;
  size?: "sm" | "md";
}

const freshnessLabels: Record<FreshnessStatus, string> = {
  fresh: "Proaspăt",
  ok: "Bun",
  expiring: "Expiră curând",
  expired: "Expirat",
};

export function FreshnessBadge({ status, size = "sm" }: FreshnessBadgeProps) {
  return <Badge label={freshnessLabels[status]} variant={status} size={size} />;
}
