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
      throw new Error("Perplexity API key not configured");
    }
    return key;
  }

  static async analyzePattern(entries: FoodEntry[]): Promise<NutritionInsight> {
    try {
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
            model: "mixtral-8x7b-instruct",
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
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`API request failed: ${response.statusText}`);
      }

      const data = await response.json();
      return this.parseResponse(data.choices[0].message.content);
    } catch (error) {
      console.error("Error analyzing nutrition pattern:", error);
      throw error;
    }
  }

  private static constructPrompt(entries: FoodEntry[]): string {
    const foodList = entries.map((entry) => ({
      name: entry.name,
      labels: entry.labels,
      isHealthy: entry.isHealthy,
      timestamp: new Date(entry.timestamp).toLocaleString(),
    }));

    return `Analyze these eating patterns and provide nutritional insights:
    ${JSON.stringify(foodList, null, 2)}
    
    Please provide:
    1. A brief summary of eating patterns
    2. Specific nutritional recommendations
    3. Estimated nutritional balance (protein/carbs/fats percentages)
    4. Overall health score (0-100)
    5. Any nutritional concerns
    
    Format the response as JSON with these keys:
    {
      "summary": "...",
      "recommendations": ["...", "..."],
      "nutritionalBalance": { "protein": x, "carbs": y, "fats": z },
      "healthScore": n,
      "concerns": ["...", "..."]
    }`;
  }

  private static parseResponse(response: string): NutritionInsight {
    try {
      // Find the JSON object in the response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("No JSON found in response");
      }

      const parsed = JSON.parse(jsonMatch[0]);

      return {
        summary: parsed.summary || "No summary available",
        recommendations: parsed.recommendations || [],
        nutritionalBalance: {
          protein: parsed.nutritionalBalance?.protein || 0,
          carbs: parsed.nutritionalBalance?.carbs || 0,
          fats: parsed.nutritionalBalance?.fats || 0,
        },
        healthScore: parsed.healthScore || 0,
        concerns: parsed.concerns || [],
      };
    } catch (error) {
      console.error("Error parsing nutrition analysis:", error);
      throw error;
    }
  }
}
