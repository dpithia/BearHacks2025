import React, { useEffect, useRef } from "react";
import { Tabs, useRouter, usePathname } from "expo-router";
import { checkExistingBuddy } from "../../services/buddyService";
import { Ionicons } from "@expo/vector-icons";
import { Platform } from "react-native";

export default function TabLayout() {
  const router = useRouter();
  const pathname = usePathname();
  const initialCheckDone = useRef(false);

  useEffect(() => {
    if (
      !initialCheckDone.current &&
      (pathname === "/(tabs)" || pathname === "/(tabs)/index")
    ) {
      console.warn("[TabLayout] Running initial buddy check");

      const checkBuddy = async () => {
        try {
          const { hasBuddy } = await checkExistingBuddy();
          console.warn("[TabLayout] Buddy check result:", { hasBuddy });

          if (hasBuddy) {
            console.warn("[TabLayout] Redirecting to buddy screen");
            router.replace("/(tabs)/buddy");
          } else {
            console.warn("[TabLayout] No buddy found, staying on index");
          }
        } catch (error) {
          console.error("[TabLayout] Error checking buddy:", error);
        } finally {
          initialCheckDone.current = true;
        }
      };

      checkBuddy();
    }
  }, [pathname, router]);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#000000",
        tabBarInactiveTintColor: "#666666",
        tabBarStyle: {
          backgroundColor: "#F7F5E1", // pixel-cream
          borderTopWidth: 4,
          borderTopColor: "#000000",
          height: Platform.OS === "ios" ? 88 : 60,
          paddingBottom: Platform.OS === "ios" ? 28 : 8,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontFamily: "Minecraft",
          fontSize: 10,
          textTransform: "uppercase",
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          href: null,
          tabBarStyle: { display: "none" },
        }}
      />
      <Tabs.Screen
        name="buddy"
        options={{
          title: "BUDDY",
          tabBarIcon: ({ color }) => (
            <Ionicons name="lock-closed" size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: "JOURNAL",
          tabBarIcon: ({ color }) => (
            <Ionicons name="book" size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="social"
        options={{
          title: "SOCIAL",
          tabBarIcon: ({ color }) => (
            <Ionicons name="happy" size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="enter-code"
        options={{
          href: null,
          tabBarStyle: { display: "none" },
        }}
      />
    </Tabs>
  );
}
