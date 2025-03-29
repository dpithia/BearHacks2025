import React, { useState, useEffect } from "react";
import { StyleSheet, View, Text } from "react-native";
import SplashScreen from "../../components/SplashScreen";

export default function HomeScreen() {
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

  // This placeholder will be replaced with your actual content
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Main Screen Placeholder</Text>
      {/* We'll build your actual content here in the next steps */}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFF8E1",
    alignItems: "center",
    justifyContent: "center",
  },
  text: {
    fontSize: 20,
    color: "#5D4037",
  },
});
