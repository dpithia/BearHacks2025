import React, { useEffect, useState } from "react";
import {
  StyleSheet,
  View,
  ScrollView,
  Image,
  Pressable,
  ActivityIndicator,
} from "react-native";
import { ThemedText } from "@/components/ThemedText";
import { IconSymbol } from "@/components/ui/IconSymbol";
import { useRouter } from "expo-router";
import { useFoodEntryStore } from "../../stores/foodEntryStore";
import {
  NutritionAnalyzer,
  NutritionInsight,
} from "../../services/NutritionAnalyzer";

type FoodEntry = {
  id: string;
  name: string;
  timestamp: Date;
  imageUrl?: string;
  confidence: number;
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  isHealthy: boolean;
  labels: string[];
};

const FoodEntryCard = ({ entry }: { entry: FoodEntry }) => (
  <Pressable
    style={[
      styles.entryCard,
      { borderLeftColor: entry.isHealthy ? "#4CAF50" : "#FFA000" },
    ]}
  >
    {entry.imageUrl && (
      <Image source={{ uri: entry.imageUrl }} style={styles.entryImage} />
    )}
    <View style={styles.entryContent}>
      <ThemedText
        style={[
          styles.entryName,
          { fontWeight: "600", fontFamily: "Minecraft" },
        ]}
      >
        {entry.name}
      </ThemedText>
      <ThemedText style={[styles.entryTime, { fontFamily: "Minecraft" }]}>
        {new Date(entry.timestamp).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        })}
      </ThemedText>
      <View style={styles.labels}>
        {entry.labels.length > 0 && (
          <ThemedText style={[styles.label, { fontFamily: "Minecraft" }]}>
            {entry.labels[0]}
          </ThemedText>
        )}
      </View>
    </View>
    <View style={styles.entryConfidence}>
      <ThemedText style={styles.confidenceText}>
        {Math.round(entry.confidence * 100)}%
      </ThemedText>
      <IconSymbol
        size={24}
        color={entry.isHealthy ? "#4CAF50" : "#FFA000"}
        name={
          entry.isHealthy
            ? "checkmark.circle.fill"
            : "exclamationmark.circle.fill"
        }
      />
    </View>
  </Pressable>
);

const InsightsCard = ({ insight }: { insight: NutritionInsight }) => (
  <View style={styles.insightsCard}>
    <View style={styles.insightHeader}>
      <IconSymbol size={24} color="#4CAF50" name="chart.bar.fill" />
      <ThemedText style={styles.insightTitle}>Nutritional Insights</ThemedText>
      <View style={styles.healthScoreContainer}>
        <ThemedText style={styles.healthScoreText}>
          {insight.healthScore}
        </ThemedText>
        <ThemedText style={styles.healthScoreLabel}>Health Score</ThemedText>
      </View>
    </View>

    <ThemedText style={styles.insightSummary}>{insight.summary}</ThemedText>

    <View style={styles.nutritionBalance}>
      <View style={styles.balanceItem}>
        <View
          style={[
            styles.balanceBar,
            {
              height: `${insight.nutritionalBalance.protein}%`,
              backgroundColor: "#4CAF50",
            },
          ]}
        />
        <ThemedText style={styles.balanceLabel}>Protein</ThemedText>
        <ThemedText style={styles.balanceValue}>
          {insight.nutritionalBalance.protein}%
        </ThemedText>
      </View>
      <View style={styles.balanceItem}>
        <View
          style={[
            styles.balanceBar,
            {
              height: `${insight.nutritionalBalance.carbs}%`,
              backgroundColor: "#FFA000",
            },
          ]}
        />
        <ThemedText style={styles.balanceLabel}>Carbs</ThemedText>
        <ThemedText style={styles.balanceValue}>
          {insight.nutritionalBalance.carbs}%
        </ThemedText>
      </View>
      <View style={styles.balanceItem}>
        <View
          style={[
            styles.balanceBar,
            {
              height: `${insight.nutritionalBalance.fats}%`,
              backgroundColor: "#F44336",
            },
          ]}
        />
        <ThemedText style={styles.balanceLabel}>Fats</ThemedText>
        <ThemedText style={styles.balanceValue}>
          {insight.nutritionalBalance.fats}%
        </ThemedText>
      </View>
    </View>

    <View style={styles.recommendationsContainer}>
      <ThemedText style={styles.recommendationsTitle}>
        Recommendations
      </ThemedText>
      {insight.recommendations.map((rec, index) => (
        <View key={index} style={styles.recommendationItem}>
          <IconSymbol size={16} color="#4CAF50" name="checkmark.circle.fill" />
          <ThemedText style={styles.recommendationText}>{rec}</ThemedText>
        </View>
      ))}
    </View>

    {insight.concerns && insight.concerns.length > 0 && (
      <View style={styles.concernsContainer}>
        <ThemedText style={styles.concernsTitle}>Concerns</ThemedText>
        {insight.concerns.map((concern, index) => (
          <View key={index} style={styles.concernItem}>
            <IconSymbol
              size={16}
              color="#F44336"
              name="exclamationmark.circle.fill"
            />
            <ThemedText style={styles.concernText}>{concern}</ThemedText>
          </View>
        ))}
      </View>
    )}
  </View>
);

