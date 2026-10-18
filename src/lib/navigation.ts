import type { Router } from 'expo-router';
import type { Item } from './types';

// Ouvre la fiche d'un titre depuis n'importe quel écran
export function openTitle(router: Router, item: Item) {
  router.push({
    pathname: '/titre/[kind]/[id]',
    params: { kind: item.kind, id: item.id, title: item.title, poster: item.poster ?? '', year: item.year ?? '' },
  });
}