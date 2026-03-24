import React from "react";
import { View, Text } from "react-native";

interface CameraOverlayProps {
  message?: string;
}

export default function CameraOverlay({
  message = "Încadrează frigiderul în chenar",
}: CameraOverlayProps) {
  return (
    <View className="absolute inset-0 items-center justify-center">
      {/* Top dark overlay */}
      <View className="absolute top-0 left-0 right-0 h-[20%] bg-black/50" />
      {/* Bottom dark overlay */}
      <View className="absolute bottom-0 left-0 right-0 h-[20%] bg-black/50" />
      {/* Left dark overlay */}
      <View className="absolute top-[20%] left-0 w-[10%] h-[60%] bg-black/50" />
      {/* Right dark overlay */}
      <View className="absolute top-[20%] right-0 w-[10%] h-[60%] bg-black/50" />

      {/* Guide rectangle */}
      <View className="w-[80%] h-[60%] border-2 border-white rounded-3xl">
        {/* Corner accents - top left */}
        <View className="absolute -top-0.5 -left-0.5 w-8 h-8 border-t-4 border-l-4 border-primary rounded-tl-3xl" />
        {/* Corner accents - top right */}
        <View className="absolute -top-0.5 -right-0.5 w-8 h-8 border-t-4 border-r-4 border-primary rounded-tr-3xl" />
        {/* Corner accents - bottom left */}
        <View className="absolute -bottom-0.5 -left-0.5 w-8 h-8 border-b-4 border-l-4 border-primary rounded-bl-3xl" />
        {/* Corner accents - bottom right */}
        <View className="absolute -bottom-0.5 -right-0.5 w-8 h-8 border-b-4 border-r-4 border-primary rounded-br-3xl" />
      </View>

      {/* Instruction text */}
      <View className="absolute bottom-[22%] bg-black/60 px-6 py-3 rounded-full">
        <Text className="text-white text-sm font-medium text-center">
          {message}
        </Text>
      </View>
    </View>
  );
}
