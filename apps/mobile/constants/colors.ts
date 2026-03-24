export const Colors = {
  primary: "#2D8B4E",
  secondary: "#FF6B35",
  accent: "#5C6BC0",
  bg: "#FAFDF7",
  text: "#1A2E1A",
  textLight: "#4A6B4A",
  textMuted: "#8A9F8A",

  critical: "#D32F2F",
  warning: "#F57C00",
  safe: "#2E7D32",

  fresh: "#4CAF50",
  ok: "#FFC107",
  expiring: "#FF9800",
  expired: "#F44336",

  white: "#FFFFFF",
  black: "#000000",
  gray100: "#F5F5F5",
  gray200: "#EEEEEE",
  gray300: "#E0E0E0",
  gray400: "#BDBDBD",
  gray500: "#9E9E9E",
  gray600: "#757575",

  primaryLight: "#E8F5E9",
  secondaryLight: "#FFF3E0",
  accentLight: "#E8EAF6",
  criticalLight: "#FFEBEE",
  warningLight: "#FFF8E1",
  safeLight: "#E8F5E9",
} as const;

export type ColorKey = keyof typeof Colors;

export const FreshnessColors = {
  fresh: Colors.fresh,
  ok: Colors.ok,
  expiring: Colors.expiring,
  expired: Colors.expired,
} as const;

export type FreshnessStatus = keyof typeof FreshnessColors;

export const getFreshnessStatus = (daysUntilExpiry: number): FreshnessStatus => {
  if (daysUntilExpiry < 0) return "expired";
  if (daysUntilExpiry <= 2) return "expiring";
  if (daysUntilExpiry <= 5) return "ok";
  return "fresh";
};

export const getFreshnessLabel = (status: FreshnessStatus): string => {
  const labels: Record<FreshnessStatus, string> = {
    fresh: "Proaspăt",
    ok: "Bun",
    expiring: "Expiră curând",
    expired: "Expirat",
  };
  return labels[status];
};
