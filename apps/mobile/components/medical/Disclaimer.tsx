import React from "react";
import { View, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { MEDICAL_DISCLAIMER } from "@/constants/medical";

interface DisclaimerProps {
  compact?: boolean;
}

export default function Disclaimer({ compact = false }: DisclaimerProps) {
  if (compact) {
    return (
      <View className="flex-row items-start bg-gray-50 rounded-lg p-3 mt-4">
        <Ionicons
          name="information-circle-outline"
          size={16}
          color="#9E9E9E"
          style={{ marginTop: 1 }}
        />
        <Text className="text-xs text-gray-400 ml-2 flex-1 leading-4">
          Informații cu caracter informativ. Consultați medicul.
        </Text>
      </View>
    );
  }

  return (
    <View className="bg-gray-50 border border-gray-200 rounded-xl p-4 mt-4">
      <View className="flex-row items-center mb-2">
        <Ionicons
          name="medical-outline"
          size={18}
          color="#9E9E9E"
        />
        <Text className="text-xs font-semibold text-gray-500 ml-2 uppercase tracking-wide">
          Disclaimer medical
        </Text>
      </View>
      <Text className="text-xs text-gray-400 leading-4">
        {MEDICAL_DISCLAIMER}
      </Text>
    </View>
  );
}
