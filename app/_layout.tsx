import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from '@/lib/auth';
import { StoreProvider } from '@/lib/store';
import { loadCatalog } from '@/lib/catalog';
import { loadPrefs } from '@/lib/prefs';
import { applyPaletteAtBoot, colors } from '@/lib/theme';

// L'application démarre directement sur les onglets (accueil), sans passer par la connexion.
export const unstable_settings = {
  initialRouteName: '(tabs)',
};

export default function RootLayout() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Thème et préférences chargés avant d'afficher les écrans
    Promise.all([applyPaletteAtBoot(), loadPrefs()]).finally(() => setReady(true));
    loadCatalog();
  }, []);

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <StoreProvider>
          <View style={{ flex: 1, backgroundColor: colors.background }}>
            {ready ? (
              <Stack
                screenOptions={{
                  headerShown: false,
                  contentStyle: { backgroundColor: colors.background },
                }}
              />
            ) : null}
          </View>
          <StatusBar style="light" />
        </StoreProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}