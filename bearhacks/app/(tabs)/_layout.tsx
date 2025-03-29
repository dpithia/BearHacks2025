import React, { useEffect, useRef } from "react";
import { Tabs, useRouter, usePathname } from "expo-router";
import { checkExistingBuddy } from "../../services/buddyService";
import { Ionicons } from "@expo/vector-icons";

export default function TabLayout() {
  const router = useRouter();
  const pathname = usePathname();
  const initialCheckDone = useRef(false);

  useEffect(() => {
    // Only check once on initial mount if we're on the index page
    // and we haven't already checked in the root layout
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
        tabBarActiveTintColor: "#FFA000",
        tabBarInactiveTintColor: "#5D4037",
        tabBarStyle: {
          backgroundColor: "#FFF8E1",
          borderTopColor: "#FFE0B2",
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
          title: "Buddy",
          tabBarIcon: ({ color }) => (
            <Ionicons name="paw-outline" size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: "Explore",
          tabBarIcon: ({ color }) => (
            <Ionicons name="restaurant-outline" size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="social"
        options={{
          title: "Social",
          tabBarIcon: ({ color }) => (
            <Ionicons name="people-outline" size={24} color={color} />
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
