import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { supabase } from "../services/supabase";
import { router } from "expo-router";

export default function EnterCodeScreen() {
  const [code, setCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async () => {
    if (!code) {
      Alert.alert("Error", "Please enter a friend code");
      return;
    }

    try {
      setIsLoading(true);

      // Get current user
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Verify code exists and isn't expired
      const { data: codeData, error: codeError } = await supabase
        .from("friend_codes")
        .select("user_id, used, expires_at")
        .eq("code", code.toUpperCase())
        .single();

      if (codeError || !codeData) {
        Alert.alert("Error", "Invalid friend code");
        return;
      }

      if (codeData.used) {
        Alert.alert("Error", "This code has already been used");
        return;
      }

      if (new Date(codeData.expires_at) < new Date()) {
        Alert.alert("Error", "This code has expired");
        return;
      }

      if (codeData.user_id === user.id) {
        Alert.alert("Error", "You cannot follow yourself");
        return;
      }

      // Create follow relationship
      const { error: followError } = await supabase.from("follows").insert({
        follower_id: user.id,
        following_id: codeData.user_id,
      });

      if (followError) {
        if (followError.code === "23505") {
          Alert.alert("Error", "You are already following this user");
          return;
        }
        throw followError;
      }

      // Mark code as used
      await supabase
        .from("friend_codes")
        .update({ used: true })
        .eq("code", code.toUpperCase());

      Alert.alert("Success", "You are now following this user!", [
        {
          text: "OK",
          onPress: () => router.back(),
        },
      ]);
    } catch (error) {
      console.error("Error following user:", error);
      Alert.alert("Error", "Failed to follow user");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Enter Friend Code</Text>
        <TextInput
          style={styles.input}
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
            <ActivityIndicator color="white" />
          ) : (
            <Text style={styles.buttonText}>Follow Friend</Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFF8E1",
  },
  content: {
    padding: 16,
    alignItems: "center",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#5D4037",
    marginBottom: 24,
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
