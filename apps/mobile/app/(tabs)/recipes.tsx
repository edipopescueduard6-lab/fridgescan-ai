import React, { useState } from "react";
import { View, Text, FlatList, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import RecipeCard, { type RecipeCardData } from "@/components/recipe/RecipeCard";
import Button from "@/components/ui/Button";
import Disclaimer from "@/components/medical/Disclaimer";
import { usePantryStore } from "@/stores/pantry.store";
import { Colors } from "@/constants/colors";
import api from "@/services/api";

// Mock recipes for demo
const MOCK_RECIPES: RecipeCardData[] = [
  {
    id: "r1",
    name: "Omletă cu legume și brânză",
    time: 15,
    difficulty: "ușor",
    tags: ["Mic dejun", "Proteic", "Rapid"],
    calories: 320,
    protein: 22,
    carbs: 8,
    fat: 24,
  },
  {
    id: "r2",
    name: "Piept de pui la grătar cu salată",
    time: 30,
    difficulty: "mediu",
    tags: ["Prânz", "Low-carb", "Proteic"],
    calories: 450,
    protein: 42,
    carbs: 12,
    fat: 18,
  },
  {
    id: "r3",
    name: "Supă cremă de roșii cu brânză",
    time: 40,
    difficulty: "mediu",
    tags: ["Cină", "Vegetarian", "Reconfortant"],
    calories: 280,
    protein: 14,
    carbs: 32,
    fat: 12,
  },
  {
    id: "r4",
    name: "Salată rapidă cu ouă fierte",
    time: 10,
    difficulty: "ușor",
    tags: ["Gustare", "Rapid", "Ușor"],
    calories: 220,
    protein: 16,
    carbs: 6,
    fat: 15,
  },
  {
    id: "r5",
    name: "Paste integrale cu sos de roșii",
    time: 25,
    difficulty: "ușor",
    tags: ["Prânz", "Vegetarian", "Fibros"],
    calories: 380,
    protein: 14,
    carbs: 58,
    fat: 10,
  },
];

export default function RecipesScreen() {
  const router = useRouter();
  const items = usePantryStore((s) => s.items);
  const [recipes, setRecipes] = useState<RecipeCardData[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [hasGenerated, setHasGenerated] = useState(false);

  const handleGenerateRecipes = async () => {
    setIsGenerating(true);
    try {
      const ingredients = items.map((i) => ({
        name: i.name,
        quantity: i.quantity,
        unit: i.unit,
      }));
      const result = await api.post<RecipeCardData[]>("/recipes/generate", {
        ingredients,
      });
      setRecipes(result);
    } catch {
      // Use mock data if API unavailable
      await new Promise((resolve) => setTimeout(resolve, 1500));
      setRecipes(MOCK_RECIPES);
    }
    setHasGenerated(true);
    setIsGenerating(false);
  };

  const handleRecipePress = (id: string) => {
    router.push(`/recipe/${id}`);
  };

  return (
    <SafeAreaView className="flex-1 bg-bg" edges={["top"]}>
      {/* Header */}
      <View className="px-5 pt-4 pb-3">
        <Text className="text-2xl font-bold text-txt">Rețete</Text>
        <Text className="text-sm text-gray-500">
          Rețete generate din produsele tale
        </Text>
      </View>

      {/* Generate button */}
      <View className="px-5 mb-4">
        <Button
          title={hasGenerated ? "Regenerează rețete" : "Generează rețete din inventar"}
          variant="primary"
          fullWidth
          isLoading={isGenerating}
          icon={
            !isGenerating ? (
              <Ionicons name="sparkles" size={18} color="#FFFFFF" />
            ) : undefined
          }
          onPress={handleGenerateRecipes}
        />
        {items.length === 0 && (
          <Text className="text-xs text-warning text-center mt-2">
            Adaugă produse în inventar pentru rețete personalizate
          </Text>
        )}
      </View>

      {/* Loading */}
      {isGenerating && (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text className="text-base font-medium text-txt mt-4">
            Se generează rețete...
          </Text>
          <Text className="text-sm text-gray-500 mt-1">
            AI-ul analizează ingredientele tale
          </Text>
        </View>
      )}

      {/* Empty state */}
      {!isGenerating && recipes.length === 0 && (
        <View className="flex-1 items-center justify-center px-8">
          <View className="w-20 h-20 rounded-full bg-secondary/10 items-center justify-center mb-4">
            <Ionicons
              name="restaurant-outline"
              size={40}
              color={Colors.secondary}
            />
          </View>
          <Text className="text-lg font-semibold text-txt text-center mb-2">
            {hasGenerated ? "Nicio rețetă găsită" : "Descoperă rețete noi"}
          </Text>
          <Text className="text-sm text-gray-500 text-center">
            {hasGenerated
              ? "Adaugă mai multe ingrediente și încearcă din nou."
              : "Apasă butonul de mai sus pentru a genera rețete bazate pe produsele din inventar."}
          </Text>
        </View>
      )}

      {/* Recipe list */}
      {!isGenerating && recipes.length > 0 && (
        <FlatList
          data={recipes}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <RecipeCard recipe={item} onPress={handleRecipePress} />
          )}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 32 }}
          showsVerticalScrollIndicator={false}
          ListFooterComponent={<Disclaimer compact />}
        />
      )}
    </SafeAreaView>
  );
}
