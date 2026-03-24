import React from "react";
import { View, Text, FlatList, TouchableOpacity, TextInput } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { ScanResult } from "@/stores/scan.store";
import Card from "@/components/ui/Card";

interface ScanResultsProps {
  results: ScanResult[];
  onToggleSelection: (id: string) => void;
  onUpdateQuantity: (id: string, quantity: number) => void;
}

function ConfidenceBar({ confidence }: { confidence: number }) {
  const percentage = Math.round(confidence * 100);
  const color =
    confidence >= 0.8
      ? "bg-fresh"
      : confidence >= 0.5
        ? "bg-ok"
        : "bg-expiring";

  return (
    <View className="flex-row items-center mt-1">
      <View className="flex-1 h-1.5 bg-gray-200 rounded-full mr-2">
        <View
          className={`h-1.5 rounded-full ${color}`}
          style={{ width: `${percentage}%` }}
        />
      </View>
      <Text className="text-xs text-gray-500">{percentage}%</Text>
    </View>
  );
}

function ScanResultItem({
  item,
  onToggle,
  onUpdateQuantity,
}: {
  item: ScanResult;
  onToggle: () => void;
  onUpdateQuantity: (quantity: number) => void;
}) {
  return (
    <Card className="mb-2" variant="outlined" padding="sm">
      <View className="flex-row items-center">
        <TouchableOpacity onPress={onToggle} className="mr-3">
          <Ionicons
            name={item.selected ? "checkbox" : "square-outline"}
            size={24}
            color={item.selected ? "#2D8B4E" : "#BDBDBD"}
          />
        </TouchableOpacity>

        <View className="flex-1">
          <Text
            className={`text-base font-medium ${
              item.selected ? "text-txt" : "text-gray-400"
            }`}
          >
            {item.name}
          </Text>
          <Text className="text-xs text-gray-500 mt-0.5">
            {item.category}
          </Text>
          <ConfidenceBar confidence={item.confidence} />
        </View>

        <View className="flex-row items-center ml-3">
          <TouchableOpacity
            onPress={() => onUpdateQuantity(Math.max(0, item.quantity - 1))}
            className="w-8 h-8 bg-gray-100 rounded-full items-center justify-center"
          >
            <Ionicons name="remove" size={16} color="#757575" />
          </TouchableOpacity>
          <TextInput
            className="w-12 text-center text-base font-medium text-txt mx-1"
            value={String(item.quantity)}
            onChangeText={(text) => {
              const num = parseInt(text, 10);
              if (!isNaN(num) && num >= 0) onUpdateQuantity(num);
            }}
            keyboardType="numeric"
          />
          <TouchableOpacity
            onPress={() => onUpdateQuantity(item.quantity + 1)}
            className="w-8 h-8 bg-primary/10 rounded-full items-center justify-center"
          >
            <Ionicons name="add" size={16} color="#2D8B4E" />
          </TouchableOpacity>
          <Text className="text-xs text-gray-500 ml-1 w-6">
            {item.unit}
          </Text>
        </View>
      </View>
    </Card>
  );
}

export default function ScanResults({
  results,
  onToggleSelection,
  onUpdateQuantity,
}: ScanResultsProps) {
  const selectedCount = results.filter((r) => r.selected).length;

  return (
    <View className="flex-1">
      <View className="flex-row justify-between items-center mb-3">
        <Text className="text-lg font-bold text-txt">
          Produse detectate
        </Text>
        <Text className="text-sm text-gray-500">
          {selectedCount} / {results.length} selectate
        </Text>
      </View>

      <FlatList
        data={results}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <ScanResultItem
            item={item}
            onToggle={() => onToggleSelection(item.id)}
            onUpdateQuantity={(quantity) => onUpdateQuantity(item.id, quantity)}
          />
        )}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}
