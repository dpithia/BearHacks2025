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
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
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
    buddy?: {
      hp: number;
      energy: number;
      sleeping: boolean;
    };
  } | null;
  follower_user: {
    email: string;
    buddy?: {
      hp: number;
      energy: number;
      sleeping: boolean;
    };
  } | null;
};

type Follow = {
  id: string;
  follower_id: string;
  following_id: string;
  created_at: string;
  following?: {
    email: string;
    buddy?: {
      hp: number;
      energy: number;
      sleeping: boolean;
    };
  };
  follower?: {
    email: string;
    buddy?: {
      hp: number;
      energy: number;
      sleeping: boolean;
    };
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
          following_user:users!follows_following_id_fkey(
            email,
            buddy (
              hp,
              energy,
              sleeping
            )
          )
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
            ? {
                email: follow.following_user.email,
                buddy: follow.following_user.buddy,
              }
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
          follower_user:users!follows_follower_id_fkey(
            email,
            buddy (
              hp,
              energy,
              sleeping
            )
          )
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
            ? {
                email: follow.follower_user.email,
                buddy: follow.follower_user.buddy,
              }
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

  const renderItem = ({ item }: { item: Follow }) => {
    const user = activeTab === "following" ? item.following : item.follower;
    const buddy = user?.buddy;

    return (
      <View style={styles.followItem}>
        <View style={styles.followInfo}>
          <Ionicons
            name={buddy?.sleeping ? "moon" : "person-circle-outline"}
            size={24}
            color={buddy?.sleeping ? "#5C6BC0" : "#5D4037"}
          />
          <Text style={styles.username}>{user?.email.split("@")[0]}</Text>
          {buddy && (
            <View style={styles.statsContainer}>
              <Text style={styles.statText}>HP: {Math.round(buddy.hp)}%</Text>
              <Text style={styles.statText}>
                Energy: {Math.round(buddy.energy)}%
              </Text>
            </View>
          )}
        </View>
        {activeTab === "following" && (
          <TouchableOpacity
            style={styles.unfollowButton}
            onPress={() => unfollow(item.id)}
          >
            <Text style={styles.unfollowText}>Unfollow</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    loadFollows();
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FFA000" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Social</Text>
      </View>

      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === "following" && styles.activeTab]}
          onPress={() => setActiveTab("following")}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === "following" && styles.activeTabText,
            ]}
          >
            Following ({following.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === "followers" && styles.activeTab]}
          onPress={() => setActiveTab("followers")}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === "followers" && styles.activeTabText,
            ]}
          >
            Followers ({followers.length})
          </Text>
        </TouchableOpacity>
      </View>

      {friendCode && (
        <View style={styles.codeContainer}>
          <Text style={styles.codeLabel}>Your Friend Code:</Text>
          <View style={styles.codeWrapper}>
            <Text style={styles.codeText}>{friendCode}</Text>
            <TouchableOpacity
              style={styles.copyButton}
              onPress={copyToClipboard}
            >
              <Ionicons name="copy-outline" size={24} color="#5D4037" />
            </TouchableOpacity>
          </View>
          <Text style={styles.codeExpiry}>Valid for 24 hours</Text>
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
          <Text style={styles.emptyText}>
            {activeTab === "following"
              ? "You're not following anyone yet"
              : "You don't have any followers yet"}
          </Text>
        }
      />

      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.button, { backgroundColor: "#FFA000" }]}
          onPress={generateFriendCode}
        >
          <Text style={styles.buttonText}>Generate Friend Code</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.button, { backgroundColor: "#FB8C00" }]}
          onPress={() => router.push("/(tabs)/enter-code" as any)}
        >
          <Text style={styles.buttonText}>Enter Friend Code</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFF8E1",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FFF8E1",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#5D4037",
  },
  tabContainer: {
    flexDirection: "row",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#FFE0B2",
  },
  tab: {
    flex: 1,
    padding: 8,
    alignItems: "center",
    borderRadius: 20,
  },
  activeTab: {
    backgroundColor: "#FFD54F",
  },
  tabText: {
    color: "#5D4037",
    fontWeight: "bold",
  },
  activeTabText: {
    fontWeight: "bold",
    color: "#FFA000",
  },
  list: {
    flex: 1,
  },
  followItem: {
    flexDirection: "row",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#FFE0B2",
    backgroundColor: "white",
  },
  followInfo: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  username: {
    marginLeft: 8,
    fontSize: 16,
    color: "#5D4037",
  },
  unfollowButton: {
    padding: 8,
  },
  unfollowText: {
    color: "#D84315",
    fontWeight: "bold",
  },
  emptyText: {
    textAlign: "center",
    color: "#5D4037",
    fontSize: 16,
    marginTop: 24,
  },
  buttonContainer: {
    padding: 16,
    gap: 8,
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
  codeContainer: {
    margin: 16,
    padding: 16,
    backgroundColor: "white",
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#FFE0B2",
    alignItems: "center",
  },
  codeLabel: {
    fontSize: 16,
    color: "#5D4037",
    marginBottom: 8,
  },
  codeWrapper: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  codeText: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#FFA000",
    letterSpacing: 2,
  },
  copyButton: {
    padding: 8,
    backgroundColor: "#FFE0B2",
    borderRadius: 8,
  },
  codeExpiry: {
    fontSize: 14,
    color: "#8D6E63",
    marginTop: 8,
  },
  listContent: {
    flexGrow: 1,
    paddingBottom: 16,
  },
  statsContainer: {
    flexDirection: "row",
    gap: 12,
  },
  statText: {
    color: "#8D6E63",
    fontSize: 14,
  },
});
