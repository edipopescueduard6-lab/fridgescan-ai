import React from "react";
import { View, type ViewProps } from "react-native";

interface CardProps extends ViewProps {
  children: React.ReactNode;
  variant?: "default" | "elevated" | "outlined";
  padding?: "none" | "sm" | "md" | "lg";
}

const variantClasses: Record<string, string> = {
  default: "bg-white rounded-2xl shadow-sm",
  elevated: "bg-white rounded-2xl shadow-md",
  outlined: "bg-white rounded-2xl border border-gray-200",
};

const paddingClasses: Record<string, string> = {
  none: "",
  sm: "p-3",
  md: "p-4",
  lg: "p-6",
};

export default function Card({
  children,
  variant = "default",
  padding = "md",
  className,
  ...props
}: CardProps) {
  return (
    <View
      className={`
        ${variantClasses[variant]}
        ${paddingClasses[padding]}
        ${className || ""}
      `}
      {...props}
    >
      {children}
    </View>
  );
}
