export type Kind = 'film' | 'manga' | 'occidental' | 'serie';

export type Item = {
  kind: Kind;
  id: string;
  title: string;
  poster?: string | null;
  backdrop?: string | null;
  year?: string | null;
};

export const sameItem = (a: Pick<Item, 'kind' | 'id'>, b: Pick<Item, 'kind' | 'id'>) =>
  a.kind === b.kind && a.id === b.id;