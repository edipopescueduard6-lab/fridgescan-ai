import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";

export interface RecipeCardData {
  id: string;
  name: string;
  time: number; // minutes
  difficulty: "ușor" | "mediu" | "dificil";
  tags: string[];
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  imageUrl?: string;
}

interface RecipeCardProps {
  recipe: RecipeCardData;
  onPress: (id: string) => void;
}

const difficultyVariant = {
  ușor: "fresh" as const,
  mediu: "ok" as const,
  dificil: "expiring" as const,
};

export default function RecipeCard({ recipe, onPress }: RecipeCardProps) {
  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={() => onPress(recipe.id)}
    >
      <Card className="mb-3" variant="elevated" padding="md">
        {/* Header */}
        <View className="flex-row items-start justify-between mb-2">
          <Text className="text-lg font-bold text-txt flex-1 mr-2" numberOfLines={2}>
            {recipe.name}
          </Text>
          <Badge label={recipe.difficulty} variant={difficultyVariant[recipe.difficulty]} />
        </View>

        {/* Time and calories */}
        <View className="flex-row items-center mb-3">
          <View className="flex-row items-center mr-4">
            <Ionicons name="time-outline" size={16} color="#757575" />
            <Text className="text-sm text-gray-600 ml-1">
              {recipe.time} min
            </Text>
          </View>
          <View className="flex-row items-center">
            <Ionicons name="flame-outline" size={16} color="#FF6B35" />
            <Text className="text-sm text-gray-600 ml-1">
              {recipe.calories} kcal
            </Text>
          </View>
        </View>

        {/* Macros mini */}
        <View className="flex-row mb-3">
          <View className="flex-row items-center mr-4">
            <View className="w-2 h-2 rounded-full bg-primary mr-1" />
            <Text className="text-xs text-gray-500">P: {recipe.protein}g</Text>
          </View>
          <View className="flex-row items-center mr-4">
            <View className="w-2 h-2 rounded-full bg-secondary mr-1" />
            <Text className="text-xs text-gray-500">C: {recipe.carbs}g</Text>
          </View>
          <View className="flex-row items-center">
            <View className="w-2 h-2 rounded-full bg-accent mr-1" />
            <Text className="text-xs text-gray-500">G: {recipe.fat}g</Text>
          </View>
        </View>

        {/* Tags */}
        <View className="flex-row flex-wrap">
          {recipe.tags.map((tag) => (
            <View key={tag} className="bg-gray-100 px-2.5 py-1 rounded-full mr-1.5 mb-1">
              <Text className="text-xs text-gray-600">{tag}</Text>
            </View>
          ))}
        </View>
      </Card>
    </TouchableOpacity>
  );
}
