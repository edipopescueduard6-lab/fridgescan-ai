import React, { useState } from "react";
import { View, Text, TouchableOpacity, Dimensions } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import Input from "@/components/ui/Input";
import Chip from "@/components/ui/Chip";
import Button from "@/components/ui/Button";
import { useUserStore } from "@/stores/user.store";
import { ALLERGY_OPTIONS } from "@/constants/medical";
import { Colors } from "@/constants/colors";

const { width } = Dimensions.get("window");

const TOTAL_STEPS = 4;

export default function OnboardingScreen() {
  const router = useRouter();
  const [step, setStep] = useState(0);

  const profile = useUserStore((s) => s.profile);
  const updateProfile = useUserStore((s) => s.updateProfile);
  const toggleAllergy = useUserStore((s) => s.toggleAllergy);

  const handleNext = () => {
    if (step < TOTAL_STEPS - 1) {
      setStep(step + 1);
    } else {
      updateProfile({ onboardingCompleted: true });
      router.replace("/(tabs)");
    }
  };

  const handleSkip = () => {
    updateProfile({ onboardingCompleted: true });
    router.replace("/(tabs)");
  };

  const renderStep = () => {
    switch (step) {
      case 0:
        return (
          <View className="flex-1 items-center justify-center px-8">
            <View className="w-28 h-28 rounded-full bg-primary/10 items-center justify-center mb-6">
              <Ionicons name="leaf" size={56} color={Colors.primary} />
            </View>
            <Text className="text-3xl font-bold text-txt text-center mb-3">
              FridgeScan AI
            </Text>
            <Text className="text-lg text-gray-500 text-center mb-2">
              Bun venit!
            </Text>
            <Text className="text-sm text-gray-400 text-center leading-5">
              Scanează-ți frigiderul, gestionează inventarul, primește rețete
              personalizate și monitorizează nutriția — totul adaptat profilului
              tău medical.
            </Text>
          </View>
        );

      case 1:
        return (
          <View className="flex-1 px-6 pt-8">
            <View className="items-center mb-6">
              <View className="w-16 h-16 rounded-full bg-accent/10 items-center justify-center mb-3">
                <Ionicons name="person-outline" size={32} color={Colors.accent} />
              </View>
              <Text className="text-xl font-bold text-txt text-center">
                Date personale
              </Text>
              <Text className="text-sm text-gray-500 text-center mt-1">
                Completează datele de bază pentru calcule nutriționale
              </Text>
            </View>

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
                <View className="flex-row mb-4">
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
                      Masculin
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
                      Feminin
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
          </View>
        );

      case 2:
        return (
          <View className="flex-1 px-6 pt-8">
            <View className="items-center mb-6">
              <View className="w-16 h-16 rounded-full bg-critical/10 items-center justify-center mb-3">
                <Ionicons
                  name="alert-circle-outline"
                  size={32}
                  color={Colors.critical}
                />
              </View>
              <Text className="text-xl font-bold text-txt text-center">
                Alergii alimentare
              </Text>
              <Text className="text-sm text-gray-500 text-center mt-1">
                Selectează alergiile tale pentru recomandări sigure
              </Text>
            </View>

            <View className="flex-row flex-wrap justify-center">
              {ALLERGY_OPTIONS.map((allergy) => (
                <Chip
                  key={allergy.id}
                  label={allergy.label}
                  selected={profile.allergies.includes(allergy.id)}
                  onPress={() => toggleAllergy(allergy.id)}
                />
              ))}
            </View>

            <Text className="text-xs text-gray-400 text-center mt-4">
              Poți modifica aceste setări oricând din pagina de Profil
            </Text>
          </View>
        );

      case 3:
        return (
          <View className="flex-1 items-center justify-center px-8">
            <View className="w-28 h-28 rounded-full bg-fresh/10 items-center justify-center mb-6">
              <Ionicons name="checkmark-circle" size={64} color={Colors.fresh} />
            </View>
            <Text className="text-2xl font-bold text-txt text-center mb-3">
              Ești pregătit!
            </Text>
            <Text className="text-sm text-gray-500 text-center leading-5 mb-4">
              Profilul tău a fost configurat. Acum poți scana frigiderul,
              gestiona inventarul și primi rețete personalizate.
            </Text>

            <View className="flex-row items-center bg-primary/5 rounded-xl p-4 w-full">
              <Ionicons name="camera-outline" size={24} color={Colors.primary} />
              <View className="flex-1 ml-3">
                <Text className="text-sm font-medium text-txt">
                  Primul pas
                </Text>
                <Text className="text-xs text-gray-500">
                  Scanează conținutul frigiderului tău
                </Text>
              </View>
            </View>
          </View>
        );

      default:
        return null;
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-bg">
      {/* Progress bar */}
      <View className="px-6 pt-4">
        <View className="flex-row">
          {Array.from({ length: TOTAL_STEPS }).map((_, index) => (
            <View
              key={index}
              className={`flex-1 h-1 rounded-full mx-0.5 ${
                index <= step ? "bg-primary" : "bg-gray-200"
              }`}
            />
          ))}
        </View>
      </View>

      {/* Step content */}
      {renderStep()}

      {/* Navigation buttons */}
      <View className="px-6 pb-8">
        <Button
          title={step === TOTAL_STEPS - 1 ? "Începe!" : "Continuă"}
          variant="primary"
          fullWidth
          size="lg"
          onPress={handleNext}
        />
        {step < TOTAL_STEPS - 1 && (
          <TouchableOpacity onPress={handleSkip} className="py-3 items-center">
            <Text className="text-sm text-gray-500 font-medium">
              Sari peste
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}
