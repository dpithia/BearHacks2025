import React, { useEffect, useRef } from "react";
import { View, Text, StyleSheet, Animated, Easing } from "react-native";
import { StatusBar } from "expo-status-bar";

interface SplashScreenProps {
  appName?: string;
}

const SplashScreen: React.FC<SplashScreenProps> = ({
  appName = "BearBuddy",
}) => {
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
    backgroundColor: "#3AA385",
  },
  circleContainer: {
    marginBottom: 24,
    shadowColor: "#000000",
    shadowOffset: {
      width: 4,
      height: 4,
    },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 8,
  },
  circle: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: "#F7F5E1",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 4,
    borderColor: "#000000",
  },
  bearEmoji: {
    fontSize: 70,
    fontFamily: "Minecraft",
  },
  appName: {
    fontSize: 32,
    fontFamily: "Minecraft",
    color: "#F7F5E1",
    marginTop: 24,
    textTransform: "uppercase",
    textShadowColor: "#000000",
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 0,
  },
});

export default SplashScreen;
