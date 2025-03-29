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
          <ImageBackground
            style={styles.gridBackground}
            source={{ uri: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACgAAAAoCAYAAACM/rhtAAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAAOxAAADsQBlSsOGwAAABl0RVh0U29mdHdhcmUAd3d3Lmlua3NjYXBlLm9yZ5vuPBoAAAAPdEVYdFRpdGxlAEdyaWQgUGF0dGVybtVVVkEAAAAadEVYdEF1dGhvcgBHcmlkIFBhdHRlcm4gQ3JlYXRvcl/YEg8AAAAhdEVYdERlc2NyaXB0aW9uAEdyaWQgUGF0dGVybiBDcmVhdG9yZGdkZAAAABd0RVh0Q3JlYXRpb24gVGltZQAyMDIzLTExLTI4W4RJnQAAABx0RVh0U29mdHdhcmUAQWRvYmUgRmlyZXdvcmtzIENTNui8sowAAAAVdEVYdFRlY2huaXF1ZQBHcmlkIFBhdHRlcm6q5ZCEAAAAI3RFWHRUaW1lIFN0YW1wADIwMjMtMTEtMjggMTI6NDc6NDQgKzAwMDCwYJKGAAAAFXRFWHRDb3B5cmlnaHQAUHVibGljIERvbWFpbqHjYtcAAAAKdEVYdExpY2Vuc2UAQ0MwcsR8oAAAAApJREFUWIXt1j1IVGEYxvHfvXNmdWd3Z3fHj9bVVVdXV0VFRUVFRUVF7SNCiIiIiIgQIiIiIkSIiBARESEiQoSIEBEhIiIiQoiIiAgRIiIiIkKIiIiIiAgR4tR5Z+acOTPn7MfMzNz3geeF93mf+7kP7/ty4MCBAwd2GwngKDAP/AYywHOgY7eD7QYagFlAX2PNAc27GbIdeA/YQC6wbGAKOLKbQRuBN0ARyAMvgVEgDHwEVKAAvNrNoI3AJFAGvgGngRBQB5wD5oEScHQ3gzYAz4AK8BE4CQSBEHABWASWgBO7GbQemACqwBfgLOAHgsBFYAlYBk7tZtB6YByQwDxwHvACfuAy8B1YAc7sZtA6YAyQwFfgEuAGvMBV4AewClzYzaC1wCiggG/ADcAFuIEbwE9gDbgE2LsZdi0PAQv4AdwEnEAAuAX8AtaBK7sd9j4ggVXgDuAAAsAdYAP4A1zf7bD3gCqwBtwFbCAA3AM2gU3gJmDtdtgRQAXWgQeABQSAh8AWsAXcY4cPiDuAAmwAI0A1UAOMAlngL/CAHb5FbgEKsAmMAh6gBhgDckAOGGaHb/ENoALkgHHAC9QCE0AeyAMPgR0/RW4AFZAHJgEfUAc8BgpAARhihw+JK0AF2AKmgABQDzwBikARGGSHD6mrQBnIA9NACGgAngIloAQMsMOH5GWgDBSAp0AYaASeA2WgDPSzw4f0RaAMFIEZoBFoAl4AFaACPGKHD4kLQAUoAbNAM9AMvAQUQAH62OFD+hxQAcrAHNACtAKvARVQgV52+CnSC8hABZgH2oA24A2gARrQww4/xboBGSgDC0A70A68BTRAA7rZ4adoFyADZWAROAQcAt4BOqADXezwU7wTkIEysAR0AoeB94AO6MBDdvgp3gHIQBlYBo4AR4EPgA7oQCc7/C3SDshAGVgBjgHHgY+ADuhAOzv8LdYGyEAZWAWOAyeAT4AO6EArO/wt2grIQBlYA04CJ4HPgA7oQAs7/BRvBmSgDKwDp4DTwBdAB3TgPjt8SN8HyEAZ2ADOAJ3AV0AHdOAuO3xI3wXIQBnYBM4CXcA3QAd04A47fEjfBshAGcgC54Bu4DugAzpwix1+SN8CyEAZyAHngR7gB6ADOnCDHX5I3wDIQBnIA73AeeAnoAM6cI0dPqSvAzJQBgrABeAi8AvQAR24yg4f0lcBGSgDReAScBn4DeiADlxhhw/pK4AMlIES0A9cBf4AOqADl9nhQ/oyIANloAwMANeBv4AO6MAldrEDB/7X/AMRW5Q3E2KPbwAAAABJRU5ErkJggg=='}}
            resizeMode="repeat"
          >
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
          </ImageBackground>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#3AA385", // pixel-green
    paddingTop: Platform.OS === 'ios' ? 47 : 0, // Account for dynamic island
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
  },
  gridBackground: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
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
