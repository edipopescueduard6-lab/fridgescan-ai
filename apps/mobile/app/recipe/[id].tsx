import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import NutritionSummary from "@/components/nutrition/NutritionSummary";
import MedicalWarning from "@/components/medical/MedicalWarning";
import Disclaimer from "@/components/medical/Disclaimer";
import { Colors } from "@/constants/colors";
import api from "@/services/api";

interface RecipeIngredient {
  name: string;
  amount: string;
  available: boolean;
}

interface RecipeStep {
  number: number;
  instruction: string;
  duration?: number; // minutes
}

interface RecipeDetail {
  id: string;
  name: string;
  description: string;
  time: number;
  servings: number;
  difficulty: "ușor" | "mediu" | "dificil";
  tags: string[];
  ingredients: RecipeIngredient[];
  steps: RecipeStep[];
  nutrition: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    fiber: number;
    sodium: number;
  };
  warnings: Array<{
    severity: "high" | "medium" | "low";
    title: string;
    message: string;
  }>;
  storage: {
    fridge: string;
    freezer: string;
    tips: string;
  };
}

// Mock data
const MOCK_RECIPE: RecipeDetail = {
  id: "r1",
  name: "Omletă cu legume și brânză",
  description:
    "O omletă pufoasă și nutritivă cu legume proaspete din frigider și brânză telemea, perfectă pentru un mic dejun sănătos.",
  time: 15,
  servings: 2,
  difficulty: "ușor",
  tags: ["Mic dejun", "Proteic", "Rapid", "Fără gluten"],
  ingredients: [
    { name: "Ouă", amount: "3 bucăți", available: true },
    { name: "Roșii", amount: "1 medie", available: true },
    { name: "Ardei gras", amount: "1/2 bucată", available: false },
    { name: "Brânză telemea", amount: "50g", available: true },
    { name: "Lapte", amount: "30ml", available: true },
    { name: "Ulei de măsline", amount: "1 lingură", available: false },
    { name: "Sare și piper", amount: "după gust", available: true },
    { name: "Pătrunjel", amount: "1 legătură mică", available: false },
  ],
  steps: [
    {
      number: 1,
      instruction:
        "Bate ouăle într-un castron cu laptele, sarea și piperul până obții un amestec omogen.",
      duration: 2,
    },
    {
      number: 2,
      instruction:
        "Taie roșiile și ardeiul gras în cubulețe mici. Mărunțește pătrunjelul.",
      duration: 3,
    },
    {
      number: 3,
      instruction:
        "Încinge o tigaie antiaderentă la foc mediu cu ulei de măsline.",
      duration: 1,
    },
    {
      number: 4,
      instruction:
        "Adaugă legumele tăiate și călește-le 2 minute până se înmoaie ușor.",
      duration: 2,
    },
    {
      number: 5,
      instruction:
        "Toarnă amestecul de ouă peste legume și lasă la foc mic. Adaugă brânza telemea sfărâmată.",
      duration: 4,
    },
    {
      number: 6,
      instruction:
        "Când omleta este gata pe o parte, pliaz-o în jumătate. Servește cu pătrunjel proaspăt.",
      duration: 3,
    },
  ],
  nutrition: {
    calories: 320,
    protein: 22,
    carbs: 8,
    fat: 24,
    fiber: 2,
    sodium: 580,
  },
  warnings: [
    {
      severity: "medium",
      title: "Conținut de sodiu moderat",
      message:
        "Această rețetă conține ~580mg sodiu per porție. Dacă aveți hipertensiune, reduceți cantitatea de brânză și sare.",
    },
    {
      severity: "low",
      title: "Informație nutrițională",
      message:
        "Rețeta este bogată în proteine și grăsimi sănătoase. Indicată pentru diete low-carb și keto.",
    },
  ],
  storage: {
    fridge: "Se păstrează la frigider maximum 24 de ore într-un recipient închis.",
    freezer: "Nu se recomandă congelarea omletei.",
    tips: "Se servește cel mai bine proaspăt preparată. Reîncălzirea la microunde este posibilă dar textura se modifică.",
  },
};

