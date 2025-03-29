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
