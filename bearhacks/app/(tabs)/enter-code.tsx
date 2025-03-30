import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { supabase } from "../../services/supabase";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

export default function EnterCodeScreen() {
  const [code, setCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleBack = () => {
    if (isLoading) return;

    try {
      console.log("Navigating back to social screen");
      // Use replace instead of back() to ensure we go to the social tab
      router.replace("/(tabs)/social");
    } catch (error) {
      console.error("Navigation error in handleBack:", error);
      // Fallback navigation if replace fails
      try {
        router.push("/(tabs)/social");
      } catch (fallbackError) {
        console.error("Fallback navigation failed:", fallbackError);
        Alert.alert(
          "Error",
          "Unable to return to previous screen. Please restart the app.",
          [{ text: "OK" }]
        );
      }
    }
  };

  const handleSubmit = async () => {
    if (isLoading) return;

    if (!code) {
      Alert.alert("Error", "Please enter a friend code");
      return;
    }

    try {
      setIsLoading(true);
      console.log("Starting friend code submission:", code);

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) {
        console.error("Auth error:", userError);
        throw userError;
      }

      if (!user) {
        console.log("No user found");
        Alert.alert("Error", "Please sign in to use friend codes");
        return;
      }

      console.log("Verifying code for user:", user.id);

      // Verify code exists and isn't expired
      const { data: codeData, error: codeError } = await supabase
        .from("friend_codes")
        .select("user_id, used, expires_at")
        .eq("code", code.toUpperCase())
        .single();

      if (codeError) {
        console.error("Code verification error:", codeError);
        Alert.alert("Error", "Invalid friend code");
        return;
      }

      if (!codeData) {
        console.log("No code data found");
        Alert.alert("Error", "Invalid friend code");
        return;
      }

      if (codeData.used) {
        console.log("Code already used");
        Alert.alert("Error", "This code has already been used");
        return;
      }

      if (new Date(codeData.expires_at) < new Date()) {
        console.log("Code expired");
        Alert.alert("Error", "This code has expired");
        return;
      }

      if (codeData.user_id === user.id) {
        console.log("User tried to follow themselves");
        Alert.alert("Error", "You cannot follow yourself");
        return;
      }

      console.log("Creating follow relationship");

      // Create follow relationship
      const { error: followError } = await supabase.from("follows").insert({
        follower_id: user.id,
        following_id: codeData.user_id,
      });

      if (followError) {
        if (followError.code === "23505") {
          console.log("Already following user");
          Alert.alert("Error", "You are already following this user");
          return;
        }
        console.error("Follow error:", followError);
        throw followError;
      }

      console.log("Marking code as used");

      // Mark code as used
      const { error: updateError } = await supabase
        .from("friend_codes")
        .update({ used: true })
        .eq("code", code.toUpperCase());

      if (updateError) {
        console.error("Error marking code as used:", updateError);
        // Don't throw here as the follow was successful
      }

      console.log("Friend code process completed successfully");

      // Clear the form state before navigation
      setCode("");

      Alert.alert(
        "Success",
        "You are now following this user!",
        [
          {
            text: "OK",
            onPress: () => {
              try {
                console.log("Navigating back after successful submission");
                router.replace("/(tabs)/social");
              } catch (navError) {
                console.error("Navigation error after submission:", navError);
                // Fallback navigation
                try {
                  router.push("/(tabs)/social");
                } catch (fallbackError) {
                  console.error("Fallback navigation failed:", fallbackError);
                  Alert.alert(
                    "Error",
                    "Unable to return to previous screen. Please restart the app.",
                    [{ text: "OK" }]
                  );
                }
              }
            },
          },
        ],
        { cancelable: false }
      );
    } catch (error) {
      console.error("Error following user:", error);
      Alert.alert(
        "Error",
        "Failed to follow user. Please try again.",
        [{ text: "OK" }],
        { cancelable: false }
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={handleBack}
            disabled={isLoading}
          >
            <Ionicons name="arrow-back" size={24} color="#5D4037" />
          </TouchableOpacity>
          <Text style={styles.title}>Enter Friend Code</Text>
        </View>

        <View style={styles.content}>
          <TextInput
            style={[styles.input, { fontFamily: "Minecraft" }]}
            placeholder="Enter friend code"
            placeholderTextColor="#9E9E9E"
            value={code}
            onChangeText={setCode}
            autoCapitalize="characters"
            maxLength={8}
            editable={!isLoading}
          />

          <TouchableOpacity
            style={[
              styles.submitButton,
              isLoading && styles.submitButtonDisabled,
            ]}
            onPress={handleSubmit}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.submitButtonText}>Submit</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#3AA385",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 4,
    borderBottomColor: "#000000",
  },
  backButton: {
    padding: 12,
    backgroundColor: "#F7F5E1",
    borderWidth: 3,
    borderColor: "#000000",
    shadowColor: "#000000",
    shadowOffset: {
      width: 3,
      height: 3,
    },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 4,
  },
  title: {
    fontSize: 24,
    fontFamily: "Minecraft",
    color: "#F7F5E1",
    marginLeft: 16,
    textTransform: "uppercase",
  },
  content: {
    flex: 1,
    padding: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  input: {
    width: "100%",
    height: 50,
    backgroundColor: "#F7F5E1",
    borderWidth: 3,
    borderColor: "#000000",
    paddingHorizontal: 16,
    fontSize: 16,
    color: "#000000",
    marginBottom: 20,
    shadowColor: "#000000",
    shadowOffset: {
      width: 3,
      height: 3,
    },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 4,
  },
  submitButton: {
    width: "100%",
    height: 50,
    backgroundColor: "#8977b6",
    borderWidth: 3,
    borderColor: "#000000",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000000",
    shadowOffset: {
      width: 3,
      height: 3,
    },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 4,
  },
  submitButtonDisabled: {
    backgroundColor: "#8977b6",
    opacity: 0.7,
  },
  submitButtonText: {
    color: "#F7F5E1",
    fontSize: 16,
    fontFamily: "Minecraft",
    textTransform: "uppercase",
  },
});
