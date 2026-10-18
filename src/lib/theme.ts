import { Appearance } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ACCENTS: Record<string, string> = {
  Rouge: '#E11D2A',
  Bleu: '#2563EB',
  Violet: '#7C3AED',
  Vert: '#16A34A',
  Orange: '#EA580C',
};

const DARK = {
  background: '#0E0F13',
  card: '#171920',
  muted: '#22242C',
  foreground: '#F5F3EE',
  mutedForeground: '#9A9CA6',
  border: '#2A2C35',
  gold: '#FBBF24',
  destructive: '#E5484D',
  primaryForeground: '#FFFFFF',
};

const LIGHT = {
  background: '#F5F3EE',
  card: '#FFFFFF',
  muted: '#E8E6E1',
  foreground: '#15161B',
  mutedForeground: '#5F626B',
  border: '#DDDAD3',
  gold: '#F59E0B',
  destructive: '#DC2626',
  primaryForeground: '#FFFFFF',
};

// Objet mutable : mis à jour au démarrage, avant le chargement des écrans
export const colors: typeof DARK & { primary: string } = { ...DARK, primary: ACCENTS.Rouge };

export function applyPalette(apparence: string, theme: string) {
  const dark = apparence === 'Sombre' || (apparence === 'Auto' && Appearance.getColorScheme() !== 'light');
  Object.assign(colors, dark ? DARK : LIGHT, { primary: ACCENTS[theme] ?? ACCENTS.Rouge });
}

export async function applyPaletteAtBoot() {
  try {
    const v = await AsyncStorage.getItem('mv:prefs');
    const p = v ? JSON.parse(v) : {};
    applyPalette(p.apparence ?? 'Sombre', p.theme ?? 'Rouge');
  } catch {
    applyPalette('Sombre', 'Rouge');
  }
}