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

  return (
    <View style={{ flex: 1 }}>
      {showSignUp ? (
        <SignUpScreen
          onAuthSuccess={async () => {
            console.warn("[Auth] Sign up success");
            try {
              await cleanupDuplicateBuddies();
              const { hasBuddy } = await checkExistingBuddy();
              console.warn("[Auth] Sign up buddy check:", { hasBuddy });
              router.replace(hasBuddy ? "/(tabs)/buddy" : "/(tabs)");
            } catch (error) {
              console.error("[Auth] Error in signup buddy check:", error);
            }
          }}
          onSignInPress={() => setShowSignUp(false)}
        />
      ) : (
        <AuthScreen
          onAuthSuccess={async () => {
            console.warn("[Auth] Sign in success");
            try {
              await cleanupDuplicateBuddies();
              const { hasBuddy } = await checkExistingBuddy();
              console.warn("[Auth] Sign in buddy check:", { hasBuddy });
              router.replace(hasBuddy ? "/(tabs)/buddy" : "/(tabs)");
            } catch (error) {
              console.error("[Auth] Error in signin buddy check:", error);
            }
          }}
          onSignUpPress={() => setShowSignUp(true)}
        />
      )}
    </View>
  );
}
