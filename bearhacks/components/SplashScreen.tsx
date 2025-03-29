import React, { useEffect, useRef } from "react";
import { View, Text, StyleSheet, Animated, Easing } from "react-native";
import { StatusBar } from "expo-status-bar";

interface SplashScreenProps {
  appName?: string;
}

const SplashScreen: React.FC<SplashScreenProps> = ({ appName = "BearApp" }) => {
  // Animation value for rotation
  const spinValue = useRef(new Animated.Value(0)).current;

  // Start the spinning animation when component mounts
  useEffect(() => {
    startSpinAnimation();
  }, []);

  // Create the spinning animation
  const startSpinAnimation = (): void => {
    Animated.loop(
      Animated.timing(spinValue, {
        toValue: 1,
        duration: 3000, // 3 seconds per rotation
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();
  };

  // Map the spin value to rotation
  const spin = spinValue.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  return (
    <View style={styles.container}>
      <StatusBar style="auto" />

      {/* Circle with spinning bear emoji */}
      <View style={styles.circleContainer}>
        <View style={styles.circle}>
          <Animated.Text
            style={[styles.bearEmoji, { transform: [{ rotate: spin }] }]}
          >
            🐻
          </Animated.Text>
        </View>
      </View>

      {/* App name */}
      <Text style={styles.appName}>{appName}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFF8E1", // Light honey color for background
  },
  circleContainer: {
    marginBottom: 24,
  },
  circle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "#FFA000", // Amber/honey color
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: "#FF8F00", // Darker honey outline
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
  },
  bearEmoji: {
    fontSize: 60,
    // No need for specific color as emoji has its own color
  },
  appName: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#5D4037", // Brown color (bear-like)
    marginTop: 16,
  },
});

export default SplashScreen;
