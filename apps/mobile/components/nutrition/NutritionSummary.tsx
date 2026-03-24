import React from "react";
import { View, Text } from "react-native";
import Card from "@/components/ui/Card";

interface MacroInfo {
  label: string;
  current: number;
  target: number;
  unit: string;
  color: string;
}

interface NutritionSummaryProps {
  calories: { current: number; target: number };
  protein: { current: number; target: number };
  carbs: { current: number; target: number };
  fat: { current: number; target: number };
}

function MacroBar({ macro }: { macro: MacroInfo }) {
  const percentage = Math.min((macro.current / macro.target) * 100, 100);

  return (
    <View className="mb-3">
      <View className="flex-row justify-between items-center mb-1">
        <Text className="text-sm font-medium text-txt">{macro.label}</Text>
        <Text className="text-xs text-gray-500">
          {macro.current} / {macro.target} {macro.unit}
        </Text>
      </View>
      <View className="h-2.5 bg-gray-200 rounded-full overflow-hidden">
        <View
          className="h-2.5 rounded-full"
          style={{
            width: `${percentage}%`,
            backgroundColor: macro.color,
          }}
        />
      </View>
      <Text className="text-xs text-gray-400 mt-0.5 text-right">
        {Math.round(percentage)}%
      </Text>
    </View>
  );
}

export default function NutritionSummary({
  calories,
  protein,
  carbs,
  fat,
}: NutritionSummaryProps) {
  const macros: MacroInfo[] = [
    {
      label: "Calorii",
      current: calories.current,
      target: calories.target,
      unit: "kcal",
      color: "#FF6B35",
    },
    {
      label: "Proteine",
      current: protein.current,
      target: protein.target,
      unit: "g",
      color: "#2D8B4E",
    },
    {
      label: "Carbohidrați",
      current: carbs.current,
      target: carbs.target,
      unit: "g",
      color: "#5C6BC0",
    },
    {
      label: "Grăsimi",
      current: fat.current,
      target: fat.target,
      unit: "g",
      color: "#F57C00",
    },
  ];

  return (
    <Card variant="elevated" padding="md">
      <Text className="text-base font-bold text-txt mb-3">
        Progres nutrițional zilnic
      </Text>
      {macros.map((macro) => (
        <MacroBar key={macro.label} macro={macro} />
      ))}
    </Card>
  );
}
