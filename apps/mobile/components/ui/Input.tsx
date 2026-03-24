import React from "react";
import { View, Text, TextInput, type TextInputProps } from "react-native";

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
}

export default function Input({
  label,
  error,
  helperText,
  leftIcon,
  className,
  ...props
}: InputProps) {
  return (
    <View className={`mb-4 ${className || ""}`}>
      {label && (
        <Text className="text-txt text-sm font-medium mb-1.5">{label}</Text>
      )}
      <View
        className={`
          flex-row items-center
          bg-white rounded-xl border
          ${error ? "border-critical" : "border-gray-300"}
          px-4 py-3
        `}
      >
        {leftIcon && <View className="mr-3">{leftIcon}</View>}
        <TextInput
          className="flex-1 text-txt text-base"
          placeholderTextColor="#8A9F8A"
          {...props}
        />
      </View>
      {error && (
        <Text className="text-critical text-xs mt-1">{error}</Text>
      )}
      {helperText && !error && (
        <Text className="text-gray-500 text-xs mt-1">{helperText}</Text>
      )}
    </View>
  );
}
