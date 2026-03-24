import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Alert,
  Modal,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { FreshnessBadge } from "@/components/ui/Badge";
import { usePantryStore, type PantryItem } from "@/stores/pantry.store";
import { FOOD_CATEGORIES, type FoodCategory } from "@/constants/medical";
import { Colors, getFreshnessStatus } from "@/constants/colors";

function PantryItemCard({
  item,
  onDelete,
}: {
  item: PantryItem;
  onDelete: () => void;
}) {
  const daysUntilExpiry = Math.ceil(
    (new Date(item.expiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );
  const status = getFreshnessStatus(daysUntilExpiry);

  const expiryText =
    daysUntilExpiry < 0
      ? `Expirat de ${Math.abs(daysUntilExpiry)} zile`
      : daysUntilExpiry === 0
        ? "Expiră azi"
        : daysUntilExpiry === 1
          ? "Expiră mâine"
          : `Expiră în ${daysUntilExpiry} zile`;

  return (
    <Card className="mb-2" variant="outlined" padding="sm">
      <View className="flex-row items-center">
        <View className="flex-1">
          <View className="flex-row items-center mb-1">
            <Text className="text-base font-medium text-txt flex-1">
              {item.name}
            </Text>
            <FreshnessBadge status={status} />
          </View>
          <View className="flex-row items-center">
            <Text className="text-sm text-gray-500">
              {item.quantity} {item.unit}
            </Text>
            <Text className="text-xs text-gray-400 ml-3">{item.category}</Text>
          </View>
          <Text
            className={`text-xs mt-1 ${
              status === "expired" || status === "expiring"
                ? "text-expired font-medium"
                : "text-gray-400"
            }`}
          >
            {expiryText} ({new Date(item.expiryDate).toLocaleDateString("ro-RO")})
          </Text>
        </View>
        <TouchableOpacity
          onPress={onDelete}
          className="ml-3 w-10 h-10 rounded-full bg-critical/10 items-center justify-center"
        >
          <Ionicons name="trash-outline" size={18} color={Colors.critical} />
        </TouchableOpacity>
      </View>
    </Card>
  );
}

function AddItemModal({
  visible,
  onClose,
  onAdd,
}: {
  visible: boolean;
  onClose: () => void;
  onAdd: (item: Omit<PantryItem, "id" | "addedDate">) => void;
}) {
  const [name, setName] = useState("");
  const [quantity, setQuantity] = useState("");
  const [unit, setUnit] = useState("buc");
  const [category, setCategory] = useState<FoodCategory>("altele");
  const [expiryDays, setExpiryDays] = useState("7");

  const handleAdd = () => {
    if (!name.trim()) {
      Alert.alert("Eroare", "Introdu numele produsului.");
      return;
    }
    const qty = parseInt(quantity, 10);
    if (isNaN(qty) || qty <= 0) {
      Alert.alert("Eroare", "Introdu o cantitate validă.");
      return;
    }

    const days = parseInt(expiryDays, 10) || 7;
    const expiryDate = new Date(
      Date.now() + days * 24 * 60 * 60 * 1000
    ).toISOString();

    onAdd({
      name: name.trim(),
      quantity: qty,
      unit,
      category,
      expiryDate,
    });

    // Reset form
    setName("");
    setQuantity("");
    setUnit("buc");
    setCategory("altele");
    setExpiryDays("7");
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View className="flex-1 bg-black/50 justify-end">
        <View className="bg-bg rounded-t-3xl px-5 pt-6 pb-10">
          <View className="flex-row items-center justify-between mb-6">
            <Text className="text-xl font-bold text-txt">
              Adaugă produs
            </Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color={Colors.text} />
            </TouchableOpacity>
          </View>

          <Input
            label="Nume produs"
            placeholder="ex: Lapte, Ouă, Roșii..."
            value={name}
            onChangeText={setName}
          />

          <View className="flex-row">
            <View className="flex-1 mr-2">
              <Input
                label="Cantitate"
                placeholder="1"
                value={quantity}
                onChangeText={setQuantity}
                keyboardType="numeric"
              />
            </View>
            <View className="flex-1 ml-2">
              <Input
                label="Unitate"
                placeholder="buc"
                value={unit}
                onChangeText={setUnit}
              />
            </View>
          </View>

          <Text className="text-txt text-sm font-medium mb-2">Categorie</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            className="mb-4"
          >
            {FOOD_CATEGORIES.filter((c) => c.id !== "toate").map((cat) => (
              <TouchableOpacity
                key={cat.id}
                onPress={() => setCategory(cat.id)}
                className={`px-4 py-2 rounded-full mr-2 border ${
                  category === cat.id
                    ? "bg-primary border-primary"
                    : "bg-white border-gray-300"
                }`}
              >
                <Text
                  className={`text-sm font-medium ${
                    category === cat.id ? "text-white" : "text-txt"
                  }`}
                >
                  {cat.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <Input
            label="Zile până la expirare"
            placeholder="7"
            value={expiryDays}
            onChangeText={setExpiryDays}
            keyboardType="numeric"
          />

          <Button
            title="Adaugă în inventar"
            variant="primary"
            fullWidth
            size="lg"
            onPress={handleAdd}
          />
        </View>
      </View>
    </Modal>
  );
}

export default function PantryScreen() {
  const items = usePantryStore((s) => s.items);
  const removeItem = usePantryStore((s) => s.removeItem);
  const addItem = usePantryStore((s) => s.addItem);
  const selectedCategory = usePantryStore((s) => s.selectedCategory);
  const setCategory = usePantryStore((s) => s.setCategory);
  const [showAddModal, setShowAddModal] = useState(false);

  const filteredItems =
    selectedCategory === "toate"
      ? items
      : items.filter(
          (item) => item.category.toLowerCase() === selectedCategory.toLowerCase()
        );

  const handleDelete = useCallback(
    (item: PantryItem) => {
      Alert.alert(
        "Șterge produs",
        `Ești sigur că vrei să ștergi „${item.name}" din inventar?`,
        [
          { text: "Anulează", style: "cancel" },
          {
            text: "Șterge",
            style: "destructive",
            onPress: () => removeItem(item.id),
          },
        ]
      );
    },
    [removeItem]
  );

  return (
    <SafeAreaView className="flex-1 bg-bg" edges={["top"]}>
      {/* Header */}
      <View className="px-5 pt-4 pb-2">
        <Text className="text-2xl font-bold text-txt">Inventar</Text>
        <Text className="text-sm text-gray-500">
          {items.length} produse{items.length !== 1 ? "" : ""} în frigider
        </Text>
      </View>

      {/* Category filters */}
      <View className="px-5 mb-3">
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
        >
          {FOOD_CATEGORIES.map((cat) => (
            <TouchableOpacity
              key={cat.id}
              onPress={() => setCategory(cat.id)}
              className={`px-4 py-2 rounded-full mr-2 border ${
                selectedCategory === cat.id
                  ? "bg-primary border-primary"
                  : "bg-white border-gray-300"
              }`}
            >
              <Text
                className={`text-sm font-medium ${
                  selectedCategory === cat.id ? "text-white" : "text-txt"
                }`}
              >
                {cat.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Item list */}
      {filteredItems.length === 0 ? (
        <View className="flex-1 items-center justify-center px-8">
          <View className="w-20 h-20 rounded-full bg-primary/10 items-center justify-center mb-4">
            <Ionicons name="basket-outline" size={40} color={Colors.primary} />
          </View>
          <Text className="text-lg font-semibold text-txt text-center mb-2">
            Inventarul este gol
          </Text>
          <Text className="text-sm text-gray-500 text-center mb-6">
            Scanează frigiderul sau adaugă produse manual pentru a-ți gestiona inventarul.
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredItems}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <PantryItemCard
              item={item}
              onDelete={() => handleDelete(item)}
            />
          )}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* FAB */}
      <TouchableOpacity
        onPress={() => setShowAddModal(true)}
        activeOpacity={0.8}
        className="absolute bottom-6 right-5 w-14 h-14 rounded-full bg-primary items-center justify-center shadow-lg"
        style={{
          elevation: 8,
          shadowColor: Colors.primary,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.3,
          shadowRadius: 8,
        }}
      >
        <Ionicons name="add" size={28} color="#FFFFFF" />
      </TouchableOpacity>

      <AddItemModal
        visible={showAddModal}
        onClose={() => setShowAddModal(false)}
        onAdd={(item) => addItem(item)}
      />
    </SafeAreaView>
  );
}
