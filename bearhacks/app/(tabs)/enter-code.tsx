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

      // Get current user
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
          <View style={{ width: 24 }} />
        </View>

        <View style={styles.content}>
          <TextInput
            style={[styles.input, isLoading && styles.inputDisabled]}
            value={code}
            onChangeText={setCode}
            placeholder="Enter 8-character code"
            autoCapitalize="characters"
            maxLength={8}
            editable={!isLoading}
          />
          <TouchableOpacity
            style={[styles.button, isLoading && styles.buttonDisabled]}
            onPress={handleSubmit}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="white" size="small" />
            ) : (
              <Text style={styles.buttonText}>Follow Friend</Text>
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
    backgroundColor: "#FFF8E1",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#FFE0B2",
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#5D4037",
  },
  content: {
    padding: 16,
    alignItems: "center",
  },
  input: {
    width: "100%",
    backgroundColor: "white",
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#FFE0B2",
    fontSize: 18,
    textAlign: "center",
    marginBottom: 16,
  },
  inputDisabled: {
    opacity: 0.7,
    backgroundColor: "#F5F5F5",
  },
  button: {
    backgroundColor: "#FFA000",
    padding: 16,
    borderRadius: 12,
    width: "100%",
    alignItems: "center",
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: "white",
    fontSize: 18,
    fontWeight: "bold",
  },
});
