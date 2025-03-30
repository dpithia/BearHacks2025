import React, { useState } from "react";
import { View } from "react-native";
import AuthScreen from "../components/AuthScreen";
import SignUpScreen from "../components/SignUpScreen";
import {
  cleanupDuplicateBuddies,
  checkExistingBuddy,
} from "../services/buddyService";
import { router } from "expo-router";

export default function Auth() {
  const [showSignUp, setShowSignUp] = useState(false);
  const [isAuthProcessing, setIsAuthProcessing] = useState(false);

  const handleAuthSuccess = async () => {
    // Set a flag to prevent multiple loading screens
    setIsAuthProcessing(true);

    console.warn("[Auth] Authentication success");
    try {
      await cleanupDuplicateBuddies();
      const { hasBuddy } = await checkExistingBuddy();
      console.warn("[Auth] Buddy check:", { hasBuddy });

      // Replace route directly without showing splash
      router.replace(hasBuddy ? "/(tabs)/buddy" : "/(tabs)");
    } catch (error) {
      console.error("[Auth] Error in buddy check:", error);
      setIsAuthProcessing(false);
    }
  };

  // If auth is processing, show a blank screen to prevent flashes
  if (isAuthProcessing) {
    return <View style={{ flex: 1, backgroundColor: "#3AA385" }} />;
  }

  return (
    <View style={{ flex: 1 }}>
      {showSignUp ? (
        <SignUpScreen
          onAuthSuccess={handleAuthSuccess}
          onSignInPress={() => setShowSignUp(false)}
        />
      ) : (
        <AuthScreen
          onAuthSuccess={handleAuthSuccess}
          onSignUpPress={() => setShowSignUp(true)}
        />
      )}
    </View>
  );
}
