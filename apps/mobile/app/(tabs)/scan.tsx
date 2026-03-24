import React, { useState, useRef, useEffect } from "react";
import { View, Text, TouchableOpacity, Alert, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { CameraView, useCameraPermissions } from "expo-camera";
import { Ionicons } from "@expo/vector-icons";
import CameraOverlay from "@/components/scanner/CameraOverlay";
import ScanResults from "@/components/scanner/ScanResults";
import Button from "@/components/ui/Button";
import { useScanStore } from "@/stores/scan.store";
import { usePantryStore } from "@/stores/pantry.store";
import { Colors } from "@/constants/colors";
import api from "@/services/api";

type FlashMode = "off" | "on";

// Mock scan results for demo
const MOCK_SCAN_RESULTS = [
  {
    id: "scan_1",
    name: "Lapte integral",
    quantity: 1,
    unit: "L",
    category: "Lactate",
    confidence: 0.95,
    selected: true,
    estimatedExpiry: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "scan_2",
    name: "Ouă",
    quantity: 10,
    unit: "buc",
    category: "Proteine",
    confidence: 0.88,
    selected: true,
    estimatedExpiry: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "scan_3",
    name: "Roșii",
    quantity: 4,
    unit: "buc",
    category: "Legume",
    confidence: 0.72,
    selected: true,
    estimatedExpiry: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "scan_4",
    name: "Piept de pui",
    quantity: 500,
    unit: "g",
    category: "Proteine",
    confidence: 0.67,
    selected: false,
    estimatedExpiry: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "scan_5",
    name: "Brânză telemea",
    quantity: 200,
    unit: "g",
    category: "Lactate",
    confidence: 0.81,
    selected: true,
    estimatedExpiry: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

export default function ScanScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [flash, setFlash] = useState<FlashMode>("off");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const cameraRef = useRef<CameraView>(null);

  const scanResults = useScanStore((s) => s.scanResults);
  const setScanResults = useScanStore((s) => s.setScanResults);
  const toggleResultSelection = useScanStore((s) => s.toggleResultSelection);
  const updateResultQuantity = useScanStore((s) => s.updateResultQuantity);
  const clearResults = useScanStore((s) => s.clearResults);
  const getSelectedResults = useScanStore((s) => s.getSelectedResults);

  const addItems = usePantryStore((s) => s.addItems);

  const handleCapture = async () => {
    if (!cameraRef.current) return;

    try {
      setIsAnalyzing(true);
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
        base64: false,
      });

      // Try to send to API, fall back to mock data
      try {
        const formData = new FormData();
        formData.append("image", {
          uri: photo?.uri,
          type: "image/jpeg",
          name: "fridge_scan.jpg",
        } as any);

        const results = await api.upload<typeof MOCK_SCAN_RESULTS>(
          "/scan/analyze",
          formData
        );
        setScanResults(results);
      } catch {
        // Use mock data if API is unavailable
        await new Promise((resolve) => setTimeout(resolve, 2000));
        setScanResults(MOCK_SCAN_RESULTS);
      }
    } catch (err) {
      Alert.alert("Eroare", "Nu s-a putut captura imaginea. Încearcă din nou.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleAddToInventory = () => {
    const selected = getSelectedResults();
    if (selected.length === 0) {
      Alert.alert("Atenție", "Selectează cel puțin un produs pentru a-l adăuga în inventar.");
      return;
    }

    const itemsToAdd = selected.map((r) => ({
      name: r.name,
      quantity: r.quantity,
      unit: r.unit,
      category: r.category as any,
      expiryDate: r.estimatedExpiry,
      confidence: r.confidence,
    }));

    addItems(itemsToAdd);
    clearResults();
    Alert.alert(
      "Succes",
      `${selected.length} produs${selected.length > 1 ? "e" : ""} adăugat${selected.length > 1 ? "e" : ""} în inventar.`
    );
  };

  // Show results view if we have scan results
  if (scanResults.length > 0) {
    return (
      <SafeAreaView className="flex-1 bg-bg" edges={["top"]}>
        <View className="flex-1 px-5 pt-4">
          {/* Header */}
          <View className="flex-row items-center justify-between mb-4">
            <TouchableOpacity
              onPress={clearResults}
              className="flex-row items-center"
            >
              <Ionicons name="arrow-back" size={24} color={Colors.text} />
              <Text className="text-base font-medium text-txt ml-2">
                Scanare nouă
              </Text>
            </TouchableOpacity>
          </View>

          {/* Results list */}
          <ScanResults
            results={scanResults}
            onToggleSelection={toggleResultSelection}
            onUpdateQuantity={updateResultQuantity}
          />

          {/* Add button */}
          <View className="py-4">
            <Button
              title="Adaugă în inventar"
              variant="primary"
              fullWidth
              size="lg"
              icon={<Ionicons name="add-circle" size={20} color="#FFFFFF" />}
              onPress={handleAddToInventory}
            />
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // Permission not granted yet
  if (!permission) {
    return (
      <SafeAreaView className="flex-1 bg-bg items-center justify-center">
        <ActivityIndicator size="large" color={Colors.primary} />
      </SafeAreaView>
    );
  }

  if (!permission.granted) {
    return (
      <SafeAreaView className="flex-1 bg-bg items-center justify-center px-8">
        <View className="w-20 h-20 rounded-full bg-primary/10 items-center justify-center mb-4">
          <Ionicons name="camera-outline" size={40} color={Colors.primary} />
        </View>
        <Text className="text-xl font-bold text-txt text-center mb-2">
          Acces la cameră necesar
        </Text>
        <Text className="text-sm text-gray-500 text-center mb-6">
          FridgeScan AI are nevoie de acces la cameră pentru a scana conținutul frigiderului tău.
        </Text>
        <Button
          title="Permite accesul la cameră"
          variant="primary"
          fullWidth
          onPress={requestPermission}
        />
      </SafeAreaView>
    );
  }

  // Analyzing overlay
  if (isAnalyzing) {
    return (
      <View className="flex-1 bg-black items-center justify-center">
        <View className="bg-white/90 rounded-3xl p-8 items-center mx-8">
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text className="text-lg font-bold text-txt mt-4 mb-1">
            Se analizează...
          </Text>
          <Text className="text-sm text-gray-500 text-center">
            AI-ul identifică produsele din frigider
          </Text>
        </View>
      </View>
    );
  }

  // Camera view
  return (
    <View className="flex-1 bg-black">
      <CameraView
        ref={cameraRef}
        className="flex-1"
        facing="back"
        flash={flash}
      >
        <CameraOverlay />

        {/* Top controls */}
        <SafeAreaView edges={["top"]}>
          <View className="flex-row justify-between items-center px-5 pt-2">
            <TouchableOpacity
              className="w-10 h-10 rounded-full bg-black/40 items-center justify-center"
              onPress={() => setFlash(flash === "off" ? "on" : "off")}
            >
              <Ionicons
                name={flash === "off" ? "flash-off" : "flash"}
                size={20}
                color="#FFFFFF"
              />
            </TouchableOpacity>
            <View className="bg-black/40 px-4 py-2 rounded-full">
              <Text className="text-white text-xs font-medium">
                FridgeScan AI
              </Text>
            </View>
            <View className="w-10" />
          </View>
        </SafeAreaView>

        {/* Bottom capture button */}
        <View className="absolute bottom-0 left-0 right-0 pb-12 items-center">
          <TouchableOpacity
            onPress={handleCapture}
            activeOpacity={0.7}
            className="w-20 h-20 rounded-full border-4 border-white items-center justify-center"
          >
            <View className="w-16 h-16 rounded-full bg-white" />
          </TouchableOpacity>
          <Text className="text-white text-xs mt-3 font-medium">
            Apasă pentru a scana
          </Text>
        </View>
      </CameraView>
    </View>
  );
}
