import { Stack } from "expo-router";
import React, { useEffect, useState } from "react";
import { View } from "react-native";
import SplashScreen from "../../components/SplashScreen";
import AuthScreen from "../../components/AuthScreen";
import SignUpScreen from "../../components/SignUpScreen";
import { supabase } from "../../services/supabase";

export default function RootLayout() {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showSignUp, setShowSignUp] = useState(false);

  useEffect(() => {
    checkUser();

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAuthenticated(!!session);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const checkUser = async () => {
    try {
      // Clear any existing session first
      await supabase.auth.signOut();

      const {
        data: { session },
      } = await supabase.auth.getSession();
      setIsAuthenticated(!!session);
    } catch (error) {
      console.error("Error checking auth state:", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return <SplashScreen />;
  }

  if (!isAuthenticated) {
    return (
      <View style={{ flex: 1 }}>
        {showSignUp ? (
          <SignUpScreen
            onAuthSuccess={() => setIsAuthenticated(true)}
            onSignInPress={() => setShowSignUp(false)}
          />
        ) : (
          <AuthScreen
            onAuthSuccess={() => setIsAuthenticated(true)}
            onSignUpPress={() => setShowSignUp(true)}
          />
        )}
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
    </Stack>
  );
}
