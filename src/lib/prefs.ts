import { useSyncExternalStore } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { applyPalette } from './theme';

export type Prefs = {
  apparence: 'Sombre' | 'Clair' | 'Auto';
  theme: string;
  taille: 'Compact' | 'Normal' | 'Grand';
  economiseur: boolean;
  famille: boolean;
  contraste: boolean;
  animations: boolean;
  soustitres: boolean;
};

const DEFAULT: Prefs = {
  apparence: 'Sombre',
  theme: 'Rouge',
  taille: 'Compact',
  economiseur: true,
  famille: false,
  contraste: false,
  animations: false,
  soustitres: true,
};

let current: Prefs = DEFAULT;
let loaded = false;
const listeners = new Set<() => void>();

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}
const getPrefs = () => current;

function emit() {
  listeners.forEach((l) => l());
}

export async function loadPrefs(): Promise<void> {
  if (loaded) return;
  loaded = true;
  try {
    const v = await AsyncStorage.getItem('mv:prefs');
    if (v) {
      current = { ...DEFAULT, ...JSON.parse(v) };
      emit();
    }
  } catch {
    // préférences par défaut
  }
}

export function usePrefs(): [Prefs, <K extends keyof Prefs>(key: K, value: Prefs[K]) => void] {
  const prefs = useSyncExternalStore(subscribe, getPrefs);
  const setPref = <K extends keyof Prefs>(key: K, value: Prefs[K]) => {
    current = { ...current, [key]: value };
    emit();
    AsyncStorage.setItem('mv:prefs', JSON.stringify(current));
    if (key === 'apparence' || key === 'theme') applyPalette(current.apparence, current.theme);
  };
  return [prefs, setPref];
}

const BLOCKED = ['horreur', 'horror', 'thriller', 'crime'];
export function isFamilySafe(item: { genres: string[] }): boolean {
  return !item.genres.some((g) => BLOCKED.includes(g.toLowerCase()));
}