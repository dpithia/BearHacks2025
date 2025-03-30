import React, { useState, useEffect, useRef } from "react";
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  ImageBackground,
  Platform,
  SafeAreaView,
  Image,
  TouchableWithoutFeedback,
  Keyboard,
  KeyboardAvoidingView,
} from "react-native";
import { useRouter, useNavigation } from "expo-router";
import SplashScreen from "../../components/SplashScreen";
import { saveBuddyState } from "../../services/buddyService";
import { useBuddyState } from "../../hooks/useBuddyState";

export default function HomeScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [buddyName, setBuddyName] = useState<string>("");
  const [selectedCat, setSelectedCat] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState<boolean>(false);
  const { buddyState, isLoading: isBuddyLoading } = useBuddyState();

  const nameInputRef = useRef<TextInput>(null);
  const [isScreenFocused, setIsScreenFocused] = useState(false);

  // Reset loading states when component mounts
  useEffect(() => {
    console.log("[HomeScreen] Component mounted, resetting loading states");
    setIsLoading(false);
    setIsCreating(false);
    setIsScreenFocused(true);
  }, []);

  // Focus input after a delay when the screen is ready
  useEffect(() => {
    if (!isLoading && !isBuddyLoading && isScreenFocused) {
      const focusTimer = setTimeout(() => {
        if (nameInputRef.current) {
          console.log("[HomeScreen] Focusing name input after delay");
          nameInputRef.current.focus();
        }
      }, 500);

      return () => clearTimeout(focusTimer);
    }
  }, [isLoading, isBuddyLoading, isScreenFocused]);

  // Additional useEffect to try focusing again if the first attempt fails
  useEffect(() => {
    const backupFocusTimer = setTimeout(() => {
      if (nameInputRef.current && isScreenFocused) {
        console.log("[HomeScreen] Backup attempt to focus input");
        nameInputRef.current.focus();
      }
    }, 1000);

    return () => clearTimeout(backupFocusTimer);
  }, [isScreenFocused]);

  // cat options with labels and gif paths
  const buddyOptions = [
    {
      gif: require("../../assets/gifs/blackcatsitting.gif"),
      label: "BLACK",
      id: "black",
    },
    {
      gif: require("../../assets/gifs/christmascatsitting.gif"),
      label: "CHRISTMAS",
      id: "christmas",
    },
    {
      gif: require("../../assets/gifs/whitecatsitting.gif"),
      label: "WHITE",
      id: "white",
    },
    {
      gif: require("../../assets/gifs/batmancatsitting.gif"),
      label: "BATMAN",
      id: "batman",
    },
  ];

  // check if buddy exists and redirect if needed
  useEffect(() => {
    if (!isBuddyLoading && buddyState) {
      console.warn("[HomeScreen] Buddy already exists, redirecting");
      router.replace("/(tabs)/buddy");
    }
  }, [isBuddyLoading, buddyState, router]);

  // show loading state
  if (isLoading || isBuddyLoading) {
    return <SplashScreen />;
  }

  // If buddy exists, don't show creation screen
  if (buddyState) {
    return null;
  }

  // Handle cat selection
  const handleCatSelect = (catId: string) => {
    setSelectedCat(catId);
  };

  // Handle buddy creation
  const handleCreateBuddy = async () => {
    if (!buddyName || !selectedCat || isCreating) return;

    try {
      setIsCreating(true);
      console.warn("[HomeScreen] Creating new buddy:", {
        buddyName,
        selectedCat,
      });

      // Create buddy in Supabase
      await saveBuddyState({
        name: buddyName,
        imageUrl: selectedCat, // Store the cat type instead of emoji
        hp: 100,
        energy: 100,
        steps: 0,
        lastUpdated: new Date().toISOString(),
        lastFed: null,
        lastDrank: null,
        isSleeping: false,
        sleepStartTime: null,
        totalSleepHours: 0,
        lastSleepDate: null,
        waterConsumed: 0,
      });

      console.warn(
        "[HomeScreen] Buddy created successfully, navigating to buddy screen"
      );
      router.replace("/(tabs)/buddy");
    } catch (error) {
      console.error("[HomeScreen] Error creating buddy:", error);
      Alert.alert("Error", "Failed to create buddy. Please try again.");
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>CREATE YOUR</Text>
        <Text style={styles.headerTitle}>BUDDY</Text>
      </View>

      <View style={styles.fixedContentContainer}>
        <View style={styles.formContainer}>
          <Text style={styles.label}>NAME YOUR BUDDY:</Text>
          <TextInput
            ref={nameInputRef}
            key="buddy-name-input-static"
            style={styles.input}
            placeholder="MAX 12 CHARS"
            placeholderTextColor="#666"
            value={buddyName}
            onChangeText={setBuddyName}
            maxLength={12}
            editable={true}
            onSubmitEditing={() => Keyboard.dismiss()}
            returnKeyType="done"
            autoCorrect={false}
            blurOnSubmit={false}
            contextMenuHidden={true}
            spellCheck={false}
            keyboardType={
              Platform.OS === "ios" ? "default" : "visible-password"
            }
          />

          <Text style={styles.label}>CHOOSE YOUR BUDDY:</Text>
          <View style={styles.buddyGrid}>
            {buddyOptions.map((option, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.buddyOption,
                  selectedCat === option.id && styles.selectedBuddyOption,
                ]}
                onPress={() => handleCatSelect(option.id)}
                disabled={isLoading || isCreating}
              >
                <Image
                  source={option.gif}
                  style={styles.buddyGif}
                  resizeMode="contain"
                />
                <Text style={styles.buddyLabel}>{option.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity
            style={[
              styles.createButton,
              (!buddyName || !selectedCat || isCreating || isLoading) &&
                styles.disabledButton,
            ]}
            disabled={!buddyName || !selectedCat || isCreating || isLoading}
            onPress={handleCreateBuddy}
          >
            <Text style={styles.createButtonText}>
              {isCreating ? "CREATING..." : "CREATE"}
            </Text>
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
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#3AA385",
    paddingTop: Platform.OS === "ios" ? 47 : 0,
  },
  header: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    backgroundColor: "#F7F5E1",
    borderBottomWidth: 4,
    borderBottomColor: "#000000",
    paddingTop: 65,
    alignItems: "center",
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
    lineHeight: 32,
  },
  fixedContentContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#3AA385",
    paddingTop: 100, // Account for header with two lines
    paddingBottom: 100,
  },
  formContainer: {
    width: "90%",
    maxWidth: 400,
    backgroundColor: "#FFFCEE",
    borderWidth: 4,
    borderColor: "#000000",
    padding: 20,
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
    backgroundColor: "#FFFCEE",
    borderWidth: 2,
    borderColor: "#000000",
    padding: 8,
    marginBottom: 24,
    fontFamily: "Minecraft",
    fontSize: 14,
    color: "#000000",
  },
  buddyGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: 24,
  },
  buddyOption: {
    width: "48%",
    aspectRatio: 1,
    backgroundColor: "#FFFCEE",
    borderWidth: 2,
    borderColor: "#000000",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
    padding: 8,
  },
  selectedBuddyOption: {
    borderWidth: 2,
    borderColor: "#8977b6",
  },
  buddyGif: {
    width: "100%",
    height: "70%",
    marginBottom: 8,
  },
  buddyLabel: {
    fontSize: 14,
    fontFamily: "Minecraft",
    fontWeight: "400",
    color: "#000000",
  },
  createButton: {
    backgroundColor: "#F7F5E1",
    borderWidth: 2,
    borderColor: "#000000",
    padding: 12,
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
  disabledButton: {
    opacity: 0.5,
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
