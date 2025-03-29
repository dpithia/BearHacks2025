import React from "react";
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
} from "react-native";
import { useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

export default function BuddyScreen() {
  // Get parameters from navigation (these would be passed when navigating from create screen)
  const { name, emoji } = useLocalSearchParams<{
    name: string;
    emoji: string;
  }>();

  // Default values if parameters are not provided
  const buddyName = name || "Buddy";
  const buddyEmoji = emoji || "🐻";

  // Status values (would be dynamic in a real app)
  const healthLevel = 80;
  const energyLevel = 65;

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Buddy name and image */}
        <Text style={styles.buddyName}>{buddyName}</Text>
        <View style={styles.buddyImageContainer}>
          <Text style={styles.buddyEmoji}>{buddyEmoji}</Text>
        </View>

        {/* Status bars */}
        <View style={styles.statusContainer}>
          {/* HP Bar */}
          <View style={styles.statusBarWrapper}>
            <View style={styles.statusLabelContainer}>
              <Text style={styles.statusEmoji}>❤️</Text>
              <Text style={styles.statusLabel}>HP</Text>
            </View>
            <View style={styles.statusBarBackground}>
              <View
                style={[
                  styles.statusBarFill,
                  { width: `${healthLevel}%`, backgroundColor: "#FF5252" },
                ]}
              />
            </View>
          </View>

          {/* Energy Bar */}
          <View style={styles.statusBarWrapper}>
            <View style={styles.statusLabelContainer}>
              <Text style={styles.statusEmoji}>⚡</Text>
              <Text style={styles.statusLabel}>Energy</Text>
            </View>
            <View style={styles.statusBarBackground}>
              <View
                style={[
                  styles.statusBarFill,
                  { width: `${energyLevel}%`, backgroundColor: "#FFD600" },
                ]}
              />
            </View>
          </View>
        </View>

        {/* Action buttons */}
        <View style={styles.actionContainer}>
          {/* Feed button */}
          <TouchableOpacity style={styles.actionButton}>
            <Ionicons name="camera-outline" size={36} color="#5D4037" />
            <Text style={styles.actionText}>Feed</Text>
          </TouchableOpacity>

          {/* Drink button */}
          <TouchableOpacity style={styles.actionButton}>
            <Ionicons name="water-outline" size={36} color="#5D4037" />
            <Text style={styles.actionText}>Drink</Text>
          </TouchableOpacity>

          {/* Sleep button */}
          <TouchableOpacity style={styles.actionButton}>
            <Ionicons name="bed-outline" size={36} color="#5D4037" />
            <Text style={styles.actionText}>Sleep</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#FFF8E1",
    // Add extra padding for Dynamic Island
    paddingTop: 60,
  },
  container: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: 20,
  },
  buddyName: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#5D4037",
    marginBottom: 10,
  },
  buddyImageContainer: {
    width: 150,
    height: 150,
    backgroundColor: "#FFD54F",
    borderRadius: 75,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    borderColor: "#FFA000",
    marginBottom: 30,
  },
  buddyEmoji: {
    fontSize: 80,
  },
  statusContainer: {
    width: "100%",
    marginBottom: 40,
  },
  statusBarWrapper: {
    marginBottom: 16,
  },
  statusLabelContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  statusEmoji: {
    fontSize: 18,
    marginRight: 8,
  },
  statusLabel: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#5D4037",
  },
  statusBarBackground: {
    height: 20,
    backgroundColor: "#EEEEEE",
    borderRadius: 10,
    overflow: "hidden",
    borderWidth: 2,
    borderColor: "#D7CCC8",
  },
  statusBarFill: {
    height: "100%",
    borderRadius: 8,
  },
  actionContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    width: "100%",
  },
  actionButton: {
    backgroundColor: "#FFA000",
    width: 100,
    height: 100,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#FF8F00",
  },
  actionText: {
    marginTop: 8,
    color: "#5D4037",
    fontWeight: "bold",
  },
});
