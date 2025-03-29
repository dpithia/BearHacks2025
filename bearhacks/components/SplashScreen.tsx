import React, { useEffect, useRef } from "react";
import {
  View,
  StyleSheet,
  Animated,
  Easing,
  Platform,
  Image,
  Dimensions,
} from "react-native";
import { StatusBar } from "expo-status-bar";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const LOGO_SIZE = Math.min(SCREEN_WIDTH * 0.6, 300); // Reduced to 60% of screen width, max 300px

interface SplashScreenProps {
  appName?: string;
}

const SplashScreen: React.FC<SplashScreenProps> = () => {
  // Animation values
  const scaleValue = useRef(new Animated.Value(0.8)).current;
  const opacityValue = useRef(new Animated.Value(0)).current;
  const loadingBarWidth = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    startAnimations();
  }, []);

  const startAnimations = () => {
    // Reset animation values
    scaleValue.setValue(0.8);
    opacityValue.setValue(0);
    loadingBarWidth.setValue(0);

    // Create parallel animations
    Animated.parallel([
      // Scale animation
      Animated.sequence([
        Animated.timing(scaleValue, {
          toValue: 1.1,
          duration: 500,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(scaleValue, {
          toValue: 1,
          duration: 300,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
      // Fade in animation
      Animated.timing(opacityValue, {
        toValue: 1,
        duration: 800,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
      // Loading bar animation
      Animated.sequence([
        // Wait a bit before starting
        Animated.delay(400),
        // Animate to 70% quickly
        Animated.timing(loadingBarWidth, {
          toValue: 70,
          duration: 700,
          easing: Easing.out(Easing.ease),
          useNativeDriver: false,
        }),
        // Slow down in the middle
        Animated.timing(loadingBarWidth, {
          toValue: 85,
          duration: 600,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: false,
        }),
        // Quick jump to completion
        Animated.timing(loadingBarWidth, {
          toValue: 100,
          duration: 400,
          easing: Easing.in(Easing.ease),
          useNativeDriver: false,
        }),
      ]),
    ]).start();
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      {/* Logo */}
      <Animated.View
        style={[
          styles.logoContainer,
          {
            opacity: opacityValue,
            transform: [{ scale: scaleValue }],
          },
        ]}
      >
        <Image
          source={require("../assets/images/splashscreen.png")}
          style={styles.logo}
          resizeMode="contain"
        />
      </Animated.View>

      {/* Loading Bar */}
      <View style={styles.loadingBarContainer}>
        <Animated.View
          style={[
            styles.loadingBar,
            {
              width: loadingBarWidth.interpolate({
                inputRange: [0, 100],
                outputRange: ["0%", "100%"],
              }),
            },
          ]}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#3AA385",
    padding: 20,
  },
  logoContainer: {
    marginBottom: 40,
    backgroundColor: "#F7F5E1",
    padding: 20,
    borderRadius: 20,
    shadowColor: "#000000",
    shadowOffset: {
      width: 4,
      height: 4,
    },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 8,
  },
  logo: {
    width: LOGO_SIZE,
    height: LOGO_SIZE,
  },
  loadingBarContainer: {
    width: Math.min(SCREEN_WIDTH * 0.7, 300),
    height: 8,
    backgroundColor: "#F7F5E1",
    borderRadius: 4,
    overflow: "hidden",
    borderWidth: 2,
    borderColor: "#000000",
  },
  loadingBar: {
    height: "100%",
    backgroundColor: "#3AA385",
  },
});

export default SplashScreen;
