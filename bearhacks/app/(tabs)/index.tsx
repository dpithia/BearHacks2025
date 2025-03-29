import React, { useState, useEffect } from "react";
import { StyleSheet, View, Text } from "react-native";
import SplashScreen from "../../components/SplashScreen";

export default function TabOneScreen() {
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Simulate loading time
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 3000); // Show splash screen for 3 seconds

    return () => clearTimeout(timer);
  }, []);

  // Show splash screen while loading
  if (isLoading) {
    return <SplashScreen appName="BearApp" />;
  }

  // Your main app content
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Welcome to BearApp!</Text>
      <Text style={styles.subtitle}>Your bear-themed application</Text>
      {/* More content will be added in future steps */}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFF8E1",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#5D4037",
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    color: "#795548",
  },
});
