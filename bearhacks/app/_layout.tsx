import { Stack, router, Slot } from "expo-router";
import React, { useEffect, useState } from "react";
import { View } from "react-native";
import SplashScreen from "../components/SplashScreen";
import { supabase } from "../services/supabase";
import {
  checkExistingBuddy,
  cleanupDuplicateBuddies,
} from "../services/buddyService";
import * as SecureStore from "expo-secure-store";
import { useFonts } from "expo-font";

export default function RootLayout() {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isCheckingBuddy, setIsCheckingBuddy] = useState(false);
  const [forceShowSplash, setForceShowSplash] = useState(true);
  const [initialRoute, setInitialRoute] = useState<string | null>(null);

  const [fontsLoaded] = useFonts({
    Minecraft: require("../assets/fonts/Minecraft.ttf"),
  });

  useEffect(() => {
    const timer = setTimeout(() => {
      setForceShowSplash(false);
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  // Handle navigation after everything is loaded
  useEffect(() => {
    if (
      !isLoading &&
      !isCheckingBuddy &&
      !forceShowSplash &&
      fontsLoaded &&
      initialRoute
    ) {
      console.log(`[Navigation] Replacing route to: ${initialRoute}`);
      router.replace(initialRoute as any);
    }
  }, [isLoading, isCheckingBuddy, forceShowSplash, fontsLoaded, initialRoute]);

  // Handle auth state changes
  useEffect(() => {
    checkUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      console.log(`[Auth] Auth state changed: ${_event}`);

      if (_event === "SIGNED_OUT") {
        console.log("[Auth] User signed out, resetting app state");
        await SecureStore.deleteItemAsync("supabase-auth");

        // Force a complete reset of the app state without splash screen
        setIsAuthenticated(false);
        setIsLoading(true); // Force loading state to true briefly

        // Navigate to auth immediately
        router.replace("/auth");
        setInitialRoute("/auth");

        // Reset loading state after a brief delay to ensure components remount
        setTimeout(() => {
          console.log("[Auth] Finished sign-out process, app should be ready");
          setIsLoading(false);
        }, 500);

        return;
      }

      // For SIGNED_IN event, we handle this more efficiently
      if (_event === "SIGNED_IN") {
        console.log("[Auth] User signed in, checking buddy state");
        const hasSession = !!session;
        setIsAuthenticated(hasSession);

        if (hasSession) {
          try {
            // Skip buddy cleanup during sign-in for faster transitions
            const { hasBuddy } = await checkExistingBuddy();
            console.log("[Auth] Buddy check result:", { hasBuddy });

            // Set route directly without additional state changes
            const targetRoute = hasBuddy ? "/(tabs)/buddy" : "/(tabs)";
            setInitialRoute(targetRoute);

            // Skip loading state updates for smoother transition
            return;
          } catch (error) {
            console.error("[Auth] Error checking buddy:", error);
            setInitialRoute("/auth");
          }
        }
        return;
      }

      // Handle other auth state changes
      const hasSession = !!session;
      setIsAuthenticated(hasSession);

      if (hasSession) {
        setIsCheckingBuddy(true);
        try {
          await cleanupDuplicateBuddies();
          const { hasBuddy } = await checkExistingBuddy();
          setInitialRoute(hasBuddy ? "/(tabs)/buddy" : "/(tabs)");
        } catch (error) {
          console.error("[Auth] Error checking buddy:", error);
          setInitialRoute("/auth");
        } finally {
          setIsCheckingBuddy(false);
        }
      } else {
        setInitialRoute("/auth");
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const checkUser = async () => {
    try {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError) throw sessionError;

      const hasSession = !!session;
      setIsAuthenticated(hasSession);

      if (hasSession) {
        setIsCheckingBuddy(true);
        try {
          await cleanupDuplicateBuddies();
          const { hasBuddy } = await checkExistingBuddy();
          setInitialRoute(hasBuddy ? "/(tabs)/buddy" : "/(tabs)");
        } catch (error) {
          console.error("[Auth] Error in initial buddy check:", error);
          setInitialRoute("/auth");
        } finally {
          setIsCheckingBuddy(false);
        }
      } else {
        setInitialRoute("/auth");
      }
    } catch (error) {
      console.error("[Auth] Error checking auth state:", error);
      setIsAuthenticated(false);
      await SecureStore.deleteItemAsync("supabase-auth");
      setInitialRoute("/auth");
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading || isCheckingBuddy || !fontsLoaded || forceShowSplash) {
    // Don't show splash screen in these cases:
    // 1. During logout when navigating to auth route
    // 2. When navigating to buddy creation screen after signup
    if (
      (isLoading && initialRoute === "/auth" && isAuthenticated === false) ||
      (isCheckingBuddy && initialRoute === "/(tabs)")
    ) {
      return null;
    }
    return <SplashScreen />;
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="auth" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="+not-found" options={{ title: "Oops!" }} />
    </Stack>
  );
}
