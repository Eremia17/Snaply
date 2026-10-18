import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const configuredUrl = process.env.EXPO_PUBLIC_SUPABASE_URL?.trim();
const configuredKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();

export const isSupabaseConfigured = Boolean(
  configuredUrl &&
  configuredKey &&
  !configuredUrl.includes('YOUR_PROJECT') &&
  !configuredKey.includes('replace_me'),
);

// The fallback allows the app shell to open before the real backend is configured.
// Backend-dependent functions should check isSupabaseConfigured before making requests.
export const supabase = createClient(
  isSupabaseConfigured ? configuredUrl! : 'https://placeholder.supabase.co',
  isSupabaseConfigured ? configuredKey! : 'placeholder-publishable-key',
  {
    auth: {
      storage: AsyncStorage,
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
    },
  },
);
