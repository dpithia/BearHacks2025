import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Pressable,
} from "react-native";
import { useRouter } from "expo-router";
import SplashScreen from "../../components/SplashScreen";

export default function HomeScreen() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [buddyName, setBuddyName] = useState<string>("");
  const [selectedEmoji, setSelectedEmoji] = useState<string | null>(null);

  // Emoji options
  const emojiOptions = ["🐻", "🐼", "🐨", "🦊"];

  // Simulate loading time
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 3000); // Show splash screen for 3 seconds

    return () => clearTimeout(timer);
  }, []);

  // Show splash screen while loading
  if (isLoading) {
    return <SplashScreen appName="BearBuddy" />;
  }

  // Handle emoji selection
  const handleEmojiSelect = (emoji: string) => {
    setSelectedEmoji(emoji);
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
          (!buddyName || !selectedEmoji) && styles.disabledButton,
        ]}
        disabled={!buddyName || !selectedEmoji}
        onPress={() => {
          router.push({
            pathname: "/buddy",
            params: { name: buddyName, emoji: selectedEmoji },
          });
        }}
      >
        <Text style={styles.createButtonText}>Create</Text>
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
