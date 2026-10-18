import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/lib/theme';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.mutedForeground,
        tabBarStyle: { backgroundColor: colors.card, borderTopColor: colors.border },
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.foreground,
        headerTitleStyle: { fontWeight: '800' },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Accueil', tabBarIcon: ({ color, size }) => <Ionicons name="home-outline" size={size} color={color} /> }} />
      <Tabs.Screen name="ma-liste" options={{ title: 'Ma liste', tabBarIcon: ({ color, size }) => <Ionicons name="heart-outline" size={size} color={color} /> }} />
      <Tabs.Screen name="telechargements" options={{ title: 'Téléchargement', tabBarIcon: ({ color, size }) => <Ionicons name="download-outline" size={size} color={color} /> }} />
      <Tabs.Screen name="profil" options={{ title: 'Profil', tabBarIcon: ({ color, size }) => <Ionicons name="person-outline" size={size} color={color} /> }} />
      {/* Le menu est ouvert par le bouton en haut à gauche, il n'a plus d'onglet */}
      <Tabs.Screen name="menu" options={{ href: null, title: 'Menu' }} />
    </Tabs>
  );
}