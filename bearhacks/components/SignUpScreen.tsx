import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ImageBackground,
  Platform,
  SafeAreaView,
} from "react-native";
import { supabase } from "../services/supabase";

interface SignUpScreenProps {
  onAuthSuccess: () => void;
  onSignInPress: () => void;
}

const SignUpScreen: React.FC<SignUpScreenProps> = ({
  onAuthSuccess,
  onSignInPress,
}) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSignUp = async () => {
    if (password !== confirmPassword) {
      Alert.alert("Error", "Passwords do not match");
      return;
    }

    if (!email.includes("@")) {
      Alert.alert("Error", "Please enter a valid email address");
      return;
    }

    try {
      setLoading(true);
      const { error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) throw error;

      // Sign in immediately after successful sign up
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) throw signInError;

      onAuthSuccess();
    } catch (error: any) {
      Alert.alert("Error", error.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>SIGN UP</Text>
        </View>

        <View style={styles.contentContainer}>
          <View style={styles.formContainer}>
            <Text style={styles.label}>EMAIL</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter your email addres"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
              placeholderTextColor="#666"
            />

            <Text style={styles.label}>PASSWORD</Text>
            <TextInput
              style={styles.input}
              placeholder="Create a password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoComplete="new-password"
              placeholderTextColor="#666"
            />

            <Text style={styles.label}>CONFIRM PASSWORD</Text>
            <TextInput
              style={styles.input}
              placeholder="Confirm your password"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
              autoComplete="new-password"
              placeholderTextColor="#666"
            />

            <TouchableOpacity
              style={styles.createButton}
              onPress={handleSignUp}
              disabled={loading}
            >
              <Text style={styles.createButtonText}>CREATE ACCOUNT</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.signInText}>ALREADY HAVE AN ACCOUNT?</Text>
          <TouchableOpacity style={styles.signInButton} onPress={onSignInPress}>
            <Text style={styles.signInButtonText}>SIGN IN</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#3AA385", // pixel-green
    paddingTop: Platform.OS === "ios" ? 47 : 0, // Account for dynamic island
  },
  container: {
    flex: 1,
    backgroundColor: "#3AA385", // pixel-green
  },
  header: {
    backgroundColor: "#F7F5E1", // pixel-cream
    borderBottomWidth: 4,
    borderBottomColor: "#000000",
    padding: 12,
    shadowColor: "#000000",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 4,
  },
  headerTitle: {
    fontSize: 28,
    fontFamily: "Minecraft",
    fontWeight: "400",
    textAlign: "center",
    color: "#000000",
  },
  contentContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
    backgroundColor: "#3AA385", // pixel-green
  },
  formContainer: {
    width: "100%",
    maxWidth: 400,
    backgroundColor: "#FFFCEE", // pixel-cream-light
    borderWidth: 4,
    borderColor: "#000000",
    padding: 20,
    marginBottom: 16,
    shadowColor: "#000000",
    shadowOffset: {
      width: 5,
      height: 5,
    },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 5,
  },
  label: {
    fontSize: 16,
    fontFamily: "Minecraft",
    fontWeight: "400",
    marginBottom: 8,
    color: "#000000",
  },
  input: {
    width: "100%",
    height: 44,
    backgroundColor: "#FFFCEE", // pixel-cream-light
    borderWidth: 2,
    borderColor: "#000000",
    padding: 8,
    marginBottom: 16,
    fontFamily: "Minecraft",
    fontSize: 14,
    color: "#000000",
  },
  createButton: {
    backgroundColor: "#F7F5E1", // pixel-cream
    borderWidth: 2,
    borderColor: "#000000",
    padding: 12,
    marginTop: 8,
    shadowColor: "#000000",
    shadowOffset: {
      width: 4,
      height: 4,
    },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 4,
  },
  createButtonText: {
    color: "#000000",
    fontFamily: "Minecraft",
    fontSize: 16,
    fontWeight: "400",
    textAlign: "center",
  },
  signInText: {
    color: "#000000",
    fontFamily: "Minecraft",
    fontSize: 14,
    fontWeight: "400",
    marginBottom: 8,
  },
  signInButton: {
    backgroundColor: "#8977b6", // pixel-purple
    borderWidth: 2,
    borderColor: "#000000",
    paddingVertical: 8,
    paddingHorizontal: 24,
    shadowColor: "#000000",
    shadowOffset: {
      width: 4,
      height: 4,
    },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 4,
  },
  signInButtonText: {
    color: "#FFFCEE", // pixel-cream-light
    fontFamily: "Minecraft",
    fontSize: 14,
    fontWeight: "400",
    textAlign: "center",
  },
});

export default SignUpScreen;
