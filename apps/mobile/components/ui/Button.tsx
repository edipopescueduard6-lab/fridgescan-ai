import React from "react";
import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  type TouchableOpacityProps,
} from "react-native";

type ButtonVariant = "primary" | "secondary" | "outline" | "danger";

interface ButtonProps extends TouchableOpacityProps {
  title: string;
  variant?: ButtonVariant;
  isLoading?: boolean;
  fullWidth?: boolean;
  size?: "sm" | "md" | "lg";
  icon?: React.ReactNode;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary: "bg-primary",
  secondary: "bg-secondary",
  outline: "bg-transparent border-2 border-primary",
  danger: "bg-critical",
};

const variantTextClasses: Record<ButtonVariant, string> = {
  primary: "text-white",
  secondary: "text-white",
  outline: "text-primary",
  danger: "text-white",
};

const sizeClasses: Record<string, string> = {
  sm: "py-2 px-4",
  md: "py-3 px-6",
  lg: "py-4 px-8",
};

const sizeTextClasses: Record<string, string> = {
  sm: "text-sm",
  md: "text-base",
  lg: "text-lg",
};

export default function Button({
  title,
  variant = "primary",
  isLoading = false,
  fullWidth = false,
  size = "md",
  icon,
  disabled,
  className,
  ...props
}: ButtonProps) {
  const isDisabled = disabled || isLoading;

  return (
    <TouchableOpacity
      className={`
        ${variantClasses[variant]}
        ${sizeClasses[size]}
        ${fullWidth ? "w-full" : ""}
        rounded-xl flex-row items-center justify-center
        ${isDisabled ? "opacity-50" : ""}
        ${className || ""}
      `}
      disabled={isDisabled}
      activeOpacity={0.7}
      {...props}
    >
      {isLoading ? (
        <ActivityIndicator
          color={variant === "outline" ? "#2D8B4E" : "#FFFFFF"}
          size="small"
        />
      ) : (
        <>
          {icon && <>{icon}</>}
          <Text
            className={`
              ${variantTextClasses[variant]}
              ${sizeTextClasses[size]}
              font-semibold
              ${icon ? "ml-2" : ""}
            `}
          >
            {title}
          </Text>
        </>
      )}
    </TouchableOpacity>
  );
}
