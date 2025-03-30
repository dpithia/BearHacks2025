import React, { useState, useEffect, useRef } from "react";
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
  TouchableWithoutFeedback,
  Keyboard,
  KeyboardAvoidingView,
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

  const emailInputRef = useRef<TextInput>(null);
  const passwordInputRef = useRef<TextInput>(null);
  const confirmPasswordInputRef = useRef<TextInput>(null);

  // Reset loading state when component mounts
  useEffect(() => {
    console.log("[SignUpScreen] Component mounted, resetting loading state");
    setLoading(false);
    setEmail("");
    setPassword("");
    setConfirmPassword("");

    // Using a longer delay to ensure screen is fully mounted
    const timer = setTimeout(() => {
      if (emailInputRef.current) {
        emailInputRef.current.focus();
        console.log("[SignUpScreen] Focused email input");
      }
    }, 800);

    return () => {
      clearTimeout(timer);
      // Clear form fields when component unmounts
      setEmail("");
      setPassword("");
      setConfirmPassword("");
    };
  }, []);

  // Add a second attempt to focus after the initial one
  useEffect(() => {
    const backupTimer = setTimeout(() => {
      if (emailInputRef.current) {
        emailInputRef.current.focus();
        console.log("[SignUpScreen] Backup focus on email input");
      }
    }, 1500);

    return () => clearTimeout(backupTimer);
  }, []);

  const handleSignUp = async () => {
    if (password !== confirmPassword) {
      Alert.alert("Error", "Passwords do not match");
      return;
    }

    if (!email.includes("@")) {
      Alert.alert("Error", "Please enter a valid email address");
      return;
    }

    // Prevent multiple attempts if already loading
    if (loading) return;

    try {
      setLoading(true);
      console.log("[SignUpScreen] Signing up with email:", email);

      const { error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) throw error;

      console.log(
        "[SignUpScreen] Sign up successful, signing in automatically"
      );

      // Sign in immediately after successful sign up
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) throw signInError;

      console.log("[SignUpScreen] Sign in successful, calling onAuthSuccess");

      // Important: Don't set loading to false here as we're transitioning to another screen
      onAuthSuccess();
    } catch (error: any) {
      Alert.alert("Error", error.message || "An error occurred");
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>SIGN UP</Text>
      </View>

      <View style={styles.fixedContentContainer}>
        <View style={styles.formContainer}>
          <Text style={styles.label}>EMAIL</Text>
          <TextInput
            ref={emailInputRef}
            key="signup-email-input-static"
            style={styles.input}
            placeholder="Enter your email address"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
            textContentType="emailAddress"
            placeholderTextColor="#666"
            editable={true}
            onSubmitEditing={() => passwordInputRef.current?.focus()}
            returnKeyType="next"
            autoCorrect={false}
            blurOnSubmit={false}
            spellCheck={false}
          />

          <Text style={styles.label}>PASSWORD</Text>
          <TextInput
            ref={passwordInputRef}
            key="signup-password-input-static"
            style={styles.input}
            placeholder="Create a password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoComplete="new-password"
            textContentType="oneTimeCode"
            placeholderTextColor="#666"
            editable={true}
            onSubmitEditing={() => confirmPasswordInputRef.current?.focus()}
            returnKeyType="next"
            autoCorrect={false}
            blurOnSubmit={false}
            contextMenuHidden={true}
            spellCheck={false}
            keyboardType={
              Platform.OS === "ios" ? "default" : "visible-password"
            }
          />

          <Text style={styles.label}>CONFIRM PASSWORD</Text>
          <TextInput
            ref={confirmPasswordInputRef}
            key="signup-confirm-input-static"
            style={styles.input}
            placeholder="Confirm your password"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry
            autoComplete="new-password"
            textContentType="oneTimeCode"
            placeholderTextColor="#666"
            editable={true}
            onSubmitEditing={handleSignUp}
            returnKeyType="done"
            autoCorrect={false}
            blurOnSubmit={false}
            contextMenuHidden={true}
            spellCheck={false}
            keyboardType={
              Platform.OS === "ios" ? "default" : "visible-password"
            }
          />

          <TouchableOpacity
            style={[styles.createButton, loading && styles.disabledButton]}
            onPress={handleSignUp}
            disabled={loading}
            activeOpacity={0.7}
          >
            <Text style={styles.createButtonText}>
              {loading ? "CREATING..." : "CREATE ACCOUNT"}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.bottomContainer}>
          <Text style={styles.signInText}>ALREADY HAVE AN ACCOUNT?</Text>
          <TouchableOpacity
            style={styles.signInButton}
            onPress={onSignInPress}
            disabled={loading}
          >
            <Text style={styles.signInButtonText}>SIGN IN</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Dismiss keyboard when tapping anywhere else */}
      <TouchableWithoutFeedback
        style={styles.keyboardDismiss}
        onPress={Keyboard.dismiss}
      >
        <View style={styles.keyboardDismiss} />
      </TouchableWithoutFeedback>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#3AA385", // pixel-green
    paddingTop: Platform.OS === "ios" ? 47 : 0, // Account for dynamic island
  },
  header: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    backgroundColor: "#F7F5E1", // pixel-cream
    borderBottomWidth: 4,
    borderBottomColor: "#000000",
    paddingTop: 65,
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
    fontSize: 32,
    fontFamily: "Minecraft",
    fontWeight: "400",
    textAlign: "center",
    color: "#000000",
  },
  fixedContentContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "flex-start",
    alignItems: "center",
    backgroundColor: "#3AA385", // pixel-green
    paddingTop: Platform.OS === "ios" ? 140 : 120,
    paddingBottom: 0,
  },
  formContainer: {
    width: "90%",
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
    marginRight: 10,
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
  disabledButton: {
    opacity: 0.5,
  },
  bottomContainer: {
    marginTop: 20,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    width: "100%",
  },
  keyboardDismiss: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: -1,
  },
});

export default SignUpScreen;
