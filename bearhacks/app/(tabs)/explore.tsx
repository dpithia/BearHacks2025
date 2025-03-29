import React, { useEffect, useState } from "react";
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { supabase } from "../../services/supabase";
import { useFonts } from "expo-font";
import { Ionicons } from "@expo/vector-icons";

interface BuddyListItem {
  id: string;
  name: string;
  image_url: string;
  user_id: string;
  hp: number;
  energy: number;
  is_sleeping: boolean;
  user_email?: string;
}

export default function SocialScreen() {
  const [buddies, setBuddies] = useState<BuddyListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [fontsLoaded] = useFonts({
    Minecraft: require("../../assets/fonts/Minecraft.ttf"),
  });

  const fetchBuddies = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data: buddyData, error } = await supabase
        .from("buddies")
        .select("*, profiles(email)")
        .neq("user_id", user.id); // Exclude current user's buddy

      if (error) throw error;

      const formattedBuddies = buddyData.map((buddy: any) => ({
        ...buddy,
        user_email: buddy.profiles?.email,
      }));

      setBuddies(formattedBuddies);
    } catch (error) {
      console.error("Error fetching buddies:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchBuddies();
  }, []);

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    fetchBuddies();
  }, []);

  if (!fontsLoaded) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#66B288" />
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#66B288" />
      </View>
    );
  }

  const renderBuddyItem = ({ item }: { item: BuddyListItem }) => (
    <View style={styles.buddyCard}>
      <View style={styles.buddyHeader}>
        <Text style={styles.buddyName}>{item.name}</Text>
        <Text style={styles.ownerEmail}>
          {item.user_email || "Unknown User"}
        </Text>
      </View>

      <View style={styles.buddyImageContainer}>
        <Text style={styles.buddyEmoji}>
          {item.is_sleeping ? "💤" : item.image_url}
        </Text>
      </View>

      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <Ionicons name="heart" size={20} color="#FF5252" />
          <Text style={styles.statText}>{Math.round(item.hp)}%</Text>
        </View>
        <View style={styles.statItem}>
          <Ionicons name="flash" size={20} color="#FFD600" />
          <Text style={styles.statText}>{Math.round(item.energy)}%</Text>
        </View>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>OTHER BUDDIES</Text>
      <FlatList
        data={buddies}
        renderItem={renderBuddyItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <Text style={styles.emptyText}>No other buddies found</Text>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#66B288",
    paddingTop: 60,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#66B288",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#000000",
    textAlign: "center",
    marginBottom: 20,
    fontFamily: "Minecraft",
  },
  listContainer: {
    padding: 16,
  },
  buddyCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 4,
    padding: 16,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: "#000000",
  },
  buddyHeader: {
    marginBottom: 12,
  },
  buddyName: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#000000",
    fontFamily: "Minecraft",
  },
  ownerEmail: {
    fontSize: 14,
    color: "#666666",
    marginTop: 4,
    fontFamily: "Minecraft",
  },
  buddyImageContainer: {
    width: 100,
    height: 100,
    backgroundColor: "#FFFFFF",
    borderRadius: 4,
    justifyContent: "center",
    alignItems: "center",
    alignSelf: "center",
    marginBottom: 16,
    borderWidth: 2,
    borderColor: "#000000",
  },
  buddyEmoji: {
    fontSize: 50,
  },
  statsContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  statItem: {
    flexDirection: "row",
    alignItems: "center",
  },
  statText: {
    marginLeft: 8,
    fontSize: 16,
    color: "#000000",
    fontFamily: "Minecraft",
  },
  emptyText: {
    textAlign: "center",
    fontSize: 16,
    color: "#000000",
    fontFamily: "Minecraft",
  },
});
