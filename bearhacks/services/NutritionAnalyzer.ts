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
                  "Be precise and concise. You are a nutritionist analyzing eating patterns. Return your analysis as a valid JSON object with the exact structure: {summary: string, recommendations: string[], nutritionalBalance: {protein: number, carbs: number, fats: number}, healthScore: number, concerns: string[]}. Do not include any markdown formatting, comments, or explanatory text.",
              },
              {
                role: "user",
                content: prompt,
              },
            ],
            temperature: 0.2,
            top_p: 0.9,
            max_tokens: 1000,
            stream: false,
          }),
        }
      );

      const rawResponse = await response.text();
      console.log("Raw API Response:", rawResponse);

      if (!response.ok) {
        console.error("Perplexity API Error:", {
          status: response.status,
          statusText: response.statusText,
          response: rawResponse,
        });
        throw new Error(`API request failed: ${response.statusText}`);
      }

      // Try to parse the response as JSON
      let data;
      try {
        data = JSON.parse(rawResponse);
      } catch (e) {
        console.error("Failed to parse API response as JSON:", e);
        console.log("Raw response that failed to parse:", rawResponse);
        throw new Error("Invalid JSON response from API");
      }

      if (!data.choices?.[0]?.message?.content) {
        console.error("Unexpected API response structure:", data);
        throw new Error("Invalid API response format");
      }

      const content = data.choices[0].message.content;

      // Remove any markdown code blocks and comments
      const cleanContent = content
        .replace(/```json\n?|\n?```/g, "") // Remove markdown code blocks
        .replace(/\/\/.*$/gm, "") // Remove single-line comments
        .replace(/\/\*[\s\S]*?\*\//g, ""); // Remove multi-line comments

      console.log("Cleaned Content:", cleanContent);

      try {
        const parsedContent = JSON.parse(cleanContent);
        return this.validateAndNormalizeInsight(parsedContent);
      } catch (e) {
        console.error("Failed to parse cleaned content:", e);
        throw new Error("Failed to parse API response content");
      }
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
      .slice(0, 10);

    return `Analyze these recent meals and provide nutritional insights. Return a JSON object without any comments or markdown formatting that includes:
{
  "summary": "Brief analysis of eating patterns",
  "recommendations": ["2-3 specific, actionable recommendations"],
  "nutritionalBalance": {"protein": number, "carbs": number, "fats": number},
  "healthScore": number from 0-100,
  "concerns": ["any nutritional concerns"]
}

The meals to analyze are:
${JSON.stringify(foodList, null, 2)}`;
  }

  private static parseResponse(response: string): NutritionInsight {
    try {
      // First try to parse the entire response
      try {
        return this.validateAndNormalizeInsight(JSON.parse(response));
      } catch (e) {
        console.log("Failed to parse entire response, trying to extract JSON");
        // Look for JSON-like structure
        const matches = response.match(/\{[\s\S]*\}/g);
        if (!matches) {
          throw new Error("No JSON object found in response");
        }

        // Try each match until we find valid JSON
        for (const match of matches) {
          try {
            const parsed = JSON.parse(match);
            if (parsed && typeof parsed === "object") {
              return this.validateAndNormalizeInsight(parsed);
            }
          } catch (e) {
            continue;
          }
        }
        throw new Error("No valid JSON found in response");
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
