import { useRouter } from 'expo-router';
import type { Item } from './types';

// Ouvre la fiche d'un titre depuis n'importe quel écran
export function openTitle(router: ReturnType<typeof useRouter>, item: Item) {
  router.push({
    pathname: '/titre/[kind]/[id]',
    params: { kind: item.kind, id: item.id, title: item.title, poster: item.poster ?? '', backdrop: item.backdrop ?? '', year: item.year ?? '' },
  });
}