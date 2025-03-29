import * as FileSystem from "expo-file-system";
import * as MediaLibrary from "expo-media-library";

// Clarifai API Configuration
const CLARIFAI_PAT = "ac6d83289b1a441d9871b13037470134";
const USER_ID = "clarifai";
const APP_ID = "main";
const MODEL_ID = "food-item-recognition";
const MODEL_VERSION_ID = "1d5fd481e0cf4826aa72ec3ff049e044";

export interface FoodAnalysisResult {
  isHealthy: boolean;
  labels?: string[];
  confidence?: number;
}

/**
 * A service for analyzing food images - currently uses a placeholder function
 * that will be replaced with TensorFlow ML in the future
 */
export class FoodAnalyzer {
  private static healthyFoodKeywords = [
    // Original keywords retained
    "vegetable",
    "fruit",
    "salad",
    "fish",
    "lean",
    "grilled",
    "steamed",
    "fresh",
    "whole grain",

    // Healthy foods from Clarifai taxonomy
    "acorn squash",
    "almond",
    "amaranth",
    "apple",
    "apricot",
    "artichoke",
    "arugula",
    "asparagus",
    "avocado",
    "banana",
    "barley",
    "basil",
    "bass",
    "bay leaf",
    "beans",
    "beet",
    "bell pepper",
    "berry",
    "bilberry",
    "black beans",
    "black currant",
    "blackberry",
    "blood orange",
    "blueberry",
    "bok choy",
    "boysenberry",
    "breadfruit",
    "bream",
    "broccoli",
    "broccolini",
    "brown rice",
    "brussels sprout",
    "buckwheat",
    "cabbage",
    "cantaloupe",
    "caper",
    "caprese salad",
    "cardoon",
    "carrot",
    "cashew",
    "cassava",
    "cauliflower",
    "celery",
    "chard",
    "cherry",
    "cherry tomato",
    "chestnut",
    "chicken breast",
    "chickpeas",
    "chives",
    "citron",
    "citrus",
    "clam",
    "clementine",
    "coconut",
    "collards",
    "common bean",
    "corn salad",
    "cottage cheese",
    "couscous",
    "crab",
    "cranberry",
    "crayfish",
    "cress",
    "cucumber",
    "curd",
    "currant",
    "cuttlefish",
    "daikon",
    "dandelion greens",
    "date",
    "dragonfruit",
    "dried apricot",
    "dried fruit",
    "edamame",
    "eel",
    "egg white",
    "elderberry",
    "endive",
    "fava beans",
    "fiddlehead",
    "fig",
    "fish",
    "flatfish",
    "florence fennel",
    "french beans",
    "garlic",
    "garlic chives",
    "ginger",
    "goats cheese",
    "goji berry",
    "gooseberry",
    "gourd",
    "granola",
    "grape",
    "grapefruit",
    "greek salad",
    "green bean",
    "green onion",
    "guava",
    "halibut",
    "hazelnut",
    "herring",
    "honey",
    "honeydew melon",
    "huckleberry",
    "hummus",
    "jackfruit",
    "jerusalem artichoke",
    "jicama",
    "jujube",
    "juniper berry",
    "kale",
    "kidney bean",
    "kingfish",
    "kipper",
    "kiwi fruit",
    "kohlrabi",
    "kombu",
    "kumquat",
    "lamb's lettuce",
    "lavender",
    "leek",
    "lemon",
    "lentil",
    "lettuce",
    "lima bean",
    "lime",
    "lobster",
    "lotus root",
    "lychee",
    "macadamia nut",
    "mandarin orange",
    "mango",
    "marjoram",
    "melon",
    "millet",
    "mint",
    "miso soup",
    "muesli",
    "mulberry",
    "mung bean",
    "mushroom",
    "mussel",
    "napa cabbage",
    "nectarine",
    "nori",
    "oat",
    "oatmeal",
    "octopus",
    "okra",
    "olive",
    "orange",
    "oyster",
    "papaya",
    "parmesan",
    "parsnip",
    "passionfruit",
    "pea",
    "peach",
    "peanut",
    "peapod",
    "pear",
    "pearl onion",
    "pecan",
    "perch",
    "persimmon",
    "pho",
    "piho",
    "pine nut",
    "pineapple",
    "pistachio",
    "plum",
    "pomegranate",
    "pomelo",
    "potato",
    "potato onion",
    "prawn",
    "prune",
    "pumpkin",
    "pumpkin seeds",
    "quince",
    "quinoa",
    "radicchio",
    "radish",
    "raisin",
    "rambutan",
    "raspberry",
    "ratatouille",
    "red cabbage",
    "rhubarb",
    "rice",
    "roe",
    "romaine",
    "rosemary",
    "rutabaga",
    "sage",
    "salmon",
    "sardine",
    "scallion",
    "scallop",
    "sea bass",
    "seaweed salad",
    "sesame seed",
    "shallot",
    "shellfish",
    "shrimp",
    "snow pea",
    "sorghum",
    "sorrel",
    "soup",
    "spinach",
    "split peas",
    "spring onion",
    "sprouts",
    "squash",
    "squash blossoms",
    "squid",
    "star fruit",
    "stir-fry",
    "strawberry",
    "string bean",
    "sturgeon",
    "succotash",
    "summer squash",
    "sunflower seeds",
    "sushi",
    "sweet potato",
    "swiss chard",
    "tabouli",
    "tamarind",
    "tangerine",
    "tempura",
    "tofu",
    "tomatillo",
    "tomato",
    "trout",
    "tuna",
    "turkey breast",
    "turnip",
    "venison",
    "vermicelli",
    "water chestnut",
    "watercress",
    "watermelon",
    "winter melon",
    "yam",
    "yardlong bean",
    "yellow summer squash",
    "yogurt",
    "zucchini",
  ];

