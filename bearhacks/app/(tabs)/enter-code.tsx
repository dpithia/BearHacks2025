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
  SafeAreaView,
} from "react-native";
import { router } from "expo-router";
import { supabase } from "../../services/supabase";

export default function EnterCodeScreen() {
  const [code, setCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleBack = () => {
    try {
      router.back();
    } catch (error) {
      console.error("Error navigating back:", error);
      router.replace("/(tabs)/social");
    }
  };

  const handleSubmit = async () => {
    if (!code.trim()) {
      Alert.alert("Error", "Please enter a friend code");
      return;
    }

    setIsLoading(true);
    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();
      if (userError) throw userError;
      if (!user) {
        Alert.alert("Error", "Please sign in to use friend codes");
        return;
      }

      // Find the friend code
      const { data: codeData, error: codeError } = await supabase
        .from("friend_codes")
        .select("user_id, used, expires_at")
        .eq("code", code.trim().toUpperCase())
        .single();

      if (codeError || !codeData) {
        Alert.alert("Error", "Invalid friend code");
        return;
      }

      if (codeData.used) {
        Alert.alert("Error", "This friend code has already been used");
        return;
      }

      const now = new Date();
      const expiresAt = new Date(codeData.expires_at);
      if (now > expiresAt) {
        Alert.alert("Error", "This friend code has expired");
        return;
      }

      if (codeData.user_id === user.id) {
        Alert.alert("Error", "You cannot use your own friend code");
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
        } else {
          throw followError;
        }
        return;
      }

      // Mark code as used
      const { error: updateError } = await supabase
        .from("friend_codes")
        .update({ used: true })
        .eq("code", code.trim().toUpperCase());

      if (updateError) throw updateError;

      Alert.alert("Success", "You are now following this user!", [
        { text: "OK", onPress: handleBack },
      ]);
    } catch (error) {
      console.error("Error submitting friend code:", error);
      Alert.alert("Error", "Failed to process friend code. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior="padding" style={styles.content}>
        <Text style={styles.title}>Enter Friend Code</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter 8-character code"
          value={code}
          onChangeText={setCode}
          autoCapitalize="characters"
          maxLength={8}
          editable={!isLoading}
        />
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.button, { backgroundColor: "#FB8C00" }]}
            onPress={handleSubmit}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={styles.buttonText}>Submit</Text>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.button, { backgroundColor: "#FFB74D" }]}
            onPress={handleBack}
            disabled={isLoading}
          >
            <Text style={styles.buttonText}>Back</Text>
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
  content: {
    flex: 1,
    padding: 16,
    justifyContent: "center",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#5D4037",
    textAlign: "center",
    marginBottom: 24,
  },
  input: {
    backgroundColor: "white",
    padding: 16,
    borderRadius: 12,
    fontSize: 20,
    textAlign: "center",
    letterSpacing: 2,
    marginBottom: 24,
    borderWidth: 2,
    borderColor: "#FFE0B2",
  },
  buttonContainer: {
    gap: 12,
  },
  button: {
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  buttonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
  },
});
