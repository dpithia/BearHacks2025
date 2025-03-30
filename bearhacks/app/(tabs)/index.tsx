import React, { useState, useEffect } from "react";
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
} from "react-native";
import { useRouter } from "expo-router";
import SplashScreen from "../../components/SplashScreen";
import { saveBuddyState } from "../../services/buddyService";
import { useBuddyState } from "../../hooks/useBuddyState";

export default function HomeScreen() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [buddyName, setBuddyName] = useState<string>("");
  const [selectedCat, setSelectedCat] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState<boolean>(false);
  const { buddyState, isLoading: isBuddyLoading } = useBuddyState();

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
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>CREATE YOUR</Text>
          <Text style={styles.headerTitle}>BUDDY</Text>
        </View>

        <View style={styles.contentContainer}>
          <ImageBackground
            style={styles.gridBackground}
            source={{
              uri: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACgAAAAoCAYAAACM/rhtAAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAAOxAAADsQBlSsOGwAAABl0RVh0U29mdHdhcmUAd3d3Lmlua3NjYXBlLm9yZ5vuPBoAAAAPdEVYdFRpdGxlAEdyaWQgUGF0dGVybtVVVkEAAAAadEVYdEF1dGhvcgBHcmlkIFBhdHRlcm4gQ3JlYXRvcl/YEg8AAAAhdEVYdERlc2NyaXB0aW9uAEdyaWQgUGF0dGVybiBDcmVhdG9yZGdkZAAAABd0RVh0Q3JlYXRpb24gVGltZQAyMDIzLTExLTI4W4RJnQAAABx0RVh0U29mdHdhcmUAQWRvYmUgRmlyZXdvcmtzIENTNui8sowAAAAVdEVYdFRlY2huaXF1ZQBHcmlkIFBhdHRlcm6q5ZCEAAAAI3RFWHRUaW1lIFN0YW1wADIwMjMtMTEtMjggMTI6NDc6NDQgKzAwMDCwYJKGAAAAFXRFWHRDb3B5cmlnaHQAUHVibGljIERvbWFpbqHjYtcAAAAKdEVYdExpY2Vuc2UAQ0MwcsR8oAAAAApJREFUWIXt1j1IVGEYxvHfvXNmdWd3Z3fHj9bVVVdXV0VFRUVFRUVF7SNCiIiIiIgQIiIiIkSIiBARESEiQoSIEBEhIiIiQoiIiAgRIiIiIkKIiIiIiAgR4tR5Z+acOTPn7MfMzNz3geeF93mf+7kP7/ty4MCBAwd2GwngKDAP/AYywHOgY7eD7QYagFlAX2PNAc27GbIdeA/YQC6wbGAKOLKbQRuBN0ARyAMvgVEgDHwEVKAAvNrNoI3AJFAGvgGngRBQB5wD5oEScHQ3gzYAz4AK8BE4CQSBEHABWASWgBO7GbQemACqwBfgLOAHgsBFYAlYBk7tZtB6YByQwDxwHvACfuAy8B1YAc7sZtA6YAyQwFfgEuAGvMBV4AewClzYzaC1wCiggG/ADcAFuIEbwE9gDbgE2LsZdi0PAQv4AdwEnEAAuAX8AtaBK7sd9j4ggVXgDuAAAsAdYAP4A1zf7bD3gCqwBtwFbCAA3AM2gU3gJmDtdtgRQAXWgQeABQSAh8AWsAXcY4cPiDuAAmwAI0A1UAOMAlngL/CAHb5FbgEKsAmMAh6gBhgDckAOGGaHb/ENoALkgHHAC9QCE0AeyAMPgR0/RW4AFZAHJgEfUAc8BgpAARhihw+JK0AF2AKmgABQDzwBikARGGSHD6mrQBnIA9NACGgAngIloAQMsMOH5GWgDBSAp0AYaASeA2WgDPSzw4f0RaAMFIEZoBFoAl4AFaACPGKHD4kLQAUoAbNAM9AMvAQUQAH62OFD+hxQAcrAHNACtAKvARVQgV52+CnSC8hABZgH2oA24A2gARrQww4/xboBGSgDC0A70A68BTRAA7rZ4adoFyADZWAROAQcAt4BOqADXezwU7wTkIEysAR0AoeB94AO6MBDdvgp3gHIQBlYBo4AR4EPgA7oQCc7/C3SDshAGVgBjgHHgY+ADuhAOzv8LdYGyEAZWAWOAyeAT4AO6EArO/wt2grIQBlYA04CJ4HPgA7oQAs7/BRvBmSgDKwDp4DTwBdAB3TgPjt8SN8HyEAZ2ADOAJ3AV0AHdOAuO3xI3wXIQBnYBM4CXcA3QAd04A47fEjfBshAGcgC54Bu4DugAzpwix1+SN8CyEAZyAHngR7gB6ADOnCDHX5I3wDIQBnIA73AeeAnoAM6cI0dPqSvAzJQBgrABeAi8AvQAR24yg4f0lcBGSgDReAScBn4DeiADlxhhw/pK4AMlIES0A9cBf4AOqADl9nhQ/oyIANloAwMANeBv4AO6MAldrEDB/7X/AMRW5Q3E2KPbwAAAABJRU5ErkJggg==",
            }}
            resizeMode="repeat"
          >
            <View style={styles.formContainer}>
              <Text style={styles.label}>NAME YOUR BUDDY:</Text>
              <TextInput
                style={styles.input}
                placeholder="MAX 12 CHARS"
                placeholderTextColor="#666"
                value={buddyName}
                onChangeText={setBuddyName}
                maxLength={12}
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
                  (!buddyName || !selectedCat || isCreating) &&
                    styles.disabledButton,
                ]}
                disabled={!buddyName || !selectedCat || isCreating}
                onPress={handleCreateBuddy}
              >
                <Text style={styles.createButtonText}>CREATE</Text>
              </TouchableOpacity>
            </View>
          </ImageBackground>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#3AA385",
    paddingTop: Platform.OS === "ios" ? 47 : 0,
  },
  container: {
    flex: 1,
    backgroundColor: "#3AA385",
  },
  header: {
    backgroundColor: "#F7F5E1",
    borderBottomWidth: 4,
    borderBottomColor: "#000000",
    padding: 12,
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
});
