import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  Image,
  TextInput,
  Modal,
  ActivityIndicator,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as MediaLibrary from "expo-media-library";
import { Pedometer } from "expo-sensors";
import FoodCamera from "../../components/FoodCamera";
import { FoodAnalyzer } from "../../services/FoodAnalyzer";
import { useBuddyState } from "../../hooks/useBuddyState";
import SplashScreen from "../../components/SplashScreen";
import { supabase } from "../../services/supabase";
import { useFoodEntryStore } from "../../stores/foodEntryStore";

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
const WATER_GOAL = 15; // Daily water goal in cups

// Debounce utility function
const debounce = (func: Function, wait: number) => {
  let timeout: NodeJS.Timeout;
  return (...args: any[]) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

export default function BuddyScreen() {
  const { buddyState, isLoading, updateBuddyState } = useBuddyState();
  const router = useRouter();
  const addFoodEntry = useFoodEntryStore((state) => state.addEntry);

  // Add loading states
  const [isUpdatingStats, setIsUpdatingStats] = useState(false);
  const [isTogglingState, setIsTogglingState] = useState(false);

  // Move all useState hooks to the top
  const [cameraVisible, setCameraVisible] = React.useState<boolean>(false);
  const [capturedImage, setCapturedImage] = React.useState<string | null>(null);
  const [processingImage, setProcessingImage] = React.useState<boolean>(false);
  const [waterModalVisible, setWaterModalVisible] =
    React.useState<boolean>(false);
  const [waterAmount, setWaterAmount] = React.useState<string>("1");
  const [isPedometerAvailable, setIsPedometerAvailable] =
    React.useState<boolean>(false);
  const [currentStepCount, setCurrentStepCount] = React.useState<number>(0);
  const [dailyStepGoal] = React.useState<number>(10000);

  // Timer ref
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Add new state for tracking initial load
  const [hasInitializedStats, setHasInitializedStats] = useState(false);

  // Debounced update function
  const debouncedUpdateStats = useCallback(
    debounce(async (updates: any) => {
      try {
        await updateBuddyState(updates);
      } catch (error) {
        console.error("Error updating buddy stats:", error);
      }
    }, 1000),
    [updateBuddyState]
  );

  // Modify updateBuddyStats to be more efficient
  const updateBuddyStats = useCallback(
    async (force = false) => {
      if (!buddyState || isUpdatingStats || (!force && hasInitializedStats))
        return;

      try {
        setIsUpdatingStats(true);
        const now = new Date();
        const lastUpdated = new Date(buddyState.lastUpdated);

        // Check if it's a new day for water reset
        const isNewDay = now.toDateString() !== lastUpdated.toDateString();

        // Calculate hours since last update
        const hoursSinceUpdate =
          (now.getTime() - lastUpdated.getTime()) / (1000 * 60 * 60);

        // Skip update if less than a minute has passed (unless forced)
        if (!force && hoursSinceUpdate < 0.016) {
          return;
        }

        // Determine HP decay rate
        let hpDecayRate = NORMAL_HP_DECAY;
        if (hoursSinceUpdate > HUNGRY_THRESHOLD) {
          hpDecayRate += HUNGRY_HP_DECAY;
        }
        if (hoursSinceUpdate > THIRSTY_THRESHOLD) {
          hpDecayRate += THIRSTY_HP_DECAY;
        }

        // Calculate all updates before making any changes
        const hpLoss = Math.round(hpDecayRate * hoursSinceUpdate);
        const energyChange = Math.round(
          buddyState.isSleeping
            ? ENERGY_RECOVERY * hoursSinceUpdate
            : -ENERGY_DECAY * hoursSinceUpdate
        );

        const updates = {
          hp: Math.max(0, Math.round(buddyState.hp - hpLoss)),
          energy: Math.max(
            0,
            Math.min(100, Math.round(buddyState.energy + energyChange))
          ),
          waterConsumed: isNewDay ? 0 : buddyState.waterConsumed,
          lastUpdated: now.toISOString(),
        };

        // Only update if values have actually changed
        if (
          updates.hp !== buddyState.hp ||
          updates.energy !== buddyState.energy ||
          updates.waterConsumed !== buddyState.waterConsumed ||
          isNewDay
        ) {
          await updateBuddyState(updates);

          // Check for critical stats after update
          if (updates.hp <= 20 || updates.energy <= 20) {
            const alerts = [];
            if (updates.hp <= 20) {
              alerts.push(
                `${buddyState.name}'s HP is getting low. Time for some food!`
              );
            }
            if (updates.energy <= 20) {
              alerts.push(
                `${buddyState.name}'s energy is low. They should get some sleep!`
              );
            }
            if (alerts.length > 0) {
              Alert.alert("Your buddy needs attention!", alerts.join("\n"));
            }
          }
        }

        if (!hasInitializedStats) {
          setHasInitializedStats(true);
        }
      } finally {
        setIsUpdatingStats(false);
      }
    },
    [buddyState, isUpdatingStats, hasInitializedStats, updateBuddyState]
  );

  // Handler functions
  const handlePictureTaken = async (imageUri: string) => {
    if (!buddyState) return;

    setCapturedImage(imageUri);
    setCameraVisible(false);
    setProcessingImage(true);

    try {
      const analysis = await FoodAnalyzer.analyzeImage(imageUri);
      const hpGain = Math.round(
        analysis.isHealthy ? HEALTHY_FOOD_HP_GAIN : UNHEALTHY_FOOD_HP_GAIN
      );

      // Add to food journal
      addFoodEntry({
        name: analysis.labels?.[0] || "Unknown Food",
        timestamp: new Date(),
        imageUrl: imageUri,
        confidence: analysis.confidence || 0,
        isHealthy: analysis.isHealthy,
        labels: analysis.labels || [],
      });

      await updateBuddyState({
        hp: Math.min(100, Math.round(buddyState.hp + hpGain)),
        lastFed: new Date().toISOString(),
      });

      Alert.alert(
        analysis.isHealthy ? "Healthy Food! 🥗" : "Unhealthy Food! 🍔",
        `I think this is: ${analysis.labels?.join(", ") || "unknown food"}\n\n${
          analysis.isHealthy
            ? `Great choice! ${buddyState.name} is happy about this healthy meal!`
            : `${buddyState.name} would prefer something healthier next time!`
        }`,
        [{ text: "OK", onPress: () => console.log("OK Pressed") }]
      );
    } catch (error) {
      console.error("Error processing food image:", error);
      Alert.alert("Error", "Failed to process food image");
    } finally {
      setProcessingImage(false);
      setCapturedImage(null);
    }
  };

  const handleWaterSubmit = async () => {
    if (!buddyState) return;

    const cups = parseInt(waterAmount, 10) || 1;
    const newWaterConsumed = Math.round((buddyState.waterConsumed || 0) + cups);

    await updateBuddyState({
      hp: Math.min(100, Math.round(buddyState.hp + cups * 2)),
      waterConsumed: newWaterConsumed,
      lastDrank: new Date().toISOString(),
    });

    Alert.alert(
      "Refreshing!",
      `${buddyState.name} has had ${cups} cup${
        cups > 1 ? "s" : ""
      } of water! That's ${newWaterConsumed} cups today.`
    );

    setWaterModalVisible(false);
    setWaterAmount("1");
  };

  // Modify sleep handling to prevent race conditions
  const handleSleep = async () => {
    if (!buddyState || isTogglingState) return;

    try {
      setIsTogglingState(true);
      const currentSleepState = buddyState.isSleeping;
      const now = new Date();

      // Force a stats update before changing sleep state
      await updateBuddyStats(true);

      if (currentSleepState) {
        // Waking up - calculate everything before update
        const sleepStartTime = new Date(buddyState.sleepStartTime || now);
        const today = now.toDateString();
        const hoursSlept =
          Math.round(
            ((now.getTime() - sleepStartTime.getTime()) / (1000 * 60 * 60)) *
              100
          ) / 100;

        // Single update call with all changes
        await updateBuddyState({
          isSleeping: false,
          sleepStartTime: null,
          energy: Math.min(
            100,
            Math.round(buddyState.energy + ENERGY_RECOVERY * hoursSlept)
          ),
          totalSleepHours:
            Math.round(
              (buddyState.lastSleepDate === today
                ? (buddyState.totalSleepHours || 0) + hoursSlept
                : hoursSlept) * 100
            ) / 100,
          lastSleepDate: today,
          lastUpdated: now.toISOString(),
        });

        Alert.alert(
          "Good morning!",
          `${buddyState.name} slept for ${hoursSlept.toFixed(
            1
          )} hours and feels refreshed!`
        );
      } else {
        // Going to sleep - single update
        await updateBuddyState({
          isSleeping: true,
          sleepStartTime: now.toISOString(),
          lastUpdated: now.toISOString(),
        });

        Alert.alert("Sleep tight!", `${buddyState.name} is now sleeping!`);
      }
    } finally {
      // Add a small delay before allowing next toggle
      setTimeout(() => setIsTogglingState(false), 500);
    }
  };

  // Add handleSignOut function back
  const handleSignOut = async () => {
    try {
      console.warn("[Auth] Signing out user");
      // Just trigger the sign out - the auth state listener in RootLayout will handle navigation
      await supabase.auth.signOut();
      console.warn("[Auth] User signed out successfully");
      // Remove direct navigation - let auth state change handle it
    } catch (error) {
      console.error("[Auth] Error signing out:", error);
      Alert.alert("Error", "Failed to sign out. Please try again.");
    }
  };

  // Update useEffect hooks to prevent redundant updates
  useEffect(() => {
    if (buddyState && !isLoading && !hasInitializedStats) {
      // Initial stats update when buddy is loaded
      updateBuddyStats(true);
    }
  }, [buddyState, isLoading, hasInitializedStats, updateBuddyStats]);

  // Periodic updates
  useEffect(() => {
    if (!buddyState || !hasInitializedStats) return;

    const timer = setInterval(() => {
      updateBuddyStats();
    }, 60000); // Update every minute

    return () => clearInterval(timer);
  }, [buddyState, hasInitializedStats, updateBuddyStats]);

  useEffect(() => {
    (async () => {
      await MediaLibrary.requestPermissionsAsync();
    })();
  }, []);

  useEffect(() => {
    let subscription: { remove: () => void } | null = null;

    const subscribeToPedometer = async () => {
      try {
        const isAvailable = await Pedometer.isAvailableAsync();
        setIsPedometerAvailable(isAvailable);

        if (isAvailable) {
          subscription = await Pedometer.watchStepCount((result) => {
            setCurrentStepCount(result.steps);
            if (buddyState) {
              updateBuddyState({ steps: result.steps });
            }
          });
        }
      } catch (error) {
        console.error("Failed to set up pedometer:", error);
        setIsPedometerAvailable(false);
      }
    };

    subscribeToPedometer();

    return () => {
      if (subscription) {
        subscription.remove();
      }
    };
  }, [buddyState, updateBuddyState]);

  // Effects
  useEffect(() => {
    if (!isLoading && !buddyState) {
      console.warn(
        "[BuddyScreen] No buddy state found, redirecting to creation"
      );
      router.replace("/(tabs)");
    }
  }, [isLoading, buddyState, router]);

  // Show loading state
  if (isLoading || !buddyState) {
    return <SplashScreen />;
  }

  // Camera view when taking a picture
  if (cameraVisible) {
    return (
      <FoodCamera
        onTakePicture={handlePictureTaken}
        onCancel={() => setCameraVisible(false)}
        buddyName={buddyState.name}
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
        {/* Header buttons */}
        <View style={styles.headerButtons}>
          <TouchableOpacity style={styles.headerButton} onPress={handleSignOut}>
            <Ionicons name="log-out-outline" size={24} color="#5D4037" />
          </TouchableOpacity>
        </View>

        {/* Loading indicator for stats update */}
        {isUpdatingStats && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color="#FFA000" />
          </View>
        )}

        {/* Buddy name and image */}
        <Text style={styles.buddyName}>{buddyState.name}</Text>
        <View
          style={[
            styles.buddyImageContainer,
            buddyState.isSleeping && styles.sleepingBuddy,
          ]}
        >
          <Text style={styles.buddyEmoji}>
            {buddyState.isSleeping ? "💤" : buddyState.imageUrl}
          </Text>
        </View>

        {/* Status bars */}
        <View style={styles.statusContainer}>
          {/* HP Bar */}
          <View style={styles.statusBarWrapper}>
            <View style={styles.statusLabelContainer}>
              <Text style={styles.statusEmoji}>❤️</Text>
              <Text style={styles.statusLabel}>HP</Text>
              <Text style={styles.statusValue}>
                {Math.round(buddyState.hp)}%
              </Text>
            </View>
            <View style={styles.statusBarBackground}>
              <View
                style={[
                  styles.statusBarFill,
                  { width: `${buddyState.hp}%`, backgroundColor: "#FF5252" },
                ]}
              />
            </View>
          </View>

          {/* Energy Bar */}
          <View style={styles.statusBarWrapper}>
            <View style={styles.statusLabelContainer}>
              <Text style={styles.statusEmoji}>⚡</Text>
              <Text style={styles.statusLabel}>Energy</Text>
              <Text style={styles.statusValue}>
                {Math.round(buddyState.energy)}%
              </Text>
            </View>
            <View style={styles.statusBarBackground}>
              <View
                style={[
                  styles.statusBarFill,
                  {
                    width: `${buddyState.energy}%`,
                    backgroundColor: "#FFD600",
                  },
                ]}
              />
            </View>
          </View>
        </View>

        {/* Action buttons */}
        <View style={styles.actionContainer}>
          {/* Feed button */}
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => setCameraVisible(true)}
          >
            <Ionicons name="camera-outline" size={36} color="#5D4037" />
            <Text style={styles.actionText}>Feed</Text>
          </TouchableOpacity>

          {/* Drink button */}
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => setWaterModalVisible(true)}
          >
            <Ionicons name="water-outline" size={36} color="#5D4037" />
            <Text style={styles.actionText}>Drink</Text>
          </TouchableOpacity>

          {/* Sleep/Wake button - restored to action buttons */}
          <TouchableOpacity
            style={[styles.actionButton, isTogglingState && { opacity: 0.5 }]}
            onPress={handleSleep}
            disabled={isTogglingState}
          >
            <Ionicons
              name={buddyState.isSleeping ? "sunny-outline" : "bed-outline"}
              size={36}
              color="#5D4037"
            />
            <Text style={styles.actionText}>
              {buddyState.isSleeping ? "Wake" : "Sleep"}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Tracking stats */}
        <View style={styles.trackingContainer}>
          {/* Sleep tracking */}
          <View style={styles.trackingItem}>
            <Ionicons name="bed-outline" size={24} color="#5D4037" />
            <Text style={styles.trackingText}>
              {buddyState.lastSleepDate === new Date().toDateString()
                ? `Slept ${
                    buddyState.totalSleepHours?.toFixed(1) || 0
                  } hours today`
                : "No sleep recorded today"}
            </Text>
          </View>

          {/* Water tracking */}
          <View style={styles.trackingItem}>
            <Ionicons name="water-outline" size={24} color="#5D4037" />
            <Text style={styles.trackingText}>
              {`${
                buddyState.waterConsumed || 0
              } / ${WATER_GOAL} cups of water today`}
            </Text>
          </View>

          {/* Water progress bar */}
          <View style={styles.waterProgressContainer}>
            <View style={styles.waterProgressBackground}>
              <View
                style={[
                  styles.waterProgressFill,
                  {
                    width: `${Math.min(
                      100,
                      ((buddyState.waterConsumed || 0) / WATER_GOAL) * 100
                    )}%`,
                  },
                ]}
              />
            </View>
          </View>

          {/* Steps tracking */}
          <View style={styles.trackingItem}>
            <Ionicons name="footsteps-outline" size={24} color="#5D4037" />
            <Text style={styles.trackingText}>
              {isPedometerAvailable
                ? `${currentStepCount} / ${dailyStepGoal} steps today`
                : "Pedometer not available"}
            </Text>
          </View>

          {/* Steps progress bar */}
          {isPedometerAvailable && (
            <View style={styles.waterProgressContainer}>
              <View style={styles.waterProgressBackground}>
                <View
                  style={[
                    styles.stepsProgressFill,
                    {
                      width: `${Math.min(
                        100,
                        (currentStepCount / dailyStepGoal) * 100
                      )}%`,
                    },
                  ]}
                />
              </View>
            </View>
          )}
        </View>

        {/* Water Modal */}
        <Modal
          visible={waterModalVisible}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setWaterModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContainer}>
              <Text style={styles.modalTitle}>How many cups of water?</Text>

              <TextInput
                style={styles.modalInput}
                keyboardType="number-pad"
                value={waterAmount}
                onChangeText={setWaterAmount}
                maxLength={2}
              />

              <View style={styles.modalButtonsContainer}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.modalCancelButton]}
                  onPress={() => {
                    setWaterModalVisible(false);
                    setWaterAmount("1");
                  }}
                >
                  <Text style={styles.modalButtonText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.modalButton}
                  onPress={handleWaterSubmit}
                >
                  <Text style={styles.modalButtonText}>Confirm</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
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
    paddingTop: 70,
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
    marginBottom: 30,
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
    marginBottom: 30,
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
  // Tracking styles
  trackingContainer: {
    width: "100%",
    backgroundColor: "#FFF3E0",
    borderRadius: 16,
    padding: 16,
    borderWidth: 2,
    borderColor: "#FFE0B2",
  },
  trackingItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  trackingText: {
    fontSize: 16,
    color: "#5D4037",
    marginLeft: 10,
  },
  waterProgressContainer: {
    marginTop: 5,
    marginBottom: 15,
  },
  waterProgressBackground: {
    height: 15,
    backgroundColor: "#E0E0E0",
    borderRadius: 10,
    overflow: "hidden",
  },
  waterProgressFill: {
    height: "100%",
    backgroundColor: "#4FC3F7",
    borderRadius: 10,
  },
  stepsProgressFill: {
    height: "100%",
    backgroundColor: "#66BB6A", // Green color for steps
    borderRadius: 10,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContainer: {
    width: "80%",
    backgroundColor: "#FFF8E1",
    borderRadius: 16,
    padding: 20,
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#FFA000",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#5D4037",
    marginBottom: 20,
  },
  modalInput: {
    backgroundColor: "white",
    width: "50%",
    height: 50,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "#FFB74D",
    fontSize: 20,
    textAlign: "center",
    color: "#5D4037",
    marginBottom: 20,
  },
  modalButtonsContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    width: "100%",
  },
  modalButton: {
    backgroundColor: "#FFA000",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 10,
    minWidth: 100,
    alignItems: "center",
  },
  modalCancelButton: {
    backgroundColor: "#E0E0E0",
  },
  modalButtonText: {
    color: "#5D4037",
    fontWeight: "bold",
    fontSize: 16,
  },
  loadingOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(255, 255, 255, 0.7)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 2,
  },
  headerButtons: {
    flexDirection: "row",
    position: "absolute",
    top: 16,
    right: 16,
    gap: 16,
    zIndex: 1,
  },
  headerButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: "#FFE0B2",
  },
});
