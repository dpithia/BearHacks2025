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
      router.replace(initialRoute as any);
    }
  }, [isLoading, isCheckingBuddy, forceShowSplash, fontsLoaded, initialRoute]);

  useEffect(() => {
    checkUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (_event === "SIGNED_OUT") {
        await SecureStore.deleteItemAsync("supabase-auth");
        setIsAuthenticated(false);
        setInitialRoute("/auth");
        return;
      }

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
