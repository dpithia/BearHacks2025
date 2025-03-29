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
import { useFonts } from "expo-font";

export default function HomeScreen() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [buddyName, setBuddyName] = useState<string>("");
  const [selectedEmoji, setSelectedEmoji] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState<boolean>(false);
  const { buddyState, isLoading: isBuddyLoading } = useBuddyState();

  const [fontsLoaded] = useFonts({
    Minecraft: require("../../assets/fonts/Minecraft.ttf"),
  });

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
  if (isLoading || isBuddyLoading || !fontsLoaded) {
    return <SplashScreen appName="BearBuddy" />;
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
      <Text style={styles.title}>CREATE YOUR BUDDY</Text>

      {/* Name input */}
      <TextInput
        style={styles.input}
        placeholder="ENTER BUDDY NAME"
        placeholderTextColor="#9E9E9E"
        value={buddyName}
        onChangeText={setBuddyName}
        maxLength={12}
      />

      {/* Emoji Grid */}
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
          {isCreating ? "CREATING..." : "CREATE"}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#66B288",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#000000",
    marginBottom: 24,
    fontFamily: "Minecraft",
  },
  input: {
    width: "100%",
    height: 40,
    backgroundColor: "#FFFFFF",
    borderWidth: 2,
    borderColor: "#000000",
    marginBottom: 24,
    padding: 8,
    fontFamily: "Minecraft",
    fontSize: 14,
    color: "#000000",
  },
  emojiGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: 24,
    width: "100%",
  },
  emojiContainer: {
    width: "48%",
    aspectRatio: 1,
    backgroundColor: "#FFFFFF",
    borderWidth: 2,
    borderColor: "#000000",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 10,
  },
  selectedEmojiContainer: {
    backgroundColor: "#E8E8E8",
  },
  emoji: {
    fontSize: 40,
  },
  createButton: {
    width: "100%",
    height: 50,
    backgroundColor: "#FFFFFF",
    borderWidth: 2,
    borderColor: "#000000",
    justifyContent: "center",
    alignItems: "center",
  },
  createButtonText: {
    color: "#000000",
    fontSize: 18,
    fontFamily: "Minecraft",
    fontWeight: "bold",
  },
  disabledButton: {
    opacity: 0.5,
  },
});
