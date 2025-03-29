import { Stack, router } from "expo-router";
import React, { useEffect, useState } from "react";
import { View } from "react-native";
import SplashScreen from "../components/SplashScreen";
import AuthScreen from "../components/AuthScreen";
import SignUpScreen from "../components/SignUpScreen";
import { supabase } from "../services/supabase";
import {
  checkExistingBuddy,
  cleanupDuplicateBuddies,
} from "../services/buddyService";

export default function RootLayout() {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showSignUp, setShowSignUp] = useState(false);
  const [isCheckingBuddy, setIsCheckingBuddy] = useState(false);
  const [initialRoute, setInitialRoute] = useState<string | null>(null);

  useEffect(() => {
    checkUser();

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      console.warn("[Auth] Auth state changed:", {
        event: _event,
        userId: session?.user?.id,
      });

      if (_event === "SIGNED_OUT") {
        setIsAuthenticated(false);
        setInitialRoute(null);
        return;
      }

      const hasSession = !!session;
      setIsAuthenticated(hasSession);

      if (hasSession) {
        // Check for existing buddy when user authenticates
        setIsCheckingBuddy(true);
        try {
          await cleanupDuplicateBuddies();
          const { hasBuddy, buddy } = await checkExistingBuddy();
          console.warn("[Auth] Buddy check result:", { hasBuddy, buddy });

          // Set initial route based on buddy existence
          setInitialRoute(hasBuddy ? "/(tabs)/buddy" : "/(tabs)");
        } catch (error) {
          console.error("[Auth] Error checking buddy:", error);
        } finally {
          setIsCheckingBuddy(false);
        }
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const checkUser = async () => {
    try {
      console.warn("[Auth] Starting user check");

      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError) {
        throw sessionError;
      }

      console.warn("[Auth] Got session:", {
        userId: session?.user?.id,
        hasSession: !!session,
      });

      const hasSession = !!session;
      setIsAuthenticated(hasSession);

      if (hasSession) {
        // Check for existing buddy
        setIsCheckingBuddy(true);
        try {
          await cleanupDuplicateBuddies();
          const { hasBuddy, buddy } = await checkExistingBuddy();
          console.warn("[Auth] Initial buddy check result:", {
            hasBuddy,
            buddy,
          });

          // Set initial route based on buddy existence
          setInitialRoute(hasBuddy ? "/(tabs)/buddy" : "/(tabs)");
        } catch (error) {
          console.error("[Auth] Error in initial buddy check:", error);
        } finally {
          setIsCheckingBuddy(false);
        }
      }
    } catch (error) {
      console.error("[Auth] Error checking auth state:", error);
      setIsAuthenticated(false);
      setInitialRoute(null);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle navigation after layout is mounted
  useEffect(() => {
    if (initialRoute && !isLoading && !isCheckingBuddy) {
      console.warn("[Auth] Navigating to initial route:", initialRoute);
      const timer = setTimeout(() => {
        router.replace(initialRoute as any); // Type assertion to bypass type error
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [initialRoute, isLoading, isCheckingBuddy]);

  if (isLoading || isCheckingBuddy) {
    return <SplashScreen />;
  }

  if (!isAuthenticated) {
    return (
      <View style={{ flex: 1 }}>
        {showSignUp ? (
          <SignUpScreen
            onAuthSuccess={async () => {
              console.warn("[Auth] Sign up success");
              setIsAuthenticated(true);
              // Force a fresh buddy check
              setIsCheckingBuddy(true);
              try {
                await cleanupDuplicateBuddies();
                const { hasBuddy } = await checkExistingBuddy();
                console.warn("[Auth] Sign up buddy check:", { hasBuddy });
                setInitialRoute(hasBuddy ? "/(tabs)/buddy" : "/(tabs)");
              } catch (error) {
                console.error("[Auth] Error in signup buddy check:", error);
              } finally {
                setIsCheckingBuddy(false);
              }
            }}
            onSignInPress={() => setShowSignUp(false)}
          />
        ) : (
          <AuthScreen
            onAuthSuccess={async () => {
              console.warn("[Auth] Sign in success");
              setIsAuthenticated(true);
              // Force a fresh buddy check
              setIsCheckingBuddy(true);
              try {
                await cleanupDuplicateBuddies();
                const { hasBuddy } = await checkExistingBuddy();
                console.warn("[Auth] Sign in buddy check:", { hasBuddy });
                setInitialRoute(hasBuddy ? "/(tabs)/buddy" : "/(tabs)");
              } catch (error) {
                console.error("[Auth] Error in signin buddy check:", error);
              } finally {
                setIsCheckingBuddy(false);
              }
            }}
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
