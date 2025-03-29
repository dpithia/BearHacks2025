import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Alert,
  ActivityIndicator,
  Clipboard,
  SafeAreaView,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "../../services/supabase";
import { router } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";

type DatabaseFollow = {
  id: string;
  follower_id: string;
  following_id: string;
  created_at: string;
  following_user: {
    email: string;
  } | null;
  follower_user: {
    email: string;
  } | null;
};

type Follow = {
  id: string;
  follower_id: string;
  following_id: string;
  created_at: string;
  following?: {
    email: string;
  };
  follower?: {
    email: string;
  };
};

export default function SocialScreen() {
  const [activeTab, setActiveTab] = useState<"following" | "followers">(
    "following"
  );
  const [following, setFollowing] = useState<Follow[]>([]);
  const [followers, setFollowers] = useState<Follow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [friendCode, setFriendCode] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useFocusEffect(
    React.useCallback(() => {
      console.log("[Social] Screen focused, refreshing data");
      loadFollows();
    }, [])
  );

  const loadFollows = async () => {
    try {
      console.log("[Social] Loading follows data");
      setIsLoading(true);
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        console.log("[Social] No user found");
        return;
      }
      console.log("[Social] Current user:", user.id);

      // Load following with explicit join
      const { data: followingData, error: followingError } = await supabase
        .from("follows")
        .select(
          `
          id,
          follower_id,
          following_id,
          created_at,
          following_user:users!follows_following_id_fkey(email)
        `
        )
        .eq("follower_id", user.id)
        .returns<DatabaseFollow[]>();

      if (followingError) {
        console.error("[Social] Error loading following:", followingError);
        throw followingError;
      }

      console.log("[Social] Raw following data:", followingData);

      const processedFollowing =
        followingData?.map((follow) => ({
          id: follow.id,
          follower_id: follow.follower_id,
          following_id: follow.following_id,
          created_at: follow.created_at,
          following: follow.following_user
            ? { email: follow.following_user.email }
            : undefined,
        })) || [];

      console.log("[Social] Processed following data:", processedFollowing);
      setFollowing(processedFollowing);

      // Load followers with explicit join
      const { data: followersData, error: followersError } = await supabase
        .from("follows")
        .select(
          `
          id,
          follower_id,
          following_id,
          created_at,
          follower_user:users!follows_follower_id_fkey(email)
        `
        )
        .eq("following_id", user.id)
        .returns<DatabaseFollow[]>();

      if (followersError) {
        console.error("[Social] Error loading followers:", followersError);
        throw followersError;
      }

      console.log("[Social] Raw followers data:", followersData);

      const processedFollowers =
        followersData?.map((follow) => ({
          id: follow.id,
          follower_id: follow.follower_id,
          following_id: follow.following_id,
          created_at: follow.created_at,
          follower: follow.follower_user
            ? { email: follow.follower_user.email }
            : undefined,
        })) || [];

      console.log("[Social] Processed followers data:", processedFollowers);
      setFollowers(processedFollowers);
    } catch (error) {
      console.error("[Social] Error loading follows:", error);
      Alert.alert("Error", "Failed to load follows");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const generateFriendCode = async () => {
    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();
      if (userError) throw userError;
      if (!user) {
        Alert.alert("Error", "Please sign in to generate a friend code");
        return;
      }

      // Generate random 8-character code
      const code = Math.random().toString(36).substring(2, 10).toUpperCase();
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 24);

      const { error: insertError } = await supabase
        .from("friend_codes")
        .insert({
          code,
          user_id: user.id,
          expires_at: expiresAt.toISOString(),
          used: false,
        });

      if (insertError) {
        console.error("Error inserting friend code:", insertError);
        throw insertError;
      }

      setFriendCode(code);
      Alert.alert(
        "Friend Code Generated",
        `Your friend code is: ${code}\n\nShare this code with friends to let them follow you. The code will expire in 24 hours.`
      );
    } catch (error) {
      console.error("Error generating friend code:", error);
      Alert.alert("Error", "Failed to generate friend code. Please try again.");
    }
  };

  const unfollow = async (followId: string) => {
    try {
      const { error } = await supabase
        .from("follows")
        .delete()
        .eq("id", followId);

      if (error) throw error;
      await loadFollows();
    } catch (error) {
      console.error("Error unfollowing:", error);
      Alert.alert("Error", "Failed to unfollow user");
    }
  };

  const copyToClipboard = async () => {
    if (friendCode) {
      await Clipboard.setString(friendCode);
      Alert.alert("Success", "Friend code copied to clipboard!");
    }
  };

  const renderItem = ({ item }: { item: Follow }) => (
    <View style={styles.followItem}>
      <View style={styles.followInfo}>
        <View style={styles.avatarContainer}>
          <Text style={styles.avatarEmoji}>
            {activeTab === "following" ? "🐱" : "🐕"}
          </Text>
        </View>
        <View>
          <Text style={styles.username}>
            {activeTab === "following"
              ? item.following?.email.split("@")[0]
              : item.follower?.email.split("@")[0]}
          </Text>
          <Text style={styles.petName}>Whiskers</Text>
        </View>
      </View>
      {activeTab === "following" && (
        <TouchableOpacity
          style={styles.unfollowButton}
          onPress={() => unfollow(item.id)}
        >
          <Text style={styles.unfollowText}>UNFOLLOW</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  const handleRefresh = () => {
    setIsRefreshing(true);
    loadFollows();
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#8977b6" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>SOCIAL</Text>
          <TouchableOpacity style={styles.profileButton}>
            <Ionicons name="person-outline" size={24} color="#F7F5E1" />
          </TouchableOpacity>
        </View>

        {/* Tabs */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === "following" && styles.activeTab]}
            onPress={() => setActiveTab("following")}
          >
            <Text style={[styles.tabText, activeTab === "following" && styles.activeTabText]}>
              FOLLOWING
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === "followers" && styles.activeTab]}
            onPress={() => setActiveTab("followers")}
          >
            <Text style={[styles.tabText, activeTab === "followers" && styles.activeTabText]}>
              FOLLOWERS
            </Text>
          </TouchableOpacity>
        </View>

        {/* Friend Code Display */}
        {friendCode && (
          <View style={styles.codeContainer}>
            <Text style={styles.codeLabel}>YOUR FRIEND CODE:</Text>
            <View style={styles.codeWrapper}>
              <Text style={styles.codeText}>{friendCode}</Text>
              <TouchableOpacity
                style={styles.copyButton}
                onPress={copyToClipboard}
              >
                <Ionicons name="copy-outline" size={20} color="#000000" />
              </TouchableOpacity>
            </View>
            <Text style={styles.codeExpiry}>VALID FOR 24 HOURS</Text>
          </View>
        )}

        <FlatList
          data={activeTab === "following" ? following : followers}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          style={styles.list}
          contentContainerStyle={styles.listContent}
          refreshing={isRefreshing}
          onRefresh={handleRefresh}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>
                {activeTab === "following"
                  ? "You're not following anyone yet"
                  : "You don't have any followers yet"}
              </Text>
            </View>
          }
        />

        {/* Action Buttons */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={styles.generateButton}
            onPress={generateFriendCode}
          >
            <Text style={styles.buttonText}>GENERATE CODE</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.enterButton}
            onPress={() => router.push("/(tabs)/enter-code" as any)}
          >
            <Text style={styles.buttonText}>ENTER CODE</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#3AA385", // pixel-green
    paddingTop: Platform.OS === "ios" ? 47 : 0,
  },
  container: {
    flex: 1,
    backgroundColor: "#3AA385", // pixel-green
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#3AA385", // pixel-green
  },
  header: {
    backgroundColor: "#3AA385", // pixel-green
    borderBottomWidth: 4,
    borderBottomColor: "#000000",
    padding: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 24,
    fontFamily: "Minecraft",
    color: "#F7F5E1", // pixel-cream
    textTransform: "uppercase",
  },
  profileButton: {
    padding: 8,
  },
  tabContainer: {
    flexDirection: "row",
    borderBottomWidth: 4,
    borderBottomColor: "#000000",
  },
  tab: {
    flex: 1,
    padding: 12,
    backgroundColor: "#3AA385", // pixel-green
    alignItems: "center",
  },
  activeTab: {
    backgroundColor: "#F7F5E1", // pixel-cream
  },
  tabText: {
    color: "#F7F5E1", // pixel-cream
    fontFamily: "Minecraft",
    fontSize: 14,
  },
  activeTabText: {
    color: "#000000",
  },
  list: {
    flex: 1,
    backgroundColor: "#3AA385", // pixel-green
  },
  listContent: {
    padding: 16,
  },
  followItem: {
    backgroundColor: "#F7F5E1", // pixel-cream
    borderWidth: 4,
    borderColor: "#000000",
    padding: 12,
    marginBottom: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    shadowColor: "#000000",
    shadowOffset: {
      width: 4,
      height: 4,
    },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 4,
  },
  followInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  avatarContainer: {
    width: 40,
    height: 40,
    backgroundColor: "#F7F5E1", // pixel-cream
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  avatarEmoji: {
    fontSize: 24,
  },
  username: {
    fontFamily: "Minecraft",
    fontSize: 14,
    color: "#000000",
  },
  petName: {
    fontFamily: "Minecraft",
    fontSize: 12,
    color: "#666666",
  },
  unfollowButton: {
    backgroundColor: "#8977b6", // pixel-purple
    borderWidth: 3,
    borderColor: "#000000",
    padding: 8,
    shadowColor: "#000000",
    shadowOffset: {
      width: 3,
      height: 3,
    },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 4,
  },
  unfollowText: {
    color: "#F7F5E1", // pixel-cream
    fontFamily: "Minecraft",
    fontSize: 12,
  },
  emptyContainer: {
    padding: 24,
    alignItems: "center",
  },
  emptyText: {
    fontFamily: "Minecraft",
    fontSize: 14,
    color: "#F7F5E1", // pixel-cream
    textAlign: "center",
    marginBottom: 16,
  },
  buttonContainer: {
    padding: 16,
    backgroundColor: "#F7F5E1", // pixel-cream
    borderTopWidth: 4,
    borderTopColor: "#000000",
    flexDirection: "row",
    gap: 16,
  },
  generateButton: {
    flex: 1,
    backgroundColor: "#F7F5E1", // pixel-cream
    borderWidth: 3,
    borderColor: "#000000",
    padding: 12,
    alignItems: "center",
    shadowColor: "#000000",
    shadowOffset: {
      width: 3,
      height: 3,
    },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 4,
  },
  enterButton: {
    flex: 1,
    backgroundColor: "#8977b6", // pixel-purple
    borderWidth: 3,
    borderColor: "#000000",
    padding: 12,
    alignItems: "center",
    shadowColor: "#000000",
    shadowOffset: {
      width: 3,
      height: 3,
    },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 4,
  },
  buttonText: {
    color: "#000000",
    fontFamily: "Minecraft",
    fontSize: 14,
  },
  codeContainer: {
    margin: 16,
    backgroundColor: "#F7F5E1", // pixel-cream
    borderWidth: 4,
    borderColor: "#000000",
    padding: 16,
    alignItems: "center",
    shadowColor: "#000000",
    shadowOffset: {
      width: 4,
      height: 4,
    },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 4,
  },
  codeLabel: {
    fontSize: 14,
    fontFamily: "Minecraft",
    color: "#000000",
    marginBottom: 12,
    textTransform: "uppercase",
  },
  codeWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFCEE", // pixel-cream-light
    borderWidth: 3,
    borderColor: "#000000",
    padding: 12,
    marginBottom: 12,
    shadowColor: "#000000",
    shadowOffset: {
      width: 2,
      height: 2,
    },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 3,
  },
  codeText: {
    fontSize: 20,
    fontFamily: "Minecraft",
    color: "#000000",
    marginRight: 12,
    letterSpacing: 2,
  },
  copyButton: {
    backgroundColor: "#8977b6", // pixel-purple
    padding: 8,
    borderWidth: 2,
    borderColor: "#000000",
    shadowColor: "#000000",
    shadowOffset: {
      width: 2,
      height: 2,
    },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 3,
  },
  codeExpiry: {
    fontSize: 10,
    fontFamily: "Minecraft",
    color: "#666666",
    textTransform: "uppercase",
  },
});