export default function ExploreScreen() {
  const router = useRouter();
  const entries = useFoodEntryStore((state) => state.entries);
  const [insight, setInsight] = useState<NutritionInsight | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const analyzeEntries = async () => {
      if (entries.length === 0) return;

      setLoading(true);
      try {
        const analysis = await NutritionAnalyzer.analyzePattern(entries);
        setInsight(analysis);
      } catch (error) {
        console.error("Failed to analyze entries:", error);
      } finally {
        setLoading(false);
      }
    };

    analyzeEntries();
  }, [entries]);

  const goToCamera = () => {
    router.push("/(tabs)/buddy");
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <IconSymbol
          size={48}
          color="#FFA000"
          name="fork.knife"
          style={styles.headerIcon}
        />
        <ThemedText type="title" style={styles.headerTitle}>
          My Food Journal
        </ThemedText>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
      >
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#FFA000" />
            <ThemedText style={styles.loadingText}>
              Analyzing your eating patterns...
            </ThemedText>
          </View>
        ) : (
          <View style={styles.journalContainer}>
            {insight && <InsightsCard insight={insight} />}

            <View style={styles.dateHeader}>
              <ThemedText style={[styles.dateText, { fontWeight: "600" }]}>
                Today
              </ThemedText>
            </View>

            {entries.length > 0 ? (
              entries.map((entry) => (
                <FoodEntryCard key={entry.id} entry={entry} />
              ))
            ) : (
              <View style={styles.emptyState}>
                <Pressable onPress={goToCamera} style={styles.emptyStateButton}>
                  <IconSymbol
                    size={64}
                    color="#FFA000"
                    name="camera"
                    style={styles.emptyIcon}
                  />
                  <ThemedText style={[styles.emptyText, { color: "#11181C" }]}>
                    Take a photo of your food to start tracking
                  </ThemedText>
                </Pressable>
              </View>
            )}
          </View>
        )}
      </ScrollView>

      <Pressable onPress={goToCamera} style={styles.fab}>
        <IconSymbol size={32} color="#FFFFFF" name="camera" />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#3AA385",
    padding: 16,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    paddingTop: 60,
    backgroundColor: "#3AA385",
    borderBottomWidth: 4,
    borderBottomColor: "#000000",
  },
  headerIcon: {
    marginRight: 12,
  },
  headerTitle: {
    fontSize: 24,
    color: "#F7F5E1",
    fontFamily: "Minecraft",
    textTransform: "uppercase",
  },
  scrollView: {
    flex: 1,
    backgroundColor: "#3AA385",
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 20,
  },
  journalContainer: {
    padding: 16,
    backgroundColor: "#3AA385",
  },
  dateHeader: {
    paddingVertical: 12,
    borderBottomWidth: 3,
    borderBottomColor: "#000000",
  },
  dateText: {
    fontSize: 18,
    fontFamily: "Minecraft",
    color: "#F7F5E1",
    textTransform: "uppercase",
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 48,
  },
  emptyIcon: {
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 16,
    fontFamily: "Minecraft",
    color: "#F7F5E1",
    textAlign: "center",
  },
  entryCard: {
    backgroundColor: "#F7F5E1",
    marginBottom: 16,
    padding: 16,
    flexDirection: "row",
    borderWidth: 3,
    borderColor: "#000000",
    shadowColor: "#000000",
    shadowOffset: {
      width: 3,
      height: 3,
    },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 4,
  },
  entryImage: {
    width: 60,
    height: 60,
    borderWidth: 2,
    borderColor: "#000000",
    marginRight: 12,
  },
  entryContent: {
    flex: 1,
    justifyContent: "center",
  },
  entryName: {
    fontSize: 16,
    color: "#000000",
    marginBottom: 4,
    fontFamily: "Minecraft",
  },
  entryTime: {
    fontSize: 14,
    color: "#666666",
    marginBottom: 8,
    fontFamily: "Minecraft",
  },
  labels: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  label: {
    fontSize: 12,
    color: "#000000",
    backgroundColor: "#8977b6",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 2,
    borderColor: "#000000",
    marginRight: 8,
    marginBottom: 4,
    fontFamily: "Minecraft",
  },
  entryConfidence: {
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 12,
  },
  confidenceText: {
    fontSize: 14,
    color: "#000000",
    marginBottom: 4,
    fontFamily: "Minecraft",
  },
  fab: {
    position: "absolute",
    right: 20,
    bottom: 20,
    width: 64,
    height: 64,
    backgroundColor: "#8977b6",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    borderColor: "#000000",
    shadowColor: "#000000",
    shadowOffset: {
      width: 3,
      height: 3,
    },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 5,
  },
  emptyStateButton: {
    alignItems: "center",
    justifyContent: "center",
  },
  insightsCard: {
    backgroundColor: "#F7F5E1",
    marginBottom: 16,
    padding: 20,
    borderWidth: 3,
    borderColor: "#000000",
    shadowColor: "#000000",
    shadowOffset: {
      width: 3,
      height: 3,
    },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 4,
  },
  insightHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  insightTitle: {
    fontSize: 18,
    fontFamily: "Minecraft",
    color: "#000000",
    marginLeft: 12,
    flex: 1,
    textTransform: "uppercase",
  },
  healthScoreContainer: {
    alignItems: "center",
    backgroundColor: "#8977b6",
    padding: 8,
    borderWidth: 2,
    borderColor: "#000000",
  },
  healthScoreText: {
    fontSize: 24,
    fontFamily: "Minecraft",
    color: "#F7F5E1",
  },
  healthScoreLabel: {
    fontSize: 12,
    fontFamily: "Minecraft",
    color: "#F7F5E1",
  },
  insightSummary: {
    fontSize: 14,
    fontFamily: "Minecraft",
    color: "#000000",
    lineHeight: 20,
    marginBottom: 20,
  },
  nutritionBalance: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: 24,
    height: 120,
    backgroundColor: "#FFFCEE",
    borderWidth: 2,
    borderColor: "#000000",
    padding: 16,
  },
  balanceItem: {
    alignItems: "center",
    width: 60,
  },
  balanceBar: {
    width: 24,
    borderRadius: 0,
    borderWidth: 2,
    borderColor: "#000000",
    marginBottom: 8,
  },
  balanceLabel: {
    fontSize: 12,
    fontFamily: "Minecraft",
    color: "#000000",
    marginBottom: 4,
  },
  balanceValue: {
    fontSize: 14,
    fontFamily: "Minecraft",
    color: "#000000",
  },
  recommendationsContainer: {
    marginBottom: 16,
  },
  recommendationsTitle: {
    fontSize: 16,
    fontFamily: "Minecraft",
    color: "#000000",
    marginBottom: 12,
    textTransform: "uppercase",
  },
  recommendationItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  recommendationText: {
    fontSize: 14,
    fontFamily: "Minecraft",
    color: "#000000",
    marginLeft: 8,
    flex: 1,
  },
  concernsContainer: {
    marginTop: 8,
    backgroundColor: "#8977b6",
    borderWidth: 2,
    borderColor: "#000000",
    padding: 12,
  },
  concernsTitle: {
    fontSize: 16,
    fontFamily: "Minecraft",
    color: "#F7F5E1",
    marginBottom: 12,
    textTransform: "uppercase",
  },
  concernItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  concernText: {
    fontSize: 14,
    fontFamily: "Minecraft",
    color: "#F7F5E1",
    marginLeft: 8,
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    fontFamily: "Minecraft",
    color: "#F7F5E1",
  },
});
