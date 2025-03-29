import React, { useState, useEffect, useRef } from "react";
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  Image,
} from "react-native";
import { useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as MediaLibrary from "expo-media-library";
import FoodCamera from "../../components/FoodCamera";
import { FoodAnalyzer } from "../../services/FoodAnalyzer";

// Constants for game mechanics
const NORMAL_HP_DECAY = 0.5; // HP points lost per hour normally
const HUNGRY_HP_DECAY = 1.5; // HP points lost per hour when hungry
const THIRSTY_HP_DECAY = 1.5; // HP points lost per hour when thirsty
const HUNGRY_THRESHOLD = 6; // Hours until buddy gets hungry
const THIRSTY_THRESHOLD = 4; // Hours until buddy gets thirsty
const ENERGY_DECAY = 0.7; // Energy points lost per hour when awake
const ENERGY_RECOVERY = 10; // Energy points gained per hour of sleep
const HEALTHY_FOOD_HP_GAIN = 15; // HP gained for healthy food
const UNHEALTHY_FOOD_HP_GAIN = 7; // HP gained for unhealthy food

export default function BuddyScreen() {
  // Get parameters from navigation
  const { name, emoji } = useLocalSearchParams<{
    name: string;
    emoji: string;
  }>();

  // Default values if parameters are not provided
  const buddyName = name || "Buddy";
  const buddyEmoji = emoji || "🐻";

  // State for buddy status
  const [healthLevel, setHealthLevel] = useState<number>(100);
  const [energyLevel, setEnergyLevel] = useState<number>(100);
  const [lastFed, setLastFed] = useState<Date>(new Date());
  const [lastDrank, setLastDrank] = useState<Date>(new Date());
  const [isSleeping, setIsSleeping] = useState<boolean>(false);
  const [sleepStartTime, setSleepStartTime] = useState<Date | null>(null);

  // Camera and image processing states
  const [cameraVisible, setCameraVisible] = useState<boolean>(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [processingImage, setProcessingImage] = useState<boolean>(false);

  // Check for permissions on mount
  useEffect(() => {
    (async () => {
      await MediaLibrary.requestPermissionsAsync();
    })();
  }, []);

  // Ref for timer
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize or load saved data
  useEffect(() => {
    loadBuddyData();

    // Start the interval to update stats
    timerRef.current = setInterval(updateBuddyStats, 60000); // Update every minute

    // Clean up on unmount
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  // Effect to save data whenever stats change
  useEffect(() => {
    saveBuddyData();
  }, [
    healthLevel,
    energyLevel,
    lastFed,
    lastDrank,
    isSleeping,
    sleepStartTime,
  ]);

  // Load buddy data from storage
  const loadBuddyData = async () => {
    try {
      const dataString = await AsyncStorage.getItem(`buddy_${buddyName}`);
      if (dataString) {
        const data = JSON.parse(dataString);
        setHealthLevel(data.healthLevel);
        setEnergyLevel(data.energyLevel);
        setLastFed(new Date(data.lastFed));
        setLastDrank(new Date(data.lastDrank));
        setIsSleeping(data.isSleeping);
        setSleepStartTime(
          data.sleepStartTime ? new Date(data.sleepStartTime) : null
        );
      }
    } catch (error) {
      console.error("Failed to load buddy data:", error);
    }
  };

  // Save buddy data to storage
  const saveBuddyData = async () => {
    try {
      const data = {
        healthLevel,
        energyLevel,
        lastFed: lastFed.toISOString(),
        lastDrank: lastDrank.toISOString(),
        isSleeping,
        sleepStartTime: sleepStartTime?.toISOString() || null,
      };
      await AsyncStorage.setItem(`buddy_${buddyName}`, JSON.stringify(data));
    } catch (error) {
      console.error("Failed to save buddy data:", error);
    }
  };

  // Update buddy stats based on time
  const updateBuddyStats = () => {
    const now = new Date();

    // Calculate hours since last actions
    const hoursSinceLastFed =
      (now.getTime() - lastFed.getTime()) / (1000 * 60 * 60);
    const hoursSinceLastDrank =
      (now.getTime() - lastDrank.getTime()) / (1000 * 60 * 60);

    // Determine HP decay rate
    let hpDecayRate = NORMAL_HP_DECAY;
    if (hoursSinceLastFed > HUNGRY_THRESHOLD) {
      hpDecayRate += HUNGRY_HP_DECAY;
    }
    if (hoursSinceLastDrank > THIRSTY_THRESHOLD) {
      hpDecayRate += THIRSTY_HP_DECAY;
    }

    // Update HP
    const hoursSinceLastUpdate = 1 / 60; // 1 minute in hours
    const hpLoss = hpDecayRate * hoursSinceLastUpdate;
    setHealthLevel((prev) => Math.max(0, prev - hpLoss));

    // Update energy based on sleep status
    if (isSleeping && sleepStartTime) {
      // Energy increases while sleeping
      const energyGain = ENERGY_RECOVERY * hoursSinceLastUpdate;
      setEnergyLevel((prev) => Math.min(100, prev + energyGain));
    } else {
      // Energy decreases while awake
      const energyLoss = ENERGY_DECAY * hoursSinceLastUpdate;
      setEnergyLevel((prev) => Math.max(0, prev - energyLoss));
    }
  };

  // Handler for when a picture is taken
  const handlePictureTaken = async (imageUri: string) => {
    setCapturedImage(imageUri);
    setCameraVisible(false);
    setProcessingImage(true);

    // Analyze the food image using our service
    try {
      const analysis = await FoodAnalyzer.analyzeImage(imageUri);

      // Update buddy based on analysis
      setLastFed(new Date());

      if (analysis.isHealthy) {
        setHealthLevel((prev) => Math.min(100, prev + HEALTHY_FOOD_HP_GAIN));
        Alert.alert(
          "Healthy Food!",
          `That's a nutritious meal! ${buddyName} feels great and gained ${HEALTHY_FOOD_HP_GAIN} HP!`
        );
      } else {
        setHealthLevel((prev) => Math.min(100, prev + UNHEALTHY_FOOD_HP_GAIN));
        Alert.alert(
          "Snack Time!",
          `${buddyName} enjoyed that treat but it's not very nutritious. Gained ${UNHEALTHY_FOOD_HP_GAIN} HP.`
        );
      }
    } catch (error) {
      console.error("Error processing food image:", error);
      Alert.alert("Error", "Failed to analyze food. Please try again.");
    } finally {
      setProcessingImage(false);
      setCapturedImage(null);
    }
  };

  // Handle opening the camera
  const handleFeed = () => {
    setCameraVisible(true);
  };

  // Handle giving water to buddy
  const handleDrink = () => {
    setLastDrank(new Date());
    setHealthLevel((prev) => Math.min(100, prev + 5));
    Alert.alert("Refreshing!", `${buddyName} has had some water!`);
  };

  // Handle sleep toggle
  const handleSleep = () => {
    if (isSleeping) {
      // Waking up
      if (sleepStartTime) {
        const now = new Date();
        const hoursSlept =
          (now.getTime() - sleepStartTime.getTime()) / (1000 * 60 * 60);
        const energyGain = ENERGY_RECOVERY * hoursSlept;
        setEnergyLevel((prev) => Math.min(100, prev + energyGain));
        Alert.alert(
          "Good morning!",
          `${buddyName} is now awake and refreshed!`
        );
      }
      setIsSleeping(false);
      setSleepStartTime(null);
    } else {
      // Going to sleep
      setIsSleeping(true);
      setSleepStartTime(new Date());
      Alert.alert("Sleep tight!", `${buddyName} is now sleeping!`);
    }
  };

  // Camera view when taking a picture
  if (cameraVisible) {
    return (
      <FoodCamera
        onTakePicture={handlePictureTaken}
        onCancel={() => setCameraVisible(false)}
        buddyName={buddyName}
      />
    );
  }

  // Processing view when analyzing the image
  if (processingImage) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.container}>
          <Text style={styles.processingText}>Analyzing food...</Text>
          {capturedImage && (
            <Image
              source={{ uri: capturedImage }}
              style={styles.previewImage}
            />
          )}
        </View>
      </SafeAreaView>
    );
  }

  // Normal buddy view
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Buddy name and image */}
        <Text style={styles.buddyName}>{buddyName}</Text>
        <View
          style={[
            styles.buddyImageContainer,
            isSleeping && styles.sleepingBuddy,
          ]}
        >
          <Text style={styles.buddyEmoji}>
            {isSleeping ? "💤" : buddyEmoji}
          </Text>
        </View>

        {/* Status bars */}
        <View style={styles.statusContainer}>
          {/* HP Bar */}
          <View style={styles.statusBarWrapper}>
            <View style={styles.statusLabelContainer}>
              <Text style={styles.statusEmoji}>❤️</Text>
              <Text style={styles.statusLabel}>HP</Text>
              <Text style={styles.statusValue}>{Math.round(healthLevel)}%</Text>
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
              <Text style={styles.statusValue}>{Math.round(energyLevel)}%</Text>
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
          <TouchableOpacity style={styles.actionButton} onPress={handleFeed}>
            <Ionicons name="camera-outline" size={36} color="#5D4037" />
            <Text style={styles.actionText}>Feed</Text>
          </TouchableOpacity>

          {/* Drink button */}
          <TouchableOpacity style={styles.actionButton} onPress={handleDrink}>
            <Ionicons name="water-outline" size={36} color="#5D4037" />
            <Text style={styles.actionText}>Drink</Text>
          </TouchableOpacity>

          {/* Sleep/Wake button */}
          <TouchableOpacity style={styles.actionButton} onPress={handleSleep}>
            <Ionicons
              name={isSleeping ? "sunny-outline" : "bed-outline"}
              size={36}
              color="#5D4037"
            />
            <Text style={styles.actionText}>
              {isSleeping ? "Wake" : "Sleep"}
            </Text>
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
  sleepingBuddy: {
    backgroundColor: "#E0E0E0",
    borderColor: "#BDBDBD",
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
    flex: 1,
  },
  statusValue: {
    fontSize: 16,
    color: "#5D4037",
    marginLeft: 8,
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
  processingText: {
    fontSize: 24,
    color: "#5D4037",
    marginBottom: 20,
  },
  previewImage: {
    width: 300,
    height: 300,
    borderRadius: 20,
    marginBottom: 20,
  },
});
