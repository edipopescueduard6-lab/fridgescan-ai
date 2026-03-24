import React from "react";
import { TouchableOpacity, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";

interface ChipProps {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  icon?: keyof typeof Ionicons.glyphMap;
  disabled?: boolean;
}

export default function Chip({
  label,
  selected = false,
  onPress,
  icon,
  disabled = false,
}: ChipProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.7}
      className={`
        flex-row items-center
        px-4 py-2.5 rounded-full mr-2 mb-2
        border
        ${
          selected
            ? "bg-primary border-primary"
            : "bg-white border-gray-300"
        }
        ${disabled ? "opacity-50" : ""}
      `}
    >
      {icon && (
        <Ionicons
          name={icon}
          size={16}
          color={selected ? "#FFFFFF" : "#4A6B4A"}
          style={{ marginRight: 6 }}
        />
      )}
      <Text
        className={`
          text-sm font-medium
          ${selected ? "text-white" : "text-txt"}
        `}
      >
        {label}
      </Text>
      {selected && (
        <Ionicons
          name="checkmark"
          size={16}
          color="#FFFFFF"
          style={{ marginLeft: 6 }}
        />
      )}
    </TouchableOpacity>
  );
}
