import React from "react";
import { View, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SEVERITY_LEVELS, type SeverityLevel } from "@/constants/medical";

interface MedicalWarningProps {
  severity: SeverityLevel;
  title: string;
  message: string;
}

const severityBgClasses: Record<SeverityLevel, string> = {
  high: "bg-critical/10 border-critical/30",
  medium: "bg-warning/10 border-warning/30",
  low: "bg-accent/10 border-accent/30",
};

export default function MedicalWarning({
  severity,
  title,
  message,
}: MedicalWarningProps) {
  const config = SEVERITY_LEVELS[severity];

  return (
    <View
      className={`
        ${severityBgClasses[severity]}
        border rounded-xl p-4 mb-3
      `}
    >
      <View className="flex-row items-center mb-2">
        <Ionicons
          name={config.icon as any}
          size={22}
          color={config.color}
        />
        <Text
          className="text-sm font-bold ml-2 flex-1"
          style={{ color: config.color }}
        >
          {title}
        </Text>
        <View
          className="px-2 py-0.5 rounded-full"
          style={{ backgroundColor: config.color + "20" }}
        >
          <Text className="text-xs font-medium" style={{ color: config.color }}>
            {config.label}
          </Text>
        </View>
      </View>
      <Text className="text-sm text-txt leading-5">{message}</Text>
    </View>
  );
}