function StepTimer({ duration }: { duration: number }) {
  const [timeLeft, setTimeLeft] = useState(duration * 60);
  const [isRunning, setIsRunning] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (isRunning && timeLeft > 0) {
      intervalRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            setIsRunning(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isRunning, timeLeft]);

  const mins = Math.floor(timeLeft / 60);
  const secs = timeLeft % 60;

  return (
    <View className="flex-row items-center mt-2">
      <TouchableOpacity
        onPress={() => {
          if (timeLeft === 0) {
            setTimeLeft(duration * 60);
          }
          setIsRunning(!isRunning);
        }}
        className={`flex-row items-center px-3 py-1.5 rounded-full ${
          isRunning ? "bg-secondary/10" : "bg-primary/10"
        }`}
      >
        <Ionicons
          name={isRunning ? "pause" : "play"}
          size={14}
          color={isRunning ? Colors.secondary : Colors.primary}
        />
        <Text
          className={`text-xs font-bold ml-1 ${
            isRunning ? "text-secondary" : "text-primary"
          }`}
        >
          {String(mins).padStart(2, "0")}:{String(secs).padStart(2, "0")}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

export default function RecipeDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [recipe, setRecipe] = useState<RecipeDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"ingredients" | "steps">("ingredients");

  useEffect(() => {
    loadRecipe();
  }, [id]);

  const loadRecipe = async () => {
    setIsLoading(true);
    try {
      const data = await api.get<RecipeDetail>(`/recipes/${id}`);
      setRecipe(data);
    } catch {
      // Use mock data
      await new Promise((resolve) => setTimeout(resolve, 500));
      setRecipe(MOCK_RECIPE);
    }
    setIsLoading(false);
  };

  if (isLoading || !recipe) {
    return (
      <SafeAreaView className="flex-1 bg-bg items-center justify-center">
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text className="text-sm text-gray-500 mt-3">Se încarcă rețeta...</Text>
      </SafeAreaView>
    );
  }

  const difficultyVariant = {
    ușor: "fresh" as const,
    mediu: "ok" as const,
    dificil: "expiring" as const,
  };

  return (
    <SafeAreaView className="flex-1 bg-bg" edges={["top"]}>
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero gradient header */}
        <View className="bg-primary px-5 pt-4 pb-8 rounded-b-3xl">
          <TouchableOpacity
            onPress={() => router.back()}
            className="flex-row items-center mb-4"
          >
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
            <Text className="text-white text-sm font-medium ml-2">
              Înapoi la rețete
            </Text>
          </TouchableOpacity>

          <Text className="text-2xl font-bold text-white mb-2">
            {recipe.name}
          </Text>
          <Text className="text-sm text-white/80 mb-4">
            {recipe.description}
          </Text>

          <View className="flex-row items-center">
            <View className="flex-row items-center mr-4">
              <Ionicons name="time-outline" size={16} color="#FFFFFF" />
              <Text className="text-white text-sm ml-1">{recipe.time} min</Text>
            </View>
            <View className="flex-row items-center mr-4">
              <Ionicons name="people-outline" size={16} color="#FFFFFF" />
              <Text className="text-white text-sm ml-1">
                {recipe.servings} porții
              </Text>
            </View>
            <Badge
              label={recipe.difficulty}
              variant={difficultyVariant[recipe.difficulty]}
              size="md"
            />
          </View>

          {/* Tags */}
          <View className="flex-row flex-wrap mt-3">
            {recipe.tags.map((tag) => (
              <View
                key={tag}
                className="bg-white/20 px-3 py-1 rounded-full mr-2 mb-1"
              >
                <Text className="text-xs text-white font-medium">{tag}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Medical Warnings */}
        {recipe.warnings.length > 0 && (
          <View className="px-5 mt-4">
            {recipe.warnings.map((warning, index) => (
              <MedicalWarning
                key={index}
                severity={warning.severity}
                title={warning.title}
                message={warning.message}
              />
            ))}
          </View>
        )}

        {/* Tabs */}
        <View className="px-5 mt-4">
          <View className="flex-row bg-gray-100 rounded-xl p-1 mb-4">
            <TouchableOpacity
              onPress={() => setActiveTab("ingredients")}
              className={`flex-1 py-2.5 rounded-lg items-center ${
                activeTab === "ingredients" ? "bg-white shadow-sm" : ""
              }`}
            >
              <Text
                className={`text-sm font-medium ${
                  activeTab === "ingredients" ? "text-primary" : "text-gray-500"
                }`}
              >
                Ingrediente
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setActiveTab("steps")}
              className={`flex-1 py-2.5 rounded-lg items-center ${
                activeTab === "steps" ? "bg-white shadow-sm" : ""
              }`}
            >
              <Text
                className={`text-sm font-medium ${
                  activeTab === "steps" ? "text-primary" : "text-gray-500"
                }`}
              >
                Pași
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Tab content */}
        <View className="px-5">
          {activeTab === "ingredients" ? (
            <View>
              {recipe.ingredients.map((ingredient, index) => (
                <View
                  key={index}
                  className={`flex-row items-center py-3 ${
                    index < recipe.ingredients.length - 1
                      ? "border-b border-gray-100"
                      : ""
                  }`}
                >
                  <Ionicons
                    name={ingredient.available ? "checkmark-circle" : "ellipse-outline"}
                    size={20}
                    color={ingredient.available ? Colors.fresh : Colors.gray400}
                  />
                  <Text
                    className={`flex-1 text-sm ml-3 ${
                      ingredient.available ? "text-txt" : "text-gray-400"
                    }`}
                  >
                    {ingredient.name}
                  </Text>
                  <Text className="text-sm text-gray-500">
                    {ingredient.amount}
                  </Text>
                </View>
              ))}
              <Text className="text-xs text-gray-400 mt-3">
                {recipe.ingredients.filter((i) => i.available).length} din{" "}
                {recipe.ingredients.length} ingrediente disponibile în inventar
              </Text>
            </View>
          ) : (
            <View>
              {recipe.steps.map((step) => (
                <View key={step.number} className="flex-row mb-4">
                  <View className="w-8 h-8 rounded-full bg-primary items-center justify-center mr-3 mt-0.5">
                    <Text className="text-white text-sm font-bold">
                      {step.number}
                    </Text>
                  </View>
                  <View className="flex-1">
                    <Text className="text-sm text-txt leading-5">
                      {step.instruction}
                    </Text>
                    {step.duration && <StepTimer duration={step.duration} />}
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Nutrition Chart */}
        <View className="px-5 mt-6">
          <Text className="text-base font-bold text-txt mb-3">
            Informații nutriționale
          </Text>
          <NutritionSummary
            calories={{ current: recipe.nutrition.calories, target: 2000 }}
            protein={{ current: recipe.nutrition.protein, target: 120 }}
            carbs={{ current: recipe.nutrition.carbs, target: 250 }}
            fat={{ current: recipe.nutrition.fat, target: 65 }}
          />
          <View className="flex-row mt-3">
            <Card className="flex-1 mr-1" variant="outlined" padding="sm">
              <Text className="text-xs text-gray-500">Fibre</Text>
              <Text className="text-sm font-bold text-txt">
                {recipe.nutrition.fiber}g
              </Text>
            </Card>
            <Card className="flex-1 ml-1" variant="outlined" padding="sm">
              <Text className="text-xs text-gray-500">Sodiu</Text>
              <Text className="text-sm font-bold text-txt">
                {recipe.nutrition.sodium}mg
              </Text>
            </Card>
          </View>
        </View>

        {/* Storage Info */}
        <View className="px-5 mt-6">
          <Text className="text-base font-bold text-txt mb-3">
            Conservare
          </Text>
          <Card variant="outlined" padding="md">
            <View className="flex-row items-start mb-3">
              <Ionicons name="snow-outline" size={18} color={Colors.accent} />
              <View className="flex-1 ml-3">
                <Text className="text-xs font-medium text-gray-500">
                  Frigider
                </Text>
                <Text className="text-sm text-txt">{recipe.storage.fridge}</Text>
              </View>
            </View>
            <View className="flex-row items-start mb-3">
              <Ionicons name="cube-outline" size={18} color={Colors.accent} />
              <View className="flex-1 ml-3">
                <Text className="text-xs font-medium text-gray-500">
                  Congelator
                </Text>
                <Text className="text-sm text-txt">
                  {recipe.storage.freezer}
                </Text>
              </View>
            </View>
            <View className="flex-row items-start">
              <Ionicons
                name="bulb-outline"
                size={18}
                color={Colors.warning}
              />
              <View className="flex-1 ml-3">
                <Text className="text-xs font-medium text-gray-500">
                  Sfaturi
                </Text>
                <Text className="text-sm text-txt">{recipe.storage.tips}</Text>
              </View>
            </View>
          </Card>
        </View>

        {/* Disclaimer */}
        <View className="px-5">
          <Disclaimer />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
