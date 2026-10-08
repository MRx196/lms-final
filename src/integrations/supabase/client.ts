import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://whjljhgavgpamzccpjnx.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndoamxqaGdhdmdwYW16Y2Nwam54Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgyMTIyMDcsImV4cCI6MjEwMzc4ODIwN30.fg0wkLRPbXG9i59lU8yRKWRld4iB7C0CQd49C8TKaZI";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
