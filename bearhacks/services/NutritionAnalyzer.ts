import { FoodEntry } from "../stores/foodEntryStore";
import Constants from "expo-constants";

export interface NutritionInsight {
  summary: string;
  recommendations: string[];
  nutritionalBalance: {
    protein: number;
    carbs: number;
    fats: number;
  };
  healthScore: number;
  concerns?: string[];
}

export class NutritionAnalyzer {
  private static get API_KEY() {
    const key = Constants.expoConfig?.extra?.perplexityApiKey;
    if (!key) {
      console.warn("Perplexity API key not configured, using mock data");
      return null;
    }
    return key;
  }

  static async analyzePattern(entries: FoodEntry[]): Promise<NutritionInsight> {
    try {
      if (!this.API_KEY) {
        return this.getMockInsight(entries);
      }

      const prompt = this.constructPrompt(entries);

      const response = await fetch(
        "https://api.perplexity.ai/chat/completions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${this.API_KEY}`,
          },
          body: JSON.stringify({
            model: "sonar",
            messages: [
              {
                role: "system",
                content:
                  "You are a professional nutritionist analyzing eating patterns. Provide specific, actionable insights.",
              },
              {
                role: "user",
                content: prompt,
              },
            ],
            max_tokens: 1024,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.text();
        console.error("Perplexity API Error:", {
          status: response.status,
          statusText: response.statusText,
          error: errorData,
        });
        throw new Error(`API request failed: ${errorData}`);
      }

      const data = await response.json();
      if (!data.choices?.[0]?.message?.content) {
        throw new Error("Invalid API response format");
      }

      return this.parseResponse(data.choices[0].message.content);
    } catch (error) {
      console.error("Error analyzing nutrition pattern:", error);
      return this.getMockInsight(entries);
    }
  }

  private static constructPrompt(entries: FoodEntry[]): string {
    const foodList = entries
      .map((entry) => ({
        food: entry.name,
        isHealthy: entry.isHealthy,
        time: new Date(entry.timestamp).toLocaleTimeString(),
      }))
      .slice(0, 10); // Limit to last 10 entries

    return `Analyze these recent meals and provide nutritional insights in JSON format:
${JSON.stringify(foodList, null, 2)}

Return a JSON object with:
{
  "summary": "Brief analysis of eating patterns",
  "recommendations": ["2-3 specific, actionable recommendations"],
  "nutritionalBalance": {"protein": number, "carbs": number, "fats": number},
  "healthScore": number from 0-100,
  "concerns": ["any nutritional concerns"]
}`;
  }

  private static parseResponse(response: string): NutritionInsight {
    try {
      // Try direct parsing first
      try {
        const parsed = JSON.parse(response);
        return this.validateAndNormalizeInsight(parsed);
      } catch (e) {
        // If direct parsing fails, try to extract JSON from the response
        const jsonMatch = response.match(/\{[\s\S]*?\}/); // Non-greedy match
        if (!jsonMatch) {
          console.error("Raw response:", response);
          throw new Error("No JSON found in response");
        }
        const parsed = JSON.parse(jsonMatch[0]);
        return this.validateAndNormalizeInsight(parsed);
      }
    } catch (error) {
      console.error("Error parsing nutrition analysis:", error);
      throw error;
    }
  }

  private static validateAndNormalizeInsight(parsed: any): NutritionInsight {
    return {
      summary: parsed.summary || "No summary available",
      recommendations: Array.isArray(parsed.recommendations)
        ? parsed.recommendations
        : ["Try to eat more balanced meals"],
      nutritionalBalance: {
        protein: Number(parsed.nutritionalBalance?.protein) || 0,
        carbs: Number(parsed.nutritionalBalance?.carbs) || 0,
        fats: Number(parsed.nutritionalBalance?.fats) || 0,
      },
      healthScore: Number(parsed.healthScore) || 0,
      concerns: Array.isArray(parsed.concerns) ? parsed.concerns : [],
    };
  }

  private static getMockInsight(entries: FoodEntry[]): NutritionInsight {
    const healthyCount = entries.filter((e) => e.isHealthy).length;
    const totalEntries = entries.length;
    const healthScore =
      totalEntries > 0 ? (healthyCount / totalEntries) * 100 : 50;

    return {
      summary: "Based on your recent meals",
      recommendations: [
        "Try to eat more balanced meals",
        "Stay hydrated throughout the day",
        "Consider adding more variety to your diet",
      ],
      nutritionalBalance: {
        protein: 30,
        carbs: 40,
        fats: 30,
      },
      healthScore: Math.round(healthScore),
      concerns: totalEntries === 0 ? ["Not enough data to analyze"] : [],
    };
  }
}
