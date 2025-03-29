import { ExpoConfig, ConfigContext } from "expo/config";

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: "NineLives",
  slug: "ninelives",
  version: "1.0.0",
  orientation: "portrait",
  icon: "./assets/images/icon.png",
  scheme: "myapp",
  userInterfaceStyle: "automatic",
  splash: {
    image: "./assets/images/splash.png",
    resizeMode: "contain",
    backgroundColor: "#ffffff",
  },
  assetBundlePatterns: ["**/*"],
  ios: {
    supportsTablet: true,
    bundleIdentifier: "com.ninelives.app",
  },
  android: {
    adaptiveIcon: {
      foregroundImage: "./assets/images/adaptive-icon.png",
      backgroundColor: "#ffffff",
    },
    package: "com.ninelives.app",
  },
  web: {
    favicon: "./assets/images/favicon.png",
  },
  extra: {
    perplexityApiKey: "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",
  },
  plugins: ["expo-router"],
});
