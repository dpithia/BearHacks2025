import "react-native-url-polyfill/auto";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://kmhftfnrskmubhcwalbn.supabase.co";
const supabaseAnonKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImttaGZ0Zm5yc2ttdWJoY3dhbGJuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDMwNDA3OTksImV4cCI6MjA1ODYxNjc5OX0.Pe4l-shG7nob9NhOx_3xBfpMu2o5NZTnicde8O8Vi3M";

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
