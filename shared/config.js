// ==========================================
// TAXI CLUB ALBANIA
// SUPABASE CONFIG
// ==========================================

const SUPABASE_URL =
  "https://zmznxklhpqjgkorgykag.supabase.co";

const SUPABASE_PUBLISHABLE_KEY =
  "sb_publishable_SxWAKk0oqrk7lw7KmXSvDg_zuEbL8je";

const supabaseClient =
  supabase.createClient(
    SUPABASE_URL,
    SUPABASE_PUBLISHABLE_KEY
  );