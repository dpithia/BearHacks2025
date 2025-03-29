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
import { useFonts } from "expo-font";

export default function HomeScreen() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [buddyName, setBuddyName] = useState<string>("");
  const [selectedEmoji, setSelectedEmoji] = useState<string | null>(null);

  const [fontsLoaded] = useFonts({
    Minecraft: require("../../assets/fonts/Minecraft.ttf"),
  });

  // Emoji options (placeholders until we have sprites)
  const buddyOptions = [
    { emoji: "👤", name: "HUMAN" },
    { emoji: "🐱", name: "CAT" },
    { emoji: "🐕", name: "DOG" },
    { emoji: "🐦", name: "BIRD" },
  ];

  // Simulate loading time
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  if (isLoading || !fontsLoaded) {
    return <SplashScreen appName="BearBuddy" />;
  }

  const handleEmojiSelect = (emoji: string) => {
    setSelectedEmoji(emoji);
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>CREATE YOUR BUDDY</Text>

        <Text style={styles.label}>NAME YOUR BUDDY:</Text>
        <TextInput
          style={styles.input}
          placeholder="MAX 12 CHARS"
          placeholderTextColor="#9E9E9E"
          value={buddyName}
          onChangeText={setBuddyName}
          maxLength={12}
        />

        <Text style={styles.label}>CHOOSE YOUR BUDDY:</Text>
        <View style={styles.buddyGrid}>
          {buddyOptions.map((buddy, index) => (
            <TouchableOpacity
              key={index}
              style={[
                styles.buddyContainer,
                selectedEmoji === buddy.emoji && styles.selectedBuddyContainer,
              ]}
              onPress={() => handleEmojiSelect(buddy.emoji)}
            >
              <Text style={styles.buddyEmoji}>{buddy.emoji}</Text>
              <Text style={styles.buddyName}>{buddy.name}</Text>
            </TouchableOpacity>
          ))}
        </View>

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
          <Text style={styles.createButtonText}>CREATE</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#66B288", // Green background
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  card: {
    backgroundColor: "#FFFFFF",
    padding: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: "#000000",
    width: "100%",
    maxWidth: 400,
    shadowColor: "#000",
    shadowOffset: {
      width: 8,
      height: 8,
    },
    shadowOpacity: 1,
    shadowRadius: 0,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#000000",
    marginBottom: 24,
    fontFamily: "Minecraft",
  },
  label: {
    fontSize: 16,
    color: "#000000",
    marginBottom: 8,
    fontFamily: "Minecraft",
    fontWeight: "bold",
  },
  input: {
    width: "100%",
    height: 40,
    borderWidth: 2,
    borderColor: "#000000",
    marginBottom: 24,
    padding: 8,
    fontFamily: "Minecraft",
    fontSize: 14,
    color: "#000000",
  },
  buddyGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: 24,
  },
  buddyContainer: {
    width: "48%",
    aspectRatio: 1,
    borderWidth: 2,
    borderColor: "#000000",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 10,
    backgroundColor: "#FFFFFF",
  },
  selectedBuddyContainer: {
    borderColor: "#000000",
    backgroundColor: "#E8E8E8",
  },
  buddyEmoji: {
    fontSize: 40,
    marginBottom: 8,
  },
  buddyName: {
    fontSize: 14,
    fontFamily: "Minecraft",
    fontWeight: "bold",
    color: "#000000",
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
