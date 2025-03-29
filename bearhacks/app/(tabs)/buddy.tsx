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
  Platform,
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
    const newHp = Math.min(100, Math.round(buddyState.hp + cups * 2));

    // Close modal and reset input immediately
    setWaterModalVisible(false);
    setWaterAmount("1");

    // Show feedback immediately
    Alert.alert(
      "Refreshing!",
      `${buddyState.name} has had ${cups} cup${
        cups > 1 ? "s" : ""
      } of water! That's ${newWaterConsumed} cups today.`
    );

    try {
      // Update state
      const update = {
        hp: newHp,
        waterConsumed: newWaterConsumed,
        lastDrank: new Date().toISOString(),
      };

      // Update server
      await updateBuddyState(update);
    } catch (error) {
      console.error("Failed to update water:", error);
      Alert.alert("Error", "Failed to update water. Please try again.");
    }
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
            <Ionicons name="log-out-outline" size={24} color="#000000" />
          </TouchableOpacity>
        </View>

        {/* Loading indicator for stats update */}
        {isUpdatingStats && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color="#8977b6" />
          </View>
        )}

        {/* Buddy name */}
        <Text style={styles.buddyName}>{buddyState.name}</Text>

        {/* Status bars */}
        <View style={styles.statusContainer}>
          {/* HP Bar */}
          <View style={styles.statusBarWrapper}>
            <View style={styles.statusLabelContainer}>
              <Text style={styles.statusLabel}>HUNGER</Text>
              <Text style={styles.statusValue}>
                {Math.round(buddyState.hp)}/100
              </Text>
            </View>
            <View style={styles.statusBarBackground}>
              <View
                style={[
                  styles.statusBarFill,
                  { width: `${buddyState.hp}%`, backgroundColor: "#f39c12" },
                ]}
              />
            </View>
          </View>

          {/* Energy Bar */}
          <View style={styles.statusBarWrapper}>
            <View style={styles.statusLabelContainer}>
              <Text style={styles.statusLabel}>ENERGY</Text>
              <Text style={styles.statusValue}>
                {Math.round(buddyState.energy)}/100
              </Text>
            </View>
            <View style={styles.statusBarBackground}>
              <View
                style={[
                  styles.statusBarFill,
                  {
                    width: `${buddyState.energy}%`,
                    backgroundColor: "#8977b6",
                  },
                ]}
              />
            </View>
          </View>

          {/* Hydration Bar */}
          <View style={styles.statusBarWrapper}>
            <View style={styles.statusLabelContainer}>
              <Text style={styles.statusLabel}>HYDRATION</Text>
              <Text style={styles.statusValue}>
                {Math.round(
                  ((buddyState.waterConsumed || 0) / WATER_GOAL) * 100
                )}
                /100
              </Text>
            </View>
            <View style={styles.statusBarBackground}>
              <View
                style={[
                  styles.statusBarFill,
                  {
                    width: `${Math.min(
                      100,
                      ((buddyState.waterConsumed || 0) / WATER_GOAL) * 100
                    )}%`,
                    backgroundColor: "#4FC3F7",
                  },
                ]}
              />
            </View>
          </View>
        </View>

        {/* Buddy image */}
        <View
          style={[
            styles.buddyImageContainer,
            buddyState.isSleeping && styles.sleepingBuddy,
          ]}
        >
          <Image
            source={
              buddyState.isSleeping
                ? require("../../assets/gifs/blackcatsleep.gif")
                : require("../../assets/gifs/blackcatidle.gif")
            }
            style={styles.buddyGif}
            resizeMode="stretch"
          />
        </View>

        {/* Action buttons */}
        <View style={styles.actionContainer}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => setCameraVisible(true)}
          >
            <Text style={styles.actionText}>FEED</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => setWaterModalVisible(true)}
          >
            <Text style={styles.actionText}>DRINK</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, isTogglingState && { opacity: 0.5 }]}
            onPress={handleSleep}
            disabled={isTogglingState}
          >
            <Text style={styles.actionText}>
              {buddyState.isSleeping ? "WAKE" : "SLEEP"}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Today's wellness */}
        <View style={styles.trackingContainer}>
          <View style={styles.trackingItem}>
            <Text style={styles.trackingText}>
              SLEEP:{" "}
              {buddyState.lastSleepDate === new Date().toDateString()
                ? `${buddyState.totalSleepHours?.toFixed(1) || 0}h`
                : "0h"}
            </Text>
          </View>

          <View style={styles.trackingItem}>
            <Text style={styles.trackingText}>
              WATER: {buddyState.waterConsumed || 0} CUPS
            </Text>
          </View>

          <View style={styles.trackingItem}>
            <Text style={styles.trackingText}>
              STEPS: {isPedometerAvailable ? currentStepCount : "N/A"}
            </Text>
          </View>
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
              <Text style={styles.modalTitle}>HOW MANY CUPS OF WATER?</Text>

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
                  <Text style={[styles.modalButtonText, { color: "#FFFFFF" }]}>
                    CANCEL
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.modalButton}
                  onPress={handleWaterSubmit}
                >
                  <Text style={styles.modalButtonText}>CONFIRM</Text>
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
    backgroundColor: "#3AA385", // pixel-green
    paddingTop: Platform.OS === "ios" ? 47 : 0,
  },
  container: {
    flex: 1,
    backgroundColor: "#3AA385",
    alignItems: "center",
    position: "relative",
  },
  headerButtons: {
    position: "absolute",
    top: 16,
    right: 16,
    zIndex: 1,
  },
  headerButton: {
    padding: 12,
    backgroundColor: "#F7F5E1", // pixel-cream
    borderWidth: 3,
    borderColor: "#000000",
    shadowColor: "#000000",
    shadowOffset: {
      width: 3,
      height: 3,
    },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 4,
  },
  buddyName: {
    fontSize: 24,
    fontFamily: "Minecraft",
    color: "#000000",
    backgroundColor: "#F7F5E1", // pixel-cream
    width: "100%",
    textAlign: "center",
    paddingVertical: 16,
    borderBottomWidth: 4,
    borderBottomColor: "#000000",
    shadowColor: "#000000",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 4,
    marginBottom: 24,
    textTransform: "uppercase",
  },
  buddyImageContainer: {
    width: 175,
    height: 175,
    backgroundColor: "#FFFCEE",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 4,
    borderColor: "#000000",
    marginVertical: 24,
    alignSelf: "center",
    shadowColor: "#000000",
    shadowOffset: {
      width: 5,
      height: 5,
    },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 5,
    overflow: "hidden",
  },
  sleepingBuddy: {
    backgroundColor: "#F7F5E1", // pixel-cream
  },
  buddyGif: {
    width: "50%",
    height: "50%",
  },
  statusContainer: {
    width: "100%",
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  statusBarWrapper: {
    marginBottom: 12,
  },
  statusLabelContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  statusLabel: {
    fontSize: 12,
    fontFamily: "Minecraft",
    color: "#000000",
    flex: 1,
    textTransform: "uppercase",
  },
  statusValue: {
    fontSize: 12,
    fontFamily: "Minecraft",
    color: "#000000",
    marginLeft: 8,
  },
  statusBarBackground: {
    height: 12,
    backgroundColor: "#FFFFFF",
    borderWidth: 2,
    borderColor: "#000000",
    overflow: "hidden",
  },
  statusBarFill: {
    height: "100%",
  },
  actionContainer: {
    flexDirection: "row",
    justifyContent: "center",
    width: "100%",
    paddingHorizontal: 24,
    gap: 16,
    marginBottom: 24,
  },
  actionButton: {
    flex: 1,
    aspectRatio: 1,
    backgroundColor: "#F7F5E1", // pixel-cream
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    borderColor: "#000000",
    shadowColor: "#000000",
    shadowOffset: {
      width: 3,
      height: 3,
    },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 4,
    padding: 12,
    transform: [{ translateY: 0 }], // For press animation
  },
  actionButtonPressed: {
    transform: [{ translateY: 3 }],
    shadowOffset: {
      width: 1,
      height: 1,
    },
  },
  actionText: {
    color: "#000000",
    fontFamily: "Minecraft",
    fontSize: 14,
    textAlign: "center",
    textTransform: "uppercase",
  },
  processingText: {
    fontSize: 24,
    fontFamily: "Minecraft",
    color: "#000000",
    marginBottom: 20,
    textTransform: "uppercase",
  },
  previewImage: {
    width: 300,
    height: 300,
    borderWidth: 4,
    borderColor: "#000000",
    marginBottom: 20,
  },
  trackingContainer: {
    width: "100%",
    backgroundColor: "#FFFCEE", // pixel-cream-light
    borderTopWidth: 4,
    borderTopColor: "#000000",
    padding: 24,
  },
  trackingItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    justifyContent: "center",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0, 0, 0, 0.1)",
    borderStyle: "dashed",
    paddingBottom: 8,
  },
  trackingText: {
    fontSize: 14,
    fontFamily: "Minecraft",
    color: "#000000",
    textAlign: "center",
    textTransform: "uppercase",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContainer: {
    width: "80%",
    maxWidth: 400,
    backgroundColor: "#FFFCEE", // pixel-cream-light
    borderWidth: 4,
    borderColor: "#000000",
    padding: 24,
    alignItems: "center",
    shadowColor: "#000000",
    shadowOffset: {
      width: 5,
      height: 5,
    },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 16,
    fontFamily: "Minecraft",
    color: "#000000",
    marginBottom: 24,
    textAlign: "center",
    textTransform: "uppercase",
  },
  modalInput: {
    backgroundColor: "#FFFFFF",
    width: "50%",
    height: 48,
    borderWidth: 3,
    borderColor: "#000000",
    fontSize: 20,
    fontFamily: "Minecraft",
    textAlign: "center",
    color: "#000000",
    marginBottom: 24,
  },
  modalButtonsContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    width: "100%",
    gap: 16,
  },
  modalButton: {
    flex: 1,
    backgroundColor: "#F7F5E1", // pixel-cream
    padding: 12,
    borderWidth: 3,
    borderColor: "#000000",
    shadowColor: "#000000",
    shadowOffset: {
      width: 3,
      height: 3,
    },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 4,
  },
  modalCancelButton: {
    backgroundColor: "#8977b6", // pixel-purple
  },
  modalButtonText: {
    color: "#000000",
    fontFamily: "Minecraft",
    fontSize: 14,
    textAlign: "center",
    textTransform: "uppercase",
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
});