  private static unhealthyFoodKeywords = [
    // Original keywords retained
    "fried",
    "candy",
    "chocolate",
    "ice cream",
    "burger",
    "pizza",
    "soda",
    "chips",
    "cake",
    "processed",

    // Unhealthy foods from Clarifai taxonomy
    "apple pie",
    "bacon",
    "bagel",
    "baguette",
    "baked alaska",
    "baklava",
    "beef",
    "beef carpaccio",
    "beef steak",
    "beef tartare",
    "beignets",
    "birthday cake",
    "biscuits",
    "blood sausage",
    "blue cheese",
    "blueberry pie",
    "bonbon",
    "bread",
    "bread pudding",
    "bread rolls",
    "breadstick",
    "brie",
    "brioche",
    "brisket",
    "brittle",
    "brownie",
    "brulee",
    "burrito",
    "butter",
    "caesar salad",
    "cake pop",
    "calamari",
    "camembert",
    "canape",
    "candy apple",
    "candy bar",
    "cannoli",
    "caramel apple",
    "carpaccio",
    "carrot cake",
    "casserole",
    "caviar",
    "cereal",
    "ceviche",
    "cheddar",
    "cheese",
    "cheeseburger",
    "cheesecake",
    "chicken curry",
    "chicken leg",
    "chicken wings",
    "chili",
    "chili pepper",
    "chorizo",
    "chowder",
    "churros",
    "chutney",
    "ciabatta",
    "cinnamon roll",
    "clam chowder",
    "cobbler",
    "cockle",
    "coleslaw",
    "compote",
    "cookie",
    "corn bread",
    "corned beef",
    "cornflakes",
    "crab cakes",
    "cracker",
    "creme brulee",
    "crepe",
    "crescent roll",
    "crispbread",
    "croissant",
    "croque madame",
    "croquette",
    "crouton",
    "crunch",
    "cupcake",
    "custard",
    "danish pastry",
    "deviled eggs",
    "dough",
    "doughnut",
    "dumpling",
    "durian",
    "eclair",
    "egg yolk",
    "eggplant",
    "english muffin",
    "escargots",
    "falafel",
    "farfalle",
    "filet mignon",
    "fillet of sole",
    "fish and chips",
    "flan",
    "flatbread",
    "focaccia",
    "foie gras",
    "fondue",
    "frankfurters",
    "french bread",
    "french fries",
    "french onion soup",
    "french toast",
    "fried calamari",
    "fried egg",
    "fried rice",
    "frittata",
    "fritter",
    "frozen yogurt",
    "fruitcake",
    "fudge",
    "fusilli",
    "galette",
    "garlic bread",
    "gazpacho",
    "gherkin",
    "gnocchi",
    "gorgonzola",
    "gouda",
    "goulash",
    "grilled cheese sandwich",
    "grits",
    "ground beef",
    "guacamole",
    "gyoza",
    "gyro",
    "habanero pepper",
    "ham",
    "hamburger",
    "hash",
    "hot dog",
    "huevos rancheros",
    "jalapeno",
    "jelly beans",
    "jordan almonds",
    "kebab",
    "kettle corn",
    "knish",
    "lamb",
    "lamb chops",
    "lasagna",
    "lobster bisque",
    "loin",
    "lollipop",
    "lox",
    "macaron",
    "macaroni",
    "macaroon",
    "mackerel",
    "maple syrup",
    "marshmallow",
    "marzipan",
    "mashed potatoes",
    "meat",
    "meat pie",
    "meatball",
    "meatloaf",
    "meringue",
    "mochi",
    "mousse",
    "mozzarella",
    "muffin",
    "mutton",
    "nachos",
    "nigiri",
    "noodle",
    "nougat",
    "nut",
    "omelette",
    "onion rings",
    "pad thai",
    "paella",
    "pancake",
    "pancetta",
    "panna cotta",
    "parfait",
    "pasta",
    "pastrami",
    "pastry",
    "pate",
    "penne",
    "pepperoni",
    "pie",
    "pike",
    "pilaf",
    "pita bread",
    "polenta",
    "popcorn",
    "popovers",
    "poppy seed roll",
    "popsicle",
    "pork",
    "pork chop",
    "pork pie",
    "porridge",
    "pot roast",
    "poutine",
    "praline",
    "pretzel",
    "prime rib",
    "prosciutto",
    "pudding",
    "quiche",
    "raisin bread",
    "ramen",
    "ravioli",
    "red velvet cake",
    "ribbon-cut pasta",
    "risotto",
    "roast beef",
    "roquefort",
    "salami",
    "salsa",
    "samosa",
    "sandwich",
    "sashimi",
    "sauerkraut",
    "sausage",
    "sausage roll",
    "scampi",
    "scone",
    "seafood",
    "sherbet",
    "shish kebab",
    "shortcake",
    "sirloin",
    "slaw",
    "smoked fish",
    "smoked salmon",
    "snapper",
    "soda bread",
    "sorbet",
    "souffle",
    "spaghetti bolognese",
    "spaghetti carbonara",
    "spare ribs",
    "spring rolls",
    "sprinkles",
    "steak",
    "strudel",
    "stuffing",
    "sundae",
    "swiss cheese",
    "tacos",
    "tagliatelle",
    "tamale",
    "tart",
    "tartare",
    "tenderloin",
    "tiramisu",
    "toast",
    "toffee",
    "torte",
    "tortellini",
    "tortilla chips",
    "truffle",
    "tuna tartare",
    "turkey",
    "wafer",
    "waffle",
    "walnut",
    "whipped cream",
    "whoopie pie",
  ];
  /**
   * Analyze a food image and determine if it's healthy
   * @param imageUri URI of the captured image
   * @returns Analysis result with isHealthy flag
   */
  static async analyzeImage(imageUri: string): Promise<FoodAnalysisResult> {
    try {
      // Save image for future training and to photo library
      await FoodAnalyzer.saveImageForTraining(imageUri);
      await MediaLibrary.saveToLibraryAsync(imageUri);

      // Convert image to base64
      const base64Image = await FileSystem.readAsStringAsync(imageUri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      // Prepare the request body
      const raw = JSON.stringify({
        user_app_id: {
          user_id: USER_ID,
          app_id: APP_ID,
        },
        inputs: [
          {
            data: {
              image: {
                base64: base64Image,
              },
            },
          },
        ],
      });

      // Make API request
      const response = await fetch(
        `https://api.clarifai.com/v2/models/${MODEL_ID}/versions/${MODEL_VERSION_ID}/outputs`,
        {
          method: "POST",
          headers: {
            Accept: "application/json",
            Authorization: "Key " + CLARIFAI_PAT,
          },
          body: raw,
        }
      );

      const data = await response.json();

      if (!response.ok) {
        console.error("Clarifai API Error:", {
          status: response.status,
          statusText: response.statusText,
          data,
        });
        throw new Error(
          `Clarifai API request failed: ${
            data.status?.description || response.statusText
          }`
        );
      }

      if (!data.outputs?.[0]?.data?.concepts) {
        console.error("Invalid Clarifai API response:", data);
        throw new Error("Invalid API response format");
      }

      // Process results
      const concepts = data.outputs[0].data.concepts;
      const labels = concepts.map((c: any) => c.name);

      // Calculate health score based on detected labels
      let healthyScore = 0;
      let unhealthyScore = 0;

      labels.forEach((label: string) => {
        if (
          this.healthyFoodKeywords.some((keyword) =>
            label.toLowerCase().includes(keyword)
          )
        ) {
          healthyScore += 1;
        }
        if (
          this.unhealthyFoodKeywords.some((keyword) =>
            label.toLowerCase().includes(keyword)
          )
        ) {
          unhealthyScore += 1;
        }
      });

      const isHealthy = healthyScore > unhealthyScore;
      const confidence = concepts[0]?.value || 0;

      console.log("Food Analysis Results:", {
        labels: labels.slice(0, 5),
        healthyScore,
        unhealthyScore,
        isHealthy,
        confidence,
      });

      return {
        isHealthy,
        labels: labels.slice(0, 5), // Top 5 labels
        confidence,
      };
    } catch (error) {
      console.error("Error analyzing food image:", error);
      throw error; // Re-throw to handle in UI
    }
  }

  /**
   * Save a copy of the image to a dedicated directory for future training
   * @param imageUri URI of the captured image
   */
  private static async saveImageForTraining(imageUri: string): Promise<void> {
    const foodImagesDir = `${FileSystem.documentDirectory}food_images/`;
    const dirInfo = await FileSystem.getInfoAsync(foodImagesDir);

    // Create directory if it doesn't exist
    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(foodImagesDir, {
        intermediates: true,
      });
    }

    // Save image with timestamp
    const timestamp = new Date().getTime();
    const newImageUri = `${foodImagesDir}food_${timestamp}.jpg`;
    await FileSystem.copyAsync({
      from: imageUri,
      to: newImageUri,
    });
  }

  /**
   * PLACEHOLDER - This function will be implemented in the future to use TensorFlow.js
   * to analyze the image and determine if it's healthy food
   */
  private static async analyzeFoodWithTensorFlow(
    imageUri: string
  ): Promise<boolean> {
    // This will be implemented in the future when we integrate TensorFlow

    // Example code structure that would go here:
    // 1. Load the TensorFlow model
    // 2. Preprocess the image
    // 3. Run inference with the model
    // 4. Process and return the result

    return true; // Placeholder return
  }
}
