import React, { useEffect } from "react";
import { Tabs, useRouter, usePathname } from "expo-router";
import { checkExistingBuddy } from "../../services/buddyService";
import { Ionicons } from "@expo/vector-icons";

export default function TabLayout() {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const checkBuddy = async () => {
      if (pathname === "/(tabs)" || pathname === "/(tabs)/index") {
        const hasBuddy = await checkExistingBuddy();
        console.log("Has buddy:", hasBuddy);
        if (hasBuddy) {
          router.replace("/(tabs)/buddy");
        }
      }
    };
    checkBuddy();
  }, [pathname]);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: "#FFFFFF",
          borderTopWidth: 2,
          borderTopColor: "#000000",
        },
        tabBarActiveTintColor: "#66B288",
        tabBarInactiveTintColor: "#000000",
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Create",
          tabBarIcon: ({ color }) => (
            <Ionicons name="add-circle-outline" size={24} color={color} />
          ),
          tabBarStyle: { display: "none" },
        }}
      />
      <Tabs.Screen
        name="buddy"
        options={{
          title: "Buddy",
          tabBarIcon: ({ color }) => (
            <Ionicons name="heart-outline" size={24} color={color} />
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
          tabBarStyle: { display: "none" },
        }}
      />
    </Tabs>
  );
}
