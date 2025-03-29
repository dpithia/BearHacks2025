import { supabase } from "./supabase";

export interface BuddyState {
  name: string;
  imageUrl: string;
  hp: number;
  energy: number;
  steps: number;
  lastUpdated: string;
  lastFed: string | null;
  lastDrank: string | null;
  isSleeping: boolean;
  sleepStartTime: string | null;
  totalSleepHours: number;
  lastSleepDate: string | null;
  waterConsumed: number;
}

interface BuddyCheckResult {
  hasBuddy: boolean;
  buddy: any | null;
}

export const checkExistingBuddy = async (): Promise<BuddyCheckResult> => {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    console.warn("[checkExistingBuddy] Current user:", user?.id);

    if (!user) {
      console.warn("[checkExistingBuddy] No authenticated user found");
      return { hasBuddy: false, buddy: null };
    }

    const { data, error } = await supabase
      .from("buddies")
      .select("*")
      .eq("user_id", user.id)
      .order("last_updated", { ascending: false })
      .limit(1);

    console.warn("[checkExistingBuddy] Query result:", { data, error });

    if (error) {
      throw error;
    }

    return {
      hasBuddy: data && data.length > 0,
      buddy: data?.[0] || null,
    };
  } catch (error) {
    console.error("[checkExistingBuddy] Error:", error);
    return { hasBuddy: false, buddy: null };
  }
};

export const cleanupDuplicateBuddies = async (): Promise<void> => {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      console.warn("[cleanupDuplicateBuddies] No authenticated user found");
      return;
    }

    // Get all buddies for the user, ordered by last update
    const { data: buddies, error: fetchError } = await supabase
      .from("buddies")
      .select("*")
      .eq("user_id", user.id)
      .order("last_updated", { ascending: false });

    if (fetchError) {
      throw fetchError;
    }

    console.warn("[cleanupDuplicateBuddies] Found buddies:", buddies?.length);

    if (!buddies || buddies.length <= 1) {
      return; // No cleanup needed
    }

    // Keep the most recently updated buddy, delete the rest
    const [mostRecent, ...duplicates] = buddies;
    const duplicateIds = duplicates.map((b) => b.id);

    const { error: deleteError } = await supabase
      .from("buddies")
      .delete()
      .in("id", duplicateIds);

    if (deleteError) {
      throw deleteError;
    }

    console.warn(
      "[cleanupDuplicateBuddies] Deleted duplicates:",
      duplicateIds.length
    );
  } catch (error) {
    console.error("[cleanupDuplicateBuddies] Error:", error);
    throw error;
  }
};

export const saveBuddyState = async (state: BuddyState): Promise<void> => {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    console.warn("[saveBuddyState] Current user:", user?.id);

    if (!user) {
      console.error("[saveBuddyState] No authenticated user found");
      throw new Error("No user logged in");
    }

    // Check for existing buddy first
    const { buddy } = await checkExistingBuddy();

    // Ensure all numeric values are integers
    const buddyData = {
      user_id: user.id,
      name: state.name,
      image_url: state.imageUrl,
      hp: Math.round(state.hp),
      energy: Math.round(state.energy),
      steps: Math.round(state.steps),
      last_updated: state.lastUpdated,
      last_fed: state.lastFed,
      last_drank: state.lastDrank,
      is_sleeping: state.isSleeping,
      sleep_start_time: state.sleepStartTime,
      total_sleep_hours: Math.round(state.totalSleepHours * 100) / 100, // Keep 2 decimal places
      last_sleep_date: state.lastSleepDate,
      water_consumed: Math.round(state.waterConsumed),
    };

    console.warn("[saveBuddyState] Saving buddy data:", buddyData);

    // If buddy exists, update it. Otherwise, insert new.
    const { data, error } = await supabase
      .from("buddies")
      .upsert({
        ...buddyData,
        ...(buddy ? { id: buddy.id } : {}),
      })
      .select()
      .single();

    if (error) {
      if (error.message.includes("invalid input syntax for type integer")) {
        console.error("[saveBuddyState] Data type error:", {
          error,
          originalData: state,
          processedData: buddyData,
        });
        throw new Error("Invalid data type: Some values must be whole numbers");
      }
      throw error;
    }

    console.warn("[saveBuddyState] Save result:", { data, error });
  } catch (error) {
    console.error("[saveBuddyState] Error:", error);
    throw error;
  }
};

export const loadBuddyState = async (): Promise<BuddyState | null> => {
  try {
    const { buddy } = await checkExistingBuddy();

    if (!buddy) {
      console.warn("[loadBuddyState] No buddy found");
      return null;
    }

    const buddyState = {
      name: buddy.name,
      imageUrl: buddy.image_url,
      hp: buddy.hp,
      energy: buddy.energy,
      steps: buddy.steps,
      lastUpdated: buddy.last_updated,
      lastFed: buddy.last_fed,
      lastDrank: buddy.last_drank,
      isSleeping: buddy.is_sleeping,
      sleepStartTime: buddy.sleep_start_time,
      totalSleepHours: buddy.total_sleep_hours,
      lastSleepDate: buddy.last_sleep_date,
      waterConsumed: buddy.water_consumed,
    };

    console.warn("[loadBuddyState] Loaded buddy state:", buddyState);
    return buddyState;
  } catch (error) {
    console.error("[loadBuddyState] Error:", error);
    throw error;
  }
};
