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

// Add new constants for step tracking and rewards
const STEP_REWARD_THRESHOLD = 1000; // Reward HP every 1000 steps
const STEP_REWARD_HP = 5; // HP points awarded per step threshold
const MAX_DAILY_STEP_REWARDS = 50; // Maximum HP from steps per day

// Debounce utility function
const debounce = (func: Function, wait: number) => {
  let timeout: NodeJS.Timeout;
  return (...args: any[]) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

// Add new UI components
const ProgressBar = ({
  value,
  maxValue,
  color,
}: {
  value: number;
  maxValue: number;
  color: string;
}) => (
  <View style={styles.progressBarContainer}>
    <View
      style={[
        styles.progressBarFill,
        {
          width: `${(value / maxValue) * 100}%`,
          backgroundColor: color,
        },
      ]}
    />
  </View>
);

const StatDisplay = ({
  label,
  value,
  maxValue,
  color,
  icon,
}: {
  label: string;
  value: number;
  maxValue: number;
  color: string;
  icon: keyof typeof Ionicons.glyphMap;
}) => (
  <View style={styles.statContainer}>
    <View style={styles.statHeader}>
      <Ionicons name={icon} size={20} color={color} />
      <Text style={[styles.statLabel, { color }]}>{label}</Text>
    </View>
    <ProgressBar value={value} maxValue={maxValue} color={color} />
    <Text style={[styles.statValue, { color }]}>
      {Math.round(value)}/{maxValue}
    </Text>
  </View>
);

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

  // Add new state variables
  const [lastStepReward, setLastStepReward] = useState<number>(0);
  const [stepRewardsGiven, setStepRewardsGiven] = useState<number>(0);
  const [sleepTransitioning, setSleepTransitioning] = useState<boolean>(false);
  const [showStepReward, setShowStepReward] = useState<boolean>(false);

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

  // Enhanced pedometer setup
  useEffect(() => {
    let subscription: any;

    const setupPedometer = async () => {
      try {
        const { status } = await Pedometer.requestPermissionsAsync();
        if (status === "granted") {
          setIsPedometerAvailable(true);
          const end = new Date();
          const start = new Date();
          start.setHours(0, 0, 0, 0);

          const { steps: initialSteps = 0 } =
            (await Pedometer.getStepCountAsync(start, end)) || {};
          setCurrentStepCount(initialSteps);
          setLastStepReward(initialSteps);

          subscription = Pedometer.watchStepCount((result) => {
            setCurrentStepCount(result.steps);
            checkStepRewards(result.steps);
          });
        }
      } catch (error) {
        console.error("Pedometer setup failed:", error);
        setIsPedometerAvailable(false);
      }
    };

    setupPedometer();
    return () => subscription?.remove();
  }, []);

  // Enhanced step reward system
  const checkStepRewards = useCallback(
    async (steps: number) => {
      if (!buddyState || stepRewardsGiven >= MAX_DAILY_STEP_REWARDS) return;

      const stepsSinceLastReward = steps - lastStepReward;
      if (stepsSinceLastReward >= STEP_REWARD_THRESHOLD) {
        const rewardsToGive = Math.floor(
          stepsSinceLastReward / STEP_REWARD_THRESHOLD
        );
        const possibleRewards = Math.min(
          rewardsToGive,
          MAX_DAILY_STEP_REWARDS - stepRewardsGiven
        );

        if (possibleRewards > 0) {
          const hpGain = possibleRewards * STEP_REWARD_HP;
          await updateBuddyState({
            hp: Math.min(100, buddyState.hp + hpGain),
          });

          setLastStepReward(steps);
          setStepRewardsGiven((prev) => prev + possibleRewards);
          setShowStepReward(true);
          setTimeout(() => setShowStepReward(false), 3000);
        }
      }
    },
    [buddyState, lastStepReward, stepRewardsGiven]
  );

  // Enhanced sleep handling
  const handleSleep = async () => {
    if (!buddyState || isTogglingState || sleepTransitioning) return;

    try {
      setSleepTransitioning(true);
      setIsTogglingState(true);

      const currentSleepState = buddyState.isSleeping;
      const now = new Date();

      // Force a stat update before changing sleep state
      await updateBuddyStats(true);

      // Calculate sleep duration if waking up
      let sleepDuration = 0;
      if (currentSleepState && buddyState.lastSlept) {
        sleepDuration =
          (now.getTime() - new Date(buddyState.lastSlept).getTime()) /
          (1000 * 60 * 60);
      }

      const updates: any = {
        isSleeping: !currentSleepState,
        lastSlept: !currentSleepState
          ? now.toISOString()
          : buddyState.lastSlept,
      };

      // Apply sleep benefits when waking up
      if (currentSleepState && sleepDuration > 0) {
        const energyGain = Math.round(ENERGY_RECOVERY * sleepDuration);
        updates.energy = Math.min(100, buddyState.energy + energyGain);

        // Bonus HP for good sleep (6-8 hours)
        if (sleepDuration >= 6 && sleepDuration <= 8) {
          updates.hp = Math.min(100, buddyState.hp + 10);
        }
      }

      await updateBuddyState(updates);

      // Show sleep feedback
      if (!currentSleepState) {
        Alert.alert(
          "Sweet Dreams! 💤",
          `${buddyState.name} is going to sleep. They'll recover energy while sleeping!`
        );
      } else if (sleepDuration > 0) {
        Alert.alert(
          "Rise and Shine! 🌅",
          `${buddyState.name} slept for ${Math.round(
            sleepDuration
          )} hours and feels ${
            sleepDuration >= 6 && sleepDuration <= 8 ? "great" : "better"
          }!`
        );
      }
    } finally {
      setIsTogglingState(false);
      setSleepTransitioning(false);
    }
  };

  const handleSignOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      // The auth subscription in _layout should handle navigation
    } catch (error) {
      console.error("Error signing out:", error);
      Alert.alert("Error", "Failed to sign out");
    }
  };

  // Periodic updates
  useEffect(() => {
    // Clear any existing timer
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    // Start a new timer
    timerRef.current = setInterval(() => {
      console.warn("[BuddyScreen] Timer tick: Running updateBuddyStats");
      updateBuddyStats(false); // Don't force update on timer tick
    }, 60 * 1000); // Update every minute

    // Cleanup on unmount
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
        console.warn("[BuddyScreen] Cleared update timer");
      }
    };
  }, [updateBuddyStats]);

  // Initial state loading
  if (isLoading || !buddyState) {
    return <SplashScreen />;
  }

  // Calculate percentages
  const hpPercentage = (buddyState.hp / 100) * 100;
  const energyPercentage = (buddyState.energy / 100) * 100;
  const waterPercentage = (buddyState.waterConsumed / WATER_GOAL) * 100;

  // UI Rendering
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{buddyState.name}</Text>
        {isPedometerAvailable && (
          <View style={styles.stepCounter}>
            <Ionicons name="footsteps-outline" size={24} color="#5D4037" />
            <Text style={styles.stepText}>
              {currentStepCount}/{dailyStepGoal}
            </Text>
          </View>
        )}
      </View>

      <View style={styles.buddyContainer}>
        <Text style={styles.buddyEmoji}>{buddyState.imageUrl}</Text>
        {buddyState.isSleeping && (
          <Text style={styles.sleepIndicator}>💤 Sleeping</Text>
        )}
      </View>

      {/* Stats Section */}
      <View style={styles.statsContainer}>
        <StatDisplay
          label="Health"
          value={buddyState.hp}
          maxValue={100}
          color="#E53935"
          icon="heart-outline"
        />
        <StatDisplay
          label="Energy"
          value={buddyState.energy}
          maxValue={100}
          color="#FFA000"
          icon="battery-charging-outline"
        />
        <StatDisplay
          label="Water"
          value={buddyState.waterConsumed}
          maxValue={WATER_GOAL}
          color="#1E88E5"
          icon="water-outline"
        />
      </View>

      {/* Actions Section */}
      <View style={styles.actionsContainer}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => setCameraVisible(true)}
          disabled={processingImage || isUpdatingStats}
        >
          <Ionicons name="camera-outline" size={24} color="#5D4037" />
          <Text style={styles.actionButtonText}>Feed Buddy</Text>
          {processingImage && (
            <ActivityIndicator size="small" color="#5D4037" />
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => setWaterModalVisible(true)}
          disabled={isUpdatingStats}
        >
          <Ionicons name="water-outline" size={24} color="#5D4037" />
          <Text style={styles.actionButtonText}>Give Water</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionButton}
          onPress={handleSleep}
          disabled={isTogglingState || isUpdatingStats}
        >
          <Ionicons
            name={buddyState.isSleeping ? "sunny-outline" : "moon-outline"}
            size={24}
            color="#5D4037"
          />
          <Text style={styles.actionButtonText}>
            {buddyState.isSleeping ? "Wake Up" : "Sleep"}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Food Camera Modal */}
      {cameraVisible && (
        <Modal
          animationType="slide"
          transparent={false}
          visible={cameraVisible}
          onRequestClose={() => setCameraVisible(false)}
        >
          <FoodCamera
            onTakePicture={handlePictureTaken}
            onCancel={() => setCameraVisible(false)}
            buddyName={buddyState.name}
          />
        </Modal>
      )}

      {/* Water Intake Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={waterModalVisible}
        onRequestClose={() => setWaterModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>How many cups?</Text>
            <TextInput
              style={styles.waterInput}
              value={waterAmount}
              onChangeText={setWaterAmount}
              keyboardType="numeric"
              placeholder="Cups"
            />
            <View style={styles.modalButtonContainer}>
              <TouchableOpacity
                style={styles.modalButton}
                onPress={handleWaterSubmit}
              >
                <Text style={styles.modalButtonText}>Add Water</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalCancelButton]}
                onPress={() => setWaterModalVisible(false)}
              >
                <Text style={styles.modalButtonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Step Reward Animation */}
      {showStepReward && (
        <View style={styles.stepRewardContainer}>
          <Text style={styles.stepRewardText}>
            +{STEP_REWARD_HP} HP from steps! 🏃‍♂️
          </Text>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFF8E1",
    paddingTop: 60,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#5D4037",
    marginRight: 20,
  },
  buddyContainer: {
    flexDirection: "row",
    alignItems: "center",
    padding: 20,
  },
  buddyEmoji: {
    fontSize: 80,
  },
  sleepIndicator: {
    fontSize: 16,
    color: "#5D4037",
    marginLeft: 10,
  },
  statsContainer: {
    padding: 16,
  },
  statContainer: {
    marginVertical: 8,
    padding: 12,
    backgroundColor: "white",
    borderRadius: 12,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  statHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  statLabel: {
    marginLeft: 8,
    fontSize: 16,
    fontWeight: "bold",
  },
  statValue: {
    fontSize: 14,
    textAlign: "right",
    marginTop: 2,
  },
  pedometerContainer: {
    flexDirection: "row",
    alignItems: "center",
    padding: 20,
  },
  pedometerText: {
    fontSize: 16,
    color: "#5D4037",
    marginLeft: 10,
  },
  actionsContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    width: "100%",
    padding: 20,
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
  actionButtonText: {
    marginTop: 8,
    color: "#5D4037",
    fontWeight: "bold",
  },
  modalContainer: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
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
  waterInput: {
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
  modalButtonContainer: {
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
  stepRewardContainer: {
    position: "absolute",
    top: "15%",
    left: 0,
    right: 0,
    alignItems: "center",
    zIndex: 999,
  },
  stepRewardText: {
    backgroundColor: "rgba(255, 160, 0, 0.9)",
    color: "white",
    padding: 8,
    borderRadius: 8,
    fontSize: 16,
    fontWeight: "bold",
  },
  progressBarContainer: {
    height: 12,
    backgroundColor: "#E0E0E0",
    borderRadius: 6,
    overflow: "hidden",
    marginVertical: 4,
  },
  progressBarFill: {
    height: "100%",
    borderRadius: 6,
  },
  stepCounter: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFE0B2",
    padding: 8,
    borderRadius: 20,
  },
  stepText: {
    marginLeft: 8,
    color: "#5D4037",
    fontWeight: "bold",
  },
});
