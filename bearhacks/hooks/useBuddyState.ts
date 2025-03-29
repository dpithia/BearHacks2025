import { useState, useEffect } from "react";
import {
  saveBuddyState,
  loadBuddyState,
  type BuddyState,
} from "../services/buddyService";
import { supabase } from "../services/supabase";

export const useBuddyState = (initialState?: BuddyState | null) => {
  const [buddyState, setBuddyState] = useState<BuddyState | null>(
    initialState || null
  );
  const [isLoading, setIsLoading] = useState(!initialState);

  useEffect(() => {
    if (!initialState) {
      loadInitialState();
    }

    // Subscribe to auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        loadInitialState();
      } else {
        setBuddyState(null);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const loadInitialState = async () => {
    try {
      setIsLoading(true);
      const state = await loadBuddyState();
      setBuddyState(state);
    } catch (error) {
      console.error("Error loading buddy state:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const updateBuddyState = async (newState: Partial<BuddyState>) => {
    if (!buddyState) return;

    try {
      const updatedState = {
        ...buddyState,
        ...newState,
      } as BuddyState;

      await saveBuddyState(updatedState);
      setBuddyState(updatedState);
    } catch (error) {
      console.error("Error updating buddy state:", error);
      throw error;
    }
  };

  return {
    buddyState,
    isLoading,
    updateBuddyState,
    loadInitialState,
  };
};
