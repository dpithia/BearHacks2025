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

interface AuthScreenProps {
  onAuthSuccess: () => void;
  onSignUpPress: () => void;
}

const AuthScreen: React.FC<AuthScreenProps> = ({
  onAuthSuccess,
  onSignUpPress,
}) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSignIn = async () => {
    if (!email.includes("@")) {
      Alert.alert("Error", "Please enter a valid email address");
      return;
    }

    try {
      setLoading(true);
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
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
          <Text style={styles.headerTitle}>SIGN IN</Text>
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
              placeholder="Enter your password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoComplete="password"
              placeholderTextColor="#666"
            />

            <TouchableOpacity
              style={styles.signInButton}
              onPress={handleSignIn}
              disabled={loading}
            >
              <Text style={styles.signInButtonText}>SIGN IN</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.signUpText}>DON'T HAVE AN ACCOUNT?</Text>
          <TouchableOpacity style={styles.signUpButton} onPress={onSignUpPress}>
            <Text style={styles.signUpButtonText}>SIGN UP</Text>
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
  },
  container: {
    flex: 1,
    backgroundColor: "#3AA385", // pixel-green
  },
  header: {
    backgroundColor: "#F7F5E1", // pixel-cream
    borderBottomWidth: 4,
    borderBottomColor: "#000000",
    padding: 16,
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
    fontSize: 24,
    fontFamily: "Minecraft",
    textAlign: "center",
    color: "#000000",
    textTransform: "uppercase",
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
    padding: 24,
    marginBottom: 24,
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
    fontSize: 14,
    fontFamily: "Minecraft",
    marginBottom: 8,
    color: "#000000",
    textTransform: "uppercase",
  },
  input: {
    width: "100%",
    height: 44,
    backgroundColor: "#FFFFFF",
    borderWidth: 3,
    borderColor: "#000000",
    padding: 12,
    marginBottom: 16,
    fontFamily: "Minecraft",
    fontSize: 14,
    color: "#000000",
  },
  signInButton: {
    backgroundColor: "#F7F5E1", // pixel-cream
    borderWidth: 3,
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
  signInButtonText: {
    color: "#000000",
    fontFamily: "Minecraft",
    fontSize: 14,
    textAlign: "center",
    textTransform: "uppercase",
  },
  signUpText: {
    color: "#000000",
    fontFamily: "Minecraft",
    fontSize: 14,
    marginBottom: 8,
    textTransform: "uppercase",
  },
  signUpButton: {
    backgroundColor: "#8977b6", // pixel-purple
    borderWidth: 3,
    borderColor: "#000000",
    paddingVertical: 12,
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
  signUpButtonText: {
    color: "#FFFCEE", // pixel-cream-light
    fontFamily: "Minecraft",
    fontSize: 14,
    textAlign: "center",
    textTransform: "uppercase",
  },
});

export default AuthScreen;
