import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://tcsmtfkfezrykjyvawwh.supabase.co";
const supabaseAnonKey = "sb_publishable__zfnXN1-Q6YxW2pbZ9HA-g_pmLfEL6v";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
