import React from "react";
import { View, Text, ScrollView, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import NutritionSummary from "@/components/nutrition/NutritionSummary";
import { usePantryStore } from "@/stores/pantry.store";
import { Colors } from "@/constants/colors";

function StatCard({
  icon,
  label,
  value,
  color,
  bgColor,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: number;
  color: string;
  bgColor: string;
}) {
  return (
    <View className="flex-1 mx-1">
      <Card variant="elevated" padding="md">
        <View
          className="w-10 h-10 rounded-full items-center justify-center mb-2"
          style={{ backgroundColor: bgColor }}
        >
          <Ionicons name={icon} size={20} color={color} />
        </View>
        <Text className="text-2xl font-bold text-txt">{value}</Text>
        <Text className="text-xs text-gray-500 mt-0.5">{label}</Text>
      </Card>
    </View>
  );
}

export default function DashboardScreen() {
  const router = useRouter();
  const items = usePantryStore((s) => s.items);
  const getExpiringItems = usePantryStore((s) => s.getExpiringItems);
  const getExpiredItems = usePantryStore((s) => s.getExpiredItems);

  const totalItems = items.length;
  const expiringCount = getExpiringItems().length;
  const expiredCount = getExpiredItems().length;

  return (
    <SafeAreaView className="flex-1 bg-bg" edges={["top"]}>
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View className="px-5 pt-4 pb-3">
          <Text className="text-sm text-gray-500">Bun venit la</Text>
          <Text className="text-2xl font-bold text-txt">
            FridgeScan AI
          </Text>
        </View>

        {/* Stats */}
        <View className="flex-row px-4 mb-4">
          <StatCard
            icon="nutrition"
            label="Total produse"
            value={totalItems}
            color={Colors.primary}
            bgColor={Colors.primaryLight}
          />
          <StatCard
            icon="warning"
            label="Expiră curând"
            value={expiringCount}
            color={Colors.warning}
            bgColor={Colors.warningLight}
          />
          <StatCard
            icon="alert-circle"
            label="Expirate"
            value={expiredCount}
            color={Colors.critical}
            bgColor={Colors.criticalLight}
          />
        </View>

        {/* Nutrition Progress */}
        <View className="px-5 mb-4">
          <NutritionSummary
            calories={{ current: 0, target: 2000 }}
            protein={{ current: 0, target: 120 }}
            carbs={{ current: 0, target: 250 }}
            fat={{ current: 0, target: 65 }}
          />
        </View>

        {/* Quick Actions */}
        <View className="px-5 mb-4">
          <Text className="text-base font-bold text-txt mb-3">
            Acțiuni rapide
          </Text>
          <View className="flex-row">
            <View className="flex-1 mr-2">
              <Button
                title="Scanează"
                variant="primary"
                fullWidth
                icon={
                  <Ionicons name="camera" size={18} color="#FFFFFF" />
                }
                onPress={() => router.push("/(tabs)/scan")}
              />
            </View>
            <View className="flex-1 ml-2">
              <Button
                title="Adaugă manual"
                variant="outline"
                fullWidth
                icon={
                  <Ionicons name="add-circle-outline" size={18} color="#2D8B4E" />
                }
                onPress={() => router.push("/(tabs)/pantry")}
              />
            </View>
          </View>
        </View>

        {/* Recommended Recipe Placeholder */}
        <View className="px-5 mb-4">
          <Text className="text-base font-bold text-txt mb-3">
            Rețetă recomandată
          </Text>
          <Card variant="elevated" padding="lg">
            <View className="items-center py-4">
              <View className="w-16 h-16 rounded-full bg-primary/10 items-center justify-center mb-3">
                <Ionicons name="restaurant-outline" size={32} color={Colors.primary} />
              </View>
              <Text className="text-base font-semibold text-txt mb-1">
                Descoperă rețete personalizate
              </Text>
              <Text className="text-sm text-gray-500 text-center mb-4">
                Adaugă produse în inventar și primește rețete adaptate profilului tău medical
              </Text>
              <Button
                title="Vezi rețete"
                variant="secondary"
                size="sm"
                onPress={() => router.push("/(tabs)/recipes")}
              />
            </View>
          </Card>
        </View>

        {/* Expiring Soon Section */}
        {expiringCount > 0 && (
          <View className="px-5 mb-4">
            <Text className="text-base font-bold text-txt mb-3">
              Expiră curând
            </Text>
            {getExpiringItems()
              .slice(0, 3)
              .map((item) => (
                <Card
                  key={item.id}
                  className="mb-2"
                  variant="outlined"
                  padding="sm"
                >
                  <View className="flex-row items-center justify-between">
                    <View className="flex-row items-center flex-1">
                      <View className="w-8 h-8 rounded-full bg-expiring/10 items-center justify-center mr-3">
                        <Ionicons
                          name="time-outline"
                          size={16}
                          color={Colors.expiring}
                        />
                      </View>
                      <View>
                        <Text className="text-sm font-medium text-txt">
                          {item.name}
                        </Text>
                        <Text className="text-xs text-gray-500">
                          {item.quantity} {item.unit}
                        </Text>
                      </View>
                    </View>
                    <Text className="text-xs text-expiring font-medium">
                      {new Date(item.expiryDate).toLocaleDateString("ro-RO")}
                    </Text>
                  </View>
                </Card>
              ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
