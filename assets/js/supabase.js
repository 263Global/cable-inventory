/**
 * Supabase Client Configuration
 * Configure your Supabase project credentials here
 */

// ============================================
// ⚠️ CONFIGURE YOUR SUPABASE CREDENTIALS HERE
// ============================================
const SUPABASE_URL = 'https://rmvdwecxqkmotznekist.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_9XAT3z5abDwPHdtHeEVZ6g_-aWAWxmp';

// Initialize Supabase client (SDK v2 uses 'supabase' global from CDN)
const { createClient } = supabase;
const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Export for use in other modules
window.SupabaseClient = supabaseClient;
