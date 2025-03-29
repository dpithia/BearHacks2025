import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import SplashScreen from "../../components/SplashScreen";
import { saveBuddyState } from "../../services/buddyService";
import { useBuddyState } from "../../hooks/useBuddyState";

export default function HomeScreen() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [buddyName, setBuddyName] = useState<string>("");
  const [selectedEmoji, setSelectedEmoji] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState<boolean>(false);
  const { buddyState, isLoading: isBuddyLoading } = useBuddyState();

  // Emoji options
  const emojiOptions = ["🐻", "🐼", "🐨", "🦊"];

  // Check if buddy exists and redirect if needed
  useEffect(() => {
    if (!isBuddyLoading && buddyState) {
      console.warn("[HomeScreen] Buddy already exists, redirecting");
      router.replace("/(tabs)/buddy");
    }
  }, [isBuddyLoading, buddyState, router]);

  // Show loading state
  if (isLoading || isBuddyLoading) {
    return <SplashScreen />;
  }

  // If buddy exists, don't show creation screen
  if (buddyState) {
    return null;
  }

  // Handle emoji selection
  const handleEmojiSelect = (emoji: string) => {
    setSelectedEmoji(emoji);
  };

  // Handle buddy creation
  const handleCreateBuddy = async () => {
    if (!buddyName || !selectedEmoji || isCreating) return;

    try {
      setIsCreating(true);
      console.warn("[HomeScreen] Creating new buddy:", {
        buddyName,
        selectedEmoji,
      });

      // Create buddy in Supabase
      await saveBuddyState({
        name: buddyName,
        imageUrl: selectedEmoji,
        hp: 100,
        energy: 100,
        steps: 0,
        lastUpdated: new Date().toISOString(),
        lastFed: null,
        lastDrank: null,
        isSleeping: false,
        sleepStartTime: null,
        totalSleepHours: 0,
        lastSleepDate: null,
        waterConsumed: 0,
      });

      console.warn(
        "[HomeScreen] Buddy created successfully, navigating to buddy screen"
      );
      // Navigate to buddy screen
      router.replace("/(tabs)/buddy");
    } catch (error) {
      console.error("[HomeScreen] Error creating buddy:", error);
      Alert.alert("Error", "Failed to create buddy. Please try again.");
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Create Your Buddy</Text>

      {/* Name input */}
      <TextInput
        style={styles.input}
        placeholder="Enter buddy name"
        placeholderTextColor="#A1887F"
        value={buddyName}
        onChangeText={setBuddyName}
      />

      {/* 2x2 Emoji Grid */}
      <View style={styles.emojiGrid}>
        {emojiOptions.map((emoji, index) => (
          <TouchableOpacity
            key={index}
            style={[
              styles.emojiContainer,
              selectedEmoji === emoji && styles.selectedEmojiContainer,
            ]}
            onPress={() => handleEmojiSelect(emoji)}
          >
            <Text style={styles.emoji}>{emoji}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Create Button */}
      <TouchableOpacity
        style={[
          styles.createButton,
          (!buddyName || !selectedEmoji || isCreating) && styles.disabledButton,
        ]}
        disabled={!buddyName || !selectedEmoji || isCreating}
        onPress={handleCreateBuddy}
      >
        <Text style={styles.createButtonText}>
          {isCreating ? "Creating..." : "Create"}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFF8E1",
    alignItems: "center",
    paddingTop: 200,
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#5D4037",
    marginBottom: 30,
  },
  input: {
    width: "100%",
    backgroundColor: "white",
    borderWidth: 2,
    borderColor: "#FF8F00",
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
    color: "#5D4037",
    marginBottom: 30,
  },
  emojiGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    width: "100%",
    marginBottom: 40,
  },
  emojiContainer: {
    width: "45%",
    aspectRatio: 1,
    backgroundColor: "#FFD54F",
    margin: "2.5%",
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#FFA000",
  },
  selectedEmojiContainer: {
    backgroundColor: "#FFA000",
    borderColor: "#FF6F00",
    transform: [{ scale: 1.05 }],
  },
  emoji: {
    fontSize: 60,
  },
  createButton: {
    backgroundColor: "#FFA000",
    paddingVertical: 14,
    paddingHorizontal: 50,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "#FF8F00",
  },
  createButtonText: {
    color: "#5D4037",
    fontSize: 18,
    fontWeight: "bold",
  },
  disabledButton: {
    backgroundColor: "#E0E0E0",
    borderColor: "#BDBDBD",
    opacity: 0.7,
  },
});
