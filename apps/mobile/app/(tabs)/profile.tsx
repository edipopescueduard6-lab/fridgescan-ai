import React from "react";
import { View, Text, ScrollView, TouchableOpacity, Switch, TextInput } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Chip from "@/components/ui/Chip";
import Button from "@/components/ui/Button";
import Disclaimer from "@/components/medical/Disclaimer";
import { useUserStore } from "@/stores/user.store";
import { useAuthStore } from "@/stores/auth.store";
import {
  ALLERGY_OPTIONS,
  MEDICAL_CONDITIONS,
  DIET_PREFERENCES,
  ACTIVITY_LEVELS,
  COMMON_MEDICATIONS,
} from "@/constants/medical";
import { Colors } from "@/constants/colors";

export default function ProfileScreen() {
  const profile = useUserStore((s) => s.profile);
  const updateProfile = useUserStore((s) => s.updateProfile);
  const toggleAllergy = useUserStore((s) => s.toggleAllergy);
  const toggleCondition = useUserStore((s) => s.toggleCondition);
  const toggleDiet = useUserStore((s) => s.toggleDiet);
  const addMedication = useUserStore((s) => s.addMedication);
  const removeMedication = useUserStore((s) => s.removeMedication);
  const calculateBMR = useUserStore((s) => s.calculateBMR);
  const calculateTDEE = useUserStore((s) => s.calculateTDEE);
  const logout = useAuthStore((s) => s.logout);

  const bmr = calculateBMR();
  const tdee = calculateTDEE();

  const [medInput, setMedInput] = React.useState("");

  return (
    <SafeAreaView className="flex-1 bg-bg" edges={["top"]}>
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View className="px-5 pt-4 pb-3">
          <Text className="text-2xl font-bold text-txt">Profilul meu</Text>
          <Text className="text-sm text-gray-500">
            Date personale și preferințe alimentare
          </Text>
        </View>

        {/* Personal Data */}
        <View className="px-5 mb-4">
          <Card variant="elevated" padding="md">
            <Text className="text-base font-bold text-txt mb-3">
              Date personale
            </Text>

            <Input
              label="Nume"
              placeholder="Numele tău"
              value={profile.name}
              onChangeText={(text) => updateProfile({ name: text })}
            />

            <View className="flex-row">
              <View className="flex-1 mr-2">
                <Input
                  label="Vârstă"
                  placeholder="30"
                  value={profile.age ? String(profile.age) : ""}
                  onChangeText={(text) => {
                    const num = parseInt(text, 10);
                    updateProfile({ age: isNaN(num) ? null : num });
                  }}
                  keyboardType="numeric"
                />
              </View>
              <View className="flex-1 ml-2">
                <Text className="text-txt text-sm font-medium mb-1.5">Sex</Text>
                <View className="flex-row">
                  <TouchableOpacity
                    onPress={() => updateProfile({ sex: "masculin" })}
                    className={`flex-1 py-3 rounded-l-xl border items-center ${
                      profile.sex === "masculin"
                        ? "bg-primary border-primary"
                        : "bg-white border-gray-300"
                    }`}
                  >
                    <Text
                      className={`text-sm font-medium ${
                        profile.sex === "masculin" ? "text-white" : "text-txt"
                      }`}
                    >
                      M
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => updateProfile({ sex: "feminin" })}
                    className={`flex-1 py-3 rounded-r-xl border-t border-b border-r items-center ${
                      profile.sex === "feminin"
                        ? "bg-primary border-primary"
                        : "bg-white border-gray-300"
                    }`}
                  >
                    <Text
                      className={`text-sm font-medium ${
                        profile.sex === "feminin" ? "text-white" : "text-txt"
                      }`}
                    >
                      F
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            <View className="flex-row">
              <View className="flex-1 mr-2">
                <Input
                  label="Greutate (kg)"
                  placeholder="70"
                  value={profile.weight ? String(profile.weight) : ""}
                  onChangeText={(text) => {
                    const num = parseFloat(text);
                    updateProfile({ weight: isNaN(num) ? null : num });
                  }}
                  keyboardType="decimal-pad"
                />
              </View>
              <View className="flex-1 ml-2">
                <Input
                  label="Înălțime (cm)"
                  placeholder="175"
                  value={profile.height ? String(profile.height) : ""}
                  onChangeText={(text) => {
                    const num = parseFloat(text);
                    updateProfile({ height: isNaN(num) ? null : num });
                  }}
                  keyboardType="decimal-pad"
                />
              </View>
            </View>

            {/* Activity Level */}
            <Text className="text-txt text-sm font-medium mb-2">
              Nivel de activitate
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              className="mb-4"
            >
              {ACTIVITY_LEVELS.map((level) => (
                <TouchableOpacity
                  key={level.id}
                  onPress={() => updateProfile({ activityLevel: level.id })}
                  className={`px-4 py-2.5 rounded-xl mr-2 border ${
                    profile.activityLevel === level.id
                      ? "bg-primary border-primary"
                      : "bg-white border-gray-300"
                  }`}
                >
                  <Text
                    className={`text-sm font-medium ${
                      profile.activityLevel === level.id
                        ? "text-white"
                        : "text-txt"
                    }`}
                  >
                    {level.label}
                  </Text>
                  <Text
                    className={`text-xs mt-0.5 ${
                      profile.activityLevel === level.id
                        ? "text-white/70"
                        : "text-gray-400"
                    }`}
                  >
                    {level.description}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Pregnancy */}
            {profile.sex === "feminin" && (
              <View className="flex-row items-center justify-between py-2 mb-2">
                <Text className="text-sm text-txt font-medium">Sarcină</Text>
                <Switch
                  value={profile.isPregnant}
                  onValueChange={(val) => updateProfile({ isPregnant: val })}
                  trackColor={{ false: Colors.gray300, true: Colors.primaryLight }}
                  thumbColor={profile.isPregnant ? Colors.primary : Colors.gray400}
                />
              </View>
            )}

            {/* BMR/TDEE Display */}
            {bmr && tdee && (
              <View className="bg-primary/5 rounded-xl p-4 mt-2">
                <Text className="text-sm font-bold text-primary mb-2">
                  Necesar caloric estimat
                </Text>
                <View className="flex-row">
                  <View className="flex-1">
                    <Text className="text-xs text-gray-500">BMR (bazal)</Text>
                    <Text className="text-lg font-bold text-txt">
                      {bmr} kcal
                    </Text>
                  </View>
                  <View className="flex-1">
                    <Text className="text-xs text-gray-500">TDEE (zilnic)</Text>
                    <Text className="text-lg font-bold text-primary">
                      {tdee} kcal
                    </Text>
                  </View>
                </View>
              </View>
            )}
          </Card>
        </View>

        {/* Allergies */}
        <View className="px-5 mb-4">
          <Card variant="elevated" padding="md">
            <View className="flex-row items-center mb-3">
              <Ionicons name="alert-circle-outline" size={20} color={Colors.critical} />
              <Text className="text-base font-bold text-txt ml-2">
                Alergii
              </Text>
            </View>
            <View className="flex-row flex-wrap">
              {ALLERGY_OPTIONS.map((allergy) => (
                <Chip
                  key={allergy.id}
                  label={allergy.label}
                  selected={profile.allergies.includes(allergy.id)}
                  onPress={() => toggleAllergy(allergy.id)}
                />
              ))}
            </View>
          </Card>
        </View>

        {/* Medical Conditions */}
        <View className="px-5 mb-4">
          <Card variant="elevated" padding="md">
            <View className="flex-row items-center mb-3">
              <Ionicons name="medical-outline" size={20} color={Colors.warning} />
              <Text className="text-base font-bold text-txt ml-2">
                Condiții medicale
              </Text>
            </View>
            {MEDICAL_CONDITIONS.map((condition) => (
              <TouchableOpacity
                key={condition.id}
                onPress={() => toggleCondition(condition.id)}
                className={`flex-row items-center p-3 rounded-xl mb-2 border ${
                  profile.medicalConditions.includes(condition.id)
                    ? "bg-warning/10 border-warning/30"
                    : "bg-white border-gray-200"
                }`}
              >
                <Ionicons
                  name={
                    profile.medicalConditions.includes(condition.id)
                      ? "checkbox"
                      : "square-outline"
                  }
                  size={22}
                  color={
                    profile.medicalConditions.includes(condition.id)
                      ? Colors.warning
                      : Colors.gray400
                  }
                />
                <View className="flex-1 ml-3">
                  <Text className="text-sm font-medium text-txt">
                    {condition.label}
                  </Text>
                  <Text className="text-xs text-gray-500 mt-0.5">
                    {condition.description}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </Card>
        </View>

        {/* Diet Preferences */}
        <View className="px-5 mb-4">
          <Card variant="elevated" padding="md">
            <View className="flex-row items-center mb-3">
              <Ionicons name="leaf-outline" size={20} color={Colors.primary} />
              <Text className="text-base font-bold text-txt ml-2">
                Preferințe alimentare
              </Text>
            </View>
            <View className="flex-row flex-wrap">
              {DIET_PREFERENCES.map((diet) => (
                <Chip
                  key={diet.id}
                  label={diet.label}
                  selected={profile.dietPreferences.includes(diet.id)}
                  onPress={() => toggleDiet(diet.id)}
                />
              ))}
            </View>
          </Card>
        </View>

        {/* Medications */}
        <View className="px-5 mb-4">
          <Card variant="elevated" padding="md">
            <View className="flex-row items-center mb-3">
              <Ionicons name="medkit-outline" size={20} color={Colors.accent} />
              <Text className="text-base font-bold text-txt ml-2">
                Medicamente
              </Text>
            </View>

            {/* Current medications */}
            {profile.medications.length > 0 && (
              <View className="mb-3">
                {profile.medications.map((med) => (
                  <View
                    key={med}
                    className="flex-row items-center justify-between bg-accent/5 p-3 rounded-xl mb-1.5"
                  >
                    <Text className="text-sm text-txt">{med}</Text>
                    <TouchableOpacity onPress={() => removeMedication(med)}>
                      <Ionicons name="close-circle" size={20} color={Colors.gray500} />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}

            {/* Add medication */}
            <View className="flex-row items-center">
              <View className="flex-1 mr-2">
                <TextInput
                  className="bg-white border border-gray-300 rounded-xl px-4 py-3 text-txt text-sm"
                  placeholder="Adaugă medicament..."
                  placeholderTextColor="#8A9F8A"
                  value={medInput}
                  onChangeText={setMedInput}
                />
              </View>
              <TouchableOpacity
                onPress={() => {
                  if (medInput.trim()) {
                    addMedication(medInput.trim());
                    setMedInput("");
                  }
                }}
                className="w-12 h-12 rounded-xl bg-accent items-center justify-center"
              >
                <Ionicons name="add" size={24} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            {/* Common medications suggestions */}
            <Text className="text-xs text-gray-400 mt-3 mb-2">
              Medicamente comune:
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {COMMON_MEDICATIONS.filter(
                (m) => !profile.medications.includes(m)
              ).map((med) => (
                <TouchableOpacity
                  key={med}
                  onPress={() => addMedication(med)}
                  className="bg-gray-100 px-3 py-1.5 rounded-full mr-2"
                >
                  <Text className="text-xs text-gray-600">{med}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </Card>
        </View>

        <View className="px-5 mb-4">
          <Disclaimer />
        </View>

        {/* Logout */}
        <View className="px-5 mt-2">
          <Button
            title="Deconectare"
            variant="outline"
            fullWidth
            icon={<Ionicons name="log-out-outline" size={18} color={Colors.primary} />}
            onPress={logout}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
