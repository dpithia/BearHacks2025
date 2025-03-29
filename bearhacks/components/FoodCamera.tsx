import React, { useRef, useState, useEffect } from "react";
import { StyleSheet, View, Text, TouchableOpacity, Alert } from "react-native";
import { CameraView, CameraType, useCameraPermissions } from "expo-camera";
import { Ionicons } from "@expo/vector-icons";

interface FoodCameraProps {
  onTakePicture: (uri: string) => void;
  onCancel: () => void;
  buddyName: string;
}

const FoodCamera: React.FC<FoodCameraProps> = ({
  onTakePicture,
  onCancel,
  buddyName,
}) => {
  const cameraRef = useRef<any>(null);
  const [permission, requestPermission] = useCameraPermissions();

  const takePicture = async () => {
    if (!cameraRef.current) return;

    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
        skipProcessing: false,
      });

      onTakePicture(photo.uri);
    } catch (error) {
      console.error("Error taking picture:", error);
      Alert.alert("Error", "Failed to take picture. Please try again.");
      onCancel();
    }
  };

  // If permissions haven't been checked yet
  if (!permission) {
    return (
      <View style={styles.permissionContainer}>
        <Text style={styles.permissionText}>
          Requesting camera permissions...
        </Text>
      </View>
    );
  }

  // If permissions were denied
  if (!permission.granted) {
    return (
      <View style={styles.permissionContainer}>
        <Text style={styles.permissionText}>
          Camera permission denied. Please enable camera access in your device
          settings to feed your buddy.
        </Text>
        <TouchableOpacity
          style={styles.permissionButton}
          onPress={requestPermission}
        >
          <Text style={styles.permissionButtonText}>Grant Permission</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.permissionButton, styles.cancelButton]}
          onPress={onCancel}
        >
          <Text style={styles.permissionButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.cameraContainer}>
      <CameraView
        ref={cameraRef}
        style={styles.camera}
        facing="back"
        ratio="16:9"
      >
        <View style={styles.cameraOverlay}>
          <View style={styles.cameraOverlayTextContainer}>
            <Text style={styles.cameraOverlayText}>
              Take a picture of your food to feed {buddyName}
            </Text>
          </View>

          <View style={styles.cameraButtonContainer}>
            <TouchableOpacity style={styles.cancelButton} onPress={onCancel}>
              <Ionicons name="close-circle" size={36} color="#FFF" />
            </TouchableOpacity>

            <TouchableOpacity style={styles.cameraButton} onPress={takePicture}>
              <Ionicons name="camera" size={36} color="#FFF" />
            </TouchableOpacity>
          </View>
        </View>
      </CameraView>
    </View>
  );
};

const styles = StyleSheet.create({
  cameraContainer: {
    flex: 1,
    backgroundColor: "#000",
  },
  camera: {
    flex: 1,
    justifyContent: "flex-end",
  },
  cameraOverlay: {
    flex: 1,
    backgroundColor: "transparent",
    justifyContent: "space-between",
    padding: 20,
  },
  cameraButtonContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 30,
  },
  cameraButton: {
    backgroundColor: "#FFA000",
    borderRadius: 50,
    padding: 15,
    marginHorizontal: 15,
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
  },
  cancelButton: {
    backgroundColor: "#FF5252",
    borderRadius: 50,
    padding: 15,
    marginHorizontal: 15,
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
  },
  cameraOverlayTextContainer: {
    alignItems: "center",
    marginTop: 60,
  },
  cameraOverlayText: {
    backgroundColor: "rgba(0,0,0,0.6)",
    color: "white",
    padding: 12,
    borderRadius: 10,
    fontSize: 16,
    textAlign: "center",
    overflow: "hidden",
  },
  permissionContainer: {
    flex: 1,
    backgroundColor: "#FFF8E1",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  permissionText: {
    fontSize: 18,
    color: "#5D4037",
    textAlign: "center",
    marginBottom: 20,
  },
  permissionButton: {
    backgroundColor: "#FFA000",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "#FF8F00",
    marginVertical: 8,
  },
  permissionButtonText: {
    color: "#5D4037",
    fontSize: 16,
    fontWeight: "bold",
  },
});

export default FoodCamera;
